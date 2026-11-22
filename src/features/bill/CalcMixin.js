// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { normalizeSlabArray, getEffectiveSlabs, calculateNewBoreSlabs, calculateRepairBoreSlabs, computeBillTotals, slabLadderEnd } from '../../core/slabEngine.js';

// Old sanity limit; still used for saved bills (some were billed past their slabs before the limit existed).
const SAVED_BILL_MAX_DEPTH = 2500;

export class CalcMixin {
    // New bills: only as deep as the rate card's slabs go. Saved bills keep the old limit.
    // A bill can never be deeper than the rate card's last slab (the owner's rule): no price exists
    // past it. A saved bill being edited keeps its own depth even if the slabs were shortened later.
    getBillDepthLimit() {
        const ladder = slabLadderEnd(this.rates) || 0;
        if (this.loadedHistoryBillId) {
            const saved = (this.history || []).find((h) => h.id === this.loadedHistoryBillId);
            return Math.max(ladder, Number(saved?.snapshot?.totalDepth) || 0) || SAVED_BILL_MAX_DEPTH;
        }
        return ladder || SAVED_BILL_MAX_DEPTH;
    }

    // Keeps the depth field's max / hint in step with the rate card, and pulls a depth that is
    // already past the last slab (restored draft, switched to a shorter rate card) back to it.
    syncDepthLimit() {
        const el = document.getElementById('totalDepth');
        if (!el) return;
        const limit = this.getBillDepthLimit();
        if (el.max !== String(limit)) el.max = String(limit);
        const hint = `Drilling depth (up to ${limit} ft)`;
        if (el.placeholder !== hint) el.placeholder = hint;
        const v = parseInt(el.value, 10) || 0;
        if (v > limit && document.activeElement !== el) {
            el.value = String(limit);
            this.showDepthLimitMsg?.(v, limit);
        }
        if (v < limit) this.hideDepthLimitMsg?.();
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
        if (!this.loadedHistoryBillId) this.state.paymentDiscount = 0;
        this.persistCurrentSession();

        this.lastResult = computeBillTotals(this.rates, this.state);

        this.renderReceiptUI(this.lastResult, options);
    }
}
