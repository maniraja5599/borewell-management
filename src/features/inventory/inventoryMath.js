// Inventory (spares, consumables, oil, tools …) and vendors (who you buy from, what you owe).
// Casing pipes and bits & hammers keep their own pages; this is everything else.
//
//   item      { id, rigId, name, category, unit, minQty, cost, active, createdAt, updatedAt }
//   move      { id, rigId, itemId, date, type: 'in' | 'out' | 'set', qty, rate?, purchaseId?, note }
//               in = stock added, out = used, set = counted (the stock IS qty from this day on)
//   vendor    { id, name, phone, place, note }
//   purchase  { id, rigId, vendorId, date, billNo, lines: [{ itemId?, name, qty, unit, rate, amount }], total, note }
//   vpay      { id, rigId, vendorId, date, amount, mode, note, purchaseId? }
//
// Pure functions: no DOM, no storage.

export const CATEGORIES = [
    { key: 'spares', label: 'Spares' },
    { key: 'consumable', label: 'Consumables' },
    { key: 'oil', label: 'Oil & grease' },
    { key: 'fitting', label: 'Collar, cap & fittings' },
    { key: 'tools', label: 'Tools' },
    { key: 'other', label: 'Other' }
];
export const UNITS = ['nos', 'ltr', 'kg', 'mtr', 'set', 'box'];
export const catLabel = (k) => (CATEGORIES.find((c) => c.key === k) || CATEGORIES[CATEGORIES.length - 1]).label;

const ymdOk = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const r2 = (n) => Math.round(n * 100) / 100;
const newId = (p, now) => `${p}_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`;
const todayOf = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** New or edited item. Returns { item } or { error }. */
export function makeItem(input, { existing = null, items = [], now = new Date() } = {}) {
    const name = text(input?.name, 60);
    if (!name) return { error: 'Enter the item name.' };
    const rigId = existing?.rigId ?? (input?.rigId || 'local');
    const dup = items.find((i) => i && !i.deleted && i.id !== existing?.id && (i.rigId || 'local') === rigId && i.name.toLowerCase() === name.toLowerCase());
    if (dup) return { error: `"${dup.name}" is already in the list.` };
    const minQty = num(input?.minQty);
    if (Number.isNaN(minQty) || (minQty !== null && minQty < 0)) return { error: 'Minimum stock should be 0 or more.' };
    const cost = num(input?.cost);
    if (Number.isNaN(cost) || (cost !== null && cost < 0)) return { error: 'Enter the cost per unit in rupees.' };
    const at = now.toISOString();
    const base = existing ? { ...existing } : { id: newId('inv', now), rigId, active: true, createdAt: at };
    return {
        item: {
            ...base,
            name,
            category: CATEGORIES.some((c) => c.key === input?.category) ? input.category : 'other',
            unit: UNITS.includes(input?.unit) ? input.unit : 'nos',
            minQty: minQty ?? 0,
            cost: cost === null ? (existing?.cost ?? 0) : r2(cost),
            updatedAt: at
        }
    };
}

/** A stock move. Returns { move } or { error }. */
export function makeMove({ item, type, qty, rate, date, note, purchaseId } = {}, now = new Date()) {
    if (!item?.id) return { error: 'Choose the item.' };
    if (!['in', 'out', 'set'].includes(type)) return { error: 'Choose add, use or count.' };
    const q = num(qty);
    if (q === null || Number.isNaN(q) || q < 0 || (type !== 'set' && q === 0)) return { error: type === 'set' ? 'Enter the count (0 or more).' : 'Enter the quantity.' };
    if (q > 1000000) return { error: 'That quantity looks too big.' };
    const d = ymdOk(date) ? date : todayOf(now);
    if (d > todayOf(now)) return { error: 'The date cannot be in the future.' };
    const rt = num(rate);
    if (Number.isNaN(rt) || (rt !== null && rt < 0)) return { error: 'Enter the rate in rupees.' };
    return {
        move: {
            id: newId('mv', now),
            rigId: item.rigId || 'local',
            itemId: item.id,
            date: d,
            type,
            qty: r2(q),
            ...(rt !== null ? { rate: r2(rt) } : {}),
            ...(purchaseId ? { purchaseId } : {}),
            note: text(note, 120),
            createdAt: now.toISOString()
        }
    };
}

/** Stock of one item: the last count ('set') plus later ins, minus later outs. Moves in date order. */
export function stockOf(itemId, moves) {
    const list = (moves || []).filter((m) => m && !m.deleted && m.itemId === itemId)
        .sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    let q = 0;
    for (const m of list) {
        if (m.type === 'set') q = Number(m.qty) || 0;
        else if (m.type === 'in') q += Number(m.qty) || 0;
        else if (m.type === 'out') q -= Number(m.qty) || 0;
    }
    return r2(q);
}

/** Items with stock, value and status: [{ ...item, qty, value, low, out }], plus totals. */
export function inventorySummary(items, moves, { rigId = null } = {}) {
    const list = (items || []).filter((i) => i && !i.deleted && i.active !== false && (!rigId || (i.rigId || 'local') === rigId)).map((i) => {
        const qty = stockOf(i.id, moves);
        const value = Math.round(Math.max(0, qty) * (Number(i.cost) || 0));
        const out = qty <= 0;
        const low = !out && (Number(i.minQty) || 0) > 0 && qty <= Number(i.minQty);
        return { ...i, qty, value, low, out };
    });
    const alert = (i) => ((Number(i.minQty) || 0) > 0 && (i.low || i.out) ? 0 : 1);
    list.sort((a, b) => alert(a) - alert(b) || a.name.localeCompare(b.name));
    return {
        items: list,
        value: list.reduce((s, i) => s + i.value, 0),
        lowCount: list.filter((i) => i.low).length,
        outCount: list.filter((i) => i.out && (Number(i.minQty) || 0) > 0).length,
        alerts: list.filter((i) => (Number(i.minQty) || 0) > 0 && (i.low || i.out))
    };
}

/** New or edited vendor. Returns { vendor } or { error }. */
export function makeVendor(input, { existing = null, vendors = [], now = new Date() } = {}) {
    const name = text(input?.name, 60);
    if (!name) return { error: 'Enter the vendor name.' };
    if (vendors.some((v) => v && !v.deleted && v.id !== existing?.id && v.name.toLowerCase() === name.toLowerCase())) return { error: 'This vendor is already in the list.' };
    const phone = String(input?.phone || '').replace(/\D/g, '').slice(-15);
    if (phone && phone.length < 10) return { error: 'Mobile number looks short.' };
    const at = now.toISOString();
    const base = existing ? { ...existing } : { id: newId('ven', now), createdAt: at };
    return { vendor: { ...base, name, phone, place: text(input?.place, 60), note: text(input?.note, 120), updatedAt: at } };
}

/**
 * A purchase from a vendor. lines: [{ itemId?, name, qty, unit, rate }]. paidNow: amount paid at
 * once (0 = on credit). Returns { purchase, moves, payment|null } or { error }.
 * Item lines add stock ('in' moves at the line rate); free-text lines (bits, pipes, service …) do not.
 */
export function makePurchase({ vendor, rigId, date, billNo, lines, note, paidNow, mode } = {}, { items = [], now = new Date() } = {}) {
    if (!vendor?.id) return { error: 'Choose the vendor.' };
    const d = ymdOk(date) ? date : todayOf(now);
    if (d > todayOf(now)) return { error: 'The date cannot be in the future.' };
    const clean = [];
    for (const l of lines || []) {
        const item = l?.itemId ? items.find((i) => i.id === l.itemId) : null;
        const name = item ? item.name : text(l?.name, 60);
        const qty = num(l?.qty); const rate = num(l?.rate);
        if (!name && (qty === null || Number.isNaN(qty)) && (rate === null || Number.isNaN(rate))) continue; // empty row
        if (!name) return { error: 'Each line needs an item or a name.' };
        if (qty === null || Number.isNaN(qty) || qty <= 0) return { error: `Enter the quantity for ${name}.` };
        if (rate === null || Number.isNaN(rate) || rate < 0) return { error: `Enter the rate for ${name}.` };
        clean.push({ ...(item ? { itemId: item.id } : {}), name, qty: r2(qty), unit: item ? item.unit : (UNITS.includes(l?.unit) ? l.unit : 'nos'), rate: r2(rate), amount: Math.round(qty * rate) });
    }
    if (!clean.length) return { error: 'Add at least one item.' };
    const total = clean.reduce((s, l) => s + l.amount, 0);
    const paid = num(paidNow) ?? 0;
    if (Number.isNaN(paid) || paid < 0) return { error: 'Enter the amount paid now.' };
    if (paid > total) return { error: 'Paid now is more than the bill total.' };
    const at = now.toISOString();
    const purchase = { id: newId('pur', now), rigId: rigId || 'local', vendorId: vendor.id, date: d, billNo: text(billNo, 30), lines: clean, total, note: text(note, 120), createdAt: at };
    const moves = clean.filter((l) => l.itemId).map((l, i) => ({
        id: `${purchase.id}_mv${i}`, rigId: purchase.rigId, itemId: l.itemId, date: d, type: 'in', qty: l.qty, rate: l.rate, purchaseId: purchase.id, note: `From ${vendor.name}`, createdAt: at
    }));
    const payment = paid > 0 ? { id: `${purchase.id}_pay`, rigId: purchase.rigId, vendorId: vendor.id, date: d, amount: Math.round(paid), mode: mode || 'cash', note: `With bill${purchase.billNo ? ` ${purchase.billNo}` : ''}`, purchaseId: purchase.id, createdAt: at } : null;
    return { purchase, moves, payment };
}

/** Payment to a vendor. Returns { payment } or { error }. */
export function makeVendorPayment({ vendor, rigId, date, amount, mode, note } = {}, now = new Date()) {
    if (!vendor?.id) return { error: 'Choose the vendor.' };
    const a = num(amount);
    if (a === null || Number.isNaN(a) || a <= 0) return { error: 'Enter the amount paid.' };
    if (a > 10000000) return { error: 'That amount looks too big.' };
    const d = ymdOk(date) ? date : todayOf(now);
    if (d > todayOf(now)) return { error: 'The date cannot be in the future.' };
    return { payment: { id: newId('vp', now), rigId: rigId || 'local', vendorId: vendor.id, date: d, amount: Math.round(a), mode: ['cash', 'upi', 'bank', 'cheque'].includes(mode) ? mode : 'cash', note: text(note, 120), createdAt: now.toISOString() } };
}

/** Vendor book: [{ ...vendor, bought, paid, due, purchases, payments, last }] most due first. */
export function vendorBook(vendors, purchases, payments) {
    return (vendors || []).filter((v) => v && !v.deleted).map((v) => {
        const pu = (purchases || []).filter((p) => p && !p.deleted && p.vendorId === v.id).sort((a, b) => b.date.localeCompare(a.date));
        const pa = (payments || []).filter((p) => p && !p.deleted && p.vendorId === v.id).sort((a, b) => b.date.localeCompare(a.date));
        const bought = pu.reduce((s, p) => s + (Number(p.total) || 0), 0);
        const paid = pa.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const last = [pu[0]?.date, pa[0]?.date].filter(Boolean).sort().pop() || '';
        return { ...v, bought, paid, due: bought - paid, purchases: pu, payments: pa, last };
    }).sort((a, b) => b.due - a.due || b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
}

/** Total still to pay to vendors (advances paid to one vendor do not cancel another's due). */
export const totalPayable = (book) => book.reduce((s, v) => s + Math.max(0, v.due), 0);
