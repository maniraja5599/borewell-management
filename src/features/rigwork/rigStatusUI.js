// "Rig status" page (Rig work tab): is the rig working, idle or down; report a breakdown; mark it
// fixed with the repair cost; this month's breakdowns, downtime and repair cost; history.
// Logic: breakdownMath.js. Saved on this phone (like Vehicles & docs) — not synced yet.
import { storage } from '../../data/storage.js';
import { billOnCurrentRig, getCurrentRig, hasRigs } from '../../cloud/access.js';
import { el, openSheet, btn, pill } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import { isInvoice, billDay } from '../report/reportMath.js';
import { REASONS, reasonLabel, reportBreakdown, fixBreakdown, openBreakdown, downHours, fmtHours, monthSummary, rigStatus, history } from './breakdownMath.js';

const KEY = 'drillrig_breakdowns_v1';
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export function readBreakdowns() {
    try { const a = JSON.parse(storage.getRaw(KEY) || '[]'); return Array.isArray(a) ? a.filter((b) => b && b.id) : []; } catch { return []; }
}
function writeBreakdowns(list) {
    try { storage.setRaw(KEY, JSON.stringify((list || []).slice(0, 1000))); return true; } catch { return false; }
}

const rigKey = () => (hasRigs() ? getCurrentRig()?.id : null) || 'local';
const rigName = () => (hasRigs() ? getCurrentRig()?.name : '') || 'Rig';
const toLocalInput = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v) => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : null; };
const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Is a drilling run going on in the open bill's work details (this phone)? */
function drillingNow() {
    try { const d = JSON.parse(storage.getRaw('drillrig_work_draft') || 'null'); return !!(d?.work?.run?.startAt && !d.work.run.endAt); } catch { return false; }
}

export function statusNow(app) {
    const today = todayYmd();
    const todayBills = (app?.history || []).filter((b) => b && isInvoice(b) && billOnCurrentRig(b) && billDay(b) === today);
    return rigStatus(readBreakdowns(), rigKey(), { todayBills, drillingNow: drillingNow() });
}

/** Rig work tile line + warn flag. */
export function rigStatusTile(app) {
    const s = statusNow(app);
    if (s.state === 'down') return { sub: `DOWN · ${reasonLabel(s.breakdown.reason)} · ${fmtHours(s.hours)}`, warn: true };
    const m = monthSummary(readBreakdowns(), rigKey(), today().slice(0, 7));
    const tail = m.count ? ` · ${m.count} breakdown${m.count === 1 ? '' : 's'} this month` : '';
    return { sub: `${s.state === 'working' ? `Working · ${s.feetToday.toLocaleString('en-IN')} ft today` : 'Idle today'}${tail}`, warn: false };
}
const today = () => todayYmd();

export function openRigStatus(app, { onSaved } = {}) {
    let mode = null; // null | 'report' | 'fix' | { edit: id }
    const sheet = openSheet({ title: 'Rig status', sub: `${rigName()} · breakdowns, downtime and repair cost`, ic: 'activity', onClose: () => onSaved?.() });

    const save = (list) => { if (!writeBreakdowns(list)) { sheet.say('Could not save on this phone (storage full?).'); return false; } return true; };

    function reportForm() {
        let reason = '';
        const chips = el('div', { class: 'pa-chips', role: 'radiogroup', 'aria-label': 'What broke' }, REASONS.map((r) => {
            const b = el('button', { type: 'button', class: 'pa-chip', role: 'radio', 'aria-checked': 'false', text: r.label, onclick: () => {
                reason = r.key;
                chips.querySelectorAll('.pa-chip').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', String(on)); });
            } });
            return b;
        }));
        const at = el('input', { type: 'datetime-local', class: 'tt-input', value: toLocalInput(Date.now()), max: toLocalInput(Date.now()), 'aria-label': 'When it stopped' });
        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '200', placeholder: 'What happened? (optional)' });
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: 'Report breakdown' }),
            el('label', { class: 'wk-lbl', text: 'What broke' }), chips,
            el('label', { class: 'wk-lbl', text: 'When it stopped' }), at,
            el('label', { class: 'wk-lbl', text: 'Note' }), note,
            el('div', { class: 'ag-acts' }, [
                btn('Cancel', { onclick: () => { mode = null; render(); } }),
                btn('Mark rig down', { kind: 'danger', ic: 'octagon-alert', onclick: () => {
                    const list = readBreakdowns();
                    const res = reportBreakdown({ rigId: rigKey(), reason, startAt: fromLocalInput(at.value), note: note.value }, { list });
                    if (res.error) { sheet.say(res.error); return; }
                    if (!save([res.record, ...list])) return;
                    app.showToast?.('🔴 Rig marked down');
                    mode = null; render();
                } })
            ])
        ]);
    }

    function fixForm(rec, editing = false) {
        const at = el('input', { type: 'datetime-local', class: 'tt-input', value: toLocalInput(rec.endAt || Date.now()), max: toLocalInput(Date.now()), 'aria-label': 'When it worked again' });
        const cost = el('input', { type: 'number', inputmode: 'numeric', min: '0', class: 'tt-input', value: rec.cost || '', placeholder: '₹ spares + mechanic' });
        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '200', value: rec.fixNote || '', placeholder: 'What was done? (optional)' });
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: editing ? 'Edit repair' : 'Back to work' }),
            el('p', { class: 'wk-hint', text: `${reasonLabel(rec.reason)} · down since ${when(rec.startAt)}` }),
            el('label', { class: 'wk-lbl', text: 'Working again from' }), at,
            el('label', { class: 'wk-lbl', text: 'Repair cost (₹)' }), cost,
            el('label', { class: 'wk-lbl', text: 'Note' }), note,
            el('p', { class: 'wk-hint', text: 'The repair cost shows in the Transaction log as money out. Do not add it again as an expense.' }),
            el('div', { class: 'ag-acts' }, [
                btn('Cancel', { onclick: () => { mode = null; render(); } }),
                btn(editing ? 'Save' : 'Rig is working', { kind: 'pri', ic: 'check', onclick: () => {
                    const res = fixBreakdown(rec, { endAt: fromLocalInput(at.value), cost: cost.value, fixNote: note.value });
                    if (res.error) { sheet.say(res.error); return; }
                    if (!save(readBreakdowns().map((b) => (b.id === rec.id ? res.record : b)))) return;
                    app.showToast?.(editing ? '✅ Saved' : `🟢 Back to work after ${fmtHours(downHours(res.record))}`);
                    mode = null; render();
                } })
            ])
        ]);
    }

    function render() {
        sheet.say('');
        const list = readBreakdowns();
        const rig = rigKey();
        const s = statusNow(app);
        const m = monthSummary(list, rig, today().slice(0, 7));
        const open = openBreakdown(list, rig);

        const status = el('div', { class: `bd-status is-${s.state}` }, [
            el('span', { class: 'bd-dot', 'aria-hidden': 'true' }),
            el('div', { class: 'bd-status-txt' }, [
                el('strong', { text: s.state === 'down' ? 'Down' : s.state === 'working' ? 'Working' : 'Idle' }),
                el('small', { text: s.state === 'down'
                    ? `${reasonLabel(s.breakdown.reason)} · since ${when(s.since)} · ${fmtHours(s.hours)}${s.breakdown.note ? ` · ${s.breakdown.note}` : ''}`
                    : s.state === 'working' ? `${s.drilling ? 'Drilling now · ' : ''}${s.feetToday.toLocaleString('en-IN')} ft · ${s.boresToday} bore${s.boresToday === 1 ? '' : 's'} today` : 'No bore today yet' })
            ])
        ]);
        const action = mode ? null : open
            ? btn('Rig is working again', { kind: 'pri', ic: 'check', cls: 'tt-wide', onclick: () => { mode = 'fix'; render(); } })
            : btn('Report breakdown', { kind: 'danger', ic: 'octagon-alert', cls: 'tt-wide', onclick: () => { mode = 'report'; render(); } });

        let form = null;
        if (mode === 'report') form = reportForm();
        else if (mode === 'fix' && open) form = fixForm(open);
        else if (mode && mode.edit) { const rec = list.find((b) => b.id === mode.edit); if (rec) form = fixForm(rec, true); }

        const stats = el('div', { class: 'dr-grid' }, [
            el('div', { class: 'dr-stat' }, [el('small', { text: 'Breakdowns this month' }), el('strong', { text: String(m.count) })]),
            el('div', { class: 'dr-stat' }, [el('small', { text: 'Downtime this month' }), el('strong', { text: m.hours ? fmtHours(m.hours) : '0 h' })]),
            el('div', { class: 'dr-stat' }, [el('small', { text: 'Repair cost this month' }), el('strong', { text: inr(m.cost) })]),
            el('div', { class: 'dr-stat' }, [el('small', { text: 'Most hours lost' }), el('strong', { text: m.byReason[0] ? m.byReason[0].label : '—' }), m.byReason[0] ? el('em', { text: fmtHours(m.byReason[0].hours) }) : null])
        ]);

        const hist = history(list, rig).slice(0, 100);
        const histBox = hist.length ? el('div', { class: 'tt-card' }, [
            el('h4', { class: 'dr-h', text: 'Breakdowns' }),
            el('div', { class: 'tt-list' }, hist.map((b) => el('div', { class: 'tt-row is-static bd-row' }, [
                el('span', { class: `tx-ic ${b.endAt ? 'is-in' : 'is-out'}`, 'aria-hidden': 'true' }, [icon(b.endAt ? 'wrench' : 'octagon-alert')]),
                el('span', { class: 'tt-row-main' }, [
                    el('strong', { text: `${reasonLabel(b.reason)} · ${fmtHours(downHours(b))}` }),
                    el('small', { text: [`${when(b.startAt)}${b.endAt ? ` → ${when(b.endAt)}` : ' → still down'}`, b.note, b.fixNote].filter(Boolean).join(' · ') })
                ]),
                b.endAt ? el('span', { class: 'bd-side' }, [
                    el('strong', { text: b.cost ? inr(b.cost) : '₹0' }),
                    el('button', { type: 'button', class: 'wk-link', text: 'Edit', onclick: () => { mode = { edit: b.id }; render(); sheet.scroller?.scrollTo({ top: 0, behavior: 'smooth' }); } }),
                    el('button', { type: 'button', class: 'wk-link is-danger', text: 'Delete', onclick: (e) => {
                        const t = e.currentTarget;
                        if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Tap again'; setTimeout(() => { t.dataset.sure = ''; t.textContent = 'Delete'; }, 3000); return; }
                        save(readBreakdowns().filter((x) => x.id !== b.id)); render();
                    } })
                ]) : pill('Down', 'is-warn')
            ])))
        ]) : el('p', { class: 'tt-empty', text: 'No breakdowns recorded. 👍' });

        sheet.body.replaceChildren(...[
            status, action, form, stats, histBox,
            el('p', { class: 'ca-note', text: 'Working = a Final Bill today or drilling started in Work details. Saved on this phone.' })
        ].filter(Boolean));
        paintIcons();
    }
    render();
}
