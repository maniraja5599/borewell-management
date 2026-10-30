// The rates a saved bill was priced with.
//
// Opening a saved bill must show the amounts it was saved with, not today's prices.
// Bills saved from now on keep a full copy of their rates (snapshot.rates). Older bills
// only kept the rates they actually used, so their rates are rebuilt from the snapshot
// on top of the current ladder.
import { getEffectiveSlabs } from './slabEngine.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Copy of the rates to keep inside a bill snapshot. */
export function ratesForSnapshot(rates) {
    const copy = clone(rates || {});
    delete copy.profileId;
    return copy;
}

/**
 * @param {object} snap          the bill's saved snapshot (computeBillTotals result)
 * @param {object} currentRates  the live rates, used only for what the snapshot lacks
 * @returns {object} rates object for computeBillTotals
 */
export function ratesForSavedBill(snap, currentRates) {
    const s = snap || {};
    if (s.rates && Array.isArray(s.rates.slabRates) && s.rates.slabRates.length) {
        return ratesForSnapshot(s.rates);
    }

    const r = ratesForSnapshot(currentRates);
    if (s.pvc7Rate > 0) r.pvc7Rate = s.pvc7Rate;
    if (s.pvc10Rate > 0) r.pvc10Rate = s.pvc10Rate;
    if (s.oldBoreRate > 0) r.oldBoreRate = s.oldBoreRate;
    if (typeof s.gstPercentage === 'number') r.gstPercentage = s.gstPercentage;
    if (typeof s.slabBufferFt === 'number') r.slabBufferFt = s.slabBufferFt;
    // Bata is only charged once the bill has work on it, so a 0 on an empty bill says nothing.
    if (typeof s.boreBataCost === 'number' && (s.boreBataCost > 0 || s.totalDepth > 0)) {
        r.boreBataRate = s.boreBataCost;
    }

    // Slabs: the slabs the bill used, with their billed ranges and rates; before and
    // after them, the current ladder moved to the bill's base rate.
    const base = s.baseDrillingRate > 0 ? s.baseDrillingRate : (r.baseDrillingRate || 90);
    const used = (Array.isArray(s.slabDetails) ? s.slabDetails : [])
        .filter((d) => d && d.slabIndex >= 0 && d.rate > 0)
        .map((d) => ({ i: d.slabIndex, rate: d.rate, ...parseRange(d.range) }))
        .filter((d) => d.start > 0 && d.end >= d.start)
        .sort((a, b) => a.i - b.i);
    const lastBilledEnd = used.length ? used[used.length - 1].end : 0;
    const cur = getEffectiveSlabs(r, base, Math.max(s.totalDepth || 0, lastBilledEnd));
    if (!used.length) {
        r.slabRates = cur.map((x) => ({ ...x }));
        r.baseDrillingRate = r.slabRates[0]?.rate || base;
        return r;
    }

    const slabs = [];
    const push = (start, end, rate) => {
        const span = end - start + 1;
        slabs.push({ start, end, span, rangeStr: `${String(start).padStart(3, '0')}-${end} ft`, rate });
    };
    // A re-bore starts mid-ladder: keep the earlier (unbilled) slabs as they are today.
    for (const c of cur) {
        if (c.end < used[0].start && slabs.length < used[0].i) push(c.start, c.end, c.rate);
    }
    used.forEach((d, k) => {
        const start = k === 0 ? (slabs.length ? slabs[slabs.length - 1].end + 1 : 1) : d.start;
        let end = k < used.length - 1 ? used[k + 1].start - 1 : d.end;
        if (k === used.length - 1) {
            // The last billed slab may be shorter (bore ended inside it) or longer (grace feet):
            // keep today's slab end when that slab starts at the same depth.
            const same = cur.find((c) => c.start === start);
            if (same && same.end > end) end = same.end;
        }
        push(start, end, d.rate);
    });
    // Later slabs: today's ladder, shifted so the steps continue from the last billed rate.
    const lastSlab = slabs[slabs.length - 1];
    const next = cur.find((c) => c.start > lastSlab.end);
    const nextIdx = next ? cur.indexOf(next) : -1;
    if (nextIdx > 0) {
        const shift = lastSlab.rate - cur[nextIdx - 1].rate;
        let start = lastSlab.end + 1;
        for (const c of cur.slice(nextIdx)) {
            const end = Math.max(start, c.end);
            push(start, end, Math.max(1, c.rate + shift));
            start = end + 1;
        }
    }
    r.slabRates = slabs;
    r.baseDrillingRate = slabs[0].rate;
    return r;
}

/** "001–300 ft" / "201-300 ft (Flush)" → { start: 1, end: 300 } */
function parseRange(range) {
    const m = String(range || '').match(/(\d+)\s*[–-]\s*(\d+)/);
    return m ? { start: parseInt(m[1], 10), end: parseInt(m[2], 10) } : { start: 0, end: 0 };
}
