import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBigStore, memoryBackend } from '../src/data/bigStore.js';
import { hashData, applyToLocal } from '../src/cloud/syncPlan.js';

const runNow = (fn) => { let more = true; const d = { timeRemaining: () => 50 }; const q = [fn]; while (q.length && more) { const f = q.shift(); f(d); } };
const bill = (id, extra = {}) => ({ id, billNo: `SM-${id}`, snapshot: { grandTotal: 1000 }, payments: [], ...extra });

async function reopen(backend) {
    const s = createBigStore(backend, { schedule: (fn) => setTimeout(() => fn({ timeRemaining: () => 50 }), 0) });
    await s.load();
    return s;
}

describe('big lists in IndexedDB: only what changed is written', () => {
    let backend;
    let store;
    beforeEach(async () => { backend = memoryBackend(); store = await reopen(backend); });

    it('saves and reloads the list in the same order', async () => {
        store.set('history', [bill('3'), bill('2'), bill('1')]);
        await store.flush();
        const again = await reopen(backend);
        expect(again.get('history').map((b) => b.id)).toEqual(['3', '2', '1']);
    });

    it('a new bill writes one record (plus the order), not the whole list', async () => {
        const list = [];
        for (let i = 0; i < 500; i++) list.push(bill(String(i)));
        store.set('history', list);
        await store.flush();
        backend.writes.length = 0;
        list.unshift(bill('new'));
        const r = store.set('history', list);
        await store.flush();
        expect(r).toEqual({ puts: 1, dels: 0, orderChanged: true });
        expect(backend.writes).toEqual([{ name: 'history', puts: 1, dels: 0, order: true }]);
    });

    it('a bill replaced by a new object is written; an identical copy is not', async () => {
        const list = [bill('1'), bill('2')];
        store.set('history', list);
        await store.flush();
        list[1] = { ...list[1], custName: 'Ravi' };
        expect(store.set('history', list).puts).toBe(1);
        list[0] = JSON.parse(JSON.stringify(list[0]));
        expect(store.set('history', list).puts).toBe(0);
    });

    it('a deleted bill is removed from disk', async () => {
        store.set('history', [bill('1'), bill('2')]);
        store.set('history', [bill('1')].map(() => store.get('history')[0]));
        await store.flush();
        const again = await reopen(backend);
        expect(again.get('history').map((b) => b.id)).toEqual(['1']);
    });

    it('an in-place edit named by id is written straight away', async () => {
        const list = [bill('1'), bill('2')];
        store.set('history', list);
        await store.flush();
        list[1].payments.push({ amount: 500, mode: 'UPI' });
        expect(store.set('history', list, ['2']).puts).toBe(1);
        await store.flush();
        expect((await reopen(backend)).get('history')[1].payments).toHaveLength(1);
    });

    it('an in-place edit nobody named is still saved by the background check', async () => {
        vi.useFakeTimers();
        try {
            const s = createBigStore(backend, { schedule: (fn) => setTimeout(() => fn({ timeRemaining: () => 50 }), 0) });
            await s.load();
            const list = [bill('1'), bill('2')];
            s.set('history', list, []); // hinted save: nothing pending
            list[0].payments.push({ amount: 1, mode: 'Cash' });
            s.set('history', list); // no hint: identity unchanged, so nothing written yet
            expect(s.needsVerify('history')).toBe(true);
            await vi.runAllTimersAsync();
            await s.flush();
            expect(s.needsVerify('history')).toBe(false);
        } finally { vi.useRealTimers(); }
        expect((await reopen(backend)).get('history')[0].payments).toHaveLength(1);
    });

    it('verifyNow catches unnamed in-place edits at once (used before cloud sync)', async () => {
        const list = [bill('1')];
        store.set('history', list);
        list[0].custName = 'Changed';
        store.set('history', list);
        expect(store.verifyNow()).toBe(1);
        await store.flush();
        expect((await reopen(backend)).get('history')[0].custName).toBe('Changed');
    });

    it('records without an id, and two records with the same id, are both kept', async () => {
        const list = [{ name: 'No id' }, bill('7', { v: 1 }), bill('7', { v: 2 })];
        store.set('customers', list);
        await store.flush();
        const again = await reopen(backend);
        expect(again.get('customers')).toEqual(list);
    });

    it('the saved hash equals the cloud sync hash, and is reused without re-hashing', async () => {
        const list = [bill('1', { custName: 'A' })];
        store.set('history', list);
        expect(store.hashOf('history', list[0])).toBe(hashData(list[0]));
        await store.flush();
        const again = await reopen(backend);
        expect(again.hashOf('history', again.get('history')[0])).toBe(hashData(list[0]));
    });

    it('records missing from the saved order (e.g. another tab) are still loaded', async () => {
        store.set('history', [bill('1')]);
        await store.flush();
        await backend.write('history', { puts: [{ k: '9', v: bill('9'), h: '' }], dels: [], order: null });
        expect((await reopen(backend)).get('history').map((b) => b.id)).toEqual(['1', '9']);
    });

    it('sync applying cloud rows writes only the rows that changed', async () => {
        const list = [];
        for (let i = 0; i < 300; i++) list.push(bill(String(i)));
        store.set('history', list);
        await store.flush();
        const { local } = applyToLocal({ history: store.get('history') }, [
            { kind: 'bill', id: '5', data: bill('5', { custName: 'From cloud' }) },
            { kind: 'bill', id: '6', deleted: true }
        ]);
        const r = store.set('history', local.history);
        expect(r.puts).toBe(1);
        expect(r.dels).toBe(1);
    });
});

describe('writing to disk: small batches, own saves first, never a stale or deleted record', () => {
    /** Backend whose writes wait until released, to look at the queue. */
    function gatedBackend() {
        const b = memoryBackend();
        const realWrite = b.write.bind(b);
        b.gates = [];
        b.write = (name, change) => new Promise((res, rej) => b.gates.push({ name, change, go: () => realWrite(name, change).then(res, rej) }));
        b.release = async () => { while (b.gates.length) { await b.gates.shift().go(); await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); } };
        return b;
    }

    it('a new bill saved during a 5,000-record background write goes right after the current batch', async () => {
        const backend = gatedBackend();
        const store = createBigStore(backend);
        await store.load();
        const list = Array.from({ length: 5000 }, (_, i) => bill(String(i)));
        store.set('history', list);                 // bulk: written in batches of 400
        await new Promise((r) => setTimeout(r, 0));
        list.unshift(bill('NEW'));
        store.set('history', list, []);             // the user's save
        await backend.gates.shift().go();           // first bulk batch finishes
        await new Promise((r) => setTimeout(r, 0));
        const next = backend.gates[0].change.puts.map((p) => p.k);
        expect(next[0]).toBe('NEW');
        await backend.release();
        await store.flush();
        expect(backend.dump('history').records.size).toBe(5001);
        expect(backend.writes.every((w) => w.puts <= 400)).toBe(true);
    });

    it('a record deleted before its write ran is not written back', async () => {
        const backend = gatedBackend();
        const store = createBigStore(backend);
        await store.load();
        const list = [bill('1'), bill('2')];
        store.set('history', list);
        store.set('history', [list[0]], []);         // bill 2 deleted while the first write waits
        await backend.release();
        await store.flush();
        await backend.release();
        expect([...backend.dump('history').records.keys()]).toEqual(['1']);
    });

    it('a record changed many times before the write is written once, as it is now', async () => {
        const backend = gatedBackend();
        const store = createBigStore(backend);
        await store.load();
        const list = [bill('1')];
        store.set('history', list);
        for (let i = 1; i <= 5; i++) { list[0] = { ...list[0], n: i }; store.set('history', list, []); }
        await backend.release();
        await store.flush();
        await backend.release();
        const saved = backend.dump('history').records.get('1');
        expect(saved.v.n).toBe(5);
        expect(saved.h).toBe(hashData(list[0]));
        expect(backend.writes.reduce((n, w) => n + w.puts, 0)).toBeLessThanOrEqual(2);
    });

    it('a failed write is reported and retried by the next save', async () => {
        const backend = memoryBackend();
        const realWrite = backend.write.bind(backend);
        let fail = true;
        backend.write = async (n, c) => { if (fail) throw new Error('QuotaExceededError'); return realWrite(n, c); };
        const errors = [];
        const store = createBigStore(backend, { onError: (e) => errors.push(e.message) });
        await store.load();
        const list = [bill('1')];
        store.set('history', list);
        await store.flush();
        expect(errors).toEqual(['QuotaExceededError']);
        expect(store.pending()).toBeGreaterThan(0);
        fail = false;
        list.unshift(bill('2'));
        store.set('history', list, []);
        await store.flush();
        expect([...backend.dump('history').records.keys()].sort()).toEqual(['1', '2']);
        expect(store.pending()).toBe(0);
    });
});

describe('moving localStorage data into IndexedDB', () => {
    let ls;
    beforeEach(() => {
        const m = new Map();
        ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
        globalThis.window = { localStorage: ls };
        vi.resetModules();
    });
    afterEach(() => { delete globalThis.window; });

    it('moves bills and customers, then frees localStorage', async () => {
        ls.setItem('borebill_history', JSON.stringify([bill('2'), bill('1')]));
        ls.setItem('borebill_customers', JSON.stringify([{ id: 'c1', name: 'Ravi' }]));
        ls.setItem('borebill_brand', JSON.stringify({ companyName: 'X' }));
        const { initStorage, storage, storageMode } = await import('../src/data/storage.js');
        const backend = memoryBackend();
        expect(await initStorage({ backend })).toBe('indexeddb');
        expect(storageMode()).toBe('indexeddb');
        expect(storage.getList('borebill_history').map((b) => b.id)).toEqual(['2', '1']);
        expect(ls.getItem('borebill_history')).toBeNull();
        expect(ls.getItem('borebill_customers')).toBeNull();
        expect(ls.getItem('borebill_brand')).not.toBeNull(); // small settings stay
        expect(backend.dump('history').records.size).toBe(2);
    });

    it('a failed move keeps localStorage and falls back to it', async () => {
        ls.setItem('borebill_history', JSON.stringify([bill('1')]));
        const { initStorage, storage, storageMode } = await import('../src/data/storage.js');
        const backend = memoryBackend();
        backend.write = async () => { throw new Error('QuotaExceededError'); };
        expect(await initStorage({ backend })).toBe('localstorage');
        expect(storageMode()).toBe('localstorage');
        expect(ls.getItem('borebill_history')).not.toBeNull();
        expect(storage.getList('borebill_history').map((b) => b.id)).toEqual(['1']);
    });

    it('data in both places (older version wrote again): nothing is lost, newer edit wins', async () => {
        const backend = memoryBackend();
        await backend.write('history', { puts: [{ k: '1', v: bill('1', { updatedAt: '2026-01-01' }), h: '' }], dels: [], order: ['1'] });
        ls.setItem('borebill_history', JSON.stringify([bill('2'), bill('1', { updatedAt: '2026-02-01', custName: 'newer' })]));
        const { initStorage, storage } = await import('../src/data/storage.js');
        await initStorage({ backend });
        const list = storage.getList('borebill_history');
        expect(list.map((b) => b.id)).toEqual(['2', '1']);
        expect(list[1].custName).toBe('newer');
    });

    it('without IndexedDB everything stays in localStorage', async () => {
        const { initStorage, storage } = await import('../src/data/storage.js');
        expect(await initStorage({ backend: { open: async () => false } })).toBe('localstorage');
        storage.setList('borebill_history', [bill('1')]);
        expect(JSON.parse(ls.getItem('borebill_history'))[0].id).toBe('1');
    });
});

describe('cloud rows applied in one pass give the same result as one by one', () => {
    // The previous algorithm, kept here as the reference.
    const oneByOne = (list, rows) => {
        const out = [...list];
        for (const row of rows) {
            const i = out.findIndex((x) => x && String(x.id) === row.id);
            if (row.deleted) { if (i !== -1) out.splice(i, 1); } else if (i !== -1) out[i] = row.data; else out.unshift(row.data);
        }
        return out;
    };
    it('random inserts, updates, deletes and re-adds', () => {
        let seed = 7;
        const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
        for (let round = 0; round < 200; round++) {
            const list = Array.from({ length: rnd(20) }, (_, i) => ({ id: String(i * 2), v: 0 }));
            const rows = Array.from({ length: rnd(30) }, () => {
                const id = String(rnd(50));
                return rnd(4) === 0 ? { kind: 'customer', id, deleted: true } : { kind: 'customer', id, data: { id, v: rnd(1000) } };
            });
            const expected = oneByOne(list, rows);
            const { local } = applyToLocal({ customers: list }, rows);
            expect(local.customers).toEqual(expected);
        }
    });
});

describe('rate cards stored once, shared in memory', () => {
    const rates = { baseDrillingRate: 90, slabRates: [{ start: 1, end: 300, rate: 90 }, { start: 301, end: 400, rate: 100 }] };
    const pricedBill = (id, r = rates) => ({ id, snapshot: { grandTotal: 45000, rates: JSON.parse(JSON.stringify(r)) }, payments: [] });

    it('bills come back exactly the same, and bills with the same card share one copy', async () => {
        const backend = memoryBackend();
        const store = createBigStore(backend);
        await store.load();
        const other = { ...rates, baseDrillingRate: 110 };
        const list = [pricedBill('1'), pricedBill('2'), pricedBill('3', other), { id: '4', snapshot: { grandTotal: 1 } }];
        store.set('history', list);
        await store.flush();
        // On disk: no rate card inside bills, two cards stored once each.
        const disk = backend.dump('history').records;
        expect([...disk.values()].some((e) => e.v.snapshot.rates)).toBe(false);
        const again = createBigStore(backend);
        await again.load();
        const got = again.get('history');
        expect(got).toEqual(list);
        expect(got[0].snapshot.rates).toBe(got[1].snapshot.rates);
        expect(got[2].snapshot.rates).not.toBe(got[0].snapshot.rates);
        expect(again.hashOf('history', got[2])).toBe(hashData(list[2]));
    });

    it('a new bill with a new card stores that card too', async () => {
        const backend = memoryBackend();
        const store = createBigStore(backend);
        await store.load();
        const list = [pricedBill('1')];
        store.set('history', list);
        await store.flush();
        list.unshift(pricedBill('2', { ...rates, baseDrillingRate: 120 }));
        store.set('history', list, []);
        await store.flush();
        const again = createBigStore(backend);
        await again.load();
        expect(again.get('history')[0].snapshot.rates.baseDrillingRate).toBe(120);
        expect(again.get('history')[1].snapshot.rates.baseDrillingRate).toBe(90);
    });
});

describe('sync state kept in IndexedDB (it grows with the bills)', () => {
    let ls;
    beforeEach(() => {
        const m = new Map();
        ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
        globalThis.window = { localStorage: ls };
        vi.resetModules();
    });
    afterEach(() => { delete globalThis.window; });

    it('moves from localStorage, reads and writes through the same calls, survives a restart', async () => {
        ls.setItem('drillrig_sync_v1', JSON.stringify({ lastRev: 7, hashes: { 'bill:1': 'abc' } }));
        const backend = memoryBackend();
        let mod = await import('../src/data/storage.js');
        await mod.initStorage({ backend });
        expect(ls.getItem('drillrig_sync_v1')).toBeNull();
        expect(JSON.parse(mod.storage.getRaw('drillrig_sync_v1')).lastRev).toBe(7);
        mod.storage.setRaw('drillrig_sync_v1', JSON.stringify({ lastRev: 9 }));
        await mod.storage.flush();
        vi.resetModules();
        mod = await import('../src/data/storage.js');
        await mod.initStorage({ backend });
        expect(JSON.parse(mod.storage.getRaw('drillrig_sync_v1')).lastRev).toBe(9);
        mod.storage.remove('drillrig_sync_v1');
        await mod.storage.flush();
        expect(mod.storage.getRaw('drillrig_sync_v1')).toBeNull();
        expect(await backend.getMeta('doc:drillrig_sync_v1')).toBeUndefined();
    });
});
