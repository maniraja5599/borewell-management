// "Transaction log" page (Rig work tab): all money in and out for a period, grouped by day, with
// In / Out / Net, a split by type, CSV (Excel) and Print / Save as PDF. Logic: txMath.js.
// The rig is the one picked on this phone; with several rigs, hired-vehicle payouts (not tied to
// a rig) are left out.
import { billOnCurrentRig, getCurrentRig, hasRigs, visibleRigs } from '../../cloud/access.js';
import { el, openSheet } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import { addDays } from '../workers/attendanceMath.js';
import { readCash } from '../cash/cashUI.js';
import { readStock } from '../stock/stockUI.js';
import { readTools } from '../tools/toolsUI.js';
import { readVehicles } from '../rigwork/vehiclesUI.js';
import { transactions, txSummary, byDay, txCsv, TX_KINDS } from './txMath.js';
import { saveCsv } from './dailyUI.js';
import { readBreakdowns } from '../rigwork/rigStatusUI.js';
import { reasonLabel } from '../rigwork/breakdownMath.js';
import { readInventory } from '../inventory/inventoryUI.js';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const signed = (n) => `${n < 0 ? '−' : ''}${inr(Math.abs(n))}`;
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function setup() {
    const rig = hasRigs() ? getCurrentRig() : null;
    const oneRig = !rig || visibleRigs().length <= 1;
    const mine = (x) => !rig || x?.rigId === rig.id || (!x?.rigId && oneRig) || x?.rigId === 'local';
    return { rig, opts: { onRigBill: (b) => billOnCurrentRig(b), onRigItem: mine, includeVehicles: oneRig } };
}
const sources = (app) => ({
    bills: app.history || [], cash: readCash(), stock: readStock(), tools: readTools(), vehicles: readVehicles(),
    breakdowns: readBreakdowns().map((b) => ({ ...b, reasonLabel: reasonLabel(b.reason) })),
    ...(() => { const d = readInventory(); return { vendors: d.vendors, vendorPayments: d.payments }; })()
});

function monthStart(ymd) { return `${ymd.slice(0, 7)}-01`; }
function lastMonth(t) {
    const d = new Date(`${monthStart(t)}T00:00:00`); d.setDate(0);
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [monthStart(end), end];
}

/** Rig work tile line: this month's in / out. */
export function txTileSummary(app) {
    const { opts } = setup();
    const t = todayYmd();
    const s = txSummary(transactions(sources(app), monthStart(t), t, opts));
    if (!s.count) return 'All money in and out, day by day';
    return `This month: in ${inr(s.in)} · out ${inr(s.out)}`;
}

/** Print (Save as PDF) a period: a plain table in a print-only block. */
function printLog({ rows, sum, from, to, rigName, company }) {
    document.getElementById('txPrint')?.remove();
    const cell = (tag, text, cls = '') => el(tag, { class: cls, text });
    const table = el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Date', 'Type', 'Details', 'Mode', 'In', 'Out'].map((h) => cell('th', h)))]),
        el('tbody', {}, rows.slice().reverse().map((r) => el('tr', {}, [
            cell('td', r.date.split('-').reverse().join('/')),
            cell('td', TX_KINDS[r.kind].label),
            cell('td', [r.title, r.sub].filter(Boolean).join(' — ')),
            cell('td', r.mode || ''),
            cell('td', r.dir === 'in' ? inr(r.amount) : '', 'num'),
            cell('td', r.dir === 'out' ? inr(r.amount) : '', 'num')
        ]))),
        el('tfoot', {}, [
            el('tr', {}, [cell('td', 'Total'), cell('td', ''), cell('td', ''), cell('td', ''), cell('td', inr(sum.in), 'num'), cell('td', inr(sum.out), 'num')]),
            el('tr', {}, [cell('td', 'Net'), cell('td', ''), cell('td', ''), cell('td', ''), cell('td', signed(sum.net), 'num'), cell('td', '')])
        ])
    ]);
    const box = el('div', { id: 'txPrint' }, [
        el('h1', { text: `${company || 'Borewell'} — Transaction log` }),
        el('p', { text: `${rigName ? `${rigName} · ` : ''}${from.split('-').reverse().join('/')} to ${to.split('-').reverse().join('/')}` }),
        table
    ]);
    document.body.appendChild(box);
    document.documentElement.classList.add('tx-printing');
    const done = () => { document.documentElement.classList.remove('tx-printing'); box.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch { done(); } }, 50);
}

export function openTxLog(app) {
    let period = 'month';
    let dir = 'all';
    let custom = { from: addDays(todayYmd(), -29), to: todayYmd() };
    const { rig } = setup();
    const sheet = openSheet({ title: 'Transaction log', sub: `${rig ? `${rig.name} · ` : ''}all money in and out`, ic: 'arrow-left-right' });

    function range() {
        const t = todayYmd();
        if (period === 'today') return [t, t, 'Today'];
        if (period === '7d') return [addDays(t, -6), t, 'Last 7 days'];
        if (period === 'month') return [monthStart(t), t, 'This month'];
        if (period === 'last') { const [a, b] = lastMonth(t); return [a, b, 'Last month']; }
        const a = custom.from <= custom.to ? custom.from : custom.to;
        const b = custom.from <= custom.to ? custom.to : custom.from;
        return [a, b, 'Custom'];
    }

    function render() {
        const { opts } = setup();
        const [from, to] = range();
        const rowsAll = transactions(sources(app), from, to, opts);
        const sum = txSummary(rowsAll);
        const rows = rowsAll.filter((r) => dir === 'all' || r.dir === dir);

        const chips = (list, value, set, label) => el('div', { class: 'pa-chips', role: 'radiogroup', 'aria-label': label }, list.map((o) => el('button', {
            type: 'button', class: `pa-chip${o.key === value ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(o.key === value), text: o.label, onclick: () => { set(o.key); render(); }
        })));
        const customBox = period === 'custom' ? el('div', { class: 'tx-custom' }, [
            (() => { const i = el('input', { type: 'date', class: 'tt-input', value: custom.from, max: todayYmd(), 'aria-label': 'From' }); i.addEventListener('change', () => { if (i.value) { custom.from = i.value; render(); } }); return i; })(),
            el('span', { text: 'to' }),
            (() => { const i = el('input', { type: 'date', class: 'tt-input', value: custom.to, max: todayYmd(), 'aria-label': 'To' }); i.addEventListener('change', () => { if (i.value) { custom.to = i.value; render(); } }); return i; })()
        ]) : null;

        const head = el('div', { class: 'tt-card pa-head tx-head' }, [
            el('div', {}, [el('small', { text: 'Inward' }), el('strong', { class: 'is-in', text: inr(sum.in) })]),
            el('div', {}, [el('small', { text: 'Outward' }), el('strong', { class: 'is-out', text: inr(sum.out) })]),
            el('div', {}, [el('small', { text: 'Net' }), el('strong', { class: sum.net < 0 ? 'is-out' : 'is-in', text: signed(sum.net) })])
        ]);
        const split = sum.byKind.length ? el('div', { class: 'tx-split' }, sum.byKind.map((k) => el('span', { class: `tx-kind is-${k.dir}` }, [
            el('b', { text: k.label }), el('span', { text: ` ${inr(k.amount)}` })
        ]))) : null;

        const groups = byDay(rows).map((g) => el('div', { class: 'tx-day' }, [
            el('div', { class: 'tx-day-head' }, [
                el('strong', { text: dayLabel(g.day) }),
                el('span', {}, [g.in ? el('em', { class: 'is-in', text: `+${inr(g.in)}` }) : null, g.out ? el('em', { class: 'is-out', text: `−${inr(g.out)}` }) : null])
            ]),
            el('div', { class: 'tt-list' }, g.rows.map((r) => {
                const main = [
                    el('span', { class: `tx-ic is-${r.dir}`, 'aria-hidden': 'true' }, [icon(r.dir === 'in' ? 'arrow-down-left' : 'arrow-up-right')]),
                    el('span', { class: 'tt-row-main' }, [
                        el('strong', { text: r.title }),
                        el('small', { text: [TX_KINDS[r.kind].label, r.sub, r.mode].filter(Boolean).join(' · ') })
                    ]),
                    el('span', { class: `tx-amt is-${r.dir}`, text: `${r.dir === 'in' ? '+' : '−'}${inr(r.amount)}` })
                ];
                return r.billId
                    ? el('button', { type: 'button', class: 'tt-row', onclick: () => { sheet.close(); app.loadBillFromHistory(r.billId, true, true); } }, main)
                    : el('div', { class: 'tt-row is-static' }, main);
            }))
        ]));

        const company = String(app.brand?.companyName || '').trim();
        const fileName = `transactions_${(rig?.name || 'all').replace(/[^a-z0-9]+/gi, '-')}_${from}_to_${to}.csv`;
        sheet.body.replaceChildren(...[
            chips([{ key: 'today', label: 'Today' }, { key: '7d', label: '7 days' }, { key: 'month', label: 'This month' }, { key: 'last', label: 'Last month' }, { key: 'custom', label: 'Custom' }], period, (v) => { period = v; }, 'Period'),
            customBox,
            head,
            split,
            sum.count ? chips([{ key: 'all', label: `All (${sum.count})` }, { key: 'in', label: 'Inward' }, { key: 'out', label: 'Outward' }], dir, (v) => { dir = v; }, 'In or out') : null,
            groups.length ? el('div', { class: 'tx-days' }, groups) : el('p', { class: 'tt-empty', text: 'No money in or out in this period.' }),
            rowsAll.length ? el('div', { class: 'ag-acts' }, [
                el('button', { type: 'button', class: 'tt-btn', onclick: () => saveCsv(app, txCsv(rowsAll, rig?.name || ''), fileName) }, [icon('download'), el('span', { text: 'CSV (Excel)' })]),
                el('button', { type: 'button', class: 'tt-btn', onclick: () => printLog({ rows: rowsAll, sum, from, to, rigName: rig?.name || '', company }) }, [icon('printer'), el('span', { text: 'Print / PDF' })])
            ]) : null,
            el('p', { class: 'ca-note', text: 'In: bill payments and scrap sales. Out: expenses, diesel, wages and advances, casing pipe and bit / hammer purchases, hired vehicle payouts, breakdown repairs, payments to vendors (credit purchases count when paid). Cash handed between people is not counted (it is the same money).' })
        ].filter(Boolean));
        paintIcons();
    }
    render();
}
