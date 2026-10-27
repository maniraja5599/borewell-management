// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { normalizeSlabArray, getEffectiveSlabs, calculateNewBoreSlabs, calculateRepairBoreSlabs, computeBillTotals } from '../../core/slabEngine.js';

export class CalcMixin {
    normalizeSlabArray(rawSlabs, fallbackBaseRate = 90) {
        return normalizeSlabArray(rawSlabs, fallbackBaseRate);
    }

    getEffectiveSlabs(overrideBaseRate, targetDepth = 0) {
        return getEffectiveSlabs(this.rates, overrideBaseRate, targetDepth);
    }

    calculateNewBoreSlabs(totalDepth, baseRate) {
        return calculateNewBoreSlabs(this.rates, totalDepth, baseRate);
    }

    calculateRepairBoreSlabs(oldBoreDepth, totalDepth, baseRate) {
        return calculateRepairBoreSlabs(this.rates, oldBoreDepth, totalDepth, baseRate);
    }

    calculateAndRender(options = {}) {
        this.persistCurrentSession();

        this.lastResult = computeBillTotals(this.rates, this.state);

        this.renderReceiptUI(this.lastResult, options);
    }
}
