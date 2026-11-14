import { describe, it, expect } from 'vitest';
import {
    rangeFor, summarize, change, bucketSize, trend, paymentModes, topDues, depthBands, billDay, dueOf
} from '../src/features/report/reportMath.js';

const bill = (o) => ({
    id: o.id || Math.random().toString(36).slice(2),
    billDate: o.date,
    custName: o.name || 'Ravi',
    custPhone: o.phone || '9876543210',
    customerId: o.cust,
    payments: o.payments || [],
    snapshot: { docType: 'INVOICE', drillingType: o.type || 'new', totalDepth: o.depth || 0, grandTotal: o.total || 0, pvc7Length: o.p7 || 0, pvc10Length: o.p10 || 0, drillingCost: o.drill || 0 }
});
const pay = (date, amount, mode = 'UPI') => ({ date, amount, mode });

describe('report periods', () => {
    it('this month compares with the same days of last month', () => {
        const r = rangeFor('this_month', '2026-11-14');
        expect(r).toMatchObject({ start: '2026-11-01', end: '2026-11-14', prev: { start: '2026-10-01', end: '2026-10-14' } });
    });
    it('this month on the 31st compares with a shorter previous month up to its last day', () => {
        expect(rangeFor('this_month', '2026-03-31').prev).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    });
    it('7 days is today and the 6 days before; last month is the whole previous month', () => {
        expect(rangeFor('7d', '2026-11-14')).toMatchObject({ start: '2026-11-08', end: '2026-11-14', prev: { start: '2026-11-01', end: '2026-11-07' } });
        expect(rangeFor('last_month', '2026-01-10')).toMatchObject({ start: '2025-12-01', end: '2025-12-31', prev: { start: '2025-11-01', end: '2025-11-30' } });
    });
    it('custom range: swapped dates are fixed, previous period has the same length', () => {
        const r = rangeFor('custom', '2026-11-14', { start: '2026-11-10', end: '2026-11-01' });
        expect(r).toMatchObject({ start: '2026-11-01', end: '2026-11-10', prev: { start: '2026-10-22', end: '2026-10-31' } });
    });
    it('all time starts at the first bill and has nothing to compare with', () => {
        const r = rangeFor('all', '2026-11-14', {}, [bill({ date: '2026-06-03' }), bill({ date: '2026-09-01' })]);
        expect(r).toMatchObject({ start: '2026-06-03', end: '2026-11-14', prev: null });
    });
});

describe('headline figures', () => {
    const bills = [
        bill({ date: '2026-11-02', depth: 450, total: 83500, p7: 60, p10: 20, drill: 43000, payments: [pay('2026-11-02', 20000, 'Advance')] }),
        bill({ date: '2026-11-05', depth: 400, type: 'repair', total: 34220, drill: 27000, payments: [pay('2026-11-05', 34220, 'Cash')] })
    ];
    it('billed, collected, pending and bore counts add up', () => {
        const s = summarize(bills);
        expect(s).toMatchObject({ billed: 117720, collected: 54220, due: 63500, bores: 2, fresh: 1, rebore: 1, feet: 850, avgDepth: 425, avgBill: 58860, pvc7: 60, pvc10: 20 });
        expect(s.collectedPct).toBe(46); // 54,220 / 1,17,720
        expect(s.ratePerFt).toBe(82);    // 70,000 / 850 ft
    });
    it('an overpaid bill does not show more collected than billed', () => {
        const s = summarize([bill({ date: '2026-11-02', total: 1000, payments: [pay('2026-11-02', 1500)] })]);
        expect(s.collected).toBe(1000);
        expect(s.due).toBe(0);
    });
    it('% change, and nothing to compare with when the previous period was 0', () => {
        expect(change(120, 100)).toBe(20);
        expect(change(80, 100)).toBe(-20);
        expect(change(50, 0)).toBeNull();
    });
});

describe('trend chart', () => {
    it('steps are days up to a month, weeks up to 6 months, then months', () => {
        expect(bucketSize({ start: '2026-11-01', end: '2026-11-30' })).toBe('day');
        expect(bucketSize({ start: '2026-09-01', end: '2026-11-30' })).toBe('week');
        expect(bucketSize({ start: '2025-11-01', end: '2026-11-30' })).toBe('month');
    });
    it('billed goes by bill date, received by payment date (even for an older bill)', () => {
        const r = { start: '2026-11-01', end: '2026-11-03' };
        const t = trend([
            bill({ date: '2026-10-20', total: 50000, payments: [pay('2026-10-20', 10000), pay('2026-11-02', 40000)] }),
            bill({ date: '2026-11-01', total: 30000, depth: 300, payments: [pay('2026-11-01', 5000)] })
        ], r);
        expect(t.size).toBe('day');
        expect(t.buckets.map((b) => [b.start, b.billed, b.received, b.bores])).toEqual([
            ['2026-11-01', 30000, 5000, 1], ['2026-11-02', 0, 40000, 0], ['2026-11-03', 0, 0, 0]
        ]);
    });
    it('weeks start on Monday and every week in the range is present', () => {
        const t = trend([bill({ date: '2026-11-11', total: 1000 })], { start: '2026-10-01', end: '2026-11-14' });
        expect(t.size).toBe('week');
        expect(t.buckets[0].start).toBe('2026-09-28'); // Monday on or before 1 Oct
        expect(t.buckets.at(-1).start).toBe('2026-11-09');
        expect(t.buckets.find((b) => b.start === '2026-11-09').billed).toBe(1000);
    });
});

describe('lists', () => {
    it('payment modes: only money received in the period, advance kept separate, largest first', () => {
        const r = { start: '2026-11-01', end: '2026-11-30' };
        const m = paymentModes([
            bill({ date: '2026-11-02', payments: [{ date: '2026-11-02', amount: 20000, mode: 'Advance', isAdvance: true }, pay('2026-11-10', 30000, 'UPI')] }),
            bill({ date: '2026-10-02', payments: [pay('2026-10-02', 9999, 'Cash'), pay('2026-11-03', 5000, 'Cash')] })
        ], r);
        expect(m).toEqual([{ mode: 'UPI', amount: 30000 }, { mode: 'Advance', amount: 20000 }, { mode: 'Cash', amount: 5000 }]);
    });
    it('top dues: one row per customer (two bills add up), paid customers left out', () => {
        const d = topDues([
            bill({ date: '2026-11-01', cust: 'c1', name: 'Ravi', total: 50000, payments: [pay('2026-11-01', 10000)] }),
            bill({ date: '2026-10-01', cust: 'c1', name: 'Ravi', total: 20000 }),
            bill({ date: '2026-11-02', cust: 'c2', name: 'Selvi', total: 60000, payments: [pay('2026-11-02', 60000)] }),
            bill({ date: '2026-11-03', name: 'Kumar', phone: '+91 90000 11111', total: 45000 })
        ]);
        expect(d.map((x) => [x.name, x.due, x.bills, x.oldest])).toEqual([['Ravi', 60000, 2, '2026-10-01'], ['Kumar', 45000, 1, '2026-11-03']]);
    });
    it('depth bands: shallow to deep, bills without depth skipped', () => {
        const rows = depthBands([300, 301, 500, 650, 701, 900, 0].map((depth) => bill({ date: '2026-11-01', depth })));
        expect(rows.map((r) => r.bores)).toEqual([1, 2, 1, 2]);
    });
    it('bill day falls back to the local date of createdAt; due never goes below 0', () => {
        expect(billDay({ createdAt: new Date(2026, 10, 14, 23, 30).toISOString() })).toBe('2026-11-14');
        expect(dueOf(bill({ total: 100, payments: [pay('2026-11-01', 150)] }))).toBe(0);
    });
});
