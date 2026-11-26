// Pending payments by age: how long each unpaid Final Bill has been waiting (from its bill date).
// Pure functions: bills in, figures out. Who to remind: the agent when the bill is billed to an
// agent (bill.agent), else the customer.
import { isInvoice, billDay, paidOf, totalOf, dueOf, parseYmd } from '../report/reportMath.js';
import { cleanAgent } from '../agents/agentMath.js';

export const AGE_BUCKETS = [
    { key: 'b30', label: '0–30 days', max: 30 },
    { key: 'b60', label: '31–60 days', max: 60 },
    { key: 'b90', label: '61–90 days', max: 90 },
    { key: 'b90p', label: 'Over 90 days', max: Infinity }
];

/** Whole days from the bill date to today (never negative). */
export function ageDays(bill, today) {
    const d = billDay(bill);
    if (!d || !today) return 0;
    return Math.max(0, Math.round((parseYmd(today) - parseYmd(d)) / 86400000));
}

export const bucketOf = (days) => AGE_BUCKETS.find((b) => days <= b.max) || AGE_BUCKETS[AGE_BUCKETS.length - 1];

/** WhatsApp number (with 91 for a 10-digit Indian mobile), or ''. */
export function waNumber(phone) {
    const d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length === 10) return `91${d}`;
    return d.length >= 11 && d.length <= 15 ? d : '';
}

/** One row per unpaid Final Bill: { bill, id, billNo, day, age, bucket, total, paid, due, payer: { kind, name, phone } }. */
export function pendingRows(bills, today) {
    const rows = [];
    for (const b of bills || []) {
        if (!b || !isInvoice(b)) continue;
        const due = dueOf(b);
        if (due <= 0) continue;
        const age = ageDays(b, today);
        const agent = cleanAgent(b.agent);
        rows.push({
            bill: b,
            id: b.id,
            billNo: b.billNo,
            day: billDay(b),
            age,
            bucket: bucketOf(age).key,
            total: totalOf(b),
            paid: Math.min(paidOf(b), totalOf(b)),
            due,
            payer: agent
                ? { kind: 'agent', name: agent.name, phone: agent.phone || '' }
                : { kind: 'customer', name: b.custName || 'Customer', phone: b.custPhone || '' }
        });
    }
    return rows;
}

/** Totals per bucket + overall: { total, count, buckets: { b30: { count, due }, … }, over60 } */
export function ageingSummary(rows) {
    const buckets = Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, { count: 0, due: 0 }]));
    let total = 0; let over60 = 0; let over60Count = 0;
    for (const r of rows) {
        buckets[r.bucket].count += 1;
        buckets[r.bucket].due += r.due;
        total += r.due;
        if (r.age > 60) { over60 += r.due; over60Count += 1; }
    }
    return { total, count: rows.length, buckets, over60, over60Count };
}

export const SORTS = {
    due: (a, b) => b.due - a.due || b.age - a.age,
    oldest: (a, b) => b.age - a.age || b.due - a.due,
    name: (a, b) => a.payer.name.localeCompare(b.payer.name) || b.due - a.due
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const niceDay = (d) => { const [y, m, dd] = String(d).split('-'); return y && m && dd ? `${dd}/${m}/${y}` : ''; };

/** Polite WhatsApp reminder for one bill (agent bills name the site owner too). */
export function reminderText(row, brand = {}) {
    const b = row.bill;
    const company = String(brand.companyName || '').trim() || 'Borewell';
    const site = String(b.custLocation || '').trim();
    const lines = [
        `Hello ${row.payer.name},`,
        '',
        `This is a gentle reminder from *${company}*.`,
        `Bill #${row.billNo} dated ${niceDay(row.day)}${row.payer.kind === 'agent' ? ` (site: ${b.custName || 'site owner'}${site ? `, ${site}` : ''})` : site ? ` (${site})` : ''}`,
        `Bill amount: ${inr(row.total)}`,
        ...(row.paid > 0 ? [`Paid: ${inr(row.paid)}`] : []),
        `*Balance due: ${inr(row.due)}*`
    ];
    const upi = String(brand.upiId || '').trim();
    if (upi) lines.push('', `Pay by UPI: ${upi}${brand.upiName ? ` (${String(brand.upiName).trim()})` : ''}`);
    lines.push('', 'Thank you 🙏');
    return lines.join('\n');
}

/** wa.me link for a row ('' when the payer has no usable number). */
export function reminderLink(row, brand) {
    const n = waNumber(row.payer.phone);
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(reminderText(row, brand))}` : '';
}
