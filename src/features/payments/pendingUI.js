// "Pending payments" page (Rig work tab): every unpaid Final Bill by age (0–30 / 31–60 / 61–90 /
// 90+ days), sorted by amount, age or name, with Remind (WhatsApp to the customer, or to the
// agent for agent bills) and Record payment. Logic: ageingMath.js.
//
// "Reminded" times stay on this phone only (drillrig_reminded: { billId: ms }); they are a memory
// aid, not a record, so they do not touch the bill or sync.
import { billOnCurrentRig } from '../../cloud/access.js';
import { storage } from '../../data/storage.js';
import { el, openSheet, pill, avatar } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import { AGE_BUCKETS, pendingRows, ageingSummary, SORTS, reminderLink } from './ageingMath.js';

const REMINDED_KEY = 'drillrig_reminded';
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const niceDay = (d) => { const t = new Date(`${d}T00:00:00`); return isNaN(t) ? '' : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }); };

const readReminded = () => { try { return JSON.parse(storage.getRaw(REMINDED_KEY) || '{}') || {}; } catch { return {}; } };
function markReminded(id) {
    const all = readReminded();
    all[id] = Date.now();
    // keep the newest 500
    const keep = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 500);
    try { storage.setRaw(REMINDED_KEY, JSON.stringify(Object.fromEntries(keep))); } catch { /* ignore */ }
}
const agoText = (ms) => {
    const d = Math.floor((Date.now() - ms) / 86400000);
    return d <= 0 ? 'reminded today' : d === 1 ? 'reminded yesterday' : `reminded ${d} d ago`;
};

const rowsFor = (app) => pendingRows((app.history || []).filter((b) => billOnCurrentRig(b)), todayYmd());

/** Rig work tile line. */
export function pendingTileSummary(app) {
    const s = ageingSummary(rowsFor(app));
    if (!s.count) return 'Nothing to collect';
    return `${inr(s.total)} · ${s.count} bill${s.count === 1 ? '' : 's'}${s.over60Count ? ` · ${s.over60Count} over 60 d` : ''}`;
}
export const pendingTileWarn = (app) => ageingSummary(rowsFor(app)).over60Count > 0;

export function openPending(app, { onSaved } = {}) {
    let bucket = 'all';
    let sort = 'due';
    let who = 'all';
    const sheet = openSheet({ title: 'Pending payments', sub: 'Unpaid Final Bills by age · remind and collect', ic: 'hourglass', onClose: () => onSaved?.() });

    function render() {
        const rows = rowsFor(app);
        const sum = ageingSummary(rows);
        const shown = rows
            .filter((r) => bucket === 'all' || r.bucket === bucket)
            .filter((r) => who === 'all' || r.payer.kind === who)
            .sort(SORTS[sort]);
        const reminded = readReminded();

        const bars = el('div', { class: 'pa-buckets', role: 'group', 'aria-label': 'Filter by age' }, AGE_BUCKETS.map((b, i) => {
            const v = sum.buckets[b.key];
            const pct = sum.total ? Math.round((v.due / sum.total) * 100) : 0;
            return el('button', {
                type: 'button',
                class: `pa-bucket is-${i}${bucket === b.key ? ' is-on' : ''}`,
                'aria-pressed': String(bucket === b.key),
                onclick: () => { bucket = bucket === b.key ? 'all' : b.key; render(); }
            }, [
                el('small', { text: b.label }),
                el('strong', { text: inr(v.due) }),
                el('span', { class: 'pa-meter' }, [el('span', { style: `width:${pct}%` })]),
                el('em', { text: `${v.count} bill${v.count === 1 ? '' : 's'}` })
            ]);
        }));

        const chips = (name, list, value, set) => el('div', { class: 'pa-chips', role: 'radiogroup', 'aria-label': name }, list.map((o) => el('button', {
            type: 'button', class: `pa-chip${o.key === value ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(o.key === value), text: o.label, onclick: () => { set(o.key); render(); }
        })));

        const row = (r) => {
            const link = reminderLink(r, app.brand || {});
            const when = reminded[r.id];
            const ageCls = r.age > 90 ? 'is-3' : r.age > 60 ? 'is-2' : r.age > 30 ? 'is-1' : 'is-0';
            return el('div', { class: 'tt-item pa-row' }, [
                el('div', { class: 'tt-row is-static' }, [
                    avatar(r.payer.name, r.payer.kind === 'agent' ? 'is-warn' : ''),
                    el('span', { class: 'tt-row-main' }, [
                        el('strong', { text: r.payer.kind === 'agent' ? `${r.payer.name} (agent)` : r.payer.name }),
                        el('small', { text: [`#${r.billNo}`, niceDay(r.day), r.payer.kind === 'agent' ? r.bill.custName : '', r.bill.custLocation].filter(Boolean).join(' · ') }),
                        el('small', { class: 'pa-money', text: `${inr(r.total)} billed${r.paid ? ` · ${inr(r.paid)} paid` : ''}${when ? ` · ${agoText(when)}` : ''}` })
                    ]),
                    el('span', { class: 'pa-right' }, [
                        el('strong', { class: 'pa-due', text: inr(r.due) }),
                        el('span', { class: `pa-age ${ageCls}`, text: `${r.age} d` })
                    ])
                ]),
                el('div', { class: 'pa-acts' }, [
                    link
                        ? el('a', { class: 'tt-btn pa-remind', href: link, target: '_blank', rel: 'noopener', onclick: () => { markReminded(r.id); setTimeout(render, 300); } }, [icon('message-circle'), el('span', { text: 'Remind' })])
                        : el('button', { type: 'button', class: 'tt-btn', disabled: true, title: 'No mobile number on this bill' }, [icon('message-circle'), el('span', { text: 'No mobile' })]),
                    el('button', { type: 'button', class: 'tt-btn is-pri', onclick: () => { sheet.close(); app.openRecordPaymentModal?.(r.id); } }, [icon('indian-rupee'), el('span', { text: 'Record payment' })]),
                    el('button', { type: 'button', class: 'tt-icon-btn pa-open', 'aria-label': `Open bill #${r.billNo}`, onclick: () => { sheet.close(); app.loadBillFromHistory(r.id, true, true); } }, [icon('external-link')])
                ])
            ]);
        };

        sheet.body.replaceChildren(...[
            el('div', { class: 'tt-card pa-head' }, [
                el('div', {}, [el('small', { text: 'Total pending' }), el('strong', { class: sum.total ? 'is-due' : '', text: inr(sum.total) })]),
                el('div', {}, [el('small', { text: 'Unpaid bills' }), el('strong', { text: String(sum.count) })]),
                el('div', {}, [el('small', { text: 'Over 60 days' }), el('strong', { class: sum.over60 ? 'is-due' : '', text: sum.over60Count ? `${inr(sum.over60)} · ${sum.over60Count}` : '—' })])
            ]),
            sum.count ? bars : null,
            sum.count ? el('div', { class: 'pa-tools' }, [
                chips('Sort', [{ key: 'due', label: 'Highest due' }, { key: 'oldest', label: 'Oldest first' }, { key: 'name', label: 'Name A–Z' }], sort, (v) => { sort = v; }),
                rows.some((r) => r.payer.kind === 'agent') ? chips('Payer', [{ key: 'all', label: 'All' }, { key: 'customer', label: 'Customers' }, { key: 'agent', label: 'Agents' }], who, (v) => { who = v; }) : null
            ]) : null,
            bucket !== 'all' ? el('p', { class: 'pa-filter' }, [
                el('span', { text: `Showing ${AGE_BUCKETS.find((b) => b.key === bucket).label} · ${shown.length} bill${shown.length === 1 ? '' : 's'}` }),
                el('button', { type: 'button', class: 'wk-link', text: 'Show all', onclick: () => { bucket = 'all'; render(); } })
            ]) : null,
            shown.length
                ? el('div', { class: 'tt-list pa-list' }, shown.slice(0, 300).map(row))
                : el('p', { class: 'tt-empty', text: sum.count ? 'No bills in this group.' : 'Every Final Bill is fully paid. 🎉' }),
            el('p', { class: 'ca-note', text: 'Age = days since the bill date. Remind opens WhatsApp with the balance (and your UPI ID, if set in Company profile). Agent bills remind the agent.' })
        ].filter(Boolean));
        paintIcons();
    }
    render();
}
