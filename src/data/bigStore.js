// Large lists (bills, customers, stock) kept in memory and saved to IndexedDB one record at a time.
//
// Why: localStorage holds about 5 MB, which is roughly 1,500 bills. Past that, every save failed.
// IndexedDB holds hundreds of MB, and writing only the records that changed keeps a save fast
// (one bill instead of rewriting all 50,000).
//
// How a save finds what changed:
//   - records added, removed or reordered, and records replaced by a new object: found by
//     comparing ids and object identity with the last save (cheap, always right);
//   - records edited in place (e.g. a payment pushed onto a bill): the caller names them
//     (`changed` ids). As a safety net, a background check re-hashes every record and saves
//     anything that differs, so a missed hint is still saved within moments.
//
// How changes reach the disk: changed records are only *marked*. A writer saves the marks in
// small transactions, the user's own saves first. Each write takes the record as it is at that
// moment, so a record changed five times is written once, and a record deleted meanwhile is never
// written back. A huge background write (e.g. the first move of 50,000 bills) can never make a
// new bill wait behind it.
//
// Every record keeps the hash of what was saved; cloud sync reuses it (same hash function).
//
// Bills carry a full copy of the rate card they were priced with (about 60% of a bill). On disk
// each distinct rate card is stored once and bills point to it; when loaded, bills with the same
// rate card share one copy in memory. The bills themselves look exactly the same to the app.
import { hashData } from '../cloud/syncPlan.js';

export const BIG_LISTS = ['history', 'customers', 'stock', 'workers', 'tools'];
export const IDB_VERSION = 2;
const CHUNK = 400;          // records per transaction
const URGENT_MAX = 50;      // a save touching up to this many records goes to the front

const REF = '__ratesRef';
const sharedRefs = new WeakMap(); // rate-card object → its reference

/** A bill as stored: its rate card replaced by a reference (plus the rate card, if not stored yet). */
function encode(name, v, storedShared, metaPuts) {
    const rates = name === 'history' ? v?.snapshot?.rates : null;
    if (!rates || typeof rates !== 'object') return v;
    let ref = sharedRefs.get(rates);
    if (!ref) { ref = 'r' + hashData(rates); sharedRefs.set(rates, ref); }
    if (!storedShared.has(ref)) metaPuts.set(`shared:${ref}`, rates);
    const { rates: _omit, ...snap } = v.snapshot;
    return { ...v, snapshot: { ...snap, [REF]: ref } };
}

/** A stored bill back to the bill (sharing the rate-card object). */
function decode(v, shared) {
    const ref = v?.snapshot?.[REF];
    if (!ref) return v;
    const { [REF]: _omit, ...snap } = v.snapshot;
    const rates = shared.get(ref);
    if (rates) snap.rates = rates; // a missing card leaves the bill priced from its slab details
    return { ...v, snapshot: snap };
}

const validId = (id) => (typeof id === 'string' && id !== '') || (typeof id === 'number' && Number.isFinite(id));

/**
 * @param {object} backend  { open(): Promise<boolean>, load(name): Promise<{order, entries:[{k,v,h}]}>,
 *                            write(name, {puts:[{k,v,h}], dels:[k], order}): Promise<void> }
 */
export function createBigStore(backend, { onError = () => {}, schedule = defaultSchedule } = {}) {
    const colls = new Map();
    let seq = 0;
    let verifyTimer = null;
    let writing = null;          // promise of the running writer loop
    let failures = 0;
    const idleWaiters = [];
    const shared = new Map();        // ref → rate card (one object shared by bills)
    const storedShared = new Set();  // refs already on disk

    const coll = (name) => {
        if (!colls.has(name)) {
            colls.set(name, {
                name, list: [], keyOf: new WeakMap(), objOf: new Map(), hashOf: new Map(), order: [],
                unverified: false, urgent: new Set(), bulk: new Set(), dels: new Set(), orderDirty: false
            });
        }
        return colls.get(name);
    };

    function keyFor(st, obj, seen) {
        let k = st.keyOf.get(obj);
        if (k !== undefined && !seen.has(k)) return k;
        k = validId(obj?.id) && !seen.has(String(obj.id)) ? String(obj.id) : `~${++seq}`;
        while (seen.has(k)) k = `~${++seq}`;
        if (obj && typeof obj === 'object') st.keyOf.set(obj, k);
        return k;
    }

    function mark(st, keys, urgent) {
        const target = urgent ? st.urgent : st.bulk;
        for (const k of keys) { st.dels.delete(k); target.add(k); if (urgent) st.bulk.delete(k); }
    }

    const hasWork = () => [...colls.values()].some((st) => st.urgent.size || st.bulk.size || st.dels.size || st.orderDirty);

    /** Next transaction: deletes and order first, then urgent records, then bulk ones. */
    function nextBatch() {
        for (const st of colls.values()) {
            if (!(st.urgent.size || st.bulk.size || st.dels.size || st.orderDirty)) continue;
            const keys = [];
            for (const set of [st.urgent, st.bulk]) {
                for (const k of set) { if (keys.length >= CHUNK) break; keys.push(k); }
            }
            const puts = [];
            const metaPuts = new Map();
            for (const k of keys) {
                st.urgent.delete(k); st.bulk.delete(k);
                if (st.objOf.has(k)) puts.push({ k, v: encode(st.name, st.objOf.get(k), storedShared, metaPuts), h: st.hashOf.get(k) });
            }
            const dels = [...st.dels];
            st.dels.clear();
            const order = st.orderDirty ? [...st.order] : null;
            st.orderDirty = false;
            return { st, change: { puts, dels, order, meta: [...metaPuts] } };
        }
        return null;
    }

    function startWriter() {
        if (writing) return writing;
        writing = (async () => {
            let batch;
            while ((batch = nextBatch())) {
                const { st, change } = batch;
                try {
                    await backend.write(st.name, change);
                    for (const [key] of change.meta || []) storedShared.add(key.slice('shared:'.length));
                    failures = 0;
                } catch (e) {
                    // Put the work back and stop; the next save retries. Report it once per run.
                    mark(st, change.puts.map((p) => p.k), true);
                    for (const k of change.dels) if (!st.objOf.has(k)) st.dels.add(k);
                    if (change.order) st.orderDirty = true;
                    failures++;
                    onError(e);
                    break;
                }
            }
            writing = null;
            if (!hasWork() || failures) while (idleWaiters.length) idleWaiters.shift()();
        })();
        return writing;
    }

    function verifyList(st, from, until) {
        const hits = [];
        for (let i = from; i < until; i++) {
            const k = st.order[i];
            const h = hashData(st.list[i]);
            if (h !== st.hashOf.get(k)) { st.hashOf.set(k, h); st.objOf.set(k, st.list[i]); hits.push(k); }
        }
        return hits;
    }

    return {
        /** Load every list into memory. */
        async load() {
            for (const [ref, rates] of (await backend.loadShared?.()) || []) {
                shared.set(ref, rates); storedShared.add(ref); sharedRefs.set(rates, ref);
            }
            for (const name of BIG_LISTS) {
                const st = coll(name);
                const { order, entries } = await backend.load(name);
                const byKey = new Map(entries.map((e) => [e.k, e]));
                const keys = [];
                const used = new Set();
                for (const k of order || []) if (byKey.has(k) && !used.has(k)) { keys.push(k); used.add(k); }
                for (const e of entries) if (!used.has(e.k)) { keys.push(e.k); used.add(e.k); } // records missing from the order
                st.list = keys.map((k) => {
                    const e = byKey.get(k);
                    e.v = decode(e.v, shared);
                    if (e.v && typeof e.v === 'object') st.keyOf.set(e.v, k);
                    st.objOf.set(k, e.v);
                    st.hashOf.set(k, e.h || hashData(e.v));
                    const n = /^~(\d+)$/.exec(k);
                    if (n) seq = Math.max(seq, Number(n[1]));
                    return e.v;
                });
                st.order = keys;
            }
        },

        get(name) { return coll(name).list; },

        /**
         * Make `list` the saved list and write what changed.
         * @param {Iterable<string|number>} [changed] ids of records edited in place. Pass [] when
         *   the caller only added, removed or replaced records (skips the background check).
         */
        set(name, list, changed) {
            const st = coll(name);
            const hinted = changed ? new Set([...changed].map(String)) : null;
            const seen = new Set();
            const order = new Array(list.length);
            const puts = [];
            let skippedSame = false;
            for (let i = 0; i < list.length; i++) {
                const obj = list[i];
                const k = keyFor(st, obj, seen);
                seen.add(k);
                order[i] = k;
                const same = st.objOf.get(k) === obj;
                if (same && !(hinted && hinted.has(k))) { skippedSame = true; continue; }
                const h = hashData(obj);
                st.objOf.set(k, obj);
                if (h === st.hashOf.get(k)) continue; // replaced by an identical copy
                st.hashOf.set(k, h);
                puts.push(k);
            }
            const dels = [];
            for (const k of st.objOf.keys()) if (!seen.has(k)) dels.push(k);
            for (const k of dels) { st.objOf.delete(k); st.hashOf.delete(k); st.urgent.delete(k); st.bulk.delete(k); st.dels.add(k); }
            const orderChanged = order.length !== st.order.length || order.some((k, i) => k !== st.order[i]);
            st.list = list;
            st.order = order;
            if (orderChanged) st.orderDirty = true;
            mark(st, puts, puts.length <= URGENT_MAX);
            // Records kept by identity may have been edited in place without a hint: check them later.
            if (!hinted && skippedSame) { st.unverified = true; this.scheduleVerify(); }
            if (puts.length || dels.length || orderChanged) startWriter();
            return { puts: puts.length, dels: dels.length, orderChanged };
        },

        /** Saved hash of a record (the same one cloud sync uses), computing it if needed. */
        hashOf(name, obj) {
            const st = coll(name);
            const k = st.keyOf.get(obj);
            if (k !== undefined && st.objOf.get(k) === obj && !st.unverified) return st.hashOf.get(k);
            return hashData(obj);
        },

        /** True when a save without hints may have left in-place edits unchecked. */
        needsVerify(name) { return name ? coll(name).unverified : BIG_LISTS.some((n) => coll(n).unverified); },

        /** Re-hash every record now and save any that changed in place. */
        verifyNow(name) {
            let found = 0;
            for (const n of name ? [name] : BIG_LISTS) {
                const st = coll(n);
                if (!st.unverified) continue;
                const hits = verifyList(st, 0, st.list.length);
                st.unverified = false;
                found += hits.length;
                mark(st, hits, true);
            }
            if (found) startWriter();
            return found;
        },

        /** Background version of verifyNow: a slice at a time so the screen never freezes. */
        scheduleVerify(delay = 1500) {
            clearTimeout(verifyTimer);
            verifyTimer = setTimeout(() => {
                for (const n of BIG_LISTS) {
                    const st = coll(n);
                    if (!st.unverified) continue;
                    const list = st.list;
                    let i = 0;
                    const step = (deadline) => {
                        if (st.list !== list) { if (st.unverified) this.scheduleVerify(delay); return; } // list replaced: start over later
                        if (!st.unverified) return; // verifyNow ran meanwhile
                        const until = performance.now() + Math.min(12, deadline?.timeRemaining?.() || 12);
                        let end = i;
                        while (end < list.length && performance.now() < until) {
                            const hits = verifyList(st, end, Math.min(list.length, end + 25));
                            if (hits.length) { mark(st, hits, true); startWriter(); }
                            end = Math.min(list.length, end + 25);
                        }
                        i = end;
                        if (i < list.length) { schedule(step); return; }
                        st.unverified = false;
                    };
                    schedule(step);
                }
            }, delay);
        },

        /** Resolves when every change so far has reached the disk (or a write failed). */
        flush() {
            if (!hasWork() && !writing) return Promise.resolve();
            return new Promise((res) => { idleWaiters.push(res); startWriter(); });
        },

        /** Changes not yet on disk (for tests and the "saving…" state). */
        pending() { let n = 0; for (const st of colls.values()) n += st.urgent.size + st.bulk.size + st.dels.size + (st.orderDirty ? 1 : 0); return n; },

        stats(name) { const st = coll(name); return { records: st.list.length, keys: st.objOf.size }; }
    };
}

function defaultSchedule(fn) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 500 });
    else setTimeout(() => fn(null), 0);
}

/** Memory backend (tests). */
export function memoryBackend() {
    const data = new Map();
    const db = (name) => { if (!data.has(name)) data.set(name, { order: null, records: new Map() }); return data.get(name); };
    return {
        writes: [],
        async open() { return true; },
        async load(name) { const d = db(name); return { order: d.order, entries: [...d.records].map(([k, e]) => ({ k, ...structuredClone(e) })) }; },
        async loadShared() { return [...(data.get('~shared') || new Map())].map(([k, v]) => [k, structuredClone(v)]); },
        async write(name, { puts, dels, order, meta = [] }) {
            this.writes.push({ name, puts: puts.length, dels: dels.length, order: !!order });
            if (meta.length) { if (!data.has('~shared')) data.set('~shared', new Map()); for (const [k, v] of meta) data.get('~shared').set(k.slice(7), structuredClone(v)); }
            const d = db(name);
            for (const p of puts) d.records.set(p.k, structuredClone({ v: p.v, h: p.h }));
            for (const k of dels) d.records.delete(k);
            if (order) d.order = [...order];
        },
        dump(name) { const d = db(name); return { order: d.order, records: d.records }; },
        async getMeta(key) { return data.get('~meta')?.get(key); },
        async putMeta(key, value) { if (!data.has('~meta')) data.set('~meta', new Map()); data.get('~meta').set(key, value); },
        async deleteMeta(key) { data.get('~meta')?.delete(key); }
    };
}

/** IndexedDB backend: one object store per list (key → { v, h }) and a 'meta' store for the order. */
export function idbBackend(dbName = 'drillrig-data') {
    let db = null;
    const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    return {
        async open() {
            if (typeof indexedDB === 'undefined') return false;
            db = await new Promise((res, rej) => {
                // Version 2 (2026-11-22) adds the 'workers' and 'tools' stores. Raise it whenever a
                // list is added to BIG_LISTS: an existing database only gets new stores on upgrade.
                const r = indexedDB.open(dbName, IDB_VERSION);
                r.onupgradeneeded = () => {
                    for (const n of BIG_LISTS) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
                    if (!r.result.objectStoreNames.contains('meta')) r.result.createObjectStore('meta');
                };
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
                // Another tab still has the old version open: it closes on 'versionchange' and the
                // upgrade then goes on. Never give up here (that would fall back to an empty localStorage).
                r.onblocked = () => console.warn('[storage] waiting for another DrillRig tab to close the old database');
            });
            db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } };
            return true;
        },
        async load(name) {
            if (!db.objectStoreNames.contains(name)) return { order: null, entries: [] };
            const tx = db.transaction([name, 'meta'], 'readonly');
            const [keys, values, order] = await Promise.all([
                req(tx.objectStore(name).getAllKeys()), req(tx.objectStore(name).getAll()), req(tx.objectStore('meta').get(`order:${name}`))
            ]);
            return { order: order || null, entries: keys.map((k, i) => ({ k, v: values[i]?.v, h: values[i]?.h })) };
        },
        async loadShared() {
            const tx = db.transaction('meta', 'readonly');
            const range = IDBKeyRange.bound('shared:', 'shared:\uffff');
            const [keys, values] = await Promise.all([req(tx.objectStore('meta').getAllKeys(range)), req(tx.objectStore('meta').getAll(range))]);
            return keys.map((k, i) => [String(k).slice(7), values[i]]);
        },
        write(name, { puts, dels, order, meta = [] }) {
            return new Promise((res, rej) => {
                const tx = db.transaction([name, 'meta'], 'readwrite');
                const st = tx.objectStore(name);
                for (const [k, v] of meta) tx.objectStore('meta').put(v, k);
                for (const p of puts) st.put({ v: p.v, h: p.h }, p.k);
                for (const k of dels) st.delete(k);
                if (order) tx.objectStore('meta').put(order, `order:${name}`);
                tx.oncomplete = () => res();
                tx.onerror = () => rej(tx.error);
                tx.onabort = () => rej(tx.error || new Error('IndexedDB write aborted'));
            });
        },
        async getMeta(key) { return req(db.transaction('meta', 'readonly').objectStore('meta').get(key)); },
        putMeta(key, value) { return metaTx((st) => st.put(value, key)); },
        deleteMeta(key) { return metaTx((st) => st.delete(key)); }
    };
    function metaTx(fn) {
        return new Promise((res, rej) => {
            const tx = db.transaction('meta', 'readwrite');
            fn(tx.objectStore('meta'));
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('aborted'));
        });
    }
}
