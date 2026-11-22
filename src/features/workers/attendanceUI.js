// "Attendance & wages" sheet (Settings → Rig work).
//   Day    pick a date, mark each ACTIVE worker present / half day / absent / holiday (one tap saves),
//          "All present", "Holiday for all", the day's wages.
//   Wages  each worker's balance (we owe them / they owe us), this pay period, advances and wage
//          payments. Money given here is a cash entry, so it leaves the payer's cash in hand.
// Who: owner everything; office staff with "workers" (money needs "expenses" too); managers the
// workers of their rigs. Office staff (no rig) are marked only by the owner / office (server 0017).
// Logic: attendanceMath.js.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { can, isOwnerOrLocal, getRole, visibleRigs, getCurrentRig, currentUser } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, btn, field, input, seg, openSheet, item, label, pill, avatar } from '../../ui/sheet.js';
import { readWorkers } from './workersUI.js';
import { wageOn, todayYmd, workerLabel, typeOf } from './workersMath.js';
import { shortDate } from '../tools/toolsMath.js';
import {
    STATUSES, PAY_CYCLES, payCycleOf, isActive, markDay, markAll, upsertAll, marksOn, daySummary, ledger, payNow, addDays, fmtDays
} from './attendanceMath.js';
import { PAID_BY, LOCAL_HOLDER, makeEntry, inr } from '../cash/cashMath.js';

export const readAttendance = () => storage.getList(STORAGE_KEYS.attendance) || [];
const readCash = () => storage.getList(STORAGE_KEYS.cash) || [];
const save = (app, key, list) => (app?.saveToStorage ? app.saveToStorage(key, list) : (storage.setList(key, list), true));
const me = () => currentUser() || LOCAL_HOLDER;
const OFFICE = 'office';
const LOCAL = 'local';
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

/** Settings row text: today's marks. */
export function attendanceLine() {
    const active = readWorkers().filter(isActive);
    if (!active.length) return 'Present / absent, advances, wages';
    const s = daySummary(active, readAttendance(), todayYmd());
    return s.unmarked === active.length ? `Today not marked · ${active.length} working` : `Today ${s.present + s.half} at work · ${s.unmarked} not marked`;
}

export function openAttendance(app) {
    if (!can('workers')) { app?.showToast?.('You do not have access to attendance. Ask the owner.'); return; }
    const rigs = visibleRigs();
    const officeToo = isOwnerOrLocal() || getRole() === 'office';
    const places = rigs.length
        ? [...rigs.map((r) => ({ key: r.id, label: r.name })), ...(officeToo ? [{ key: OFFICE, label: 'Office' }] : [])]
        : [{ key: LOCAL, label: '' }];
    let place = places.some((p) => p.key === getCurrentRig()?.id) ? getCurrentRig().id : places[0].key;
    let tab = 'day';
    let date = todayYmd();
    let open = null; // worker id with an open money form: `${id}:advance` | `${id}:wage`
    let expanded = null; // worker row kept open across redraws
    let restoring = false;

    const onChange = () => render();
    const events = ['drillrig:attendance-changed', 'drillrig:workers-changed', 'drillrig:cash-changed'];
    const sheet = openSheet({ title: 'Attendance & wages', sub: '', ic: 'calendar-check', onClose: () => events.forEach((e) => window.removeEventListener(e, onChange)) });

    const inPlace = (w) => (place === LOCAL ? true : place === OFFICE ? !w.rigId : w.rigId === place);
    const workersHere = () => readWorkers().filter((w) => w && inPlace(w));

    function setMarks(records) {
        if (!records.length) return;
        save(app, STORAGE_KEYS.attendance, upsertAll(readAttendance(), records));
        render();
    }

    // ------------------------------------------------------------------ Day
    function dayView() {
        const today = todayYmd();
        const active = workersHere().filter(isActive);
        const att = readAttendance();
        const marks = marksOn(att, date);
        const s = daySummary(active, att, date);
        const dateBox = input('atDate', { type: 'date', value: date, max: today });
        dateBox.addEventListener('change', () => { if (dateBox.value && dateBox.value <= today) { date = dateBox.value; render(); } });
        const rows = active.map((w) => {
            const wage = wageOn(w, date);
            return el('div', { class: 'at-row' }, [
                el('div', { class: 'at-who' }, [
                    avatar(w.name),
                    el('span', { class: 'at-name' }, [
                        el('strong', { text: workerLabel(w) }),
                        el('small', { text: [typeOf(w.type).label, wage ? `₹${wage.toLocaleString('en-IN')}/day` : 'no wage set'].join(' · ') })
                    ])
                ]),
                seg(`at_${w.id}`, STATUSES.map((x) => ({ key: x.key, label: x.key === 'half' ? 'Half' : x.label })), marks.get(w.id) || '', (v) => {
                    const r = markDay(w, date, v, { by: me() });
                    if (r.error) { sheet.say(r.error); return; }
                    setMarks([r.record]);
                })
            ]);
        });
        const prev = btn('', { ic: 'chevron-left', cls: 'at-step', onclick: () => { date = addDays(date, -1); render(); } });
        const next = btn('', { ic: 'chevron-right', cls: 'at-step', disabled: date >= today, onclick: () => { if (date < today) { date = addDays(date, 1); render(); } } });
        prev.setAttribute('aria-label', 'Day before');
        next.setAttribute('aria-label', 'Next day');
        return [
            el('div', { class: 'at-date' }, [prev, dateBox, next]),
            el('div', { class: 'tt-card at-sum' }, [
                el('div', { class: 'tt-stats' }, [
                    el('div', {}, [el('small', { text: date === today ? 'Today' : shortDate(date) }), el('strong', { text: `${s.present + s.half} at work` })]),
                    el('div', {}, [el('small', { text: 'Wages for the day' }), el('strong', { text: inr(s.wages) })])
                ]),
                el('p', { class: 'ca-note', text: `${s.present} present · ${s.half} half day · ${s.absent} absent${s.holiday ? ` · ${s.holiday} holiday` : ''}${s.unmarked ? ` · ${s.unmarked} not marked` : ''}` })
            ]),
            active.length ? el('div', { class: 'at-acts' }, [
                btn('All present', { kind: 'soft', ic: 'check-check', onclick: () => {
                    // Only the ones not marked yet: a tap never undoes someone's absent / half day.
                    const r = markAll(active.filter((w) => !marks.has(w.id)), date, 'present', { by: me() });
                    if (r.error) sheet.say(r.error); else { setMarks(r.records); sheet.say(r.records.length ? `${r.records.length} marked present.` : 'Everyone is already marked.', true); }
                } }),
                btn('Holiday for all', { kind: 'soft', ic: 'sun', onclick: () => {
                    const r = markAll(active, date, 'holiday', { by: me() });
                    if (r.error) sheet.say(r.error); else { setMarks(r.records); sheet.say(`Holiday for everyone on ${shortDate(date)}. No wages that day.`, true); }
                } })
            ]) : null,
            active.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'at-list' }, rows)])
                : el('p', { class: 'tt-empty', text: 'No active workers here. Add them in Workers (or make them active).' })
        ];
    }

    // ------------------------------------------------------------------ Wages
    function moneyForm(w, type, suggested) {
        const uid = `${w.id.slice(-6)}${type}`;
        let paidBy = 'cash';
        const amount = input(`atAmt${uid}`, { type: 'number', inputmode: 'numeric', min: '1', step: '1', placeholder: 'e.g. 1000', value: suggested || '' });
        const day = input(`atDay${uid}`, { type: 'date', value: todayYmd(), max: todayYmd() });
        const note = input(`atNote${uid}`, { type: 'text', maxlength: '200', placeholder: 'Optional' });
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        return el('div', { class: 'tt-form is-inline' }, [
            el('div', { class: 'tt-fields is-half' }, [field(amount.id, type === 'advance' ? 'Advance (₹)' : 'Wages paid (₹)', amount), field(day.id, 'Date', day)]),
            el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Paid by' }), seg(`atPaid${uid}`, PAID_BY, paidBy, (k) => { paidBy = k; })]),
            field(note.id, 'Note', note),
            el('p', { class: 'ca-note', text: 'Paid in cash: it comes out of your cash in hand.' }),
            err,
            el('div', { class: 'tt-acts is-two' }, [
                btn('Cancel', { onclick: () => { open = null; render(); } }),
                btn(type === 'advance' ? 'Give advance' : 'Pay', {
                    kind: 'pri', ic: 'check',
                    onclick: () => {
                        const res = makeEntry({ type, workerId: w.id, workerName: workerLabel(w), amount: amount.value, date: day.value, paidBy, note: note.value, rigId: w.rigId || null }, { me: me() });
                        if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                        save(app, STORAGE_KEYS.cash, [res.entry, ...readCash()]);
                        open = null;
                        sheet.say(`${type === 'advance' ? 'Advance' : 'Wages'} ${inr(res.entry.amount)} to ${w.name} saved.`, true);
                        render();
                    }
                })
            ])
        ]);
    }

    function wageRow(w, att, cash) {
        const row = wageItem(w, att, cash);
        row.dataset.wid = w.id;
        row.querySelector('.tt-row')?.addEventListener('click', () => { if (!restoring) expanded = expanded === w.id ? null : w.id; });
        return row;
    }

    function wageItem(w, att, cash) {
        const p = payNow(w, att, cash);
        const cycle = payCycleOf(w);
        const pillEl = p.toPay ? pill(`Pay ${inr(p.toPay)}`, 'is-warn') : p.owesUs ? pill(`Owes ${inr(p.owesUs)}`, 'is-office') : pill('Settled', 'is-ok');
        return item({
            avatar: avatar(w.name, isActive(w) ? '' : 'is-muted'),
            title: workerLabel(w),
            subText: `${p.range.label}: ${fmtDays(p.period.days)} day${p.period.days === 1 ? '' : 's'} · ${inr(p.period.earned)} · ${PAY_CYCLES.find((c) => c.key === cycle).label} pay`,
            pill: pillEl,
            bodyKids: () => {
                const all = ledger(w, att, cash);
                const money = can('expenses');
                return [
                    el('div', { class: 'tt-stats' }, [
                        el('div', {}, [el('small', { text: 'Days worked' }), el('strong', { text: fmtDays(all.days) })]),
                        el('div', {}, [el('small', { text: 'Wages earned' }), el('strong', { text: inr(all.earned) })]),
                        el('div', {}, [el('small', { text: 'Advances' }), el('strong', { text: inr(all.advances) })]),
                        el('div', {}, [el('small', { text: 'Wages paid' }), el('strong', { text: inr(all.paid) })])
                    ]),
                    el('p', { class: `at-bal${all.balance < 0 ? ' is-neg' : all.balance === 0 ? ' is-ok' : ''}`, text: all.balance > 0 ? `You owe ${w.name} ${inr(all.balance)}` : all.balance < 0 ? `${w.name} owes you ${inr(-all.balance)} (advance)` : 'All settled' }),
                    el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Pay' }), seg(`atCycle${w.id.slice(-6)}`, PAY_CYCLES, cycle, (v) => {
                        save(app, STORAGE_KEYS.workers, readWorkers().map((x) => (x.id === w.id ? { ...x, payCycle: v, updatedAt: new Date().toISOString() } : x)));
                        render();
                    })]),
                    money && open === `${w.id}:advance` ? moneyForm(w, 'advance') : null,
                    money && open === `${w.id}:wage` ? moneyForm(w, 'wage', p.toPay) : null,
                    money && !open?.startsWith(w.id) ? el('div', { class: 'tt-acts is-two' }, [
                        btn('Give advance', { ic: 'hand-coins', onclick: () => { open = `${w.id}:advance`; render(); } }),
                        btn('Pay wages', { kind: 'pri', ic: 'indian-rupee', onclick: () => { open = `${w.id}:wage`; render(); } })
                    ]) : null,
                    all.lines.length ? el('ol', { class: 'tl-mm at-lines' }, all.lines.slice(0, 30).map((l) => el('li', {}, [
                        el('span', { text: `${shortDate(l.date)} · ${l.kind === 'day' ? STATUS_LABEL[l.status] : l.kind === 'advance' ? 'Advance' : 'Wages paid'}` }),
                        el('strong', { text: l.kind === 'day' ? (l.amount ? `+${inr(l.amount)}` : '—') : `−${inr(l.amount)}` })
                    ]))) : el('p', { class: 'ca-note', text: 'No days or payments yet.' })
                ];
            }
        });
    }

    function wagesView() {
        const att = readAttendance();
        const cash = readCash();
        const here = workersHere();
        const active = here.filter(isActive);
        // Inactive workers stay listed while money is still open with them.
        const inactive = here.filter((w) => !isActive(w) && ledger(w, att, cash).balance !== 0);
        const owed = active.concat(inactive).reduce((s, w) => s + Math.max(0, ledger(w, att, cash).balance), 0);
        return [
            el('div', { class: 'tt-card' }, [el('div', { class: 'tt-stats' }, [
                el('div', {}, [el('small', { text: 'Wages to pay' }), el('strong', { text: inr(owed) })]),
                el('div', {}, [el('small', { text: 'Workers' }), el('strong', { text: `${active.length} active` })])
            ])]),
            active.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, active.map((w) => wageRow(w, att, cash)))]) : el('p', { class: 'tt-empty', text: 'No active workers here.' }),
            inactive.length ? label('Inactive, money still open', inactive.length) : null,
            inactive.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, inactive.map((w) => wageRow(w, att, cash)))]) : null
        ];
    }

    function render() {
        const name = places.find((p) => p.key === place)?.label;
        sheet.setSub(`${name ? `${name} · ` : ''}${attendanceLine()}`);
        sheet.body.replaceChildren(...[
            places.length > 1 ? seg('atPlace', places, place, (v) => { place = v; open = null; render(); }) : null,
            seg('atTab', [{ key: 'day', label: 'Day' }, { key: 'wages', label: 'Wages' }], tab, (v) => { tab = v; render(); }),
            ...(tab === 'day' ? dayView() : wagesView())
        ].filter(Boolean));
        // Keep the worker you were working on open after a redraw (a save redraws the list).
        if (tab === 'wages' && expanded) {
            restoring = true;
            sheet.body.querySelector(`.tt-item[data-wid="${CSS.escape(expanded)}"] .tt-row`)?.click();
            restoring = false;
        }
        paintIcons();
    }

    events.forEach((e) => window.addEventListener(e, onChange));
    render();
}
