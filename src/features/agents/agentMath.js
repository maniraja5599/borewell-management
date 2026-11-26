// Agents: dealers / contractors who pay for borewells on behalf of the site owner.
// A Final Bill "billed to an agent" keeps the agent on the bill record as `bill.agent`
// ({ name, phone }) — OUTSIDE the snapshot, so it is never printed on the customer's bill.
// The agent book is worked out from the bills (no separate list to sync): one agent per
// phone number (last 10 digits), or per name when there is no phone.
import { isInvoice, billDay, paidOf, totalOf, dueOf } from '../report/reportMath.js';

const digits = (v) => String(v || '').replace(/\D/g, '');

/** { name, phone } with a name, or null. */
export function cleanAgent(a) {
    if (!a || typeof a !== 'object') return null;
    const name = String(a.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name) return null;
    const phone = digits(a.phone).slice(-15);
    return { name, ...(phone.length >= 10 ? { phone } : {}) };
}

/** Same agent = same 10-digit mobile, else same name (case-insensitive). */
export function agentKey(a) {
    const p = digits(a?.phone).slice(-10);
    return p.length === 10 ? `p:${p}` : `n:${String(a?.name || '').trim().toLowerCase()}`;
}

/** True when a bill is billed to an agent. */
export const isAgentBill = (b) => !!cleanAgent(b?.agent);

/**
 * The agent book from the bill book: [{ key, name, phone, bills, billed, paid, due, unpaid, last, oldestDue }],
 * most money due first, then the latest work. Only Final Bills count.
 * Each agent's bills are newest first.
 */
export function agentsFromBills(bills) {
    const by = new Map();
    for (const b of bills || []) {
        if (!b || !isInvoice(b)) continue;
        const a = cleanAgent(b.agent);
        if (!a) continue;
        const key = agentKey(a);
        const day = billDay(b);
        const row = by.get(key) || { key, name: a.name, phone: a.phone || '', bills: [], billed: 0, paid: 0, due: 0, unpaid: 0, last: '', oldestDue: '' };
        // the latest bill's spelling of the name / phone wins
        if (day >= row.last) { row.name = a.name; if (a.phone) row.phone = a.phone; row.last = day; }
        row.bills.push(b);
        row.billed += totalOf(b);
        row.paid += Math.min(paidOf(b), totalOf(b) || paidOf(b));
        const due = dueOf(b);
        if (due > 0) {
            row.due += due;
            row.unpaid += 1;
            if (day && (!row.oldestDue || day < row.oldestDue)) row.oldestDue = day;
        }
        by.set(key, row);
    }
    const out = [...by.values()];
    for (const r of out) r.bills.sort((x, y) => billDay(y).localeCompare(billDay(x)) || String(y.createdAt || '').localeCompare(String(x.createdAt || '')));
    return out.sort((x, y) => y.due - x.due || y.last.localeCompare(x.last) || x.name.localeCompare(y.name));
}

/** Names + phones for the picker on the bill (newest first). */
export function knownAgents(bills) {
    return agentsFromBills(bills).sort((x, y) => y.last.localeCompare(x.last)).map((a) => ({ name: a.name, phone: a.phone }));
}

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const niceDay = (d) => { const [y, m, dd] = String(d).split('-'); return y && m && dd ? `${dd}/${m}/${y}` : ''; };

/** WhatsApp statement for one agent: their unpaid bills (or all, when nothing is due). */
export function agentStatement(agent, { company = '' } = {}) {
    const list = agent.due > 0 ? agent.bills.filter((b) => dueOf(b) > 0) : agent.bills;
    const lines = [
        `*${company || 'Borewell'}* — statement for ${agent.name}`,
        '',
        ...list.map((b) => {
            const site = [b.custName, b.custLocation].filter(Boolean).join(', ');
            const due = dueOf(b);
            return `#${b.billNo} · ${niceDay(billDay(b))} · ${site || 'site'} · ${inr(totalOf(b))}${due > 0 ? ` · due ${inr(due)}` : ' · paid'}`;
        }),
        '',
        `Total billed: ${inr(agent.billed)}`,
        `Paid: ${inr(agent.paid)}`,
        `*Balance due: ${inr(agent.due)}*`
    ];
    return lines.join('\n');
}
