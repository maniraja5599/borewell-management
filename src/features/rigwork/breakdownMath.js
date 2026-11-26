// Rig status and breakdowns. A breakdown is reported when the rig stops (reason, when, note) and
// closed when it works again (when, repair cost, note). Downtime = closed − started (or until now
// while it is still down). Pure functions: no DOM, no storage.
//
// Record: { id, rigId, reason, startAt (ms), endAt (ms | null), cost, note, fixNote, createdAt, updatedAt }

export const REASONS = [
    { key: 'engine', label: 'Engine' },
    { key: 'compressor', label: 'Compressor' },
    { key: 'hydraulic', label: 'Hydraulic' },
    { key: 'stuck', label: 'Rod / hammer stuck' },
    { key: 'vehicle', label: 'Truck / tyre' },
    { key: 'electrical', label: 'Electrical' },
    { key: 'other', label: 'Other' }
];
export const reasonLabel = (k) => (REASONS.find((r) => r.key === k) || REASONS[REASONS.length - 1]).label;

const HOUR = 3600000;
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const ymdOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** New breakdown. Returns { record } or { error }. */
export function reportBreakdown({ rigId, reason, startAt, note } = {}, { list = [], now = Date.now() } = {}) {
    if (!REASONS.some((r) => r.key === reason)) return { error: 'Choose what broke.' };
    const start = num(startAt) ?? now;
    if (start > now + 5 * 60000) return { error: 'The time cannot be in the future.' };
    if (openBreakdown(list, rigId)) return { error: 'This rig is already marked down. Mark it fixed first.' };
    const at = new Date(now).toISOString();
    return {
        record: {
            id: `bd_${now}_${Math.random().toString(36).slice(2, 7)}`,
            rigId: rigId || 'local',
            reason,
            startAt: start,
            endAt: null,
            cost: 0,
            note: text(note, 200),
            fixNote: '',
            createdAt: at,
            updatedAt: at
        }
    };
}

/** Close (or edit the close of) a breakdown. Returns { record } or { error }. */
export function fixBreakdown(rec, { endAt, cost, fixNote } = {}, now = Date.now()) {
    const end = num(endAt) ?? now;
    if (end < rec.startAt) return { error: 'Fixed time is before the breakdown time.' };
    if (end > now + 5 * 60000) return { error: 'The time cannot be in the future.' };
    const c = num(cost) ?? 0;
    if (c < 0 || c > 5000000) return { error: 'Enter the repair cost in rupees.' };
    return { record: { ...rec, endAt: end, cost: Math.round(c), fixNote: text(fixNote, 200), updatedAt: new Date(now).toISOString() } };
}

const onRig = (b, rigId) => !rigId || (b.rigId || 'local') === rigId;

/** The rig's open breakdown, or null. */
export function openBreakdown(list, rigId) {
    return (list || []).filter((b) => b && !b.deleted && !b.endAt && onRig(b, rigId)).sort((a, b) => b.startAt - a.startAt)[0] || null;
}

/** Downtime hours of one breakdown (to now while open), 1 decimal. */
export function downHours(b, now = Date.now()) {
    if (!b) return 0;
    return Math.round((Math.max(0, (b.endAt || now) - b.startAt) / HOUR) * 10) / 10;
}

export const fmtHours = (h) => (h >= 48 ? `${Math.floor(h / 24)} d ${Math.round(h % 24)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h * 60)} min`);

/** Downtime hours of a breakdown that fall between two times (for a month). */
function overlapHours(b, from, to, now) {
    const s = Math.max(b.startAt, from);
    const e = Math.min(b.endAt || now, to);
    return e > s ? (e - s) / HOUR : 0;
}

/** Month figures for a rig: { count, hours, cost, byReason: [{ key, label, count, hours, cost }] } (month = 'YYYY-MM'). */
export function monthSummary(list, rigId, month, now = Date.now()) {
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1).getTime();
    const to = new Date(y, m, 1).getTime();
    const out = { count: 0, hours: 0, cost: 0, byReason: [] };
    const by = new Map();
    for (const b of list || []) {
        if (!b || b.deleted || !onRig(b, rigId)) continue;
        const h = overlapHours(b, from, to, now);
        const started = b.startAt >= from && b.startAt < to;
        const costHere = b.endAt && b.endAt >= from && b.endAt < to ? (Number(b.cost) || 0) : 0;
        if (!h && !started && !costHere) continue;
        if (started) out.count += 1;
        out.hours += h;
        out.cost += costHere;
        const r = by.get(b.reason) || { key: b.reason, label: reasonLabel(b.reason), count: 0, hours: 0, cost: 0 };
        if (started) r.count += 1;
        r.hours += h; r.cost += costHere;
        by.set(b.reason, r);
    }
    out.hours = Math.round(out.hours * 10) / 10;
    out.byReason = [...by.values()].map((r) => ({ ...r, hours: Math.round(r.hours * 10) / 10 })).sort((a, b) => b.hours - a.hours);
    return out;
}

/**
 * Rig status now: { state: 'down' | 'working' | 'idle', since?, hours?, breakdown?, feetToday, boresToday, drilling }
 * todayBills: the rig's Final Bills dated today; drillingNow: a work-details run is going on.
 */
export function rigStatus(list, rigId, { todayBills = [], drillingNow = false, now = Date.now() } = {}) {
    const feetToday = todayBills.reduce((s, b) => {
        const snap = b?.snapshot || {};
        const t = Math.max(0, Number(snap.totalDepth) || 0);
        return s + (snap.drillingType === 'repair' ? Math.max(0, t - (Number(snap.oldBoreDepth) || 0)) : t);
    }, 0);
    const base = { feetToday, boresToday: todayBills.length, drilling: !!drillingNow };
    const open = openBreakdown(list, rigId);
    if (open) return { ...base, state: 'down', since: open.startAt, hours: downHours(open, now), breakdown: open };
    return { ...base, state: drillingNow || todayBills.length ? 'working' : 'idle' };
}

/** History newest first. */
export const history = (list, rigId) => (list || []).filter((b) => b && !b.deleted && onRig(b, rigId)).sort((a, b) => b.startAt - a.startAt);
