// Work report (dashboard.html, "Rig work"): what the rig did, from the work details on each final
// bill (bill.work, see work/workMath.js) plus the bits & hammers list (tools/toolsMath.js).
// Pure functions: bills, tools and workers in, figures out. Never shown on a customer's bill.
//
//   per rig and per operator: bores, feet drilled, compressor hours, feet per hour
//   per bit / hammer: feet in the period and in its life, mm wear bore by bore, cost per foot, warnings
//   finished and sold lists: life used, cost, scrap amount
import { toolUsage, toolWarning, lastMm } from '../work/workMath.js';
import { toolName, shortDate } from '../tools/toolsMath.js';
import { workerLabel } from '../workers/workersMath.js';

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round1 = (v) => Math.round(v * 10) / 10;

/** Feet actually drilled on this bore (a re-bore starts at the old depth). */
export function drilledFeet(bill) {
    const s = bill?.snapshot || {};
    const total = Math.max(0, n(s.totalDepth));
    if (s.drillingType !== 'repair') return total;
    return Math.max(0, total - Math.max(0, n(s.oldBoreDepth)));
}

/** Compressor hours on one bore (null when either reading is missing or wrong). */
export function boreHours(work) {
    if (!work || work.compStart === null || work.compStart === undefined || work.compEnd === null || work.compEnd === undefined) return null;
    const h = Number(work.compEnd) - Number(work.compStart);
    return Number.isFinite(h) && h >= 0 ? h : null;
}

/** Feet per compressor hour. Only bores with both readings count, so a missing reading does not inflate it. */
const perHour = (feetTimed, hours) => (hours > 0 ? Math.round(feetTimed / hours) : null);

function blank(extra = {}) {
    return { bores: 0, feet: 0, hours: 0, feetTimed: 0, timed: 0, withWork: 0, ...extra };
}
function add(acc, bill) {
    const feet = drilledFeet(bill);
    acc.bores += 1;
    acc.feet += feet;
    if (bill.work) acc.withWork += 1;
    const h = boreHours(bill.work);
    if (h !== null) { acc.hours += h; acc.feetTimed += feet; acc.timed += 1; }
}
function finish(acc) {
    return { ...acc, hours: round1(acc.hours), perHour: perHour(acc.feetTimed, acc.hours) };
}

/**
 * Everything for the period. invoices = final bills of the period (already filtered by rig),
 * allBills = every bill (a tool's life spans all time), tools = bits & hammers of the rig(s) shown.
 * rigOf(bill) gives the bill's rig id (old bills without one belong to the first rig).
 */
export function workReport({ invoices = [], allBills = [], tools = [], workers = [], limits, rigOf = (b) => b.rigId || null, usage = null } = {}) {
    const total = blank();
    const ops = new Map();
    const rigs = new Map();
    const workerBy = new Map((workers || []).filter(Boolean).map((w) => [w.id, w]));
    let water = 0;
    let shared = 0;

    for (const b of invoices) {
        add(total, b);
        const rid = rigOf(b) || '';
        if (!rigs.has(rid)) rigs.set(rid, blank({ rigId: rid }));
        add(rigs.get(rid), b);
        const w = b.work;
        if (!w) continue;
        if (n(w.waterIn) > 0) water += 1;
        // A second operator (rare) gets the bore too: both drilled it.
        const who = [w.operatorId, w.operator2Id].filter(Boolean);
        if (who.length > 1) shared += 1;
        for (const id of new Set(who)) {
            if (!ops.has(id)) {
                const p = workerBy.get(id);
                ops.set(id, blank({ id, name: p ? workerLabel(p) : 'Operator (removed)', left: p?.status === 'left' }));
            }
            add(ops.get(id), b);
        }
    }

    // Tools: life from all bills, period feet from this period's bills.
    const life = usage || toolUsage(allBills);
    const inPeriod = toolUsage(invoices);
    const toolRows = (tools || []).filter(Boolean).map((t) => {
        const u = life[t.id];
        const feet = u?.feet || 0;
        const price = n(t.price);
        const scrap = t.status === 'sold' ? n(t.soldAmount) : 0;
        const nowMm = t.tool === 'bit' ? lastMm(t, life) : null;
        const newMm = t.tool === 'bit' && n(t.newMm) > 0 ? n(t.newMm) : null;
        const net = Math.max(0, price - scrap);
        return {
            id: t.id,
            tool: t.tool,
            size: t.size,
            status: t.status || 'active',
            name: toolName({ ...t, firstUsedOn: u?.firstUsedOn || t.firstUsedOn }),
            brand: t.brand || '',
            rigId: t.rigId || null,
            price,
            scrap,
            feet,
            bores: u?.bores || 0,
            periodFeet: inPeriod[t.id]?.feet || 0,
            periodBores: inPeriod[t.id]?.bores || 0,
            newMm,
            nowMm,
            wearMm: newMm !== null && nowMm !== null ? round1(Math.max(0, newMm - nowMm)) : null,
            mm: u?.mm || [],
            // Cost per foot: what it cost (less scrap once sold) over the feet it drilled.
            costPerFt: feet > 0 && net > 0 ? round1(net / feet) : null,
            warning: (t.status || 'active') === 'active' && limits ? toolWarning(t, life, limits) : null,
            purchasedOn: t.purchasedOn || '',
            finishedOn: t.finishedOn || '',
            finishReason: t.finishReason || '',
            soldOn: t.soldOn || ''
        };
    });
    const byUse = (a, b) => b.periodFeet - a.periodFeet || b.feet - a.feet || a.name.localeCompare(b.name);
    const byDone = (a, b) => String(b.soldOn || b.finishedOn).localeCompare(String(a.soldOn || a.finishedOn));
    const active = toolRows.filter((t) => t.status === 'active').sort((a, b) => (b.warning ? 1 : 0) - (a.warning ? 1 : 0) || byUse(a, b));
    const finished = toolRows.filter((t) => t.status === 'finished').sort(byDone);
    const sold = toolRows.filter((t) => t.status === 'sold').sort(byDone);

    return {
        total: { ...finish(total), water, shared, missing: total.bores - total.withWork },
        operators: [...ops.values()].map(finish).sort((a, b) => b.feet - a.feet || a.name.localeCompare(b.name)),
        rigs: [...rigs.values()].map(finish).sort((a, b) => b.feet - a.feet),
        tools: { active, finished, sold, warnings: active.filter((t) => t.warning).length },
        doneCost: [...finished, ...sold].reduce((s, t) => s + t.price, 0),
        scrapTotal: sold.reduce((s, t) => s + t.scrap, 0)
    };
}

/** One line under a tool's name in the report. */
export function toolReportLine(t) {
    if (!t.bores) return 'Not used on a bill yet';
    const parts = [];
    // "In this period" only when it differs from the whole life (e.g. not with "All").
    if (t.periodFeet && t.periodFeet !== t.feet) parts.push(`${t.periodFeet.toLocaleString('en-IN')} ft in this period`);
    parts.push(`${t.feet.toLocaleString('en-IN')} ft in all · ${t.bores} bore${t.bores === 1 ? '' : 's'}`);
    if (t.tool === 'bit' && t.nowMm !== null) parts.push(t.wearMm ? `${t.newMm} → ${t.nowMm} mm` : `${t.nowMm} mm`);
    // Still in use: the cost per foot keeps falling as it drills, so say "so far".
    if (t.costPerFt !== null) parts.push(`₹${t.costPerFt.toLocaleString('en-IN')}/ft so far`);
    return parts.join(' · ');
}

/** Life of a finished / sold tool in one line. */
export function doneLine(t) {
    const parts = [t.bores ? `${t.feet.toLocaleString('en-IN')} ft · ${t.bores} bore${t.bores === 1 ? '' : 's'}` : 'No bores on record'];
    if (t.tool === 'bit' && t.wearMm) parts.push(`worn ${t.wearMm} mm`);
    if (t.price) parts.push(`cost ₹${t.price.toLocaleString('en-IN')}`);
    if (t.status === 'sold') parts.push(`scrap ₹${t.scrap.toLocaleString('en-IN')}`);
    if (t.costPerFt !== null) parts.push(`₹${t.costPerFt.toLocaleString('en-IN')}/ft`);
    const when = t.status === 'sold' ? t.soldOn : t.finishedOn;
    if (when) parts.push(`${t.status === 'sold' ? 'sold' : 'finished'} ${shortDate(when)}`);
    return parts.join(' · ');
}

/** "Rig work" lines for the WhatsApp report (empty when no bill in the period has work details). */
export function workWhatsAppLines(r, { max = 5 } = {}) {
    if (!r || !r.total.withWork) return [];
    const t = r.total;
    const lines = ['🔧 *RIG WORK*'];
    if (t.hours) lines.push(`• Compressor: *${t.hours.toLocaleString('en-IN')} h*${t.perHour ? ` (${t.perHour.toLocaleString('en-IN')} ft per hour)` : ''}`);
    for (const o of r.operators.slice(0, max)) {
        lines.push(`• ${o.name}: ${o.bores} bore${o.bores === 1 ? '' : 's'}, ${o.feet.toLocaleString('en-IN')} ft${o.perHour ? `, ${o.perHour} ft/h` : ''}`);
    }
    if (r.tools.warnings) lines.push(`⚠️ ${r.tools.warnings} bit/hammer${r.tools.warnings === 1 ? '' : 's'} to check`);
    if (t.missing) lines.push(`• ${t.missing} bill${t.missing === 1 ? '' : 's'} without work details`);
    return lines;
}
