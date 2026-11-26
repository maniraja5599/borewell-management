// Approvals: when the owner turns them on (brand.approvals), what a Rig Manager (or office staff)
// enters waits for the owner before it counts:
//   cash entries  expense, diesel, advance, wage   → pending / rejected ones leave the reports
//   bill payments a payment they took             → a rejected one does not count as paid
//                                                    (a pending one counts — the customer did pay)
// The mark lives on the record as `approval: { status, by, at, note, h }`; h = hash of the record
// without its approval, so any later edit of an approved record makes it pending again.
// Only the owner approves (server rule in migration 0019). Pure functions: no DOM, no storage.
import { hashData } from '../../cloud/syncPlan.js';

export const APPROVABLE_CASH = ['expense', 'diesel', 'advance', 'wage'];

const strip = (x) => { if (!x || typeof x !== 'object') return x; const { approval, ...rest } = x; return rest; };
/** Hash of a record without its approval mark. */
export const contentHash = (x) => hashData(strip(x));

export const statusOf = (x) => x?.approval?.status || null;
export const isPending = (x) => statusOf(x) === 'pending';
export const isRejected = (x) => statusOf(x) === 'rejected';
/** Does a cash entry count in totals and reports? (pending and rejected do not) */
export const cashCounts = (e) => !isPending(e) && !isRejected(e);
/** Does a payment count as paid? (only a rejected one does not) */
export const paymentCounts = (p) => !isRejected(p);

/** Needs a (new) pending mark: never marked, or changed since it was approved / rejected. */
function needsMark(x) {
    const a = x?.approval;
    if (!a) return true;
    if (a.status === 'pending') return false;
    return a.h !== contentHash(x);
}
const pendingMark = (now) => ({ status: 'pending', at: now.toISOString() });

/**
 * Mark this person's new / edited cash entries pending. Returns { list, changed } — list is a new
 * array only when something changed (changed = ids).
 */
export function stampCash(list, meId, { since = '', now = new Date() } = {}) {
    if (!meId || !Array.isArray(list)) return { list, changed: [] };
    const changed = [];
    const out = list.map((e) => {
        if (!e || e.deleted || e.holderId !== meId || !APPROVABLE_CASH.includes(e.type)) return e;
        if (since && String(e.createdAt || '') < since && !e.approval) return e; // made before approvals were on
        if (!needsMark(e)) return e;
        changed.push(e.id);
        return { ...e, approval: pendingMark(now) };
    });
    return changed.length ? { list: out, changed } : { list, changed };
}

/** Mark the payments this person took (new / edited) pending, on any bill. Same return shape. */
export function stampPayments(bills, meId, { since = '', now = new Date() } = {}) {
    if (!meId || !Array.isArray(bills)) return { list: bills, changed: [] };
    const changed = [];
    const out = bills.map((b) => {
        if (!b || !Array.isArray(b.payments) || !b.payments.some((p) => p?.by?.id === meId)) return b;
        let touched = false;
        const payments = b.payments.map((p) => {
            if (!p || p.by?.id !== meId) return p;
            if (since && String(p.createdAt || '') < since && !p.approval) return p;
            if (!needsMark(p)) return p;
            touched = true;
            return { ...p, approval: pendingMark(now) };
        });
        if (!touched) return b;
        changed.push(b.id);
        return { ...b, payments };
    });
    return changed.length ? { list: out, changed } : { list: bills, changed };
}

/** The owner's decision on a record (cash entry or payment). status: 'approved' | 'rejected'. */
export function decide(x, status, { by = null, note = '', now = new Date() } = {}) {
    if (!['approved', 'rejected'].includes(status)) throw new Error('approved or rejected');
    const base = strip(x);
    return {
        ...base,
        approval: {
            status,
            at: now.toISOString(),
            ...(by?.id ? { by: { id: by.id, name: String(by.name || '').slice(0, 80) } } : {}),
            ...(note ? { note: String(note).trim().slice(0, 120) } : {}),
            h: contentHash(base)
        }
    };
}

/**
 * Everything waiting for the owner, oldest first:
 * [{ kind: 'cash', entry } | { kind: 'payment', bill, payment }] with { id, date, amount, who }.
 */
export function waiting(cash, bills) {
    const out = [];
    for (const e of cash || []) {
        if (e && !e.deleted && isPending(e)) out.push({ kind: 'cash', id: e.id, date: e.date, amount: Math.round(Number(e.amount) || 0), who: e.holderName || '', entry: e });
    }
    for (const b of bills || []) {
        for (const p of Array.isArray(b?.payments) ? b.payments : []) {
            if (p && isPending(p)) out.push({ kind: 'payment', id: `${b.id}:${p.id}`, date: String(p.date || '').slice(0, 10), amount: Math.round(Number(p.amount) || 0), who: p.by?.name || '', bill: b, payment: p });
        }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
}
