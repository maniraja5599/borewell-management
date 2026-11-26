import { describe, it, expect } from 'vitest';
import { transactions, txSummary, byDay, txCsv } from '../src/features/report/txMath.js';

const src = {
    bills: [
        { id: 'b1', billNo: 'AB-1', billDate: '2026-11-10', custName: 'Murugan', custLocation: 'Musiri', rigId: 'r1',
            payments: [{ id: 'p1', amount: 20000, date: '2026-11-10', mode: 'Cash' }, { id: 'p2', amount: 5000, date: '2026-11-15', mode: 'UPI' }],
            snapshot: { docType: 'INVOICE', grandTotal: 50000 } },
        { id: 'b2', billNo: 'AB-2', billDate: '2026-11-12', custName: 'Selvam', rigId: 'r1', agent: { name: 'Raja' },
            payments: [{ amount: 7000 }], snapshot: { docType: 'INVOICE', grandTotal: 30000 } },
        { id: 'q1', billNo: 'Q-1', billDate: '2026-11-12', payments: [{ amount: 999, date: '2026-11-12' }], snapshot: { docType: 'QUOTATION' } },
        { id: 'b3', billNo: 'R2-1', billDate: '2026-11-12', rigId: 'r2', payments: [{ amount: 4000, date: '2026-11-12' }], snapshot: { docType: 'INVOICE', grandTotal: 4000 } }
    ],
    cash: [
        { id: 'c1', type: 'diesel', date: '2026-11-10', litres: 100, amount: 9500, bunk: 'IOC', paidBy: 'cash', rigId: 'r1' },
        { id: 'c2', type: 'expense', date: '2026-11-15', amount: 800, categoryLabel: 'Food', rigId: 'r1' },
        { id: 'c3', type: 'in', date: '2026-11-15', amount: 10000, rigId: 'r1' },
        { id: 'c4', type: 'handover', date: '2026-11-15', amount: 3000, rigId: 'r1' },
        { id: 'c5', type: 'wage', date: '2026-11-16', amount: 2500, workerName: 'Kumar', rigId: 'r1' },
        { id: 'c6', type: 'expense', date: '2026-11-16', amount: 300, rigId: 'r1', deleted: true }
    ],
    stock: [{ id: 's1', type: 'purchase', date: '2026-11-11', casing1Pipes: 10, amount: 12000, rigId: 'r1' }, { id: 's2', type: 'opening', date: '2026-11-01', amount: 0 }],
    tools: [{ id: 't1', tool: 'bit', size: '6.5', code: 'KB-1', price: 18500, purchasedOn: '2026-11-05', status: 'sold', soldOn: '2026-11-20', soldAmount: 1500, rigId: 'r1' }],
    vehicles: [{ id: 'v1', name: 'TN 45 AB 1234', ownerName: 'Ravi', settlements: [{ id: 'x1', date: '2026-11-18', amount: 6000 }] }]
};
const r1 = { onRigBill: (b) => b.rigId === 'r1', onRigItem: (x) => !x.rigId || x.rigId === 'r1' };

describe('transaction log', () => {
    it('collects money in and out, leaves out quotations, internal cash moves and deleted entries', () => {
        const rows = transactions(src, '2026-11-01', '2026-11-30', r1);
        expect(rows.map((r) => `${r.date} ${r.kind} ${r.dir} ${r.amount}`)).toEqual([
            '2026-11-20 scrap in 1500',
            '2026-11-18 hired out 6000',
            '2026-11-16 wage out 2500',
            '2026-11-15 payment in 5000',
            '2026-11-15 expense out 800',
            '2026-11-12 payment in 7000',
            '2026-11-11 pipes out 12000',
            '2026-11-10 payment in 20000',
            '2026-11-10 diesel out 9500',
            '2026-11-05 tool out 18500'
        ]);
        expect(rows.find((r) => r.amount === 7000)).toMatchObject({ title: 'Raja (agent)', billId: 'b2' });
    });

    it('date range, rig filter and vehicles switch', () => {
        expect(transactions(src, '2026-11-15', '2026-11-15', r1).map((r) => r.amount)).toEqual([5000, 800]);
        expect(transactions(src, '2026-11-12', '2026-11-12', {}).map((r) => r.amount)).toEqual([7000, 4000]);
        expect(transactions(src, '2026-11-01', '2026-11-30', { ...r1, includeVehicles: false }).some((r) => r.kind === 'hired')).toBe(false);
    });

    it('summary, days and CSV', () => {
        const rows = transactions(src, '2026-11-01', '2026-11-30', r1);
        const s = txSummary(rows);
        expect(s).toMatchObject({ in: 33500, out: 49300, net: -15800, count: 10 });
        expect(s.byKind[0]).toMatchObject({ kind: 'payment', amount: 32000, count: 3 });
        expect(byDay(rows)[0]).toMatchObject({ day: '2026-11-20', in: 1500, out: 0 });
        const csv = txCsv(rows, 'Rig 1').split('\r\n');
        expect(csv[0]).toBe('Date,Rig,Type,Details,More,Mode,In,Out');
        expect(csv[1]).toMatch(/^2026-11-05,Rig 1,Bits & hammers/);
        expect(csv[csv.length - 1]).toBe("Net (in − out),Rig 1,,,,,-15800,");
    });
});
