import { describe, it, expect } from 'vitest';
import { makeItem, makeMove, stockOf, inventorySummary, makeVendor, makePurchase, makeVendorPayment, vendorBook, totalPayable } from '../src/features/inventory/inventoryMath.js';
import { transactions } from '../src/features/report/txMath.js';

const NOW = new Date('2026-11-26T10:00:00');

describe('inventory', () => {
    it('items: name needed, no duplicates on the same rig, numbers checked', () => {
        expect(makeItem({ name: ' ' }).error).toMatch(/name/);
        const { item } = makeItem({ name: 'Grease', category: 'oil', unit: 'kg', minQty: '5', cost: '180', rigId: 'r1' }, { now: NOW });
        expect(item).toMatchObject({ name: 'Grease', category: 'oil', unit: 'kg', minQty: 5, cost: 180, rigId: 'r1' });
        expect(makeItem({ name: 'grease', rigId: 'r1' }, { items: [item] }).error).toMatch(/already/);
        expect(makeItem({ name: 'grease', rigId: 'r2' }, { items: [item] }).item).toBeTruthy();
        expect(makeItem({ name: 'X', minQty: -1 }).error).toMatch(/Minimum/);
    });

    it('stock: count (set) resets, then ins and outs; low / out alerts', () => {
        const item = { id: 'i1', name: 'Cap', minQty: 5, cost: 450 };
        const mv = (type, qty, date, createdAt = date) => makeMove({ item, type, qty, date }, NOW).move && { ...makeMove({ item, type, qty, date }, NOW).move, createdAt };
        const moves = [mv('in', 10, '2026-11-01'), mv('out', 3, '2026-11-02'), mv('set', 4, '2026-11-05'), mv('in', 6, '2026-11-06'), mv('out', 2, '2026-11-07')];
        expect(stockOf('i1', moves)).toBe(8);
        expect(makeMove({ item, type: 'out', qty: 0 }, NOW).error).toMatch(/quantity/);
        expect(makeMove({ item, type: 'set', qty: 0 }, NOW).move).toBeTruthy();
        expect(makeMove({ item, type: 'in', qty: 1, date: '2026-12-01' }, NOW).error).toMatch(/future/);
        const s = inventorySummary([item, { id: 'i2', name: 'Bolt', minQty: 0, cost: 10 }, { id: 'i3', name: 'Collar', minQty: 2, cost: 300 }], [...moves, mv('in', 2, '2026-11-01')].map((m, i) => (i === 5 ? { ...m, itemId: 'i3' } : m)));
        expect(s.items.map((i) => [i.name, i.qty, i.low, i.out])).toEqual([['Collar', 2, true, false], ['Bolt', 0, false, true], ['Cap', 8, false, false]]);
        expect(s).toMatchObject({ value: 8 * 450 + 2 * 300, lowCount: 1, outCount: 0 });
        expect(s.alerts.map((i) => i.name)).toEqual(['Collar']);
    });
});

describe('vendors', () => {
    const vendor = makeVendor({ name: 'Sri Murugan Spares', phone: '98765 43210' }, { now: NOW }).vendor;
    const items = [{ id: 'i1', name: 'Grease', unit: 'kg', rigId: 'r1' }];

    it('vendor: name needed, no duplicates, phone checked', () => {
        expect(vendor).toMatchObject({ name: 'Sri Murugan Spares', phone: '9876543210' });
        expect(makeVendor({ name: 'sri murugan spares' }, { vendors: [vendor] }).error).toMatch(/already/);
        expect(makeVendor({ name: 'A', phone: '123' }).error).toMatch(/short/);
    });

    it('purchase: item lines add stock, free lines do not, paid now becomes a payment', () => {
        expect(makePurchase({ vendor, lines: [] }, { items, now: NOW }).error).toMatch(/at least one/);
        expect(makePurchase({ vendor, lines: [{ name: 'Bit', qty: 1, rate: 100 }], paidNow: 500 }, { items, now: NOW }).error).toMatch(/more than/);
        const res = makePurchase({ vendor, rigId: 'r1', date: '2026-11-20', billNo: 'SM-77', lines: [{ itemId: 'i1', qty: 10, rate: 180 }, { name: 'Button bit 6.5', qty: 1, rate: 18500 }, {}], paidNow: 5000, mode: 'upi' }, { items, now: NOW });
        expect(res.purchase).toMatchObject({ total: 20300, billNo: 'SM-77', vendorId: vendor.id });
        expect(res.purchase.lines.map((l) => [l.name, l.amount, !!l.itemId])).toEqual([['Grease', 1800, true], ['Button bit 6.5', 18500, false]]);
        expect(res.moves).toHaveLength(1);
        expect(res.moves[0]).toMatchObject({ itemId: 'i1', type: 'in', qty: 10, rate: 180 });
        expect(res.payment).toMatchObject({ amount: 5000, mode: 'upi', date: '2026-11-20' });

        const pay2 = makeVendorPayment({ vendor, amount: 10000, date: '2026-11-25' }, NOW).payment;
        expect(makeVendorPayment({ vendor, amount: 0 }, NOW).error).toMatch(/amount/);
        const book = vendorBook([vendor, { id: 'v2', name: 'Other' }], [res.purchase], [res.payment, pay2]);
        expect(book[0]).toMatchObject({ name: 'Sri Murugan Spares', bought: 20300, paid: 15000, due: 5300, last: '2026-11-25' });
        expect(totalPayable(book)).toBe(5300);

        // Transaction log: only payments to vendors are money out (the purchase was on credit).
        const rows = transactions({ vendorPayments: [res.payment, pay2], vendors: [vendor] }, '2026-11-01', '2026-11-30', {});
        expect(rows.map((r) => [r.kind, r.amount, r.title])).toEqual([['vendor', 10000, 'Sri Murugan Spares'], ['vendor', 5000, 'Sri Murugan Spares']]);
    });
});
