// Casing pipe stock, worked out — never stored.
// Stock = (opening + purchases + adjustments) − pipe feet on FINAL bills of that rig,
// counting only bills dated on/after the rig's first stock entry (so bills from before the
// owner started tracking stock never make it negative). Quotations never count.

export const STOCK_TYPES = {
    opening: 'Opening stock',
    purchase: 'Purchase',
    adjust: 'Adjustment'
};

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/** YYYY-MM-DD of a bill (billDate, else the day it was created). */
export function billDay(bill) {
    const d = String(bill?.billDate || bill?.createdAt || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

/**
 * entries: stock movements [{ id, rigId?, type, date, casing1Ft, casing2Ft, note }]
 * bills:   the bill book
 * rigId:   which rig (null = the whole company / single-user phone)
 * rigOf:   (item) => rig id of a bill or entry (old items without rigId belong to the first rig)
 */
export function stockSummary({ entries = [], bills = [], rigId = null, rigOf = (x) => x?.rigId || null } = {}) {
    const onRig = (x) => !rigId || rigOf(x) === rigId;
    const mine = (Array.isArray(entries) ? entries : []).filter((e) => e && onRig(e) && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')));
    const sorted = [...mine].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (!mine.length) {
        return { tracking: false, since: null, entries: [], casing1: { in: 0, used: 0, balance: 0 }, casing2: { in: 0, used: 0, balance: 0 }, billsCounted: 0 };
    }
    const since = mine.reduce((m, e) => (e.date < m ? e.date : m), mine[0].date);

    const c1in = mine.reduce((s, e) => s + num(e.casing1Ft), 0);
    const c2in = mine.reduce((s, e) => s + num(e.casing2Ft), 0);

    let c1used = 0;
    let c2used = 0;
    let billsCounted = 0;
    for (const b of Array.isArray(bills) ? bills : []) {
        if (!b || (b.snapshot?.docType || 'QUOTATION') !== 'INVOICE' || !onRig(b)) continue;
        const day = billDay(b);
        if (!day || day < since) continue;
        const p1 = Math.max(0, num(b.snapshot?.pvc7Length));
        const p2 = Math.max(0, num(b.snapshot?.pvc10Length));
        if (p1 || p2) billsCounted++;
        c1used += p1;
        c2used += p2;
    }
    const round = (n) => Math.round(n * 10) / 10;
    return {
        tracking: true,
        since,
        entries: sorted,
        billsCounted,
        casing1: { in: round(c1in), used: round(c1used), balance: round(c1in - c1used) },
        casing2: { in: round(c2in), used: round(c2used), balance: round(c2in - c2used) }
    };
}

/** Which casings are at or below their low-stock level. thresholds = { casing1, casing2 } in feet. */
export function lowStock(summary, thresholds = {}) {
    if (!summary?.tracking) return [];
    const out = [];
    for (const key of ['casing1', 'casing2']) {
        const limit = num(thresholds[key]);
        const bal = summary[key].balance;
        // A casing that was never stocked and never used is not "low".
        if (summary[key].in === 0 && summary[key].used === 0) continue;
        if (bal < 0 || (limit > 0 && bal <= limit)) out.push({ key, balance: bal, limit, negative: bal < 0 });
    }
    return out;
}

/** A new stock entry from form values. Returns { entry } or { error }. */
export function makeStockEntry({ type, date, casing1Ft, casing2Ft, note, rigId }, now = new Date()) {
    if (!STOCK_TYPES[type]) return { error: 'Choose opening stock, purchase or adjustment.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { error: 'Choose a date.' };
    const c1 = Number(casing1Ft || 0);
    const c2 = Number(casing2Ft || 0);
    if (!Number.isFinite(c1) || !Number.isFinite(c2)) return { error: 'Feet must be numbers.' };
    if (type !== 'adjust' && (c1 < 0 || c2 < 0)) return { error: 'Feet cannot be negative (use Adjustment to reduce stock).' };
    if (!c1 && !c2) return { error: 'Enter feet for at least one casing size.' };
    if (Math.abs(c1) > 100000 || Math.abs(c2) > 100000) return { error: 'That is more than 1,00,000 ft — please check.' };
    const entry = {
        id: `stk_${now.getTime()}_${Math.floor(Math.random() * 1e6)}`,
        type,
        date,
        casing1Ft: Math.round(c1 * 10) / 10,
        casing2Ft: Math.round(c2 * 10) / 10,
        note: String(note || '').trim().slice(0, 200),
        createdAt: now.toISOString()
    };
    if (rigId) entry.rigId = rigId;
    return { entry };
}
