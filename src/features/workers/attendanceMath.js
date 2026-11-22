// Attendance and wages of workers (operators, helpers, labour, office staff). Nobody here signs in.
//
// One record per worker per day (kind 'attendance', migration 0017), id att_<workerId>_<date>, so two
// phones marking the same day change the same record:
//   { id, workerId, workerName, date, status, rigId, by: { id, name }, updatedAt }
//   status: present (full wage) | half (half wage) | absent (none) | holiday (none, not absent) | none (cleared)
// The wage of a day is the worker's daily wage on that day (workersMath.wageOn).
// Advances and wage payments are cash entries (cash/cashMath.js types 'advance' and 'wage' with
// workerId), so they also leave the payer's cash in hand.
//
// Balance of a worker = wages earned − advances − wages paid.
//   > 0  we owe them        < 0  they owe us (advance not yet worked off)
// Only active workers are marked (status 'left' = inactive); inactive ones keep their balance.
import { wageOn, todayYmd, workerLabel } from './workersMath.js';

export const STATUSES = [
    { key: 'present', label: 'Present', share: 1 },
    { key: 'half', label: 'Half day', share: 0.5 },
    { key: 'absent', label: 'Absent', share: 0 },
    { key: 'holiday', label: 'Holiday', share: 0 }
];
const SHARE = Object.fromEntries(STATUSES.map((s) => [s.key, s.share]));
export const PAY_CYCLES = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'any', label: 'Any time' }
];
export const payCycleOf = (w) => (PAY_CYCLES.some((c) => c.key === w?.payCycle) ? w.payCycle : 'daily');
export const isActive = (w) => !!w && w.status !== 'left';

const ymdOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const pad = (n) => String(n).padStart(2, '0');
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (ymd, n) => { const d = parse(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };

export const attId = (workerId, ymd) => `att_${workerId}_${ymd}`;

/** The record for marking a worker on a day. Returns { record } or { error }. */
export function markDay(worker, date, status, { by = null, now = new Date() } = {}) {
    if (!worker?.id) return { error: 'Choose the worker.' };
    if (!ymdOk(date)) return { error: 'Choose the date.' };
    if (date > todayYmd(now)) return { error: 'You cannot mark a day that has not come yet.' };
    if (status !== 'none' && !(status in SHARE)) return { error: 'Choose present, half day or absent.' };
    return {
        record: {
            id: attId(worker.id, date),
            workerId: worker.id,
            workerName: workerLabel(worker),
            date,
            status,
            rigId: worker.rigId || null,
            by: by?.id ? { id: by.id, name: String(by.name || '').slice(0, 80) } : null,
            updatedAt: now.toISOString()
        }
    };
}

/** Put records into the list (same id = replaced). */
export function upsertAll(list, records) {
    const by = new Map(records.map((r) => [r.id, r]));
    const out = (list || []).map((x) => (x && by.has(x.id) ? by.get(x.id) : x));
    for (const r of records) if (!(list || []).some((x) => x && x.id === r.id)) out.push(r);
    return out;
}

/** workerId → status on a day ('none' and missing are left out). */
export function marksOn(attendance, date) {
    const m = new Map();
    for (const a of attendance || []) if (a && !a.deleted && a.date === date && a.status && a.status !== 'none') m.set(a.workerId, a.status);
    return m;
}

/** Counts and wages for one day: { present, half, absent, holiday, unmarked, wages }. */
export function daySummary(workers, attendance, date) {
    const marks = marksOn(attendance, date);
    const s = { present: 0, half: 0, absent: 0, holiday: 0, unmarked: 0, wages: 0 };
    for (const w of workers || []) {
        const st = marks.get(w.id);
        if (!st) { s.unmarked += 1; continue; }
        s[st] += 1;
        s.wages += Math.round(wageOn(w, date) * SHARE[st]);
    }
    return s;
}

/** Mark everyone in the list (e.g. all present, or a holiday for all). Only active workers. */
export function markAll(workers, date, status, opts = {}) {
    const out = [];
    for (const w of workers || []) {
        if (!isActive(w)) continue;
        const r = markDay(w, date, status, opts);
        if (r.error) return { error: r.error };
        out.push(r.record);
    }
    return { records: out };
}

const moneyFor = (cash, workerId) => (cash || []).filter((e) => e && !e.deleted && e.workerId === workerId && (e.type === 'advance' || e.type === 'wage'));

/**
 * Everything about one worker up to `until`: days, wages earned, advances, wages paid, balance and the
 * lines behind them (latest first).
 */
export function ledger(worker, attendance, cash, { from = '', until = todayYmd() } = {}) {
    const t = { present: 0, half: 0, absent: 0, holiday: 0, days: 0, earned: 0, advances: 0, paid: 0 };
    const lines = [];
    for (const a of attendance || []) {
        if (!a || a.deleted || a.workerId !== worker?.id || !(a.status in SHARE) || a.date < from || a.date > until) continue;
        t[a.status] += 1;
        const share = SHARE[a.status];
        t.days += share;
        const amt = Math.round(wageOn(worker, a.date) * share);
        t.earned += amt;
        lines.push({ date: a.date, kind: 'day', status: a.status, amount: amt });
    }
    for (const e of moneyFor(cash, worker?.id)) {
        if (e.date < from || e.date > until) continue;
        const amt = Math.round(Number(e.amount) || 0);
        if (e.type === 'advance') t.advances += amt; else t.paid += amt;
        lines.push({ date: e.date, kind: e.type, amount: amt, entry: e });
    }
    lines.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'day' ? 1 : -1));
    return { ...t, balance: t.earned - t.advances - t.paid, lines };
}

/** The pay period now for this worker's cycle: { start, end, label }. */
export function cycleRange(worker, cash, today = todayYmd()) {
    const cycle = payCycleOf(worker);
    if (cycle === 'daily') return { start: today, end: today, label: 'Today' };
    if (cycle === 'weekly') {
        const dow = (parse(today).getDay() + 6) % 7; // Monday = 0
        return { start: addDays(today, -dow), end: today, label: 'This week' };
    }
    if (cycle === 'monthly') return { start: `${today.slice(0, 8)}01`, end: today, label: 'This month' };
    const last = moneyFor(cash, worker?.id).filter((e) => e.type === 'wage' && e.date <= today).map((e) => e.date).sort().pop();
    return { start: last ? addDays(last, 1) : '', end: today, label: last ? 'Since last pay' : 'So far' };
}

/**
 * The line under a worker on the wages list: this period + what to pay now.
 * toPay = the whole balance when it is positive (they are owed), else 0.
 */
export function payNow(worker, attendance, cash, today = todayYmd()) {
    const all = ledger(worker, attendance, cash, { until: today });
    const range = cycleRange(worker, cash, today);
    const period = ledger(worker, attendance, cash, { from: range.start, until: range.end });
    return { range, period, balance: all.balance, toPay: Math.max(0, all.balance), owesUs: Math.max(0, -all.balance) };
}

export const fmtDays = (d) => (Number.isInteger(d) ? String(d) : d.toFixed(1));
