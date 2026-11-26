import { describe, it, expect } from 'vitest';
import { stampCash, stampPayments, decide, waiting, cashCounts, paymentCounts, contentHash } from '../src/features/approvals/approvalMath.js';
import { cashBook, spendSummary } from '../src/features/cash/cashMath.js';
import { paidOf } from '../src/features/report/reportMath.js';
import { transactions } from '../src/features/report/txMath.js';
import { dayReport } from '../src/features/report/dailyMath.js';

const NOW = new Date('2026-11-26T10:00:00');
const M = 'mgr-1';
const exp = (id, extra = {}) => ({ id, type: 'expense', amount: 900, paidBy: 'cash', date: '2026-11-26', holderId: M, holderName: 'Ravi', createdAt: '2026-11-26T09:00:00Z', category: 'food', categoryLabel: 'Food', ...extra });

describe('approvals', () => {
    it('stamps only this person’s new money entries; hand-overs and others are left alone', () => {
        const list = [exp('e1'), exp('e2', { holderId: 'someone' }), exp('e3', { type: 'handover', amount: 500 }), exp('e4', { createdAt: '2026-01-01T00:00:00Z' })];
        const r = stampCash(list, M, { since: '2026-11-01', now: NOW });
        expect(r.changed).toEqual(['e1']);
        expect(r.list[0].approval).toMatchObject({ status: 'pending' });
        expect(r.list[3].approval).toBeUndefined(); // made before approvals were turned on
        expect(stampCash(r.list, M, { now: NOW }).changed).toEqual(['e4']); // without "since" old ones are marked too
    });

    it('an approved entry stays approved until it is edited; then it waits again', () => {
        const approved = decide(exp('e1'), 'approved', { by: { id: 'own', name: 'Owner' }, now: NOW });
        expect(approved.approval).toMatchObject({ status: 'approved', by: { id: 'own' }, h: contentHash(exp('e1')) });
        expect(stampCash([approved], M, { now: NOW }).changed).toEqual([]);
        const edited = { ...approved, amount: 1900 };
        const r = stampCash([edited], M, { now: NOW });
        expect(r.changed).toEqual(['e1']);
        expect(r.list[0].approval.status).toBe('pending');
    });

    it('payments the manager took are stamped on any bill; waiting() lists cash and payments oldest first', () => {
        const bills = [{ id: 'b1', billNo: 'AB-1', payments: [{ id: 'p1', amount: 20000, date: '2026-11-25', by: { id: M, name: 'Ravi' } }, { id: 'p2', amount: 5, by: { id: 'own' } }] }, { id: 'b2', payments: [] }];
        const r = stampPayments(bills, M, { now: NOW });
        expect(r.changed).toEqual(['b1']);
        expect(r.list[0].payments.map((p) => p.approval?.status || null)).toEqual(['pending', null]);
        expect(r.list[1]).toBe(bills[1]);
        const w = waiting(stampCash([exp('e1')], M, { now: NOW }).list, r.list);
        expect(w.map((x) => `${x.kind}:${x.amount}:${x.who}`)).toEqual(['payment:20000:Ravi', 'cash:900:Ravi']);
    });

    it('what counts: pending / rejected expenses leave the reports; a rejected payment is not paid', () => {
        const pending = { ...exp('e1'), approval: { status: 'pending' } };
        const rejected = decide(exp('e2'), 'rejected', { now: NOW });
        const ok = decide(exp('e3'), 'approved', { now: NOW });
        expect([pending, rejected, ok, exp('e4')].map(cashCounts)).toEqual([false, false, true, true]);
        expect(spendSummary([pending, rejected, ok, exp('e4')]).total).toBe(1800);
        // in hand: the pending one did leave the manager's cash; the rejected one did not
        expect(cashBook([pending, rejected, ok], [], M).spent).toBe(1800);

        const bill = { id: 'b1', billNo: 'AB-1', billDate: '2026-11-26', snapshot: { docType: 'INVOICE', grandTotal: 50000 },
            payments: [{ id: 'p1', amount: 20000, date: '2026-11-26', mode: 'Cash', by: { id: M } }, decide({ id: 'p2', amount: 7000, date: '2026-11-26', mode: 'UPI' }, 'rejected', { now: NOW })] };
        expect(paymentCounts(bill.payments[1])).toBe(false);
        expect(paidOf(bill)).toBe(20000);
        const rows = transactions({ bills: [bill], cash: [pending, rejected, ok] }, '2026-11-01', '2026-11-30', {});
        expect(rows.map((r) => `${r.kind}:${r.amount}`)).toEqual(['payment:20000', 'expense:900']);
        expect(dayReport({ bills: [bill], cash: [pending, rejected, ok] }, '2026-11-26')).toMatchObject({ collected: 20000, spend: 900 });
    });
});
