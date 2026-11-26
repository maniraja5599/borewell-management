// "Manager wallet" (Rig work tab → Money; owner and office staff with expenses): for every person
// who holds the business's cash — what they were given, collected from customers, spent on the rig
// and handed over, and what they still hold. Hand-overs waiting for "Received ✓" can be ticked here.
// Logic: cashMath.js (cashBook / holders — the same numbers as Expenses & cash).
import { STORAGE_KEYS } from '../../data/storage.js';
import { isOwnerOrLocal, getRole, currentUser } from '../../cloud/access.js';
import { el, openSheet, btn, item, pill, avatar } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { readCash, me } from './cashUI.js';
import { cashBook, holders, markReceived, entryTitle } from './cashMath.js';

const inr = (n) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(Number(n) || 0)).toLocaleString('en-IN')}`;
const niceDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

export const canSeeWallets = () => isOwnerOrLocal() || getRole() === 'office';

/** Everyone except the owner / office person looking (their own cash is on Expenses & cash). */
function people(app) {
    const myId = currentUser()?.id || me().id;
    return holders(readCash(), app.history || [], null).filter((h) => h.id !== myId);
}

/** Rig work tile line. */
export function walletTile(app) {
    const list = people(app);
    if (!list.length) return { sub: 'Cash each Rig Manager collected, spent and holds', warn: false };
    const held = list.reduce((s, h) => s + Math.max(0, h.balance), 0);
    const waiting = list.reduce((s, h) => s + h.pendingCount, 0);
    return { sub: `${inr(held)} held by ${list.length} ${list.length === 1 ? 'person' : 'people'}${waiting ? ` · ${waiting} hand-over${waiting === 1 ? '' : 's'} to tick` : ''}`, warn: waiting > 0 };
}

export function openWallet(app, { onSaved } = {}) {
    const sheet = openSheet({ title: 'Manager wallets', sub: 'Cash each person collected, spent, handed over and still holds', ic: 'wallet-cards', onClose: () => onSaved?.() });

    function receive(entry) {
        const list = readCash().map((e) => (e.id === entry.id ? markReceived(e, currentUser() || me()) : e));
        if (app.saveToStorage(STORAGE_KEYS.cash, list)) { app.showToast?.(`✅ Received ${inr(entry.amount)}`); render(); }
    }

    function body(h) {
        const b = cashBook(readCash(), app.history || [], h.id);
        const pendingHandovers = b.lines.filter((l) => l.kind === 'entry' && l.entry.type === 'handover' && !l.entry.receivedAt);
        return [
            el('div', { class: 'tt-stats ag-stats wl-stats' }, [
                el('div', {}, [el('small', { text: 'Given to them' }), el('strong', { text: inr(b.received) })]),
                el('div', {}, [el('small', { text: 'Collected' }), el('strong', { text: inr(b.collected) })]),
                el('div', {}, [el('small', { text: 'Spent' }), el('strong', { text: inr(b.spent) })]),
                el('div', {}, [el('small', { text: 'Handed over' }), el('strong', { text: inr(b.handedOver) })])
            ]),
            pendingHandovers.length ? el('div', { class: 'wl-pending' }, pendingHandovers.map((l) => el('div', { class: 'wl-pending-row' }, [
                el('span', { text: `${niceDay(l.entry.date)} · ${entryTitle(l.entry)} · ${inr(l.entry.amount)}` }),
                btn('Received ✓', { kind: 'pri', onclick: () => receive(l.entry) })
            ]))) : null,
            el('ul', { class: 'iv-moves' }, b.lines.slice(0, 25).map((l) => el('li', { class: l.amount > 0 ? 'is-pay' : '' }, [
                el('span', { text: `${niceDay(l.date)} · ${l.kind === 'collection' ? `Collected · #${l.bill.billNo} ${l.bill.custName}` : entryTitle(l.entry)}` }),
                el('small', { text: `${l.amount > 0 ? '+' : l.amount < 0 ? '−' : ''}${inr(Math.abs(l.amount))}${l.kind === 'entry' && l.entry.approval?.status === 'pending' ? ' · waiting approval' : ''}${l.kind === 'entry' && l.entry.type === 'handover' && !l.entry.receivedAt ? ' · not received yet' : ''}` })
            ])))
        ];
    }

    function render() {
        const list = people(app);
        const held = list.reduce((s, h) => s + Math.max(0, h.balance), 0);
        const toTick = list.reduce((s, h) => s + h.pending, 0);
        sheet.body.replaceChildren(...[
            el('div', { class: 'tt-card pa-head' }, [
                el('div', {}, [el('small', { text: 'Held by others' }), el('strong', { class: held ? 'is-due' : '', text: inr(held) })]),
                el('div', {}, [el('small', { text: 'People' }), el('strong', { text: String(list.length) })]),
                el('div', {}, [el('small', { text: 'Hand-overs to tick' }), el('strong', { text: toTick ? inr(toTick) : '—' })])
            ]),
            list.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, list.map((h) => item({
                avatar: avatar(h.name, h.balance > 0 ? 'is-warn' : ''),
                title: h.name,
                subText: h.pendingCount ? `${h.pendingCount} hand-over${h.pendingCount === 1 ? '' : 's'} waiting · ${inr(h.pending)}` : 'All hand-overs received',
                pill: pill(h.balance > 0 ? `holds ${inr(h.balance)}` : h.balance < 0 ? `${inr(-h.balance)} spent extra` : 'Nothing held', h.balance > 0 ? 'is-warn' : 'is-ok'),
                bodyKids: () => body(h)
            })))]) : el('p', { class: 'tt-empty', text: 'Nobody else holds cash yet. When a Rig Manager takes a cash payment or adds an expense, they show here.' }),
            el('p', { class: 'ca-note', text: 'Holds = given + collected in cash − spent in cash − handed over (received). Pending hand-overs leave their cash when you tick Received ✓. Same figures as Expenses & cash.' })
        ]);
        paintIcons();
    }
    render();
}
