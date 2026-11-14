// Pure sync logic (no network, no DOM) so it can be unit-tested.
//
// Every synced thing is a "record": { kind, id, data }.
//   kind 'customer' → one entry of the customers list (by its id)
//   kind 'bill'     → one entry of the bill book, payments included (by its id)
//   kind 'setting'  → a whole settings document (id = brand, rates, rateProfiles, …)
//
// `hashes` remembers what each record looked like at the last successful sync.
// A record whose current hash differs from that is a local change that still has to be uploaded.

export const SETTING_IDS = ['brand', 'rates', 'rateProfiles', 'savedExtras', 'savedNotes', 'waFormat'];

/** Fast 53-bit string hash (cyrb53). Plenty for change detection. */
export function hashString(str) {
    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c6ce57 ^ 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + str.length;
}

/** JSON with object keys sorted, so field order never matters when comparing. */
export function stableStringify(value) {
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort().filter((k) => value[k] !== undefined)
            .map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
}

export const recordKey = (kind, id) => `${kind}:${id}`;
export const hashData = (data) => hashString(stableStringify(data));

/**
 * Index the phone's data. local = { customers: [], history: [], settings: { brand: {...}, ... } }
 * Returns Map key → { kind, id, data, hash }. Entries without an id are skipped (callers assign ids first).
 */
export function indexLocal(local, hashFor = (kind, data) => hashData(data)) {
    const index = new Map();
    const addList = (list, kind) => {
        for (const item of Array.isArray(list) ? list : []) {
            if (!item || item.id === undefined || item.id === null || item.id === '') continue;
            const id = String(item.id);
            const key = recordKey(kind, id);
            if (index.has(key)) continue; // keep the first (newest) copy of a duplicated id
            index.set(key, { kind, id, data: item, hash: hashFor(kind, item) });
        }
    };
    addList(local.customers, 'customer');
    addList(local.history, 'bill');
    addList(local.stock, 'stock');
    for (const id of SETTING_IDS) {
        const data = local.settings?.[id];
        if (data === undefined || data === null) continue;
        index.set(recordKey('setting', id), { kind: 'setting', id, data, hash: hashData(data) });
    }
    return index;
}

/**
 * Rows to upload: everything changed or deleted since the last sync.
 * Settings that are still the app's defaults are never uploaded — a phone that was
 * never set up must not be able to overwrite a company's real settings.
 */
export function planPush(index, hashes, defaults = null) {
    const rows = [];
    for (const [key, rec] of index) {
        if (hashes[key] === rec.hash) continue;
        if (rec.kind === 'setting' && defaults && isDefaultSetting(rec.id, rec.data, defaults)) continue;
        rows.push({ kind: rec.kind, id: rec.id, data: rec.data, deleted: false, key, hash: rec.hash });
    }
    for (const key of Object.keys(hashes)) {
        if (index.has(key) || hashes[key] === null || key.startsWith('setting:')) continue;
        const sep = key.indexOf(':');
        rows.push({ kind: key.slice(0, sep), id: key.slice(sep + 1), data: {}, deleted: true, key, hash: null });
    }
    return rows;
}

/**
 * Decide what to do with downloaded rows.
 * - same as the phone already has     → just remember it as synced
 * - phone changed it since last sync  → keep the phone's version (it will be uploaded next)
 * - otherwise                          → take the cloud version
 * With `firstSync` the cloud always wins for anything it has (a new phone must not
 * push its default settings over the company's real ones).
 * Returns { apply: [{ kind, id, data, deleted, key, hash }], keepLocal: n, synced: { key: hash }, conflicts: [key] }
 * `conflicts` = records changed on BOTH this phone and another phone since the last sync.
 */
export function planPull(rows, index, hashes, { firstSync = false, defaults = null, cloudWinsSettings = false } = {}) {
    const apply = [];
    const synced = {};
    let keepLocal = 0;
    const conflicts = [];
    for (const row of rows) {
        const key = recordKey(row.kind, row.id);
        const remoteHash = row.deleted ? null : hashData(row.data);
        const localHash = index.get(key)?.hash ?? null;
        if (remoteHash === localHash) {
            synced[key] = remoteHash;
            continue;
        }
        const knownHash = Object.prototype.hasOwnProperty.call(hashes, key) ? hashes[key] : null;
        let changedHere = localHash !== knownHash;
        if (changedHere && row.kind === 'setting' && defaults && !row.deleted
            && isDefaultSetting(row.id, index.get(key)?.data, defaults)
            && !isDefaultSetting(row.id, row.data, defaults)) {
            changedHere = false; // the phone only has defaults: the company's real settings win
        }
        // Staff phones cannot upload settings, so the owner's settings always win there.
        if (cloudWinsSettings && row.kind === 'setting') changedHere = false;
        if (changedHere && !firstSync) {
            keepLocal++;
            // Both sides changed since the last sync: the phone's copy wins (it is uploaded next),
            // so tell the user instead of silently dropping the other phone's edit.
            if (remoteHash !== knownHash && row.kind !== 'setting') conflicts.push(key);
            continue;
        }
        apply.push({ kind: row.kind, id: row.id, data: row.data, deleted: !!row.deleted, key, hash: remoteHash });
        synced[key] = remoteHash;
    }
    return { apply, keepLocal, synced, conflicts };
}

/**
 * Is this settings document still the app's untouched default?
 * Used on a phone's first sync: a default left in the cloud by another (empty) phone
 * must never overwrite real settings on this phone.
 */
export function isDefaultSetting(id, data, defaults = {}) {
    if (data === undefined || data === null) return true;
    if (id === 'brand') {
        const def = defaults.brand || {};
        const name = String(data.companyName || '').trim();
        return (!name || name === def.companyName) && !String(data.phones || '').trim()
            && !String(data.address || '').trim() && !data.logoDataUrl;
    }
    if (id === 'savedExtras' || id === 'savedNotes') return Array.isArray(data) && data.length === 0;
    if (defaults[id] !== undefined) return stableStringify(data) === stableStringify(defaults[id]);
    return false;
}

/** On first sync, drop cloud settings that are untouched defaults when this phone has real ones. */
export function dropDefaultCloudSettings(rows, local, defaults = {}) {
    return rows.filter((row) => {
        if (row.kind !== 'setting' || row.deleted) return true;
        const mine = local.settings?.[row.id];
        return !(isDefaultSetting(row.id, row.data, defaults) && !isDefaultSetting(row.id, mine, defaults));
    });
}

/** Apply planned cloud rows to plain copies of the phone's lists/settings. Returns which parts changed. */
export function applyToLocal(local, applyRows) {
    const out = {
        customers: [...(local.customers || [])],
        history: [...(local.history || [])],
        stock: [...(local.stock || [])],
        settings: { ...(local.settings || {}) }
    };
    const changed = new Set();
    const LIST = { customer: 'customers', bill: 'history', stock: 'stock' };
    const rowsFor = { customers: [], history: [], stock: [] };
    for (const row of applyRows) {
        if (LIST[row.kind]) { rowsFor[LIST[row.kind]].push(row); changed.add(LIST[row.kind]); }
        else if (row.kind === 'setting' && SETTING_IDS.includes(row.id)) {
            if (row.deleted) delete out.settings[row.id];
            else out.settings[row.id] = row.data;
            changed.add(row.id);
        }
    }
    for (const name of ['customers', 'history', 'stock']) out[name] = upsertAll(out[name], rowsFor[name]);
    if (changed.has('history')) {
        // Newest bill first, the way the bill book always shows it.
        const t = (h) => Date.parse(h?.createdAt || '') || Number(h?.id) || 0;
        out.history.sort((a, b) => t(b) - t(a));
    }
    return { local: out, changed };
}

/**
 * Apply cloud rows to a list in one pass (a lookup table instead of searching the list per row,
 * which took minutes for a first sync of 50,000 bills). Same result as applying the rows one by
 * one: replace in place, remove deleted, new ones in front (latest row first).
 */
function upsertAll(list, rows) {
    if (!rows.length) return list;
    const pos = new Map();
    list.forEach((x, i) => {
        if (x && x.id !== undefined && x.id !== null && x.id !== '' && !pos.has(String(x.id))) pos.set(String(x.id), i);
    });
    const out = list;
    const removed = new Set();
    const added = new Map(); // id → data, in the order first added
    for (const row of rows) {
        if (pos.has(row.id)) {
            const i = pos.get(row.id);
            if (row.deleted) { removed.add(i); pos.delete(row.id); } else out[i] = row.data;
        } else if (added.has(row.id)) {
            if (row.deleted) added.delete(row.id); else added.set(row.id, row.data);
        } else if (!row.deleted) {
            added.set(row.id, row.data);
        }
    }
    const kept = removed.size ? out.filter((_, i) => !removed.has(i)) : out;
    return added.size ? [...[...added.values()].reverse(), ...kept] : kept;
}
