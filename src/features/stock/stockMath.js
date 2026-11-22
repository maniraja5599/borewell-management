// Casing pipe stock, worked out — never stored.
// Stock = (opening + purchases + adjustments) − pipe feet on FINAL bills of that rig,
// counting only bills dated on/after the rig's first stock entry (so bills from before the
// owner started tracking stock never make it negative). Quotations never count, and neither
// does 7″ casing billed as "drilling only" (snapshot.pvc7Mode 'drill': no pipe left in the bore).
//
// Pipes are bought by COUNT (one pipe = 20 ft, owner can change it) at a cost per pipe; stock is
// kept and shown in feet (and whole pipes). Adjustments are in feet (cut or damaged pieces).
// Low-stock alerts default to 7″ below 100 ft, 10″ below 25 ft (owner can change them).

export const PIPE_FT = 20;
export const DEFAULT_LOW = Object.freeze({ casing1: 100, casing2: 25 });
/** Pipe length, alerts, costs and the drilling-only rate saved in the company profile (brand). */
export function stockSettings(brand) {
    const pos = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
    const zeroOk = (v, d) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? d : Number(v));
    return {
        pipeFt: pos(brand?.pipeLengthFt, PIPE_FT),
        low: { casing1: zeroOk(brand?.lowStockCasing1Ft, DEFAULT_LOW.casing1), casing2: zeroOk(brand?.lowStockCasing2Ft, DEFAULT_LOW.casing2) },
        cost: { casing1: zeroOk(brand?.pipeCost1, 0), casing2: zeroOk(brand?.pipeCost2, 0) },
        drillRate: pos(brand?.casing7DrillRate, 200),
        drillName: String(brand?.casing7DrillName || '').trim().slice(0, 40) || 'Re-cutting charge'
    };
}
/** 7″ pipe on this bill came out of stock? (not "drilling only") */
export const usesPipe7 = (snap) => (snap?.pvc7Mode || 'pipe') !== 'drill';

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
        const p1 = usesPipe7(b.snapshot) ? Math.max(0, num(b.snapshot?.pvc7Length)) : 0;
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

/**
 * A new stock entry from form values. Returns { entry } or { error }.
 * Opening / purchase: give pipe counts (casing1Pipes, casing2Pipes) and the cost per pipe;
 * feet = pipes × pipeFt. Adjustment (or an old caller): feet directly, minus to remove.
 */
export function makeStockEntry({ type, date, casing1Ft, casing2Ft, casing1Pipes, casing2Pipes, cost1, cost2, pipeFt = PIPE_FT, note, rigId }, now = new Date()) {
    if (!STOCK_TYPES[type]) return { error: 'Choose opening stock, purchase or adjustment.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { error: 'Choose a date.' };
    const byPipes = type !== 'adjust' && (casing1Pipes !== undefined || casing2Pipes !== undefined);
    let pipes1 = 0;
    let pipes2 = 0;
    if (byPipes) {
        pipes1 = Number(casing1Pipes || 0);
        pipes2 = Number(casing2Pipes || 0);
        if (!Number.isInteger(pipes1) || !Number.isInteger(pipes2) || pipes1 < 0 || pipes2 < 0) return { error: 'Enter how many pipes (whole numbers).' };
        if (pipes1 > 5000 || pipes2 > 5000) return { error: 'That is more than 5,000 pipes — please check.' };
    }
    const c1 = byPipes ? pipes1 * pipeFt : Number(casing1Ft || 0);
    const c2 = byPipes ? pipes2 * pipeFt : Number(casing2Ft || 0);
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
    if (byPipes) {
        const price = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : 0; };
        Object.assign(entry, { casing1Pipes: pipes1, casing2Pipes: pipes2, pipeFt });
        if (type === 'purchase') {
            const p1 = pipes1 ? price(cost1) : 0;
            const p2 = pipes2 ? price(cost2) : 0;
            Object.assign(entry, { cost1: p1, cost2: p2, amount: pipes1 * p1 + pipes2 * p2 });
        }
    }
    if (rigId) entry.rigId = rigId;
    return { entry };
}

/** Final bills that took pipe from this rig's stock, newest first: [{ id, billNo, custName, day, casing1, casing2 }]. */
export function stockUsage({ bills = [], since = '', rigId = null, rigOf = (x) => x?.rigId || null, limit = 30 } = {}) {
    const out = [];
    for (const b of Array.isArray(bills) ? bills : []) {
        if (!b || (b.snapshot?.docType || 'QUOTATION') !== 'INVOICE' || (rigId && rigOf(b) !== rigId)) continue;
        const day = billDay(b);
        if (!day || (since && day < since)) continue;
        const c1 = usesPipe7(b.snapshot) ? Math.max(0, num(b.snapshot?.pvc7Length)) : 0;
        const c2 = Math.max(0, num(b.snapshot?.pvc10Length));
        if (c1 || c2) out.push({ id: b.id, billNo: b.billNo || '', custName: b.custName || '', day, casing1: c1, casing2: c2 });
    }
    return out.sort((a, b) => b.day.localeCompare(a.day)).slice(0, limit);
}

/** "340 ft (17 pipes)" — whole pipes plus any loose feet. */
export function feetAndPipes(ft, pipeFt = PIPE_FT) {
    const f = Math.round(Number(ft) * 10) / 10 || 0;
    const sign = f < 0 ? '−' : '';
    const abs = Math.abs(f);
    const whole = Math.floor(abs / pipeFt);
    const rest = Math.round((abs - whole * pipeFt) * 10) / 10;
    const pipes = whole ? `${whole} pipe${whole === 1 ? '' : 's'}${rest ? ` + ${rest} ft` : ''}` : (rest ? `${rest} ft` : '0 pipes');
    return `${sign}${abs.toLocaleString('en-IN')} ft (${sign}${pipes})`;
}
