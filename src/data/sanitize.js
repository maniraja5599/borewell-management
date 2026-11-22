// Cleans data that did NOT come from this phone's own keyboard: a restored backup file,
// or records downloaded from the cloud (written by other staff of the company).
//
// The screens build HTML from saved data. Most text is escaped, but ids and numbers are
// put into attributes and markup as they are, so a crafted record could inject HTML and
// run script on the owner's phone. This makes that impossible at the door:
//   - every `id` (and `…Id`) string keeps only safe characters,
//   - every other string has < and > swapped for look-alike characters (‹ ›),
//     so text still reads the same but can never become a tag.

const ID_UNSAFE = /[^A-Za-z0-9_.:@-]/g;
const SAFE_ID = /^[A-Za-z0-9_.:@-]{1,120}$/;
const MAX_DEPTH = 12;

export function isSafeId(id) {
    if (typeof id === 'number') return Number.isFinite(id);
    return typeof id === 'string' && SAFE_ID.test(id);
}

const isIdKey = (key) => key === 'id' || /Id$/.test(key);

/** Deep copy with ids cleaned and angle brackets neutralised. */
export function neutralize(value, key = '', depth = 0) {
    if (depth > MAX_DEPTH) return null;
    if (typeof value === 'string') {
        if (isIdKey(key)) return value.replace(ID_UNSAFE, '').slice(0, 120);
        return value.includes('<') || value.includes('>')
            ? value.replace(/</g, '‹').replace(/>/g, '›')
            : value;
    }
    if (Array.isArray(value)) return value.map((v) => neutralize(v, '', depth + 1));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            out[k] = neutralize(v, k, depth + 1);
        }
        return out;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) return 0;
    return value;
}

/**
 * Clean one customer / bill. Returns null when it is not usable
 * (not an object, or its id is missing/unsafe — that id is used in HTML attributes).
 */
export function sanitizeEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    if (!isSafeId(entry.id)) return null;
    const clean = neutralize(entry);
    if (entry.snapshot !== undefined && (!clean.snapshot || typeof clean.snapshot !== 'object' || Array.isArray(clean.snapshot))) {
        clean.snapshot = {};
    }
    if (clean.payments !== undefined && !Array.isArray(clean.payments)) clean.payments = [];
    return clean;
}

/**
 * Clean a list of customers or bills from a backup file.
 * Old backups can hold customers without an id: those get a fresh id instead of being
 * dropped, and an unsafe id is cleaned. Non-objects are dropped.
 */
export function sanitizeList(list, idPrefix = 'item') {
    if (!Array.isArray(list)) return [];
    const out = [];
    list.forEach((item, i) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return;
        let fixed = item;
        if (item.id === undefined || item.id === null || item.id === '') {
            fixed = { ...item, id: `${idPrefix}_${Date.now()}_${i}` };
        } else if (!isSafeId(item.id)) {
            const cleaned = String(item.id).replace(ID_UNSAFE, '').slice(0, 120);
            fixed = { ...item, id: cleaned || `${idPrefix}_${Date.now()}_${i}` };
        }
        const clean = sanitizeEntry(fixed);
        if (clean) out.push(clean);
    });
    return out;
}

/** Clean one downloaded sync record's data. Returns null to drop the record. */
export function sanitizeRecordData(kind, data) {
    if (kind === 'customer' || kind === 'bill' || kind === 'stock' || kind === 'worker' || kind === 'tool') return sanitizeEntry(data);
    if (kind === 'setting') {
        if (data === null || typeof data !== 'object') return null;
        return neutralize(data);
    }
    return null;
}
