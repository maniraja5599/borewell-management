// "Daily site report" page (Rig work tab): one day of the current rig — feet drilled, bores,
// compressor hours, diesel, other expenses, crew present and money collected — with ◀ ▶ day
// stepping, a WhatsApp summary, and a period table (7 days / this month / last month) with CSV.
// Logic: dailyMath.js. The rig is the one picked on this phone (same as Bills and Work log).
import { billOnCurrentRig, getCurrentRig, hasRigs, visibleRigs } from '../../cloud/access.js';
import { el, openSheet, seg } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import { addDays } from '../workers/attendanceMath.js';
import { readCash } from '../cash/cashUI.js';
import { readAttendance } from '../workers/attendanceUI.js';
import { dayReport, periodReport, periodCsv, dayWhatsApp } from './dailyMath.js';
import { fmtMinutes } from '../work/workMath.js';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const longDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Filters for "this rig". Cash / attendance without a rig count only when there is one rig. */
function rigFilters() {
    const rig = hasRigs() ? getCurrentRig() : null;
    const oneRig = !rig || visibleRigs().length <= 1;
    const mine = (x) => !rig || x?.rigId === rig.id || (!x?.rigId && oneRig) || x?.rigId === 'local';
    return { rig, opts: { onRigBill: (b) => billOnCurrentRig(b), onRigCash: mine, onRigAttendance: mine } };
}
const data = (app) => ({ bills: app.history || [], cash: readCash(), attendance: readAttendance() });

/** Rig work tile line for today. */
export function dailyTileSummary(app) {
    const { opts } = rigFilters();
    const r = dayReport(data(app), todayYmd(), opts);
    if (!r.boreCount && !r.collected && !r.diesel.litres) return 'Feet, diesel, crew and money — day by day';
    return `Today: ${r.feet.toLocaleString('en-IN')} ft · ${r.boreCount} bore${r.boreCount === 1 ? '' : 's'}${r.collected ? ` · ${inr(r.collected)} in` : ''}`;
}

async function saveCsv(app, text, fileName) {
    const blob = new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' });
    try {
        const file = new File([blob], fileName, { type: 'text/csv' });
        if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
            await navigator.share({ files: [file], title: fileName });
            return;
        }
    } catch (e) { if (e?.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    app.showToast?.('✅ Report downloaded (opens in Excel)');
}

export function openDailyReport(app) {
    let day = todayYmd();
    let view = 'day';
    let period = '7d';
    const { rig } = rigFilters();
    const sheet = openSheet({ title: 'Daily site report', sub: `${rig ? `${rig.name} · ` : ''}feet, diesel, crew and money`, ic: 'calendar-days' });

    const stat = (label, value, sub, cls = '') => el('div', { class: `dr-stat ${cls}` }, [el('small', { text: label }), el('strong', { text: value }), sub ? el('em', { text: sub }) : null]);

    function renderDay() {
        const { opts } = rigFilters();
        const r = dayReport(data(app), day, opts);
        const today = todayYmd();
        const dateIn = el('input', { type: 'date', class: 'tt-input dr-date', value: day, max: today, 'aria-label': 'Pick a day' });
        dateIn.addEventListener('change', () => { if (dateIn.value) { day = dateIn.value > today ? today : dateIn.value; render(); } });
        const nav = el('div', { class: 'dr-nav' }, [
            el('button', { type: 'button', class: 'tt-icon-btn', 'aria-label': 'Previous day', onclick: () => { day = addDays(day, -1); render(); } }, [icon('chevron-left')]),
            el('div', { class: 'dr-day' }, [el('strong', { text: day === today ? `Today · ${shortDay(day)}` : longDay(day) }), dateIn]),
            el('button', { type: 'button', class: 'tt-icon-btn', 'aria-label': 'Next day', disabled: day >= today, onclick: () => { if (day < today) { day = addDays(day, 1); render(); } } }, [icon('chevron-right')])
        ]);
        const grid = el('div', { class: 'dr-grid' }, [
            stat('Feet drilled', `${r.feet.toLocaleString('en-IN')} ft`, `${r.boreCount} bore${r.boreCount === 1 ? '' : 's'}${r.rebores ? ` · ${r.rebores} re-bore` : ''}`, 'is-main'),
            stat('Compressor', r.hours ? `${r.hours} h` : '—', r.feetPerHour ? `${r.feetPerHour} ft per hour` : r.minutes ? `drilling ${fmtMinutes(r.minutes)}` : 'from work details'),
            stat('Diesel', `${r.diesel.litres} L`, r.diesel.amount ? inr(r.diesel.amount) : 'filled this day'),
            stat('Crew present', String(r.crew.days), r.crew.absent ? `${r.crew.absent} absent` : r.crew.half ? `${r.crew.half} half day` : 'from attendance'),
            stat('Collected', inr(r.collected), `${r.payments.length} payment${r.payments.length === 1 ? '' : 's'}`, r.collected ? 'is-in' : ''),
            stat('Billed', inr(r.billed), r.spend ? `other expenses ${inr(r.spend)}` : 'Final Bills this day')
        ]);
        const bores = r.bores.length ? el('div', { class: 'tt-card' }, [
            el('h4', { class: 'dr-h', text: 'Bores' }),
            el('div', { class: 'tt-list' }, r.bores.map((b) => el('button', { type: 'button', class: 'tt-row', onclick: () => { sheet.close(); app.loadBillFromHistory(b.bill.id, true, true); } }, [
                el('span', { class: 'tt-row-main' }, [
                    el('strong', { text: `#${b.bill.billNo} · ${b.bill.custName || 'Customer'}` }),
                    el('small', { text: [b.bill.custLocation, `${b.feet} ft${b.rebore ? ' re-bore' : ''}`, b.hours ? `${Math.round(b.hours * 10) / 10} h` : '', b.result === 'water' ? '💧 water' : b.result === 'dry' ? 'dry' : ''].filter(Boolean).join(' · ') })
                ]),
                el('span', { class: 'dr-amt', text: inr(b.total) })
            ])))
        ]) : null;
        const pays = r.payments.length ? el('div', { class: 'tt-card' }, [
            el('h4', { class: 'dr-h', text: 'Money collected' }),
            el('div', { class: 'tt-list' }, r.payments.map((p) => el('div', { class: 'tt-row is-static' }, [
                el('span', { class: 'tt-row-main' }, [el('strong', { text: p.bill.custName || 'Customer' }), el('small', { text: [`#${p.bill.billNo}`, p.mode].filter(Boolean).join(' · ') })]),
                el('span', { class: 'dr-amt is-in', text: inr(p.amount) })
            ])))
        ]) : null;
        const company = String(app.brand?.companyName || '').trim();
        const wa = `https://wa.me/?text=${encodeURIComponent(dayWhatsApp(r, { company, rigName: rig?.name || '', dayLabel: longDay(day) }))}`;
        return [
            nav,
            grid,
            bores,
            pays,
            !r.boreCount && !r.payments.length && !r.diesel.litres && !r.crew.days ? el('p', { class: 'tt-empty', text: 'Nothing recorded on this day.' }) : null,
            el('a', { class: 'tt-btn is-pri tt-wide', href: wa, target: '_blank', rel: 'noopener' }, [icon('message-circle'), el('span', { text: 'Send this day on WhatsApp' })])
        ];
    }

    function periodRange() {
        const t = todayYmd();
        if (period === '7d') return [addDays(t, -6), t, 'Last 7 days'];
        if (period === 'month') return [`${t.slice(0, 7)}-01`, t, 'This month'];
        const d = new Date(`${t.slice(0, 7)}-01T00:00:00`); d.setDate(0);
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return [`${end.slice(0, 7)}-01`, end, 'Last month'];
    }

    function renderPeriod() {
        const { opts } = rigFilters();
        const [from, to, label] = periodRange();
        const rep = periodReport(data(app), from, to, opts);
        const t = rep.totals;
        const table = rep.days.length ? el('div', { class: 'dr-table-wrap' }, [el('table', { class: 'dr-table' }, [
            el('thead', {}, [el('tr', {}, ['Day', 'Bores', 'Feet', 'Diesel', 'Crew', 'Collected'].map((h) => el('th', { text: h })))]),
            el('tbody', {}, rep.days.map((r) => el('tr', { onclick: () => { day = r.day; view = 'day'; render(); } }, [
                el('td', { text: shortDay(r.day) }),
                el('td', { text: String(r.boreCount) }),
                el('td', { text: r.feet.toLocaleString('en-IN') }),
                el('td', { text: r.diesel.litres ? `${r.diesel.litres} L` : '—' }),
                el('td', { text: r.crew.days ? String(r.crew.days) : '—' }),
                el('td', { text: r.collected ? inr(r.collected) : '—' })
            ]))),
            el('tfoot', {}, [el('tr', {}, [
                el('td', { text: 'Total' }), el('td', { text: String(t.boreCount) }), el('td', { text: t.feet.toLocaleString('en-IN') }),
                el('td', { text: `${t.dieselLitres} L` }), el('td', { text: String(t.crewDays) }), el('td', { text: inr(t.collected) })
            ])])
        ])]) : el('p', { class: 'tt-empty', text: 'Nothing recorded in this period.' });
        const fileName = `site-report_${(rig?.name || 'rig').replace(/[^a-z0-9]+/gi, '-')}_${from}_to_${to}.csv`;
        return [
            seg('drPeriod', [{ key: '7d', label: '7 days' }, { key: 'month', label: 'This month' }, { key: 'last', label: 'Last month' }], period, (v) => { period = v; render(); }),
            el('div', { class: 'dr-grid' }, [
                stat(label, `${t.feet.toLocaleString('en-IN')} ft`, `${t.boreCount} bore${t.boreCount === 1 ? '' : 's'}${t.hours ? ` · ${t.hours} h` : ''}`, 'is-main'),
                stat('Diesel', `${t.dieselLitres} L`, t.dieselAmount ? inr(t.dieselAmount) : ''),
                stat('Collected', inr(t.collected), `billed ${inr(t.billed)}`, t.collected ? 'is-in' : ''),
                stat('Crew days', String(t.crewDays), t.spend ? `other expenses ${inr(t.spend)}` : '')
            ]),
            table,
            rep.days.length ? el('button', { type: 'button', class: 'tt-btn tt-wide', onclick: () => saveCsv(app, periodCsv(rep, rig?.name || ''), fileName) }, [icon('download'), el('span', { text: 'Download CSV (Excel)' })]) : null,
            el('p', { class: 'ca-note', text: 'Tap a day to open it. Feet come from Final Bills dated that day; compressor hours from work details; diesel and expenses from Expenses & cash; crew from Attendance.' })
        ];
    }

    function render() {
        sheet.body.replaceChildren(...[
            seg('drView', [{ key: 'day', label: 'One day' }, { key: 'period', label: 'Period' }], view, (v) => { view = v; render(); }),
            ...(view === 'day' ? renderDay() : renderPeriod())
        ].filter(Boolean));
        paintIcons();
    }
    render();
}
