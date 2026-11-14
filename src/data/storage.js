// Single place where the app reads/writes saved data.
//
// Small things (company profile, rates, settings, preferences) stay in localStorage.
// The big lists (bills, customers, stock) live in IndexedDB through bigStore.js: kept in memory,
// loaded once at start (initStorage), and saved one changed record at a time. localStorage held
// only ~1,500 bills; IndexedDB holds 50,000+ comfortably. Where IndexedDB is unavailable
// (some private modes), everything falls back to localStorage exactly as before.
import { createBigStore, idbBackend } from './bigStore.js';

export const STORAGE_KEYS = Object.freeze({
    // Business data (will move to the cloud, per company)
    customers: 'borebill_customers',
    history: 'borebill_history',            // saved bills & quotations, with payments
    stock: 'borebill_stock',                // casing pipe stock movements (opening / purchase / adjustment)
    rateProfiles: 'borebill_rate_profiles',
    rates: 'borebill_rates',
    brand: 'borebill_brand',                // company profile, bill counters, terms
    savedExtras: 'borebill_saved_extras',
    savedNotes: 'borebill_saved_notes',
    waFormat: 'borebill_wa_format',

    // Per-device preferences (stay on the phone)
    lastSession: 'borebill_last_session',   // the bill currently being typed
    lang: 'borebill_lang',
    defaultCountryCode: 'borebill_default_country_code',
    scrollY: 'borebill_scroll_y',
    v52FooterMigrated: 'borebill_v52_footer_migrated'
});

/** localStorage key → big list name. */
const BIG = {
    [STORAGE_KEYS.history]: 'history',
    [STORAGE_KEYS.customers]: 'customers',
    [STORAGE_KEYS.stock]: 'stock'
};
export const isBigKey = (key) => Object.prototype.hasOwnProperty.call(BIG, key);

/**
 * Documents that grow with the data, kept in IndexedDB too (as text, cached in memory).
 * Cloud sync remembers a hash per bill: 2.6 million characters at 50,000 bills, half of what
 * localStorage holds. Losing it would make every app open re-upload every bill.
 */
const DOCS = new Set(['drillrig_sync_v1']);
const docCache = new Map();
let docBackend = null;
let docWrites = Promise.resolve();
const docPending = new Set();
function writeDoc(key) {
    if (docPending.has(key)) return; // the queued write takes the latest value
    docPending.add(key);
    docWrites = docWrites.then(async () => {
        docPending.delete(key);
        const v = docCache.get(key);
        if (v === undefined || v === null) await docBackend.deleteMeta(`doc:${key}`);
        else await docBackend.putMeta(`doc:${key}`, v);
    }).catch((e) => errorHandler(e));
}

function safeLocalStorage() {
    try {
        return window.localStorage;
    } catch (_) {
        return null; // private mode / blocked storage
    }
}

let big = null;          // bigStore when IndexedDB is in use
let initPromise = null;
let errorHandler = (e) => console.error('Save failed:', e);

/** Show save failures to the user (the app sets a toast here). */
export function setStorageErrorHandler(fn) { errorHandler = fn; }

/** Which storage holds the big lists: 'indexeddb' or 'localstorage'. */
export function storageMode() { return big ? 'indexeddb' : 'localstorage'; }

/**
 * Open IndexedDB, load the big lists, and move any lists still in localStorage into it.
 * Call once before the app starts; safe to call again.
 */
export function initStorage(options = {}) {
    if (!initPromise) initPromise = openBigStore(options).catch((e) => { console.warn('IndexedDB unavailable, using localStorage:', e); big = null; return storageMode(); });
    return initPromise;
}

async function openBigStore({ backend = idbBackend() } = {}) {
    if (!(await backend.open())) return storageMode();
    let failed = null;
    const store = createBigStore(backend, { onError: (e) => { failed = e; errorHandler(e); } });
    await store.load();

    // One-time move from localStorage. The localStorage copy is removed only after the
    // records are confirmed on disk, so a failed move loses nothing.
    const ls = safeLocalStorage();
    for (const [key, name] of Object.entries(BIG)) {
        const raw = ls?.getItem(key);
        if (raw === null || raw === undefined) continue;
        let list;
        try { list = JSON.parse(raw); } catch { continue; }
        if (!Array.isArray(list)) { ls.removeItem(key); continue; }
        const merged = mergeLists(store.get(name), list);
        if (merged !== store.get(name)) store.set(name, merged);
        await store.flush();
        if (failed) throw failed;
        const check = await backend.load(name);
        if (check.entries.length < merged.length) throw new Error(`Move to IndexedDB incomplete for ${name}`);
        ls.removeItem(key);
    }
    // Small documents that grow with the data (sync state): load, and move from localStorage.
    for (const key of DOCS) {
        let v = await backend.getMeta(`doc:${key}`);
        const old = ls?.getItem(key);
        if (old !== null && old !== undefined) {
            if (v === undefined || v === null) { await backend.putMeta(`doc:${key}`, old); v = old; }
            ls.removeItem(key);
        }
        if (v !== undefined && v !== null) docCache.set(key, v);
    }
    docBackend = backend;
    big = store;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Last chance to catch in-place edits before the page goes away.
        window.addEventListener('pagehide', () => { try { store.verifyNow(); } catch { /* ignore */ } });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { store.verifyNow(); } catch { /* ignore */ } } });
    }
    return storageMode();
}

/**
 * Lists found in both places (IndexedDB from an earlier move, localStorage written again by an
 * older version): keep everything, the IndexedDB copy winning unless the other is newer.
 */
function mergeLists(current, incoming) {
    if (!current.length) return incoming;
    if (!incoming.length) return current;
    const idOf = (x) => (x && x.id !== undefined && x.id !== null && x.id !== '' ? String(x.id) : null);
    const at = new Map();
    current.forEach((x, i) => { const id = idOf(x); if (id !== null && !at.has(id)) at.set(id, i); });
    const out = [...current];
    const fresh = [];
    const stamp = (x) => Date.parse(x?.updatedAt || x?.createdAt || '') || 0;
    for (const x of incoming) {
        const id = idOf(x);
        if (id === null || !at.has(id)) { fresh.push(x); continue; }
        const i = at.get(id);
        if (stamp(x) > stamp(out[i])) out[i] = x;
    }
    return fresh.length ? [...fresh, ...out] : out;
}

export const storage = {
    getRaw(key) {
        if (big && isBigKey(key)) return JSON.stringify(big.get(BIG[key]));
        if (big && DOCS.has(key)) return docCache.has(key) ? docCache.get(key) : null;
        const ls = safeLocalStorage();
        return ls ? ls.getItem(key) : null;
    },

    // Throws when storage is full so callers can warn the user that data was NOT saved.
    setRaw(key, value) {
        if (big && isBigKey(key)) {
            const list = JSON.parse(value);
            big.set(BIG[key], Array.isArray(list) ? list : []);
            return;
        }
        if (big && DOCS.has(key)) { docCache.set(key, String(value)); writeDoc(key); return; }
        const ls = safeLocalStorage();
        if (!ls) throw new Error('Storage unavailable');
        ls.setItem(key, value);
    },

    remove(key) {
        if (big && isBigKey(key)) { big.set(BIG[key], []); return; }
        if (big && DOCS.has(key)) { docCache.delete(key); writeDoc(key); return; }
        const ls = safeLocalStorage();
        if (ls) ls.removeItem(key);
    },

    /** A big list. With IndexedDB this is the live in-memory array (no copy). */
    getList(key) {
        if (big && isBigKey(key)) return big.get(BIG[key]);
        try {
            const v = JSON.parse(this.getRaw(key) || '[]');
            return Array.isArray(v) ? v : [];
        } catch { return []; }
    },

    /**
     * Save a big list. `changed`: ids of records edited in place (a pushed payment, a renamed
     * customer). Added, removed and replaced records are found automatically.
     */
    setList(key, list, changed) {
        if (big && isBigKey(key)) { big.set(BIG[key], list, changed); return; }
        this.setRaw(key, JSON.stringify(list));
    },

    /** The saved hash of a record in a big list (cloud sync reuses it instead of re-hashing). */
    hashOf(key, obj, fallback) {
        if (big && isBigKey(key)) return big.hashOf(BIG[key], obj);
        return fallback(obj);
    },

    /** Check every record for in-place edits now (before cloud sync compares hashes). */
    verifyNow() { return big ? big.verifyNow() : 0; },

    /** Resolves when all saves so far are on disk. */
    flush() { return big ? Promise.all([big.flush(), docWrites]).then(() => {}) : Promise.resolve(); },

    /** Changes not yet on disk. */
    pending() { return big ? big.pending() + docPending.size : 0; }
};
