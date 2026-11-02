import { describe, it, expect } from 'vitest';
import { computeBillTotals, calculateNewBoreSlabs, calculateRepairBoreSlabs, normalizeSlabArray } from '../src/core/slabEngine.js';
import { ratesForSnapshot, ratesForSavedBill } from '../src/core/billRates.js';

const sampleRates = {
    baseDrillingRate: 90,
    oldBoreRate: 40,
    pvc7Rate: 400,
    pvc10Rate: 700,
    boreBataRate: 2000,
    slabBufferFt: 5,
    gstPercentage: 18,
    slabRates: [
        { start: 1, end: 100, span: 100, rate: 90 },
        { start: 101, end: 150, span: 50, rate: 100 },
        { start: 151, end: 200, span: 50, rate: 110 },
        { start: 201, end: 250, span: 50, rate: 120 },
        { start: 251, end: 300, span: 50, rate: 130 },
        { start: 301, end: 350, span: 50, rate: 140 },
        { start: 351, end: 400, span: 50, rate: 150 },
        { start: 401, end: 450, span: 50, rate: 160 },
        { start: 451, end: 500, span: 50, rate: 170 }
    ]
};

describe('Borewell Billing Engine Workflows', () => {
    it('calculates zero bill initially before any inputs are entered', () => {
        const state = {
            drillingType: 'new',
            docType: 'INVOICE',
            totalDepth: 0,
            oldBoreDepth: 0,
            baseDrillingRate: 90,
            pvc7Length: 0,
            pvc10Length: 0,
            gstEnabled: false,
            collarCapCost: 0,
            transportSurveyCost: 0,
            customExtraAmount: 0,
            discountAmount: 0,
            advancePaidAmount: 0
        };
        const res = computeBillTotals(sampleRates, state);
        expect(res.grandTotal).toBe(0);
        expect(res.drillingCost).toBe(0);
        expect(res.boreBataCost).toBe(0);
    });

    it('auto-applies Bore Bata once depth or pipe activity starts', () => {
        const state = {
            drillingType: 'new',
            docType: 'INVOICE',
            totalDepth: 100,
            oldBoreDepth: 0,
            baseDrillingRate: 90,
            pvc7Length: 20,
            pvc10Length: 0,
            gstEnabled: false,
            collarCapCost: 0,
            transportSurveyCost: 0,
            customExtraAmount: 0,
            discountAmount: 0,
            advancePaidAmount: 0
        };
        const res = computeBillTotals(sampleRates, state);
        expect(res.drillingCost).toBe(9000);
        expect(res.pvc7Cost).toBe(8000);
        expect(res.boreBataCost).toBe(2000);
        expect(res.grandTotal).toBe(19000);
        expect(res.balancePayable).toBe(19000);
    });

    it('applies slab buffer tolerance correctly', () => {
        const res = calculateNewBoreSlabs(sampleRates, 105, 90);
        expect(res.slabDetails).toHaveLength(1);
        expect(res.slabDetails[0].depth).toBe(105);
        expect(res.slabDetails[0].rate).toBe(90);
        expect(res.totalCost).toBe(105 * 90);

        const resOver = calculateNewBoreSlabs(sampleRates, 106, 90);
        expect(resOver.slabDetails).toHaveLength(2);
        expect(resOver.slabDetails[0].depth).toBe(100);
        expect(resOver.slabDetails[0].rate).toBe(90);
        expect(resOver.slabDetails[1].depth).toBe(6);
        expect(resOver.slabDetails[1].rate).toBe(100);
        expect(resOver.totalCost).toBe(100 * 90 + 6 * 100);
    });

    it('calculates repair/re-bore with old bore offset and flushing rate', () => {
        const state = {
            drillingType: 'repair',
            docType: 'INVOICE',
            totalDepth: 300,
            oldBoreDepth: 150,
            baseDrillingRate: 90,
            pvc7Length: 0,
            pvc10Length: 0,
            gstEnabled: false,
            collarCapCost: 0,
            transportSurveyCost: 0,
            customExtraAmount: 0,
            discountAmount: 0,
            advancePaidAmount: 0
        };
        const res = computeBillTotals(sampleRates, state);
        expect(res.drillingType).toBe('repair');
        expect(res.oldBoreCost).toBe(150 * 40);
        expect(res.grandTotal).toBeGreaterThan(res.oldBoreCost);
    });

    it('calculates discount and GST without negative taxable amount', () => {
        const state = {
            drillingType: 'new',
            docType: 'INVOICE',
            totalDepth: 200,
            oldBoreDepth: 0,
            baseDrillingRate: 90,
            pvc7Length: 40,
            pvc10Length: 0,
            gstEnabled: true,
            custGst: '33AAAAA0000A1Z5',
            collarCapCost: 1500,
            transportSurveyCost: 1000,
            customExtraAmount: 500,
            discountAmount: 500000,
            advancePaidAmount: 0
        };
        const res = computeBillTotals(sampleRates, state);
        const taxableAmount = Math.max(0, res.grossSubtotal - res.discountAmount);
        expect(taxableAmount).toBe(0);
        expect(res.gstAmount).toBe(0);
        expect(res.grandTotal).toBe(0);
        expect(res.balancePayable).toBe(0);
    });

    it('correctly tracks partial payments and settlement', () => {
        const grandTotal = 150000;
        const payments = [
            { id: 'p1', date: '2026-11-01', amount: 50000, mode: 'Advance' },
            { id: 'p2', date: '2026-11-02', amount: 60000, mode: 'UPI' }
        ];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const pending = Math.max(0, grandTotal - totalPaid);
        const status = pending === 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');

        expect(totalPaid).toBe(110000);
        expect(pending).toBe(40000);
        expect(status).toBe('partial');

        payments.push({ id: 'p3', date: '2026-11-03', amount: 40000, mode: 'Cash' });
        const finalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const finalPending = Math.max(0, grandTotal - finalPaid);
        const finalStatus = finalPending === 0 ? 'paid' : 'partial';

        expect(finalPaid).toBe(150000);
        expect(finalPending).toBe(0);
        expect(finalStatus).toBe('paid');
    });

    it('normalizes slab arrays without gaps or overlaps', () => {
        const raw = [
            { span: 100, rate: 90 },
            { span: 50, rate: 100 },
            { span: 50, rate: 110 }
        ];
        const normalized = normalizeSlabArray(raw, 90);
        expect(normalized[0].start).toBe(1);
        expect(normalized[0].end).toBe(100);
        expect(normalized[1].start).toBe(101);
        expect(normalized[1].end).toBe(150);
        expect(normalized[2].start).toBe(151);
        expect(normalized[2].end).toBe(200);
    });

    it('preserves immutable prices when opening past bills via ratesForSavedBill', () => {
        const pastSnapshot = {
            baseDrillingRate: 85,
            pvc7Rate: 380,
            pvc10Rate: 650,
            boreBataCost: 1500,
            rates: {
                baseDrillingRate: 85,
                pvc7Rate: 380,
                pvc10Rate: 650,
                boreBataRate: 1500,
                slabRates: sampleRates.slabRates
            }
        };
        const currentLiveRates = {
            baseDrillingRate: 95,
            pvc7Rate: 420,
            pvc10Rate: 750,
            boreBataRate: 2500
        };
        const historical = ratesForSavedBill(pastSnapshot, currentLiveRates);
        expect(historical.baseDrillingRate).toBe(85);
        expect(historical.pvc7Rate).toBe(380);
        expect(historical.pvc10Rate).toBe(650);
        expect(historical.boreBataRate).toBe(1500);
    });
});
