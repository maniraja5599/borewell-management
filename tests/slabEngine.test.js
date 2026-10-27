// Regression tests: the billing engine must give exactly the same results as the original app.
// Golden fixtures were recorded from the pre-refactor app.js (see git history).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
    normalizeSlabArray,
    calculateNewBoreSlabs,
    calculateRepairBoreSlabs,
    computeBillTotals
} from '../src/core/slabEngine.js';

const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));

const RATE_SETS = {
    default: { slabBufferFt: 5, oldBoreRate: 40, baseDrillingRate: 90, slabRates: null },
    buffer0: { slabBufferFt: 0, oldBoreRate: 45, baseDrillingRate: 100, slabRates: null },
    custom: {
        slabBufferFt: 10, oldBoreRate: 50, baseDrillingRate: 95,
        slabRates: [{ span: 200, rate: 95 }, { span: 100, rate: 110 }, { span: 150, rate: 140 }, { span: 100, rate: 180 }]
    }
};

describe('slab engine matches original app (golden)', () => {
    const golden = load('slab-golden.json');
    it('has fixtures', () => expect(golden.length).toBeGreaterThan(1000));

    for (const { k, v } of golden) {
        const [set, kind, ...args] = k.split('|');
        const rates = structuredClone(RATE_SETS[set]);
        it(k, () => {
            let got;
            if (kind === 'normalize') got = normalizeSlabArray(rates.slabRates, rates.baseDrillingRate);
            else if (kind === 'new') got = calculateNewBoreSlabs(rates, Number(args[1]), Number(args[0]));
            else got = calculateRepairBoreSlabs(rates, Number(args[1]), Number(args[2]), Number(args[0]));
            expect(got).toEqual(v);
        });
    }
});

describe('bill totals match original app (golden)', () => {
    for (const [i, { state, rates, result }] of load('totals-golden.json').entries()) {
        it(`case ${i}`, () => expect(computeBillTotals(rates, state)).toEqual(result));
    }
});

describe('slab engine rules', () => {
    const rates = RATE_SETS.default;
    const feet = (r) => r.slabDetails.reduce((s, x) => s + x.depth, 0);

    it('bills every foot exactly once', () => {
        for (let d = 0; d <= 2500; d += 37) expect(feet(calculateNewBoreSlabs(rates, d, 90))).toBe(d);
    });

    it('applies the buffer: 305 ft stays in the first slab, 306 ft moves on', () => {
        expect(calculateNewBoreSlabs(rates, 305, 90).totalCost).toBe(305 * 90);
        expect(calculateNewBoreSlabs(rates, 306, 90).totalCost).toBe(300 * 90 + 6 * 100);
    });

    it('re-bore charges flushing rate for the old depth', () => {
        const r = calculateRepairBoreSlabs(rates, 200, 450, 90);
        expect(r.slabDetails[0]).toMatchObject({ slabIndex: -1, depth: 200, rate: 40, cost: 8000 });
        expect(feet(r)).toBe(450);
    });

    it('never lets discount or advance push totals below zero', () => {
        const t = computeBillTotals({ ...rates, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 2000, gstPercentage: 18 },
            { drillingType: 'new', totalDepth: 100, oldBoreDepth: 0, pvc7Length: 0, pvc10Length: 0, collarCapCost: 0,
              transportSurveyCost: 0, customExtraAmount: 0, discountAmount: 1e9, advancePaidAmount: 1e9, gstEnabled: true });
        expect(t.grandTotal).toBe(0);
        expect(t.balancePayable).toBe(0);
    });
});
