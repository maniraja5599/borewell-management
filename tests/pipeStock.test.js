// Phase 7: casing pipes bought by count, cost per pipe, low-stock defaults, drilling-only 7″ casing.
import { describe, it, expect } from 'vitest';
import { stockSummary, makeStockEntry, stockSettings, usesPipe7, stockUsage, feetAndPipes, DEFAULT_LOW } from '../src/features/stock/stockMath.js';
import { computeBillTotals } from '../src/core/slabEngine.js';

const bill = (date, p7, p10, snap = {}, extra = {}) => ({ billDate: date, snapshot: { docType: 'INVOICE', pvc7Length: p7, pvc10Length: p10, ...snap }, ...extra });
const entry = (date, c1, c2 = 0) => ({ id: `e${date}${c1}`, type: 'purchase', date, casing1Ft: c1, casing2Ft: c2 });

describe('pipes by count', () => {
    it('purchase: feet = pipes × 20, cost per pipe and total', () => {
        const { entry: e } = makeStockEntry({ type: 'purchase', date: '2026-11-20', casing1Pipes: '17', casing2Pipes: 3, cost1: '2400', cost2: 6500, rigId: 'r1' });
        expect(e).toMatchObject({ casing1Ft: 340, casing2Ft: 60, casing1Pipes: 17, casing2Pipes: 3, pipeFt: 20, cost1: 2400, cost2: 6500, amount: 17 * 2400 + 3 * 6500, rigId: 'r1' });
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-20', casing1Pipes: 2.5 }).error).toMatch(/whole/);
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-20', casing1Pipes: 0, casing2Pipes: 0 }).error).toMatch(/at least one/);
        expect(makeStockEntry({ type: 'purchase', date: '2026-11-20', casing1Pipes: 9000 }).error).toMatch(/5,000/);
    });

    it('opening stock has no cost; pipe length can be changed; adjustments are in feet', () => {
        const op = makeStockEntry({ type: 'opening', date: '2026-11-01', casing1Pipes: 5, pipeFt: 18 }).entry;
        expect(op).toMatchObject({ casing1Ft: 90, casing2Ft: 0, casing1Pipes: 5 });
        expect(op.amount).toBeUndefined();
        const adj = makeStockEntry({ type: 'adjust', date: '2026-11-21', casing1Ft: -8, casing1Pipes: 3 }).entry;
        expect(adj).toMatchObject({ casing1Ft: -8 });
        expect(adj.casing1Pipes).toBeUndefined();
    });
});

describe('drilling-only 7″ casing', () => {
    it('does not take pipe from stock, and is not listed as using pipe', () => {
        expect(usesPipe7({})).toBe(true);
        expect(usesPipe7({ pvc7Mode: 'drill' })).toBe(false);
        const s = stockSummary({ entries: [entry('2026-11-10', 400)], bills: [bill('2026-11-11', 100, 0), bill('2026-11-12', 80, 0, { pvc7Mode: 'drill' })] });
        expect(s.casing1).toEqual({ in: 400, used: 100, balance: 300 });
        const u = stockUsage({ since: '2026-11-10', bills: [bill('2026-11-11', 100, 0, {}, { id: 'a' }), bill('2026-11-12', 80, 20, { pvc7Mode: 'drill' }, { id: 'b' }), bill('2026-11-09', 50, 0, {}, { id: 'old' })] });
        expect(u.map((x) => [x.id, x.casing1, x.casing2])).toEqual([['b', 0, 20], ['a', 100, 0]]);
    });

    it('the bill charges the drilling-only rate and says so in the snapshot', () => {
        const rates = { baseDrillingRate: 90, oldBoreRate: 40, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 0, gstPercentage: 18, slabBufferFt: 0, slabRates: [{ start: 1, end: 1000, span: 1000, rangeStr: '001-1000 ft', rate: 90 }] };
        const base = { drillingType: 'new', docType: 'INVOICE', totalDepth: 300, pvc7Length: 60, pvc10Length: 0, baseDrillingRate: 90, extraItems: [] };
        const pipe = computeBillTotals(rates, base);
        expect(pipe).toMatchObject({ pvc7Rate: 400, pvc7Cost: 24000 });
        expect(pipe.pvc7Mode).toBeUndefined(); // normal bills unchanged
        const drill = computeBillTotals(rates, { ...base, pvc7Mode: "drill", pvc7DrillRate: 200 });
        expect(drill).toMatchObject({ pvc7Mode: 'drill', pvc7Rate: 200, pvc7Cost: 12000 });
        expect(pipe.pvc7Cost - drill.pvc7Cost).toBe(12000);
        // No drilling-only rate given: the default ₹200
        expect(computeBillTotals(rates, { ...base, pvc7Mode: "drill" }).pvc7Rate).toBe(200);
    });
});

describe('settings and wording', () => {
    it('defaults 7″ 100 ft, 10″ 25 ft, 20 ft pipes, ₹200 drilling only; owner values kept (0 = no alert)', () => {
        expect(stockSettings({})).toEqual({ pipeFt: 20, low: { casing1: 100, casing2: 25 }, cost: { casing1: 0, casing2: 0 }, drillRate: 200, drillName: 'Re-cutting charge' });
        expect(DEFAULT_LOW).toEqual({ casing1: 100, casing2: 25 });
        expect(stockSettings({ pipeLengthFt: 18, lowStockCasing1Ft: 0, lowStockCasing2Ft: 40, pipeCost1: 2400, casing7DrillRate: 250, casing7DrillName: ' Drilling only ' }))
            .toMatchObject({ pipeFt: 18, low: { casing1: 0, casing2: 40 }, cost: { casing1: 2400, casing2: 0 }, drillRate: 250, drillName: 'Drilling only' });
    });

    it('feet and pipes for people', () => {
        expect(feetAndPipes(340)).toBe('340 ft (17 pipes)');
        expect(feetAndPipes(350)).toBe('350 ft (17 pipes + 10 ft)');
        expect(feetAndPipes(20)).toBe('20 ft (1 pipe)');
        expect(feetAndPipes(-40)).toBe('−40 ft (−2 pipes)');
        expect(feetAndPipes(0)).toBe('0 ft (0 pipes)');
        expect(feetAndPipes(9, 20)).toBe('9 ft (9 ft)');
    });
});
