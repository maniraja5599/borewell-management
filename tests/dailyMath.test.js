import { describe, it, expect } from 'vitest';
import { feetDrilled, compHours, dayReport, periodReport, periodCsv, dayWhatsApp, daysBetween } from '../src/features/report/dailyMath.js';

const bill = (id, day, depth, total, extra = {}) => ({
    id, billNo: id, billDate: day, custName: `Cust ${id}`, custLocation: 'Musiri', rigId: 'r1',
    payments: [],
    snapshot: { docType: 'INVOICE', grandTotal: total, totalDepth: depth, drillingType: 'new', ...(extra.snapshot || {}) },
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'snapshot'))
});

const DAY = '2026-11-20';
const data = {
    bills: [
        bill('1', DAY, 600, 60000, { work: { compStart: 100, compEnd: 106.5, run: { startAt: 60000, endAt: 121 * 60000 } }, payments: [{ amount: 20000, date: DAY, mode: 'Cash' }] }),
        bill('2', DAY, 450, 20000, { snapshot: { drillingType: 'repair', oldBoreDepth: 300 }, payments: [{ amount: 5000, date: '2026-11-22' }] }),
        bill('3', '2026-11-18', 500, 50000, { payments: [{ amount: 10000, date: DAY, mode: 'UPI' }] }),
        bill('4', DAY, 999, 99999, { snapshot: { docType: 'QUOTATION' } }),
        bill('5', DAY, 700, 70000, { rigId: 'r2' })
    ],
    cash: [
        { type: 'diesel', date: DAY, litres: 120, amount: 11400, rigId: 'r1' },
        { type: 'diesel', date: DAY, litres: 80, amount: 7600, rigId: 'r2' },
        { type: 'expense', date: DAY, amount: 900, rigId: 'r1' },
        { type: 'wage', date: DAY, amount: 3000, rigId: 'r1' },
        { type: 'diesel', date: '2026-11-19', litres: 50, amount: 4750, rigId: 'r1' }
    ],
    attendance: [
        { date: DAY, status: 'present', rigId: 'r1' },
        { date: DAY, status: 'present', rigId: 'r1' },
        { date: DAY, status: 'half', rigId: 'r1' },
        { date: DAY, status: 'absent', rigId: 'r1' },
        { date: DAY, status: 'present', rigId: 'r2' }
    ]
};
const r1 = { onRigBill: (b) => b.rigId === 'r1', onRigCash: (e) => e.rigId === 'r1', onRigAttendance: (a) => a.rigId === 'r1' };

describe('daily site report', () => {
    it('feet: re-bores count only below the old depth; compressor hours from the readings', () => {
        expect(feetDrilled(bill('x', DAY, 600, 1))).toBe(600);
        expect(feetDrilled(bill('x', DAY, 450, 1, { snapshot: { drillingType: 'repair', oldBoreDepth: 300 } }))).toBe(150);
        expect(compHours({ work: { compStart: 10, compEnd: 12.5 } })).toBe(2.5);
        expect(compHours({ work: { compStart: 10, compEnd: null } })).toBe(0);
    });

    it('one day on one rig: bores, feet, hours, diesel, spend, crew and collections', () => {
        const r = dayReport(data, DAY, r1);
        expect(r).toMatchObject({ boreCount: 2, newBores: 1, rebores: 1, feet: 750, billed: 80000, hours: 6.5, minutes: 120, feetPerHour: 115, spend: 900, collected: 30000 });
        expect(r.diesel).toEqual({ litres: 120, amount: 11400 });
        expect(r.crew).toEqual({ present: 2, half: 1, absent: 1, days: 2.5 });
        expect(r.payments.map((p) => p.amount)).toEqual([20000, 10000]);
    });

    it('period: only days with activity, totals, and a CSV with a total row', () => {
        expect(daysBetween('2026-11-18', '2026-11-20')).toEqual(['2026-11-20', '2026-11-19', '2026-11-18']);
        const rep = periodReport(data, '2026-11-17', '2026-11-22', r1);
        expect(rep.days.map((d) => d.day)).toEqual(['2026-11-22', '2026-11-20', '2026-11-19', '2026-11-18']);
        expect(rep.totals).toMatchObject({ boreCount: 3, feet: 1250, collected: 35000, dieselLitres: 170 });
        const csv = periodCsv(rep, '=Rig 1').split('\r\n');
        expect(csv[0]).toMatch(/^Date,Rig,Bores/);
        expect(csv[1].startsWith("2026-11-18,'=Rig 1,1")).toBe(true);
        expect(csv[csv.length - 1]).toMatch(/^Total,/);
    });

    it('WhatsApp text lists the bores and the money', () => {
        const t = dayWhatsApp(dayReport(data, DAY, r1), { company: 'Anjaneya', rigName: 'Rig 1' });
        expect(t).toContain('Feet drilled: 750 ft');
        expect(t).toContain('#1 Cust 1, Musiri — 600 ft');
        expect(t).toContain('Collected: ₹30,000');
    });
});
