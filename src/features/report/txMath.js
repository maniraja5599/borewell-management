// Transaction log: every rupee in and out, day by day, from the records the app already has.
//
//   IN   bill payments (customer / agent; old bills without payment dates use the bill date)
//        bits & hammers sold as scrap (tool.soldAmount on tool.soldOn)
//   OUT  Expenses & cash: expense, diesel (priced), advance, wage
//        casing pipe purchases (stock entry type 'purchase' with an amount)
//        bits & hammers bought (tool.price on tool.purchasedOn)
//        hired vehicle payouts (vehicle.settlements)
//
// Cash given to a person ('in') and hand-overs move money inside the business, so they are
// left out (they would count the same rupee twice). Pure functions: lists in, rows out.
import { isInvoice, billDay } from './reportMath.js';
import { cashCounts, paymentCounts } from '../approvals/approvalMath.js';

const ymdOk = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
const all = () => true;

export const TX_KINDS = {
    payment: { dir: 'in', label: 'Bill payment' },
    scrap: { dir: 'in', label: 'Scrap sale' },
    expense: { dir: 'out', label: 'Expense' },
    diesel: { dir: 'out', label: 'Diesel' },
    wage: { dir: 'out', label: 'Wages' },
    advance: { dir: 'out', label: 'Advance' },
    pipes: { dir: 'out', label: 'Casing pipes' },
    tool: { dir: 'out', label: 'Bits & hammers' },
    hired: { dir: 'out', label: 'Hired vehicle' },
    repair: { dir: 'out', label: 'Breakdown repair' },
    vendor: { dir: 'out', label: 'Vendor payment' }
};

/**
 * All transactions between from and to (YYYY-MM-DD, inclusive), newest first.
 * src: { bills, cash, stock, tools, vehicles }
 * opts: { onRigBill, onRigItem, includeVehicles }
 * Row: { id, date, dir, kind, amount, title, sub, mode, billId? }
 */
export function transactions(src = {}, from = '0000-00-00', to = '9999-12-31', opts = {}) {
    const onBill = opts.onRigBill || all;
    const onItem = opts.onRigItem || all;
    const inRange = (d) => ymdOk(d) && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
    const out = [];
    const push = (row) => { if (row.amount > 0 && inRange(row.date)) out.push({ ...row, date: row.date.slice(0, 10), dir: TX_KINDS[row.kind].dir }); };

    for (const b of src.bills || []) {
        if (!b || !isInvoice(b) || !onBill(b)) continue;
        (Array.isArray(b.payments) ? b.payments : []).forEach((p, i) => {
            if (!paymentCounts(p)) return;
            const by = b.agent?.name ? `${b.agent.name} (agent)` : (b.custName || 'Customer');
            push({
                id: `pay_${b.id}_${p?.id || i}`,
                date: ymdOk(p?.date) ? p.date : billDay(b),
                kind: 'payment',
                amount: Math.round(Number(p?.amount) || 0),
                title: by,
                sub: [`#${b.billNo}`, b.agent?.name ? b.custName : '', b.custLocation].filter(Boolean).join(' · '),
                mode: p?.mode || '',
                billId: b.id
            });
        });
    }

    for (const e of src.cash || []) {
        if (!e || e.deleted || !cashCounts(e) || !onItem(e) || !TX_KINDS[e.type] || TX_KINDS[e.type].dir !== 'out') continue;
        const title = e.type === 'expense' ? (e.categoryLabel || e.category || 'Expense')
            : e.type === 'diesel' ? `Diesel ${Number(e.litres) || 0} L`
                : `${TX_KINDS[e.type].label}${e.workerName ? ` · ${e.workerName}` : ''}`;
        push({
            id: `cash_${e.id}`,
            date: e.date,
            kind: e.type,
            amount: Math.round(Number(e.amount) || 0),
            title,
            sub: [e.type === 'diesel' ? e.bunk : '', e.note, e.holderName ? `by ${e.holderName}` : ''].filter(Boolean).join(' · '),
            mode: e.paidBy || ''
        });
    }

    for (const s of src.stock || []) {
        if (!s || s.deleted || s.type !== 'purchase' || !onItem(s)) continue;
        const parts = [s.casing1Pipes ? `${s.casing1Pipes} × 7″` : '', s.casing2Pipes ? `${s.casing2Pipes} × 10″` : ''].filter(Boolean).join(', ');
        push({ id: `stock_${s.id}`, date: s.date, kind: 'pipes', amount: Math.round(Number(s.amount) || 0), title: `Casing pipes${parts ? ` · ${parts}` : ''}`, sub: s.note || '', mode: '' });
    }

    for (const t of src.tools || []) {
        if (!t || t.deleted || !onItem(t)) continue;
        const name = [t.tool === 'bit' ? 'Bit' : 'Hammer', t.size ? `${t.size}″` : '', t.code || t.brand || ''].filter(Boolean).join(' ');
        push({ id: `toolbuy_${t.id}`, date: t.purchasedOn, kind: 'tool', amount: Math.round(Number(t.price) || 0), title: name, sub: t.brand && t.code ? t.brand : '', mode: '' });
        if (t.status === 'sold') push({ id: `toolsell_${t.id}`, date: t.soldOn, kind: 'scrap', amount: Math.round(Number(t.soldAmount) || 0), title: `${name} sold`, sub: t.buyer || '', mode: '' });
    }

    const vendorName = (id) => (src.vendors || []).find((v) => v && v.id === id)?.name || 'Vendor';
    for (const p of src.vendorPayments || []) {
        if (!p || p.deleted || !onItem(p)) continue;
        push({ id: `vpay_${p.id}`, date: p.date, kind: 'vendor', amount: Math.round(Number(p.amount) || 0), title: vendorName(p.vendorId), sub: p.note || '', mode: p.mode || '' });
    }

    for (const b of src.breakdowns || []) {
        if (!b || b.deleted || !b.endAt || !onItem(b)) continue;
        const d = new Date(b.endAt);
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        push({ id: `repair_${b.id}`, date: day, kind: 'repair', amount: Math.round(Number(b.cost) || 0), title: `Repair · ${b.reasonLabel || b.reason || 'breakdown'}`, sub: [b.note, b.fixNote].filter(Boolean).join(' · '), mode: '' });
    }

    if (opts.includeVehicles !== false) {
        for (const v of src.vehicles || []) {
            for (const s of (v && Array.isArray(v.settlements)) ? v.settlements : []) {
                push({ id: `hired_${v.id || v.name}_${s.id}`, date: s.date, kind: 'hired', amount: Math.round(Number(s.amount) || 0), title: `${v.name}${v.ownerName ? ` · ${v.ownerName}` : ''}`, sub: s.note || '', mode: '' });
            }
        }
    }

    return out.sort((a, b) => b.date.localeCompare(a.date) || (a.dir === b.dir ? b.amount - a.amount : a.dir === 'in' ? -1 : 1));
}

/** { in, out, net, count, byKind: [{ kind, label, dir, amount, count }] } */
export function txSummary(rows) {
    const s = { in: 0, out: 0, net: 0, count: rows.length, byKind: [] };
    const by = new Map();
    for (const r of rows) {
        s[r.dir] += r.amount;
        const k = by.get(r.kind) || { kind: r.kind, label: TX_KINDS[r.kind].label, dir: r.dir, amount: 0, count: 0 };
        k.amount += r.amount; k.count += 1;
        by.set(r.kind, k);
    }
    s.net = s.in - s.out;
    s.byKind = [...by.values()].sort((a, b) => (a.dir === b.dir ? b.amount - a.amount : a.dir === 'in' ? -1 : 1));
    return s;
}

/** Rows grouped by day (newest first): [{ day, in, out, rows }] */
export function byDay(rows) {
    const m = new Map();
    for (const r of rows) {
        const g = m.get(r.date) || { day: r.date, in: 0, out: 0, rows: [] };
        g[r.dir] += r.amount;
        g.rows.push(r);
        m.set(r.date, g);
    }
    return [...m.values()];
}

const csvCell = (v) => {
    const s = String(v ?? '');
    const safe = typeof v !== 'number' && /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV, oldest first, with In / Out columns and totals. */
export function txCsv(rows, rigName = '') {
    const head = ['Date', 'Rig', 'Type', 'Details', 'More', 'Mode', 'In', 'Out'];
    const body = rows.slice().reverse().map((r) => [r.date, rigName, TX_KINDS[r.kind].label, r.title, r.sub, r.mode, r.dir === 'in' ? r.amount : '', r.dir === 'out' ? r.amount : '']);
    const s = txSummary(rows);
    body.push(['Total', rigName, '', '', '', '', s.in, s.out]);
    body.push(['Net (in − out)', rigName, '', '', '', '', s.net, '']);
    return [head, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
