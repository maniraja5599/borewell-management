// Lists that started out on one phone only (a plain localStorage key) and are now synced big
// lists (migration 0018: vehicles, breakdowns, inventory). The first read moves the old copy
// into the synced list — records already there (same id) are kept — and removes the old key,
// so nothing typed before the update is lost and the next sync uploads it.
import { storage } from './storage.js';

const moved = new Set();

/** The synced list `key`, after moving anything still under `oldKey` into it (once). */
export function readMovedList(key, oldKey, convert = (x) => x) {
    const list = storage.getList(key);
    if (moved.has(oldKey)) return list;
    let raw = null;
    try { raw = window.localStorage?.getItem(oldKey) ?? null; } catch { raw = null; }
    if (raw === null) { moved.add(oldKey); return list; }
    let old = [];
    try { old = convert(JSON.parse(raw)); } catch { old = []; }
    const have = new Set(list.filter((x) => x && x.id !== undefined).map((x) => String(x.id)));
    const fresh = (Array.isArray(old) ? old : []).filter((x) => x && x.id !== undefined && x.id !== null && x.id !== '' && !have.has(String(x.id)));
    try {
        if (fresh.length) storage.setList(key, [...fresh, ...list]);
        window.localStorage.removeItem(oldKey); // only after the new list took it
        moved.add(oldKey);
    } catch (e) {
        console.warn('[storage] could not move', oldKey, e);
        return list;
    }
    return storage.getList(key);
}

/** Save a synced list through the app (that also schedules the cloud sync). */
export function saveList(app, key, list) {
    if (app?.saveToStorage) return app.saveToStorage(key, list);
    try { storage.setList(key, list); return true; } catch { return false; }
}
