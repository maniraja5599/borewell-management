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
//   boreLog: [{ ft, strata, water, note }]  bore log: what came up at each depth, shallow first.
//                             An entry = the layer from the previous entry's depth down to `ft`.
//   run: { startAt, endAt }   drilling run: when Start / Stop drilling was pressed (ms)
//   lateRods: [{ rods, rate, note }]  extra rods used after the quote; the owner may add them to the bill
//
// Usage (feet per bit / hammer, mm history) is worked out from all bills, never stored twice.

const num = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const id = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 120 ? v : null);
export const halfMm = (v) => { const n = num(v); return n === null ? null : Math.round(n * 2) / 2; };

const cleanGps = (g) => {
    if (!g || typeof g !== 'object') return null;
    const lat = num(g.lat); const lng = num(g.lng);
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const acc = num(g.acc); const at = num(g.at);
    return {
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        ...(acc !== null ? { acc: Math.round(acc) } : {}),
        ...(at !== null ? { at } : {})
    };
};

/** Layers the crew can pick in the bore log (key, label, colour for the strata column). */
export const STRATA = [
    { key: 'soil', label: 'Soil / red earth', color: '#b45309' },
    { key: 'clay', label: 'Clay', color: '#a16207' },
    { key: 'sand', label: 'Sand / gravel', color: '#ca8a04' },
    { key: 'murram', label: 'Murram / weathered rock', color: '#d97706' },
    { key: 'soft', label: 'Soft rock', color: '#78716c' },
    { key: 'fractured', label: 'Fractured rock', color: '#0e7490' },
    { key: 'hard', label: 'Hard rock / granite', color: '#334155' },
    { key: 'other', label: 'Other', color: '#94a3b8' }
];
export const strataOf = (key) => STRATA.find((x) => x.key === key) || null;

/** Clean bore log entries: depth > 0, known layer, shallow first, at most 40. */
export function cleanBoreLog(arr) {
    return (Array.isArray(arr) ? arr : [])
        .map((e) => ({
            ft: num(e?.ft),
            strata: strataOf(e?.strata) ? e.strata : null,
            water: e?.water === true,
            note: String(e?.note || '').trim().slice(0, 80)
        }))
        .filter((e) => e.ft !== null && e.ft > 0 && (e.strata || e.water || e.note))
        .sort((a, b) => a.ft - b.ft)
        .slice(0, 40)
        .map((e) => ({ ft: Math.round(e.ft), ...(e.strata ? { strata: e.strata } : {}), ...(e.water ? { water: true } : {}), ...(e.note ? { note: e.note } : {}) }));
}

/** Bore log as layers: [{ from, to, strata, water, note }] (for the strata column and reports). */
export function boreLayers(log) {
    let from = 0;
    return cleanBoreLog(log).map((e) => {
        const layer = { from, to: e.ft, strata: e.strata || null, water: !!e.water, note: e.note || '' };
        from = e.ft;
        return layer;
    }).filter((l) => l.to > l.from);
}

/** Drilling run: { startAt, endAt } in ms, or null. endAt only with a startAt. */
export function cleanRun(r) {
    if (!r || typeof r !== 'object') return null;
    const startAt = num(r.startAt);
    if (startAt === null || startAt <= 0) return null;
    const endAt = num(r.endAt);
    return { startAt, ...(endAt !== null && endAt > 0 ? { endAt } : {}) };
}

/** Minutes of a run (to now while still drilling). */
export function runMinutes(run, now = Date.now()) {
    const r = cleanRun(run);
    if (!r) return 0;
    return Math.max(0, Math.round(((r.endAt ?? now) - r.startAt) / 60000));
}

export const fmtMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} m`);

/** Late rods: whole rods > 0, rate >= 0, at most 10 rows. */
export function cleanLateRods(arr) {
    return (Array.isArray(arr) ? arr : [])
        .map((r) => ({ rods: num(r?.rods), rate: num(r?.rate), note: String(r?.note || '').trim().slice(0, 80) }))
        .filter((r) => r.rods !== null && r.rods > 0)
        .slice(0, 10)
        .map((r) => ({ rods: Math.round(r.rods), ...(r.rate !== null && r.rate > 0 ? { rate: Math.round(r.rate) } : {}), ...(r.note ? { note: r.note } : {}) }));
}

/** { rods, amount } over all late rod rows. */
export function lateRodsTotal(arr) {
    return cleanLateRods(arr).reduce((t, r) => ({ rods: t.rods + r.rods, amount: t.amount + r.rods * (r.rate || 0) }), { rods: 0, amount: 0 });
}

/** Normalise what the card collected. Returns null when nothing was entered. */
export function cleanWork(w) {
    if (!w || typeof w !== 'object') return null;
    const bits = (Array.isArray(w.bits) ? w.bits : [])
        .map((b) => ({ toolId: id(b?.toolId), mm: halfMm(b?.mm), atFt: num(b?.atFt) }))
        .filter((b) => b.toolId || b.mm !== null)
        .slice(0, 8);
    const gps = cleanGps(w.gps);
    const boreLog = cleanBoreLog(w.boreLog);
    const run = cleanRun(w.run);
    const lateRods = cleanLateRods(w.lateRods);
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
        boreResult: ['pending', 'water', 'dry'].includes(w.boreResult) ? w.boreResult : null,
        gps,
        ...(boreLog.length ? { boreLog } : {}),
        ...(run ? { run } : {}),
        ...(lateRods.length ? { lateRods } : {}),
        note: String(w.note || '').trim().slice(0, 200)
    };
    const empty = !out.operatorId && !out.operator2Id && out.compEnd === null && !out.obHammerId && !out.hammerId
        && !bits.length && out.waterIn === null && !out.boreResult && !gps && !out.note && !boreLog.length && !run && !lateRods.length;
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
    if (w.run?.endAt && w.run.endAt < w.run.startAt) return 'Drilling stop time is before the start time.';
    if (w.run && !w.run.endAt && required) return 'Drilling is still running. Press Stop drilling first.';
    const log = w.boreLog || [];
    for (let i = 1; i < log.length; i++) if (log[i].ft === log[i - 1].ft) return `Bore log has ${log[i].ft} ft twice. Keep one entry per depth.`;
    if (totalDepth && log.length && log[log.length - 1].ft > totalDepth) return `Bore log goes to ${log[log.length - 1].ft} ft, deeper than the total depth (${totalDepth} ft).`;
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

