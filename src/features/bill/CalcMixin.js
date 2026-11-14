// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { normalizeSlabArray, getEffectiveSlabs, calculateNewBoreSlabs, calculateRepairBoreSlabs, computeBillTotals, slabLadderEnd } from '../../core/slabEngine.js';

// Old sanity limit; still used for saved bills (some were billed past their slabs before the limit existed).
const SAVED_BILL_MAX_DEPTH = 2500;

export class CalcMixin {
    // New bills: only as deep as the rate card's slabs go. Saved bills keep the old limit.
    getBillDepthLimit() {
        if (this.loadedHistoryBillId) return SAVED_BILL_MAX_DEPTH;
        return slabLadderEnd(this.rates) || SAVED_BILL_MAX_DEPTH;
    }

    // Keeps the depth field's max / hint in step with the rate card, and pulls a depth that is
    // already past the last slab (restored draft, switched to a shorter rate card) back to it.
    syncDepthLimit() {
        const el = document.getElementById('totalDepth');
        if (!el) return;
        const limit = this.getBillDepthLimit();
        if (el.max !== String(limit)) el.max = String(limit);
        const hint = this.loadedHistoryBillId ? 'Enter Drilling Depth (e.g. 500)' : `Drilling depth (up to ${limit} ft)`;
        if (el.placeholder !== hint) el.placeholder = hint;
        const v = parseInt(el.value, 10) || 0;
        if (v > limit && document.activeElement !== el) {
            el.value = String(limit);
            this.showToast?.(`⚠️ Slab rates go up to ${limit} ft — depth set to ${limit} ft. Add a slab in Rates to bill deeper.`);
        }
    }

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
        this.syncDepthLimit();
        this.persistCurrentSession();

        this.lastResult = computeBillTotals(this.rates, this.state);

        this.renderReceiptUI(this.lastResult, options);
    }
}
