// Borewell depth-slab pricing engine. Pure functions: same input -> same output, no DOM, no storage.
// Covered by tests/slabEngine.test.js (golden results recorded from the original app).
import { DEPTH_SLABS_DEFINITION } from '../config/constants.js';

export function normalizeSlabArray(rawSlabs, fallbackBaseRate = 90) {
    const source = (Array.isArray(rawSlabs) && rawSlabs.length > 0)
        ? rawSlabs
        : DEPTH_SLABS_DEFINITION.map(s => ({ ...s, rate: s.defaultRate }));

    let currentStart = 1;
    return source.map((s, idx) => {
        const defaultSpan = idx === 0 ? 300 : 100;
        let span = parseInt(s.span, 10);
        if (!span || span < 10) {
            const parsedEnd = parseInt(s.end, 10);
            span = (parsedEnd && parsedEnd >= currentStart) ? (parsedEnd - currentStart + 1) : defaultSpan;
        }
        const start = currentStart;
        const end = start + span - 1;
        currentStart = end + 1;
        const rate = Math.max(1, parseFloat(s.rate ?? s.defaultRate ?? fallbackBaseRate) || fallbackBaseRate);
        const rangeStr = `${String(start).padStart(3, '0')}-${end} ft`;
        return {
            start,
            end,
            span,
            rangeStr,
            rate
        };
    });
}

export function getEffectiveSlabs(rates, overrideBaseRate, targetDepth = 0) {
    const activeBase = overrideBaseRate > 0 ? overrideBaseRate : (rates.baseDrillingRate || 90);
    const storedSlabs = normalizeSlabArray(rates.slabRates, rates.baseDrillingRate || 90);

    const firstSlabRate = storedSlabs[0]?.rate || 90;
    const delta = activeBase - firstSlabRate;

    const result = storedSlabs.map((s) => ({
        start: s.start,
        end: s.end,
        span: s.span,
        rangeStr: s.rangeStr,
        rate: Math.max(1, s.rate + delta)
    }));

    // If a borewell depth exceeds the last explicitly defined slab row, auto-extend in 100 ft steps using the last step
    const maxNeeded = Math.min(3500, Math.max(0, parseInt(targetDepth, 10) || 0));
    if (result.length > 0 && maxNeeded > result[result.length - 1].end) {
        const lastStep = result.length >= 2
            ? Math.max(0, result[result.length - 1].rate - result[result.length - 2].rate)
            : 10;
        while (result[result.length - 1].end < maxNeeded) {
            const prev = result[result.length - 1];
            const start = prev.end + 1;
            const span = 100;
            const end = start + span - 1;
            const rate = Math.max(1, prev.rate + lastStep);
            result.push({
                start,
                end,
                span,
                rangeStr: `${String(start).padStart(3, '0')}-${end} ft`,
                rate
            });
        }
    }

    return result;
}

export function calculateNewBoreSlabs(rates, totalDepth, baseRate) {
    const slabs = getEffectiveSlabs(rates, baseRate, totalDepth);
    const bufferFt = typeof rates.slabBufferFt === 'number' ? rates.slabBufferFt : 5;
    const slabDetails = [];
    let totalCost = 0;
    let remaining = totalDepth;
    let currentDepth = 1;

    for (let i = 0; i < slabs.length; i++) {
        if (remaining <= 0) break;
        const slab = slabs[i];
        const isLastSlab = (i === slabs.length - 1);

        let applicable;
        if (!isLastSlab && remaining > slab.span && (remaining - slab.span) <= bufferFt) {
            applicable = remaining;
        } else if (isLastSlab) {
            applicable = remaining;
        } else {
            applicable = Math.min(slab.span, remaining);
        }

        if (applicable > 0) {
            const cost = applicable * slab.rate;
            totalCost += cost;
            const endDepth = currentDepth + applicable - 1;
            slabDetails.push({
                slabIndex: i,
                range: `${String(currentDepth).padStart(3, '0')}–${endDepth} ft`,
                depth: applicable,
                rate: slab.rate,
                cost
            });
            currentDepth += applicable;
            remaining -= applicable;
        }
    }

    return { totalCost, slabDetails };
}

export function calculateRepairBoreSlabs(rates, oldBoreDepth, totalDepth, baseRate) {
    const slabs = getEffectiveSlabs(rates, baseRate, totalDepth);
    const bufferFt = typeof rates.slabBufferFt === 'number' ? rates.slabBufferFt : 5;
    const slabDetails = [];
    let totalCost = 0;

    const validOldDepth = Math.min(oldBoreDepth, totalDepth);
    if (validOldDepth > 0) {
        const flushCost = validOldDepth * rates.oldBoreRate;
        totalCost += flushCost;
        slabDetails.push({
            slabIndex: -1,
            range: `001–${validOldDepth} ft (Flush)`,
            depth: validOldDepth,
            rate: rates.oldBoreRate,
            cost: flushCost
        });
    }

    let remaining = Math.max(0, totalDepth - validOldDepth);
    let currentDepth = validOldDepth + 1;

    for (let i = 0; i < slabs.length; i++) {
        if (remaining <= 0) break;
        const slab = slabs[i];
        const adjStart = Math.max(slab.start, currentDepth);

        if (adjStart <= slab.end || i === slabs.length - 1) {
            const standardSpan = (i === slabs.length - 1) ? remaining : (slab.end - adjStart + 1);
            const isLastSlab = (i === slabs.length - 1);

            let applicable;
            if (!isLastSlab && remaining > standardSpan && (remaining - standardSpan) <= bufferFt) {
                applicable = remaining;
            } else {
                applicable = Math.min(standardSpan, remaining);
            }

            if (applicable > 0) {
                const adjEnd = adjStart + applicable - 1;
                const cost = applicable * slab.rate;
                totalCost += cost;
                slabDetails.push({
                    slabIndex: i,
                    range: `${String(adjStart).padStart(3, '0')}–${adjEnd} ft`,
                    depth: applicable,
                    rate: slab.rate,
                    cost
                });
                remaining -= applicable;
                currentDepth = adjEnd + 1;
            }
        }
    }

    return { totalCost, slabDetails };
}

/**
 * Full bill totals from the bill being edited (`s` = session state) and the active rate profile.
 * Returns the same object the app stores as `lastResult` and renders on the receipt.
 */
export function computeBillTotals(rates, s) {
    const totalDepth = s.totalDepth;
    const oldBoreDepth = s.oldBoreDepth;
    const baseDrillingRate = s.baseDrillingRate;
    const pvc7Length = s.pvc7Length;
    const pvc10Length = s.pvc10Length;
    const gstEnabled = s.gstEnabled;
    const custGst = (s.custGst || '').trim().toUpperCase();

    const collarCapCost = s.collarCapCost;
    const transportSurveyCost = s.transportSurveyCost;
    const customExtraLabel = s.customExtraLabel || 'Extra Charges';
    const customExtraAmount = s.customExtraAmount;
    const customNote = (s.customNote || '').trim();
    const discountAmount = s.discountAmount;
    const advancePaidAmount = s.advancePaidAmount;

    let slabCalc;
    if (s.drillingType === 'repair') {
        slabCalc = calculateRepairBoreSlabs(rates, oldBoreDepth, totalDepth, baseDrillingRate);
    } else {
        slabCalc = calculateNewBoreSlabs(rates, totalDepth, baseDrillingRate);
    }

    const drillingCost = slabCalc.totalCost;
    const pvc7Cost = pvc7Length * rates.pvc7Rate;
    const pvc10Cost = pvc10Length * rates.pvc10Rate;
    // Show ₹0 initially before any depth, pipe, or extra charge is entered; auto-apply Bore Bata as soon as billing starts
    const hasAnyBillActivity = (
        totalDepth > 0 ||
        oldBoreDepth > 0 ||
        pvc7Length > 0 ||
        pvc10Length > 0 ||
        collarCapCost > 0 ||
        transportSurveyCost > 0 ||
        customExtraAmount > 0
    );
    const boreBataCost = hasAnyBillActivity ? (rates.boreBataRate ?? 2000) : 0;

    const grossSubtotal = drillingCost + pvc7Cost + pvc10Cost + boreBataCost + collarCapCost + transportSurveyCost + customExtraAmount;
    const taxableAmount = Math.max(0, grossSubtotal - discountAmount);
    const gstAmount = gstEnabled ? Math.round((taxableAmount * rates.gstPercentage) / 100) : 0;
    const grandTotal = taxableAmount + gstAmount;
    const balancePayable = Math.max(0, grandTotal - advancePaidAmount);
    const avgPerFoot = totalDepth > 0 ? (drillingCost / totalDepth) : 0;

    const validOldBoreDepth = s.drillingType === 'repair'
        ? (totalDepth > 0 ? Math.min(oldBoreDepth, totalDepth) : oldBoreDepth)
        : 0;
    const oldBoreRate = rates.oldBoreRate || 40;
    const oldBoreCost = validOldBoreDepth * oldBoreRate;

    return {
        drillingType: s.drillingType,
        docType: s.docType || 'QUOTATION',
        boreDia: s.boreDia,
        totalDepth,
        oldBoreDepth,
        oldBoreRate,
        oldBoreCost,
        baseDrillingRate,
        pvc7Length,
        pvc7Rate: rates.pvc7Rate,
        pvc7Cost,
        pvc10Length,
        pvc10Rate: rates.pvc10Rate,
        pvc10Cost,
        boreBataCost,
        collarCapCost,
        transportSurveyCost,
        customExtraLabel,
        customExtraAmount,
        customNote,
        grossSubtotal,
        discountAmount,
        gstEnabled,
        custGst: gstEnabled ? custGst : '',
        gstPercentage: rates.gstPercentage,
        gstAmount,
        grandTotal,
        advancePaidAmount,
        balancePayable,
        avgPerFoot,
        slabDetails: slabCalc.slabDetails,
        slabBufferFt: typeof rates.slabBufferFt === 'number' ? rates.slabBufferFt : 5,
        drillingCost
    };
}
