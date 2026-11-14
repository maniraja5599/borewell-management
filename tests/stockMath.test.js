import { describe, it, expect } from 'vitest';
import { stockSummary, lowStock, makeStockEntry, billDay } from '../src/features/stock/stockMath.js';

const bill = (date, p7, p10, extra = {}) => ({ billDate: date, snapshot: { docType: 'INVOICE', pvc7Length: p7, pvc10Length: p10 }, ...extra });
const entry = (date, c1, c2 = 0, extra = {}) => ({ id: `e${date}${c1}`, type: 'purchase', date, casing1Ft: c1, casing2Ft: c2, ...extra });

describe('pipe stock maths', () => {
    it('not tracking until the first stock entry', () => {
        const s = stockSummary({ entries: [], bills: [bill('2026-11-01', 40, 0)] });
        expect(s.tracking).toBe(false);
        expect(lowStock(s, { casing1: 100 })).toEqual([]);
    });

    it('stock in minus final-bill usage since the first entry', () => {
        const s = stockSummary({
            entries: [entry('2026-11-10', 500, 100, { type: 'opening' }), entry('2026-11-12', 200, 0)],
            bills: [
                bill('2026-11-01', 999, 999),                                   // before tracking started: ignored
                bill('2026-11-10', 80, 20),
                bill('2026-11-13', 60, 0),
                { billDate: '2026-11-13', snapshot: { docType: 'QUOTATION', pvc7Length: 500 } }, // quotation: ignored
                bill('2026-11-14', '40', null)                                  // text numbers / nulls are fine
            ]
        });
        expect(s.since).toBe('2026-11-10');
        expect(s.casing1).toEqual({ in: 700, used: 180, balance: 520 });
        expect(s.casing2).toEqual({ in: 100, used: 20, balance: 80 });
        expect(s.billsCounted).toBe(3);
        expect(s.entries.map((e) => e.date)).toEqual(['2026-11-12', '2026-11-10']); // newest first
    });

    it('editing or deleting a bill changes stock by itself (nothing stored)', () => {
        const entries = [entry('2026-11-10', 300)];
        expect(stockSummary({ entries, bills: [bill('2026-11-11', 100, 0)] }).casing1.balance).toBe(200);
        expect(stockSummary({ entries, bills: [bill('2026-11-11', 120, 0)] }).casing1.balance).toBe(180);
        expect(stockSummary({ entries, bills: [] }).casing1.balance).toBe(300);
    });

    it('per rig: entries and bills of other rigs do not count; old items belong to the first rig', () => {
        const rigOf = (x) => x.rigId || 'r1';
        const entries = [entry('2026-11-10', 300), entry('2026-11-10', 50, 0, { rigId: 'r2', id: 'x' })];
        const bills = [bill('2026-11-11', 40, 0), bill('2026-11-11', 10, 0, { rigId: 'r2' })];
        expect(stockSummary({ entries, bills, rigId: 'r1', rigOf }).casing1.balance).toBe(260);
        expect(stockSummary({ entries, bills, rigId: 'r2', rigOf }).casing1.balance).toBe(40);
    });

    it('adjustments can reduce stock (e.g. damaged pipes)', () => {
        const s = stockSummary({ entries: [entry('2026-11-10', 300), entry('2026-11-11', -20, 0, { type: 'adjust' })], bills: [] });
        expect(s.casing1.balance).toBe(280);
    });

    it('low-stock and negative warnings', () => {
        const s = stockSummary({ entries: [entry('2026-11-10', 300, 50)], bills: [bill('2026-11-11', 150, 60)] });
        expect(lowStock(s, { casing1: 200, casing2: 100 })).toEqual([
            { key: 'casing1', balance: 150, limit: 200, negative: false },
            { key: 'casing2', balance: -10, limit: 100, negative: true }
        ]);
        expect(lowStock(s, {}).map((w) => w.key)).toEqual(['casing2']); // no limit set: only negative warns
    });

    it('a casing size that is never used is never "low"', () => {
        const s = stockSummary({ entries: [entry('2026-11-10', 300, 0)], bills: [] });
        expect(lowStock(s, { casing1: 100, casing2: 100 })).toEqual([]);
    });

    it('validates new entries', () => {
        const now = new Date('2026-11-14T10:00:00Z');
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-14', casing1Ft: '200', note: ' Supplier A ' }, now).entry)
            .toMatchObject({ type: 'purchase', date: '2026-11-14', casing1Ft: 200, casing2Ft: 0, note: 'Supplier A' });
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-14', casing1Ft: -5 }).error).toMatch(/Adjustment/);
        expect(makeStockEntry({ type: 'adjust', date: '2026-11-14', casing1Ft: -5 }).entry.casing1Ft).toBe(-5);
        expect(makeStockEntry({ type: 'purchase', date: '', casing1Ft: 5 }).error).toMatch(/date/);
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-14' }).error).toMatch(/at least one/);
        expect(makeStockEntry({ type: 'gift', date: '2026-11-14', casing1Ft: 5 }).error).toBeTruthy();
        expect(makeStockEntry({ type: 'opening', date: '2026-11-14', casing1Ft: 5, rigId: 'r2' }).entry.rigId).toBe('r2');
    });

    it('bill day falls back to the creation date', () => {
        expect(billDay({ createdAt: '2026-11-13T22:00:00.000Z' })).toBe('2026-11-13');
        expect(billDay({})).toBe('');
    });
});
