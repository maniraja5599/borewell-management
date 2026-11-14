// Numbers behind the owner report (dashboard.html). Pure functions: bills in, figures out.
// Dates are local 'YYYY-MM-DD' strings throughout, so a bill made at 11 pm stays on its own day.

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

export const isInvoice = (b) => (b?.snapshot?.docType || 'QUOTATION') === 'INVOICE';

/** The day a bill belongs to. */
export function billDay(b) {
    if (b?.billDate && /^\d{4}-\d{2}-\d{2}/.test(b.billDate)) return b.billDate.slice(0, 10);
    if (b?.createdAt) { const d = new Date(b.createdAt); if (!isNaN(d)) return ymd(d); }
    return '';
}

/** Money received on a bill (all payments; old bills only kept the advance). */
export function paidOf(b) {
    if (Array.isArray(b?.payments)) return b.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return Number(b?.snapshot?.advancePaidAmount) || 0;
}
export const totalOf = (b) => Math.round(Number(b?.snapshot?.grandTotal) || 0);
export const dueOf = (b) => Math.max(0, totalOf(b) - paidOf(b));

/**
 * The period for a filter button, plus the period just before it (for "vs previous").
 * keys: today | yesterday | 7d | this_month | last_month | all | custom
 */
export function rangeFor(key, today = ymd(new Date()), custom = {}, bills = []) {
    const t = parseYmd(today);
    let start;
    let end = today;
    let prev = null;
    let prevLabel = '';
    switch (key) {
        case 'today':
            start = today; prev = { start: addDays(today, -1), end: addDays(today, -1) }; prevLabel = 'yesterday'; break;
        case 'yesterday':
            start = end = addDays(today, -1); prev = { start: addDays(today, -2), end: addDays(today, -2) }; prevLabel = 'the day before'; break;
        case '7d':
            start = addDays(today, -6); prev = { start: addDays(today, -13), end: addDays(today, -7) }; prevLabel = 'previous 7 days'; break;
        case 'this_month': {
            start = ymd(new Date(t.getFullYear(), t.getMonth(), 1));
            // Same days of last month (1st..today's date), so a half month is not compared with a full one.
            const pStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
            const pLast = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
            prev = { start: ymd(pStart), end: ymd(new Date(pStart.getFullYear(), pStart.getMonth(), Math.min(t.getDate(), pLast))) };
            prevLabel = 'same days last month';
            break;
        }
        case 'last_month': {
            const s = new Date(t.getFullYear(), t.getMonth() - 1, 1);
            start = ymd(s); end = ymd(new Date(t.getFullYear(), t.getMonth(), 0));
            prev = { start: ymd(new Date(t.getFullYear(), t.getMonth() - 2, 1)), end: ymd(new Date(t.getFullYear(), t.getMonth() - 1, 0)) };
            prevLabel = 'the month before';
            break;
        }
        case 'custom': {
            start = custom.start || today; end = custom.end || today;
            if (start > end) [start, end] = [end, start];
            const len = daysBetween(start, end) + 1;
            prev = { start: addDays(start, -len), end: addDays(start, -1) }; prevLabel = `previous ${len} ${len === 1 ? 'day' : 'days'}`;
            break;
        }
        default: { // all
            const days = bills.map(billDay).filter(Boolean).sort();
            start = days[0] && days[0] < today ? days[0] : today;
            end = days.length && days[days.length - 1] > today ? days[days.length - 1] : today;
        }
    }
    return { key, start, end, prev, prevLabel };
}

export const inRange = (day, r) => !!day && day >= r.start && day <= r.end;

/** Headline figures for a set of final bills. */
export function summarize(bills) {
    const s = { bills: bills.length, billed: 0, collected: 0, due: 0, feet: 0, fresh: 0, rebore: 0, pvc7: 0, pvc10: 0, drilling: 0 };
    for (const b of bills) {
        const snap = b.snapshot || {};
        s.billed += totalOf(b);
        s.collected += Math.min(paidOf(b), totalOf(b) || paidOf(b));
        s.due += dueOf(b);
        s.feet += Number(snap.totalDepth) || 0;
        if (snap.drillingType === 'repair') s.rebore++; else s.fresh++;
        s.pvc7 += Number(snap.pvc7Length) || 0;
        s.pvc10 += Number(snap.pvc10Length) || 0;
        s.drilling += Number(snap.drillingCost) || 0;
    }
    s.bores = s.fresh + s.rebore;
    s.avgDepth = s.bores ? Math.round(s.feet / s.bores) : 0;
    s.avgBill = s.bores ? Math.round(s.billed / s.bores) : 0;
    s.ratePerFt = s.feet && s.drilling ? Math.round(s.drilling / s.feet) : 0;
    s.collectedPct = s.billed ? Math.round((s.collected / s.billed) * 100) : 0;
    return s;
}

/** % change, or null when there is nothing to compare with. */
export function change(now, before) {
    if (!before) return null;
    return Math.round(((now - before) / before) * 100);
}

/** How wide each step of the trend chart is: a day, a week (from Monday) or a month. */
export function bucketSize(r) {
    const days = daysBetween(r.start, r.end) + 1;
    if (days <= 31) return 'day';
    if (days <= 182) return 'week';
    return 'month';
}

function bucketStart(day, size) {
    if (size === 'day') return day;
    const d = parseYmd(day);
    if (size === 'month') return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    const back = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - back);
    return ymd(d);
}
function nextBucket(start, size) {
    const d = parseYmd(start);
    if (size === 'day') d.setDate(d.getDate() + 1);
    else if (size === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    return ymd(d);
}

/**
 * Billed (by bill date) and money received (by payment date) per day / week / month.
 * Payments count in the step they were received, whichever period the bill is from.
 */
export function trend(invoices, r) {
    const size = bucketSize(r);
    const buckets = [];
    const index = new Map();
    for (let s = bucketStart(r.start, size); s <= r.end; s = nextBucket(s, size)) {
        const b = { start: s, billed: 0, received: 0, bores: 0, feet: 0 };
        index.set(s, b);
        buckets.push(b);
    }
    for (const bill of invoices) {
        const day = billDay(bill);
        if (inRange(day, r)) {
            const b = index.get(bucketStart(day, size));
            if (b) { b.billed += totalOf(bill); b.bores++; b.feet += Number(bill.snapshot?.totalDepth) || 0; }
        }
        for (const p of paymentsOf(bill)) {
            if (!inRange(p.date, r)) continue;
            const b = index.get(bucketStart(p.date, size));
            if (b) b.received += p.amount;
        }
    }
    return { size, buckets };
}

/** Payments of a bill with a usable date (old bills without dated payments fall back to the bill day). */
function paymentsOf(bill) {
    if (Array.isArray(bill.payments)) {
        return bill.payments.map((p) => ({
            amount: Number(p.amount) || 0,
            date: /^\d{4}-\d{2}-\d{2}/.test(p.date || '') ? p.date.slice(0, 10) : billDay(bill),
            mode: p.isAdvance || p.mode === 'Advance' ? 'Advance' : (p.mode || 'Other')
        })).filter((p) => p.amount > 0);
    }
    const adv = Number(bill.snapshot?.advancePaidAmount) || 0;
    return adv > 0 ? [{ amount: adv, date: billDay(bill), mode: 'Advance' }] : [];
}

/** Money received in the period, split by how it was paid; largest first. */
export function paymentModes(invoices, r) {
    const by = new Map();
    for (const bill of invoices) {
        for (const p of paymentsOf(bill)) {
            if (inRange(p.date, r)) by.set(p.mode, (by.get(p.mode) || 0) + p.amount);
        }
    }
    return [...by].map(([mode, amount]) => ({ mode, amount })).sort((a, b) => b.amount - a.amount);
}

/** Customers with the most money pending on these bills; largest first. */
export function topDues(invoices, n = 5) {
    const by = new Map();
    for (const b of invoices) {
        const due = dueOf(b);
        if (due <= 0) continue;
        const key = b.customerId || `${(b.custName || '').trim().toLowerCase()}|${String(b.custPhone || '').replace(/\D/g, '').slice(-10)}`;
        const row = by.get(key) || { name: b.custName || 'Customer', phone: b.custPhone || '', place: b.custLocation || '', due: 0, bills: 0, oldest: billDay(b) };
        row.due += due;
        row.bills++;
        if (billDay(b) && billDay(b) < row.oldest) row.oldest = billDay(b);
        by.set(key, row);
    }
    return [...by.values()].sort((a, b) => b.due - a.due).slice(0, n);
}

export const DEPTH_BANDS = [
    { label: 'Up to 300 ft', max: 300 },
    { label: '301–500 ft', max: 500 },
    { label: '501–700 ft', max: 700 },
    { label: 'Over 700 ft', max: Infinity }
];

/** Bores per depth band (ordered shallow → deep). */
export function depthBands(invoices) {
    const rows = DEPTH_BANDS.map((d) => ({ label: d.label, bores: 0 }));
    for (const b of invoices) {
        const depth = Number(b.snapshot?.totalDepth) || 0;
        if (depth <= 0) continue;
        rows[DEPTH_BANDS.findIndex((d) => depth <= d.max)].bores++;
    }
    return rows;
}

/** Short axis label for a trend step. */
export function bucketLabel(start, size) {
    const d = parseYmd(start);
    if (size === 'month') return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Long label for a tooltip / table row. */
export function bucketTitle(start, size) {
    const d = parseYmd(start);
    if (size === 'month') return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (size === 'week') {
        const e = parseYmd(addDays(start, 6));
        return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
