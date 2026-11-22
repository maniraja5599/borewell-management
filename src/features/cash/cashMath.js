// Expenses, diesel and cash in hand. Each money entry is a record (kind 'cash', migration 0016):
//
//   type 'expense'   money spent: category (Spares, Food, Bike, Service, ...), paid from cash or UPI / bank
//   type 'diesel'    litres × rate per litre = amount; bunk name (or "from a vehicle")
//   type 'in'        cash given to this person (by the owner, the office or someone else)
//   type 'handover'  cash handed to the owner or the office; it leaves the person's cash only after
//                    the receiver ticks "Received ✓"
//
// rigId: the rig (null = office). holderId / holderName: whose cash it is (the signed-in person;
// 'me' on a phone that does not use the cloud).
//
// Cash in hand of a person =  cash in + customer payments they took in cash (bill payment.by)
//                           − expenses and diesel paid in cash − hand-overs that were received.
// Pure functions: no DOM, no storage.
import { todayYmd } from '../workers/workersMath.js';

export const CASH_TYPES = [
    { key: 'expense', label: 'Expense' },
    { key: 'diesel', label: 'Diesel' },
    { key: 'in', label: 'Cash received' },
    { key: 'handover', label: 'Handed over' }
];
export const PAID_BY = [
    { key: 'cash', label: 'Cash' },
    { key: 'upi', label: 'UPI' },
    { key: 'bank', label: 'Bank' }
];
export const FROM = [
    { key: 'owner', label: 'Owner' },
    { key: 'office', label: 'Office' },
    { key: 'other', label: 'Other' }
];
export const TO = [
    { key: 'owner', label: 'Owner' },
    { key: 'office', label: 'Office' }
];
/** Owner can add, rename and remove these (saved in the company profile). Diesel has its own form. */
export const DEFAULT_CATEGORIES = Object.freeze([
    { key: 'spares', label: 'Spares' },
    { key: 'food', label: 'Food' },
    { key: 'bike', label: 'Bike' },
    { key: 'service', label: 'Service' },
    { key: 'other', label: 'Other' }
]);
export const LOCAL_HOLDER = { id: 'me', name: 'Me' };

const MAX_AMOUNT = 10000000;
const ymdOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const text = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const keyOf = (label) => text(label, 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'cat';
/** A number from a form box ('' / null = null; junk = NaN). */
const numIn = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(/[,₹\s]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};
const r2 = (n) => Math.round(n * 100) / 100;
export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// ---------------------------------------------------------------------------- categories

/** The company's categories (cleaned); 'other' is always there. */
export function categories(brand) {
    const list = Array.isArray(brand?.expenseCategories) ? brand.expenseCategories : DEFAULT_CATEGORIES;
    const seen = new Set();
    const out = [];
    for (const c of list) {
        const label = text(c?.label, 40);
        const key = text(c?.key, 40) || keyOf(label);
        if (!label || seen.has(key) || key === 'diesel') continue;
        seen.add(key);
        out.push({ key, label });
    }
    if (!seen.has('other')) out.push({ key: 'other', label: 'Other' });
    return out.slice(0, 40);
}

/** Returns { list } or { error }. */
export function addCategory(list, label) {
    const name = text(label, 40);
    if (!name) return { error: 'Type the category name.' };
    if (/^diesel$/i.test(name)) return { error: 'Diesel has its own button.' };
    if (list.some((c) => c.label.toLowerCase() === name.toLowerCase())) return { error: `${name} is already there.` };
    if (list.length >= 40) return { error: 'Up to 40 categories.' };
    let key = keyOf(name);
    while (list.some((c) => c.key === key)) key += '_';
    const other = list.findIndex((c) => c.key === 'other');
    const next = [...list];
    next.splice(other < 0 ? next.length : other, 0, { key, label: name });
    return { list: next };
}
export function renameCategory(list, key, label) {
    const name = text(label, 40);
    if (!name) return { error: 'Type the category name.' };
    if (list.some((c) => c.key !== key && c.label.toLowerCase() === name.toLowerCase())) return { error: `${name} is already there.` };
    return { list: list.map((c) => (c.key === key ? { ...c, label: name } : c)) };
}
/** Old entries keep their saved label, so removing a category never changes the past. */
export function removeCategory(list, key) {
    if (key === 'other') return { error: '"Other" stays, for anything that fits nowhere else.' };
    return { list: list.filter((c) => c.key !== key) };
}

// ---------------------------------------------------------------------------- entries

/**
 * Check and build an entry from the form. Returns { entry } or { error }.
 * me = { id, name } of the person on this phone (the holder of a new entry).
 */
export function makeEntry(input, { existing = null, me = LOCAL_HOLDER, cats = DEFAULT_CATEGORIES, now = new Date() } = {}) {
    const type = CASH_TYPES.some((t) => t.key === input?.type) ? input.type : 'expense';
    const date = ymdOk(input?.date) ? input.date : todayYmd(now);
    if (date > todayYmd(now)) return { error: 'The date cannot be in the future.' };
    const note = text(input?.note, 200);
    const out = { type, date, note };

    if (type === 'diesel') {
        const litres = numIn(input?.litres);
        if (litres === null || Number.isNaN(litres) || litres <= 0 || litres > 5000) return { error: 'Enter the litres (for example 50).' };
        const source = input?.source === 'vehicle' ? 'vehicle' : 'bunk';
        const rate = numIn(input?.rate);
        if (Number.isNaN(rate) || (rate !== null && (rate < 0 || rate > 500))) return { error: 'Enter the rate per litre (for example 92.50).' };
        if (source === 'bunk' && !(rate > 0)) return { error: 'Enter the rate per litre (for example 92.50).' };
        out.litres = r2(litres);
        out.rate = rate ? r2(rate) : null;
        out.amount = rate ? Math.round(litres * rate) : 0;
        out.source = source;
        out.bunk = text(input?.bunk, 60);
        out.paidBy = out.amount > 0 && PAID_BY.some((p) => p.key === input?.paidBy) ? input.paidBy : (out.amount > 0 ? 'cash' : null);
    } else {
        const amount = numIn(input?.amount);
        if (amount === null || Number.isNaN(amount) || amount <= 0) return { error: 'Enter the amount in rupees.' };
        if (amount > MAX_AMOUNT) return { error: 'That amount looks too big. Check it.' };
        out.amount = Math.round(amount);
        if (type === 'expense') {
            const cat = cats.find((c) => c.key === input?.category)
                || (existing?.category === input?.category && existing?.categoryLabel ? { key: existing.category, label: existing.categoryLabel } : null);
            if (!cat) return { error: 'Choose what it was for.' };
            out.category = cat.key;
            out.categoryLabel = cat.label;
            out.paidBy = PAID_BY.some((p) => p.key === input?.paidBy) ? input.paidBy : 'cash';
        } else if (type === 'in') {
            out.from = FROM.some((f) => f.key === input?.from) ? input.from : 'owner';
            out.fromName = text(input?.fromName, 80);
            if (out.from === 'other' && !out.fromName) return { error: 'Who gave the cash?' };
        } else {
            out.to = TO.some((t) => t.key === input?.to) ? input.to : 'owner';
            out.toName = text(input?.toName, 80);
        }
    }
    if (existing?.receivedAt) return { error: 'Already received. Ask the owner to change it.' };

    const at = now.toISOString();
    const base = existing ? { ...existing } : {
        id: `cash_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        holderId: me?.id || LOCAL_HOLDER.id,
        holderName: text(me?.name, 80),
        createdAt: at
    };
    // Old fields of another type do not stay behind when the type changes.
    for (const k of ['category', 'categoryLabel', 'paidBy', 'litres', 'rate', 'source', 'bunk', 'from', 'fromName', 'to', 'toName']) delete base[k];
    return { entry: { ...base, ...out, rigId: input?.rigId || null, updatedAt: at } };
}

/** The owner / office ticks a hand-over "Received ✓". */
export function markReceived(e, me, now = new Date()) {
    return { ...e, receivedAt: now.toISOString(), receivedById: me?.id || LOCAL_HOLDER.id, receivedByName: text(me?.name, 80), updatedAt: now.toISOString() };
}
export function undoReceived(e, now = new Date()) {
    const { receivedAt, receivedById, receivedByName, ...rest } = e;
    return { ...rest, updatedAt: now.toISOString() };
}

/** What this entry does to its holder's cash (pending hand-overs do nothing yet). */
export function cashEffect(e) {
    const amt = Math.max(0, Number(e?.amount) || 0);
    switch (e?.type) {
        case 'in': return amt;
        case 'expense':
        case 'diesel': return e.paidBy === 'cash' ? -amt : 0;
        case 'handover': return e.receivedAt ? -amt : 0;
        default: return 0;
    }
}

/** Customer payments taken in cash by this person: [{ billId, billNo, custName, date, amount, rigId }]. */
export function collections(bills, holderId) {
    const out = [];
    for (const b of bills || []) {
        if (!b || !Array.isArray(b.payments)) continue;
        for (const p of b.payments) {
            if (!p || p.mode !== 'Cash' || p.by?.id !== holderId) continue;
            const amount = Math.round(Number(p.amount) || 0);
            if (amount > 0) out.push({ billId: b.id, billNo: b.billNo || '', custName: b.custName || '', date: String(p.date || '').slice(0, 10), amount, rigId: b.rigId || null, payId: p.id });
        }
    }
    return out;
}

/**
 * One person's cash book: balance and the lines behind it (latest first).
 * lines: { date, kind: 'entry'|'collection', amount (+in / −out / 0 pending), entry?, bill? }
 */
export function cashBook(entries, bills, holderId) {
    const mine = (entries || []).filter((e) => e && !e.deleted && e.holderId === holderId);
    const got = collections(bills, holderId);
    const t = { received: 0, collected: 0, spent: 0, handedOver: 0, pending: 0, pendingCount: 0 };
    const lines = [];
    for (const e of mine) {
        const fx = cashEffect(e);
        if (e.type === 'in') t.received += fx;
        else if (e.type === 'handover') {
            if (e.receivedAt) t.handedOver += -fx;
            else { t.pending += Number(e.amount) || 0; t.pendingCount += 1; }
        } else t.spent += -fx;
        lines.push({ date: e.date, at: e.createdAt || '', kind: 'entry', amount: fx, entry: e });
    }
    for (const c of got) {
        t.collected += c.amount;
        lines.push({ date: c.date, at: '', kind: 'collection', amount: c.amount, bill: c });
    }
    lines.sort((a, b) => b.date.localeCompare(a.date) || String(b.at).localeCompare(String(a.at)));
    return { ...t, balance: t.received + t.collected - t.spent - t.handedOver, lines };
}

/** Everyone who holds cash (entries or cash collections), with their balance; biggest first. */
export function holders(entries, bills, me = null) {
    const names = new Map();
    for (const e of entries || []) if (e && !e.deleted && e.holderId) names.set(e.holderId, e.holderName || names.get(e.holderId) || '');
    for (const b of bills || []) for (const p of (Array.isArray(b?.payments) ? b.payments : [])) {
        if (p?.mode === 'Cash' && p.by?.id && !names.has(p.by.id)) names.set(p.by.id, p.by.name || '');
    }
    if (me?.id && !names.has(me.id)) names.set(me.id, me.name || '');
    return [...names.entries()].map(([id, name]) => {
        const book = cashBook(entries, bills, id);
        return { id, name: name || 'Someone', balance: book.balance, pending: book.pending, pendingCount: book.pendingCount };
    }).sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

/** Hand-overs waiting for "Received ✓", oldest first. */
export function pendingHandovers(entries, { to = null } = {}) {
    return (entries || []).filter((e) => e && !e.deleted && e.type === 'handover' && !e.receivedAt && (!to || e.to === to))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Money spent in a period (expenses + diesel, any payment way), for one rig, the office (rigId 'office')
 * or everything (null). { total, count, byCategory: [{ key, label, amount, count }], diesel: { litres, amount, rate, count } }
 */
export function spendSummary(entries, { rigId = null, start = '', end = '9999-12-31' } = {}) {
    const list = (entries || []).filter((e) => e && !e.deleted && (e.type === 'expense' || e.type === 'diesel')
        && e.date >= start && e.date <= end
        && (rigId === null || (rigId === 'office' ? !e.rigId : e.rigId === rigId)));
    const cats = new Map();
    const diesel = { litres: 0, amount: 0, rate: null, count: 0, pricedLitres: 0 };
    let total = 0;
    for (const e of list) {
        const amt = Number(e.amount) || 0;
        total += amt;
        if (e.type === 'diesel') {
            diesel.litres += Number(e.litres) || 0;
            diesel.amount += amt;
            diesel.count += 1;
            if (amt > 0) diesel.pricedLitres += Number(e.litres) || 0;
            continue;
        }
        const c = cats.get(e.category) || { key: e.category, label: e.categoryLabel || e.category, amount: 0, count: 0 };
        c.amount += amt;
        c.count += 1;
        cats.set(e.category, c);
    }
    diesel.litres = r2(diesel.litres);
    diesel.rate = diesel.pricedLitres ? r2(diesel.amount / diesel.pricedLitres) : null;
    delete diesel.pricedLitres;
    const byCategory = [...cats.values()].sort((a, b) => b.amount - a.amount);
    if (diesel.count) byCategory.unshift({ key: 'diesel', label: 'Diesel', amount: diesel.amount, count: diesel.count });
    byCategory.sort((a, b) => b.amount - a.amount);
    return { total, count: list.length, byCategory, diesel };
}

/** Bunk names typed before, most used first (type 1–2 letters to pick an old one). */
export function bunkNames(entries) {
    const n = new Map();
    for (const e of entries || []) {
        const b = text(e?.bunk, 60);
        if (!b || e.type !== 'diesel') continue;
        const k = b.toLowerCase();
        const cur = n.get(k) || { name: b, count: 0 };
        cur.count += 1;
        n.set(k, cur);
    }
    return [...n.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((x) => x.name);
}

/** One line for an entry, e.g. "Diesel · 50 L × ₹92.50 · IOC Mohanur". */
export function entryTitle(e) {
    switch (e?.type) {
        case 'diesel': return `Diesel · ${Number(e.litres || 0).toLocaleString('en-IN')} L`;
        case 'in': return `Cash received from ${e.from === 'other' ? (e.fromName || 'someone') : e.from === 'office' ? (e.fromName ? `office (${e.fromName})` : 'office') : 'owner'}`;
        case 'handover': return `Handed to ${e.to === 'office' ? 'office' : 'owner'}${e.toName ? ` (${e.toName})` : ''}`;
        default: return e?.categoryLabel || 'Expense';
    }
}
export function entryLine(e) {
    const parts = [];
    if (e.type === 'diesel') {
        if (e.rate) parts.push(`₹${Number(e.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/L`);
        parts.push(e.source === 'vehicle' ? `from a vehicle${e.bunk ? ` (${e.bunk})` : ''}` : (e.bunk || 'bunk'));
    }
    if ((e.type === 'expense' || e.type === 'diesel') && e.paidBy && e.paidBy !== 'cash') parts.push(`paid by ${e.paidBy === 'upi' ? 'UPI' : 'bank'}`);
    if (e.type === 'handover') parts.push(e.receivedAt ? `received${e.receivedByName ? ` by ${e.receivedByName}` : ''} ✓` : 'waiting for Received ✓');
    if (e.note) parts.push(e.note);
    return parts.join(' · ');
}
