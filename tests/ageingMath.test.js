import { describe, it, expect } from 'vitest';
import { ageDays, bucketOf, pendingRows, ageingSummary, SORTS, reminderText, reminderLink, waNumber } from '../src/features/payments/ageingMath.js';

const bill = (id, day, total, paid, extra = {}) => ({
    id, billNo: id, billDate: day, custName: `Cust ${id}`, custPhone: '9876543210', custLocation: 'Musiri',
    payments: paid ? [{ amount: paid }] : [],
    snapshot: { docType: 'INVOICE', grandTotal: total },
    ...extra
});
const TODAY = '2026-11-26';

describe('payment ageing', () => {
    it('ages from the bill date into 0-30 / 31-60 / 61-90 / 90+ buckets', () => {
        expect(ageDays(bill('1', '2026-11-26', 1, 0), TODAY)).toBe(0);
        expect(ageDays(bill('1', '2026-10-27', 1, 0), TODAY)).toBe(30);
        expect(ageDays(bill('1', '2026-12-01', 1, 0), TODAY)).toBe(0); // future date: never negative
        expect([0, 30, 31, 60, 61, 90, 91, 400].map((d) => bucketOf(d).key)).toEqual(['b30', 'b30', 'b60', 'b60', 'b90', 'b90', 'b90p', 'b90p']);
    });

    it('lists unpaid final bills only, with the agent as payer on agent bills', () => {
        const rows = pendingRows([
            bill('1', '2026-11-20', 50000, 10000),
            bill('2', '2026-09-01', 30000, 0, { agent: { name: 'Raja', phone: '9123456789' } }),
            bill('3', '2026-11-01', 20000, 20000),
            bill('4', '2026-11-01', 9000, 0, { snapshot: { docType: 'QUOTATION', grandTotal: 9000 } })
        ], TODAY);
        expect(rows.map((r) => [r.id, r.due, r.age, r.bucket, r.payer.kind, r.payer.name])).toEqual([
            ['1', 40000, 6, 'b30', 'customer', 'Cust 1'],
            ['2', 30000, 86, 'b90', 'agent', 'Raja']
        ]);
        const s = ageingSummary(rows);
        expect(s).toMatchObject({ total: 70000, count: 2, over60: 30000, over60Count: 1 });
        expect(s.buckets.b30).toEqual({ count: 1, due: 40000 });
        expect([...rows].sort(SORTS.oldest).map((r) => r.id)).toEqual(['2', '1']);
        expect([...rows].sort(SORTS.name).map((r) => r.id)).toEqual(['1', '2']);
    });

    it('reminder: balance, paid so far, UPI when set; agent reminders name the site', () => {
        const [r] = pendingRows([bill('7', '2026-11-02', 45000, 5000)], TODAY);
        const t = reminderText(r, { companyName: 'Anjaneya Borewells', upiId: 'anj@upi' });
        expect(t).toContain('Bill #7 dated 02/11/2026 (Musiri)');
        expect(t).toContain('Paid: ₹5,000');
        expect(t).toContain('Balance due: ₹40,000');
        expect(t).toContain('anj@upi');
        expect(reminderLink(r, {})).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
        const [ra] = pendingRows([bill('8', '2026-11-02', 10000, 0, { agent: { name: 'Raja' } })], TODAY);
        expect(reminderText(ra, {})).toContain('(site: Cust 8, Musiri)');
        expect(reminderLink(ra, {})).toBe('');
        expect(waNumber('09876543210')).toBe('919876543210');
        expect(waNumber('123')).toBe('');
    });
});
