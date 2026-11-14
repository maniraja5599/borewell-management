import { describe, it, expect } from 'vitest';
import { BillFlowMixin } from '../src/features/bill/BillFlowMixin.js';

const app = (state) => Object.assign(Object.create(BillFlowMixin.prototype), { state });

describe('"New Bill" tab keeps a quotation that is being typed', () => {
    it('an empty form is not in progress (so it may go back to Final Bill)', () => {
        expect(app({ docType: 'QUOTATION', totalDepth: 0, pvc7Length: 0 }).isBillFormInProgress()).toBe(false);
        expect(app({}).isBillFormInProgress()).toBe(false);
    });

    it('a customer, depth, pipes, extras, discount or advance means in progress', () => {
        for (const s of [
            { custName: 'Ravi' }, { totalDepth: 300 }, { oldBoreDepth: 100 }, { pvc7Length: 20 }, { pvc10Length: 10 },
            { collarCapCost: 500 }, { transportSurveyCost: 200 }, { customExtraAmount: 100 }, { discountAmount: 50 }, { advancePaidAmount: 1000 }
        ]) {
            expect(app({ docType: 'QUOTATION', ...s }).isBillFormInProgress()).toBe(true);
        }
    });

    it('blank text and zeros do not count', () => {
        expect(app({ custName: '   ', totalDepth: '0', pvc7Length: null }).isBillFormInProgress()).toBe(false);
    });
});
