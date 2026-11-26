// Approvals (Rig work tab → Money). Owner: turn approvals on / off, approve or reject what Rig
// Managers and office staff entered (expenses, diesel, advances, wages, payments they took).
// Others: see their own entries waiting or rejected. Logic: approvalMath.js; server guard: 0019.
//
// initApprovals() marks a non-owner's new / edited entries pending as they are saved (one hook on
// saveToStorage), so every existing form works unchanged.
import { STORAGE_KEYS } from '../../data/storage.js';
import { isOwnerOrLocal, currentUser } from '../../cloud/access.js';
import { el, openSheet, btn, pill, avatar } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { readCash } from '../cash/cashUI.js';
import { entryTitle } from '../cash/cashMath.js';
import { stampCash, stampPayments, decide, waiting, statusOf } from './approvalMath.js';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const niceDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

export const approvalsOn = (app) => !!app?.brand?.approvals;

/** Mark a non-owner's new / edited entries pending while approvals are on. */
export function initApprovals(app) {
    if (!app?.saveToStorage) return;
    const orig = app.saveToStorage.bind(app);
    app.saveToStorage = (key, data, changed) => {
        try {
            const me = currentUser();
            if (approvalsOn(app) && me?.id && !isOwnerOrLocal() && Array.isArray(data)) {
                const since = String(app.brand.approvalsSince || '');
                if (key === STORAGE_KEYS.cash) {
                    const r = stampCash(data, me.id, { since });
                    if (r.changed.length) { data = r.list; changed = [...new Set([...(changed || []), ...r.changed])]; }
                } else if (key === STORAGE_KEYS.history) {
                    const r = stampPayments(data, me.id, { since });
                    if (r.changed.length) {
                        data = r.list;
                        app.history = data;
                        changed = [...new Set([...(changed || []), ...r.changed])];
                    }
                }
            }
        } catch (e) { console.warn('[approvals]', e); }
        return orig(key, data, changed);
    };
}

/** Rig work tile line + warn flag. */
export function approvalsTile(app) {
    const list = waiting(readCash(), app.history || []);
    if (isOwnerOrLocal()) {
        if (!approvalsOn(app)) return { sub: 'Off · check manager entries before they count', warn: false };
        return list.length ? { sub: `${list.length} waiting · ${inr(list.reduce((s, x) => s + x.amount, 0))}`, warn: true } : { sub: 'On · nothing waiting', warn: false };
    }
    const meId = currentUser()?.id;
    const mine = list.filter((x) => (x.kind === 'cash' ? x.entry.holderId : x.payment.by?.id) === meId);
    return { sub: mine.length ? `${mine.length} of yours waiting for the owner` : (approvalsOn(app) ? 'Your entries are checked by the owner' : 'Off'), warn: false };
}

/** Recently decided entries (newest first), for the history list. */
function decided(cash, bills, limit = 30) {
    const out = [];
    for (const e of cash) if (e && !e.deleted && ['approved', 'rejected'].includes(statusOf(e))) out.push({ kind: 'cash', at: e.approval.at || '', entry: e, amount: e.amount, who: e.holderName });
    for (const b of bills) for (const p of Array.isArray(b?.payments) ? b.payments : []) {
        if (['approved', 'rejected'].includes(statusOf(p))) out.push({ kind: 'payment', at: p.approval.at || '', bill: b, payment: p, amount: p.amount, who: p.by?.name });
    }
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

export function openApprovals(app, { onSaved } = {}) {
    const owner = isOwnerOrLocal();
    const sheet = openSheet({ title: 'Approvals', sub: owner ? 'Check Rig Manager entries before they count' : 'Your entries the owner checks', ic: 'badge-check', onClose: () => onSaved?.() });
    let rejecting = null; // id of the row being rejected (shows a note box)

    function decideOne(item, status, note = '') {
        const by = currentUser() || { id: 'owner', name: 'Owner' };
        if (item.kind === 'cash') {
            const list = readCash().map((e) => (e.id === item.entry.id ? decide(e, status, { by, note }) : e));
            if (!app.saveToStorage(STORAGE_KEYS.cash, list)) return false;
        } else {
            const bills = app.history || [];
            const idx = bills.findIndex((b) => b.id === item.bill.id);
            if (idx < 0) return false;
            const b = bills[idx];
            bills[idx] = { ...b, payments: b.payments.map((p) => (p.id === item.payment.id ? decide(p, status, { by, note }) : p)) };
            if (!app.saveToStorage(STORAGE_KEYS.history, bills, [b.id])) return false;
            try { app.syncBillPaymentSnapshot?.(bills[idx]); app.renderHistoryList?.(''); } catch { /* ignore */ }
        }
        return true;
    }

    const titleOf = (x) => (x.kind === 'cash' ? entryTitle(x.entry) : `Payment · #${x.bill.billNo} ${x.bill.custName || ''}`.trim());
    const subOf = (x) => (x.kind === 'cash'
        ? [niceDay(x.entry.date), x.entry.paidBy ? x.entry.paidBy.toUpperCase() : '', x.entry.note].filter(Boolean).join(' · ')
        : [niceDay(x.payment.date), x.payment.mode, x.bill.custLocation].filter(Boolean).join(' · '));

    function render() {
        sheet.say('');
        const cash = readCash();
        const bills = app.history || [];
        const meId = currentUser()?.id;
        let list = waiting(cash, bills);
        if (!owner) list = list.filter((x) => (x.kind === 'cash' ? x.entry.holderId : x.payment.by?.id) === meId);
        const kids = [];

        if (owner) {
            const on = approvalsOn(app);
            kids.push(el('div', { class: 'tt-card ap-switch' }, [
                el('div', { class: 'ap-switch-txt' }, [
                    el('strong', { text: 'Approve manager entries' }),
                    el('small', { text: 'Expenses, diesel, advances, wages and payments entered by Rig Managers or office staff wait for you and only count once approved. Your own entries never wait.' })
                ]),
                el('label', { class: 'ap-toggle' }, [
                    el('input', { type: 'checkbox', checked: on, 'aria-label': 'Approve manager entries', onchange: (e) => {
                        app.brand.approvals = e.target.checked;
                        if (e.target.checked && !app.brand.approvalsSince) app.brand.approvalsSince = new Date().toISOString();
                        app.saveToStorage(STORAGE_KEYS.brand, app.brand);
                        app.showToast?.(e.target.checked ? '✅ Approvals on: manager entries will wait for you' : 'Approvals off');
                        render();
                    } }),
                    el('span', { 'aria-hidden': 'true' })
                ])
            ]));
        }

        const total = list.reduce((s, x) => s + x.amount, 0);
        kids.push(el('div', { class: 'ap-head' }, [
            el('strong', { text: list.length ? `${list.length} waiting · ${inr(total)}` : 'Nothing is waiting' }),
            owner && list.length > 1 ? el('button', { type: 'button', class: 'wk-link', text: 'Approve all', onclick: (e) => {
                const t = e.currentTarget;
                if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = `Tap again to approve ${list.length}`; setTimeout(() => { t.dataset.sure = ''; t.textContent = 'Approve all'; }, 3000); return; }
                for (const x of list) decideOne(x, 'approved');
                app.showToast?.(`✅ ${list.length} approved`);
                render();
            } }) : null
        ]));

        if (list.length) {
            kids.push(el('div', { class: 'tt-list pa-list' }, list.map((x) => el('div', { class: 'tt-item pa-row' }, [
                el('div', { class: 'tt-row is-static' }, [
                    avatar(x.who || '?', 'is-warn'),
                    el('span', { class: 'tt-row-main' }, [el('strong', { text: titleOf(x) }), el('small', { text: [x.who ? `by ${x.who}` : '', subOf(x)].filter(Boolean).join(' · ') })]),
                    el('span', { class: 'pa-right' }, [el('strong', { class: 'pa-due', text: inr(x.amount) }), pill('Waiting', 'is-warn')])
                ]),
                owner ? (rejecting === x.id
                    ? el('div', { class: 'pa-acts ap-reject' }, (() => {
                        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '120', placeholder: 'Why? (shown to the manager)' });
                        setTimeout(() => note.focus(), 30);
                        return [note, btn('Reject', { kind: 'danger', onclick: () => { if (decideOne(x, 'rejected', note.value)) { app.showToast?.('Rejected'); rejecting = null; render(); } } }),
                            el('button', { type: 'button', class: 'tt-icon-btn', 'aria-label': 'Cancel', onclick: () => { rejecting = null; render(); } }, [icon('x')])];
                    })())
                    : el('div', { class: 'pa-acts' }, [
                        btn('Reject', { ic: 'x', onclick: () => { rejecting = x.id; render(); } }),
                        btn('Approve', { kind: 'pri', ic: 'check', onclick: () => { if (decideOne(x, 'approved')) { app.showToast?.(`✅ Approved ${inr(x.amount)}`); render(); } } })
                    ])) : null
            ]))));
        } else if (owner && !approvalsOn(app)) {
            kids.push(el('p', { class: 'tt-empty', text: 'Turn approvals on to check manager entries here.' }));
        }

        const done = decided(cash, bills).filter((x) => owner || (x.kind === 'cash' ? x.entry.holderId : x.payment.by?.id) === meId);
        if (done.length) {
            kids.push(el('div', { class: 'tt-card' }, [
                el('h4', { class: 'dr-h', text: 'Checked recently' }),
                el('div', { class: 'tt-list' }, done.map((x) => {
                    const a = (x.kind === 'cash' ? x.entry : x.payment).approval;
                    return el('div', { class: 'tt-row is-static' }, [
                        el('span', { class: `tx-ic ${a.status === 'approved' ? 'is-in' : 'is-out'}`, 'aria-hidden': 'true' }, [icon(a.status === 'approved' ? 'check' : 'x')]),
                        el('span', { class: 'tt-row-main' }, [
                            el('strong', { text: titleOf(x) }),
                            el('small', { text: [x.who ? `by ${x.who}` : '', a.status === 'approved' ? 'approved' : `rejected${a.note ? `: ${a.note}` : ''}`, a.by?.name ? `by ${a.by.name}` : ''].filter(Boolean).join(' · ') })
                        ]),
                        el('span', { class: 'dr-amt', text: inr(x.amount) })
                    ]);
                }))
            ]));
        }
        kids.push(el('p', { class: 'ca-note', text: owner
            ? 'Waiting and rejected expenses do not count in the Transaction log, Daily site report or spend totals. A rejected payment does not count as paid. Editing an approved entry sends it back for approval.'
            : 'Your entries count once the owner approves them. A rejected one shows the owner’s reason; fix it and save again to send it back.' }));
        sheet.body.replaceChildren(...kids.filter(Boolean));
        paintIcons();
    }
    render();
}

