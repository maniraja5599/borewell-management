import { describe, it, expect } from 'vitest';
import { computeBillTotals } from '../src/core/slabEngine.js';
import { ratesForSavedBill, ratesForSnapshot } from '../src/core/billRates.js';
import { DEPTH_SLABS_DEFINITION } from '../src/config/constants.js';

const ladder = (shift = 0) => DEPTH_SLABS_DEFINITION.map((s) => ({
    start: s.start, end: s.end, span: s.span, rangeStr: s.rangeStr, rate: s.defaultRate + shift
}));
const standard = {
    baseDrillingRate: 90, oldBoreRate: 40, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 2000,
    slabBufferFt: 5, gstPercentage: 18, slabRates: ladder()
};
// "Today" the owner uses a pricier card: other pipes, other bata, other steps.
const today = {
    baseDrillingRate: 110, oldBoreRate: 50, pvc7Rate: 500, pvc10Rate: 750, boreBataRate: 2500,
    slabBufferFt: 0, gstPercentage: 12,
    slabRates: [{ start: 1, end: 300, span: 300, rangeStr: '001-300 ft', rate: 110 }],
    profileId: 'rp_x'
};
const bill = (over = {}) => ({
    drillingType: 'new', docType: 'INVOICE', boreDia: '6.5"', totalDepth: 500, oldBoreDepth: 0,
    baseDrillingRate: 90, pvc7Length: 100, pvc10Length: 20, gstEnabled: true, custGst: '',
    collarCapCost: 1500, transportSurveyCost: 1000, customExtraLabel: 'MS Pipe', customExtraAmount: 500,
    customNote: '', discountAmount: 2000, advancePaidAmount: 10000, ...over
});

// A bill saved by the old app version: snapshot without `rates`.
const savedOld = (rates, state) => computeBillTotals(rates, state);
const reopened = (snap, state) => computeBillTotals(ratesForSavedBill(snap, today), state);

describe('a saved bill keeps its own prices when opened later', () => {
    const cases = {
        'new bore with casing, extras, GST': bill(),
        'buffer grace (305 ft)': bill({ totalDepth: 305 }),
        'deep bore past the ladder (2500 ft)': bill({ totalDepth: 2500 }),
        're-bore with flushing': bill({ drillingType: 'repair', oldBoreDepth: 200 }),
        're-bore whose old depth passes the first slab': bill({ drillingType: 'repair', oldBoreDepth: 350, totalDepth: 700 }),
        'bore ending inside a slab (450 ft)': bill({ totalDepth: 450 }),
        'empty bill': bill({ totalDepth: 0, pvc7Length: 0, pvc10Length: 0, collarCapCost: 0, transportSurveyCost: 0, customExtraAmount: 0 })
    };
    for (const [name, state] of Object.entries(cases)) {
        it(name, () => {
            const snap = savedOld(standard, state);
            const again = reopened(snap, state);
            for (const k of ['drillingCost', 'pvc7Cost', 'pvc10Cost', 'boreBataCost', 'gstAmount', 'grandTotal', 'balancePayable']) {
                expect([k, again[k]]).toEqual([k, snap[k]]);
            }
        });
    }

    it('a bill priced with a base-rate override keeps that base', () => {
        const state = bill({ baseDrillingRate: 100 });
        const snap = savedOld(standard, state);
        expect(reopened(snap, state).grandTotal).toBe(snap.grandTotal);
    });

    it('bills saved now carry their full rates and are rebuilt exactly', () => {
        const state = bill({ totalDepth: 900 });
        const snap = { ...savedOld(standard, state), rates: ratesForSnapshot(standard) };
        const r = ratesForSavedBill(snap, today);
        expect(r.slabRates).toEqual(standard.slabRates);
        expect(r.pvc7Rate).toBe(400);
        // making the bill deeper later still uses the bill's own ladder
        expect(computeBillTotals(r, { ...state, totalDepth: 1200 }).drillingCost)
            .toBe(computeBillTotals(standard, { ...state, totalDepth: 1200 }).drillingCost);
    });

    it('never carries the live-only profileId', () => {
        expect('profileId' in ratesForSavedBill(savedOld(standard, bill()), today)).toBe(false);
        expect('profileId' in ratesForSnapshot(today)).toBe(false);
    });
});
