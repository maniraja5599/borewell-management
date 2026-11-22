// Work details of one bore point (a Final Bill), kept on the bill as `bill.work` — OUTSIDE the
// snapshot, so it never reaches the customer's bill, PDF, image or WhatsApp text.
//
//   operatorId, operator2Id   who drilled (workers list); a second operator is rare
//   compStart, compEnd        compressor hour meter (one meter for engine + compressor)
//   obFeet, obHammerId        9″ OB section = the bill's 7″ casing feet; any hammer of the rig
//   hammerId                  6.5″ section hammer; rare change: hammerChangeFt + hammer2Id
//   bits: [{ toolId, mm, atFt }]  6.5″ bits in order; mm measured before use (0.5 mm steps);
//                             atFt = depth where this bit went in (the first one starts the section)
//   waterIn, note             water yield (inches), remark
//
// Usage (feet per bit / hammer, mm history) is worked out from all bills, never stored twice.

const num = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const id = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 120 ? v : null);
export const halfMm = (v) => { const n = num(v); return n === null ? null : Math.round(n * 2) / 2; };

/** Normalise what the card collected. Returns null when nothing was entered. */
export function cleanWork(w) {
    if (!w || typeof w !== 'object') return null;
    const bits = (Array.isArray(w.bits) ? w.bits : [])
        .map((b) => ({ toolId: id(b?.toolId), mm: halfMm(b?.mm), atFt: num(b?.atFt) }))
        .filter((b) => b.toolId || b.mm !== null)
        .slice(0, 8);
    const out = {
        v: 1,
        operatorId: id(w.operatorId),
        operator2Id: id(w.operator2Id),
        compStart: num(w.compStart),
        compEnd: num(w.compEnd),
        obFeet: num(w.obFeet),
        obHammerId: id(w.obHammerId),
        hammerId: id(w.hammerId),
        hammerChangeFt: num(w.hammerChangeFt),
        hammer2Id: id(w.hammer2Id),
        bits,
        waterIn: num(w.waterIn),
        note: String(w.note || '').trim().slice(0, 200)
    };
    const empty = !out.operatorId && !out.operator2Id && out.compEnd === null && !out.obHammerId && !out.hammerId
        && !bits.length && out.waterIn === null && !out.note;
    return empty ? null : out;
}

/** Problems that stop a save (only when the owner made work details required) or are plainly wrong. */
export function checkWork(w, { required = false, totalDepth = 0 } = {}) {
    if (!w) return required ? 'Fill the work details: operator, compressor reading and bit.' : null;
    if (w.compStart !== null && w.compEnd !== null && w.compEnd < w.compStart) return 'Compressor closing reading is less than the starting reading.';
    if (w.compEnd !== null && w.compEnd - (w.compStart ?? w.compEnd) > 200) return 'Compressor hours look too high for one bore. Check the readings.';
    for (const b of w.bits.slice(1)) {
        if (b.atFt === null || b.atFt <= 0) return 'Enter the depth (ft) where the bit was changed.';
        if (totalDepth && b.atFt >= totalDepth) return 'The bit change depth must be less than the total depth.';
    }
    for (let i = 2; i < w.bits.length; i++) if (w.bits[i].atFt <= w.bits[i - 1].atFt) return 'Bit changes must go deeper each time.';
    for (const b of w.bits) if (b.mm !== null && (b.mm < 100 || b.mm > 300)) return 'Bit size should be in mm, for example 164.5.';
    if (w.hammer2Id && (w.hammerChangeFt === null || w.hammerChangeFt <= 0)) return 'Enter the depth (ft) where the hammer was changed.';
    if (required) {
        if (!w.operatorId) return 'Choose the operator.';
        if (w.compEnd === null) return 'Enter the compressor closing reading.';
        if (!w.bits.length || !w.bits[0].toolId) return 'Choose the bit.';
        if (w.bits.some((b) => b.toolId && b.mm === null)) return 'Enter the bit size (mm).';
    }
    return null;
}

/**
 * Feet drilled by each tool on one bore. start = where the 6.5″ section starts
 * (after the OB section; for a re-bore, the old depth).
 */
export function boreSegments(bill) {
    const w = bill?.work;
    const s = bill?.snapshot || {};
    const total = Math.max(0, Number(s.totalDepth) || 0);
    if (!w || !total) return [];
    const repair = s.drillingType === 'repair';
    const ob = repair ? 0 : Math.min(total, Math.max(0, Number(w.obFeet) || 0));
    const start = repair ? Math.min(total, Math.max(0, Number(s.oldBoreDepth) || 0)) : ob;
    const out = [];
    if (ob > 0 && w.obHammerId) out.push({ toolId: w.obHammerId, kind: 'hammer', from: 0, to: ob });
    // 6.5″ hammers
    if (w.hammerId) {
        const change = w.hammer2Id && w.hammerChangeFt > start && w.hammerChangeFt < total ? w.hammerChangeFt : total;
        out.push({ toolId: w.hammerId, kind: 'hammer', from: start, to: change });
        if (change < total) out.push({ toolId: w.hammer2Id, kind: 'hammer', from: change, to: total });
    }
    // 6.5″ bits in order
    const bits = (w.bits || []).filter((b) => b.toolId);
    bits.forEach((b, i) => {
        const from = i === 0 ? start : Math.min(total, Math.max(start, Number(b.atFt) || start));
        const next = bits[i + 1];
        const to = next ? Math.min(total, Math.max(from, Number(next.atFt) || total)) : total;
        out.push({ toolId: b.toolId, kind: 'bit', from, to, mm: b.mm });
    });
    return out.filter((x) => x.to > x.from || x.kind === 'bit');
}

const billDay = (b) => String(b?.billDate || b?.createdAt || '').slice(0, 10);
const isFinal = (b) => (b?.snapshot?.docType || 'QUOTATION') === 'INVOICE';

/**
 * Usage of every tool across all final bills: { [toolId]: { feet, bores, firstUsedOn, lastUsedOn, mm: [{ day, billNo, mm }] } }
 * (mm in bill-date order, so the last one is the latest measurement).
 */
export function toolUsage(bills) {
    const use = {};
    const list = (bills || []).filter((b) => b && b.work && isFinal(b))
        .sort((a, b) => billDay(a).localeCompare(billDay(b)) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    for (const b of list) {
        const day = billDay(b);
        const seen = new Set();
        for (const seg of boreSegments(b)) {
            const u = use[seg.toolId] || (use[seg.toolId] = { feet: 0, bores: 0, firstUsedOn: day, lastUsedOn: day, mm: [] });
            u.feet += Math.max(0, seg.to - seg.from);
            u.lastUsedOn = day;
            if (!seen.has(seg.toolId)) { u.bores += 1; seen.add(seg.toolId); }
            if (seg.kind === 'bit' && seg.mm !== null && seg.mm !== undefined) u.mm.push({ day, billNo: b.billNo, mm: seg.mm });
        }
    }
    for (const u of Object.values(use)) u.feet = Math.round(u.feet);
    return use;
}

/** The bit's latest measured size: last work entry, else its new size. */
export function lastMm(tool, usage) {
    const m = usage?.[tool?.id]?.mm;
    return m && m.length ? m[m.length - 1].mm : (num(tool?.newMm) ?? null);
}

/** The rig's last compressor closing reading (for the next bore's start), skipping one bill (being edited). */
export function lastClosing(bills, rigId, { exceptId = null, rigOf = (b) => b.rigId || null } = {}) {
    let best = null;
    for (const b of bills || []) {
        if (!b || b.id === exceptId || !b.work || b.work.compEnd === null || b.work.compEnd === undefined) continue;
        if (rigId && rigOf(b) !== rigId) continue;
        const key = `${billDay(b)} ${b.createdAt || ''}`;
        if (!best || key > best.key) best = { key, value: Number(b.work.compEnd) };
    }
    return best ? best.value : null;
}

/** Warnings for the card and the tools list. limits: toolsMath.toolLimits(brand). */
export function toolWarning(tool, usage, limits) {
    if (!tool) return null;
    if (tool.tool === 'bit') {
        const mm = lastMm(tool, usage);
        if (mm !== null && mm < limits.bitWarnMm) return `${mm} mm — below ${limits.bitWarnMm} mm`;
        return null;
    }
    const feet = usage?.[tool.id]?.feet || 0;
    const max = limits.hammerWarnFt[tool.size] || limits.hammerWarnFt['6.5'];
    if (feet >= max) return `${feet.toLocaleString('en-IN')} ft — past ${max.toLocaleString('en-IN')} ft`;
    return null;
}

/**
 * toolUsage for the app's bill book, worked out again only when the bills changed
 * (50,000 bills take ~0.2 s on a PC, more on a phone). `version` = app._bigListVersion,
 * which goes up on every save of a big list.
 */
const usageCache = new WeakMap();
export function cachedToolUsage(bills, version = 0) {
    if (!Array.isArray(bills)) return {};
    const hit = usageCache.get(bills);
    if (hit && hit.len === bills.length && hit.version === version && hit.first === bills[0]) return hit.value;
    const value = toolUsage(bills);
    usageCache.set(bills, { len: bills.length, version, first: bills[0], value });
    return value;
}

