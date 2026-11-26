// Daily site report: what a rig did on one day — bores and feet drilled (Final Bills dated that
// day), compressor hours and drilling time (work details), diesel filled and other spend (cash
// entries), crew present (attendance) and money collected (bill payments dated that day).
// Pure functions: lists in, figures out. "On this rig" is decided by the caller (onRig* filters).
import { isInvoice, billDay, totalOf } from './reportMath.js';
import { runMinutes } from '../work/workMath.js';
import { cashCounts, paymentCounts } from '../approvals/approvalMath.js';

const r1 = (n) => Math.round(n * 10) / 10;
const all = () => true;

/** Feet drilled on one bore: a re-bore only counts below the old depth. */
export function feetDrilled(bill) {
    const s = bill?.snapshot || {};
    const total = Math.max(0, Number(s.totalDepth) || 0);
    if (s.drillingType === 'repair') return Math.max(0, total - Math.max(0, Number(s.oldBoreDepth) || 0));
    return total;
}

/** Compressor hours on one bore (closing − start), or 0. */
export function compHours(bill) {
    const w = bill?.work;
    if (!w || w.compStart === null || w.compStart === undefined || w.compEnd === null || w.compEnd === undefined) return 0;
    const h = Number(w.compEnd) - Number(w.compStart);
    return Number.isFinite(h) && h > 0 ? h : 0;
}

/** Payment day (YYYY-MM-DD) — old payments without a date count on the bill date. */
const payDay = (p, bill) => (typeof p?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(p.date) ? p.date.slice(0, 10) : billDay(bill));

/**
 * One day's report.
 * opts: { onRigBill, onRigCash, onRigAttendance } filters (default: everything).
 */
export function dayReport({ bills = [], cash = [], attendance = [] } = {}, day, opts = {}) {
    const onBill = opts.onRigBill || all;
    const onCash = opts.onRigCash || all;
    const onAtt = opts.onRigAttendance || all;

    const finals = (bills || []).filter((b) => b && isInvoice(b) && onBill(b));
    const bores = finals.filter((b) => billDay(b) === day).map((b) => ({
        bill: b,
        feet: feetDrilled(b),
        rebore: b.snapshot?.drillingType === 'repair',
        total: totalOf(b),
        hours: compHours(b),
        minutes: b.work?.run ? runMinutes(b.work.run) : 0,
        result: b.work?.boreResult || null
    }));

    const payments = [];
    for (const b of finals) {
        for (const p of Array.isArray(b.payments) ? b.payments : []) {
            const amt = Math.round(Number(p?.amount) || 0);
            if (amt > 0 && paymentCounts(p) && payDay(p, b) === day) payments.push({ bill: b, amount: amt, mode: p.mode || '' });
        }
    }

    const dayCash = (cash || []).filter((e) => e && !e.deleted && cashCounts(e) && e.date === day && onCash(e));
    const diesel = { litres: 0, amount: 0 };
    let spend = 0;
    for (const e of dayCash) {
        if (e.type === 'diesel') { diesel.litres += Number(e.litres) || 0; diesel.amount += Number(e.amount) || 0; }
        else if (e.type === 'expense') spend += Number(e.amount) || 0;
    }

    const crew = { present: 0, half: 0, absent: 0, days: 0 };
    for (const a of attendance || []) {
        if (!a || a.deleted || a.date !== day || !onAtt(a)) continue;
        if (a.status === 'present') crew.present += 1;
        else if (a.status === 'half') crew.half += 1;
        else if (a.status === 'absent') crew.absent += 1;
    }
    crew.days = crew.present + crew.half * 0.5;

    const feet = bores.reduce((s, x) => s + x.feet, 0);
    const hours = r1(bores.reduce((s, x) => s + x.hours, 0));
    return {
        day,
        bores,
        boreCount: bores.length,
        newBores: bores.filter((x) => !x.rebore).length,
        rebores: bores.filter((x) => x.rebore).length,
        feet,
        billed: bores.reduce((s, x) => s + x.total, 0),
        hours,
        minutes: bores.reduce((s, x) => s + x.minutes, 0),
        feetPerHour: hours ? Math.round(feet / hours) : 0,
        diesel: { litres: r1(diesel.litres), amount: Math.round(diesel.amount) },
        spend: Math.round(spend),
        crew,
        payments,
        collected: payments.reduce((s, p) => s + p.amount, 0)
    };
}

/** True when anything happened that day. */
export const hasActivity = (r) => !!(r.boreCount || r.payments.length || r.diesel.litres || r.spend || r.crew.present || r.crew.half || r.crew.absent);

/** Days from `from` to `to` (inclusive, YYYY-MM-DD), newest first, max 400. */
export function daysBetween(from, to) {
    const out = [];
    const d = new Date(`${to}T00:00:00`);
    const end = new Date(`${from}T00:00:00`);
    while (d >= end && out.length < 400) {
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        d.setDate(d.getDate() - 1);
    }
    return out;
}

/** Reports for a period (only days with activity) plus totals. */
export function periodReport(data, from, to, opts = {}) {
    const days = daysBetween(from, to).map((d) => dayReport(data, d, opts)).filter(hasActivity);
    const sum = (f) => days.reduce((s, r) => s + f(r), 0);
    const totals = {
        boreCount: sum((r) => r.boreCount),
        feet: sum((r) => r.feet),
        billed: sum((r) => r.billed),
        hours: r1(sum((r) => r.hours)),
        dieselLitres: r1(sum((r) => r.diesel.litres)),
        dieselAmount: sum((r) => r.diesel.amount),
        spend: sum((r) => r.spend),
        crewDays: sum((r) => r.crew.days),
        collected: sum((r) => r.collected)
    };
    return { days, totals };
}

const csvCell = (v) => {
    const s = String(v ?? '');
    // Excel formula guard + quoting
    const safe = typeof v !== 'number' && /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV of a period report (one row per day + a total row). */
export function periodCsv({ days, totals }, rigName = '') {
    const head = ['Date', 'Rig', 'Bores', 'New', 'Re-bore', 'Feet drilled', 'Compressor hours', 'Billed', 'Diesel litres', 'Diesel amount', 'Other expenses', 'Crew (days)', 'Collected'];
    const rows = days.slice().reverse().map((r) => [r.day, rigName, r.boreCount, r.newBores, r.rebores, r.feet, r.hours, r.billed, r.diesel.litres, r.diesel.amount, r.spend, r.crew.days, r.collected]);
    rows.push(['Total', rigName, totals.boreCount, '', '', totals.feet, totals.hours, totals.billed, totals.dieselLitres, totals.dieselAmount, totals.spend, totals.crewDays, totals.collected]);
    return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** WhatsApp text of one day's report. */
export function dayWhatsApp(r, { company = '', rigName = '', dayLabel = '' } = {}) {
    const lines = [
        `*${company || 'Borewell'}* — site report${rigName ? ` · ${rigName}` : ''}`,
        dayLabel || r.day,
        '',
        `⛏️ Bores: ${r.boreCount}${r.boreCount ? ` (${r.newBores} new, ${r.rebores} re-bore)` : ''}`,
        `📏 Feet drilled: ${r.feet.toLocaleString('en-IN')} ft`,
        ...(r.hours ? [`⏱️ Compressor: ${r.hours} h${r.feetPerHour ? ` · ${r.feetPerHour} ft/h` : ''}`] : []),
        ...r.bores.map((b) => `  • #${b.bill.billNo} ${b.bill.custName || ''}${b.bill.custLocation ? `, ${b.bill.custLocation}` : ''} — ${b.feet} ft · ${inr(b.total)}`),
        `⛽ Diesel: ${r.diesel.litres} L${r.diesel.amount ? ` · ${inr(r.diesel.amount)}` : ''}`,
        ...(r.spend ? [`🧾 Other expenses: ${inr(r.spend)}`] : []),
        `👷 Crew present: ${r.crew.days}${r.crew.absent ? ` (${r.crew.absent} absent)` : ''}`,
        `💰 Collected: ${inr(r.collected)}`,
        `📄 Billed: ${inr(r.billed)}`
    ];
    return lines.join('\n');
}
