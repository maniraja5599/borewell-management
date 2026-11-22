// "Expenses & cash" sheet (Settings → Rig work). Everyone who may use it sees their own cash in hand
// at the top, updated with every entry. Add an expense, diesel, cash received or a hand-over; take a
// customer payment (it goes on the bill and into the cash). The owner / office ticks hand-overs
// "Received ✓", sees everyone's cash and edits the expense categories. Logic: cashMath.js.
// Who: owner everything; manager their rigs, only their own entries; office with "expenses".
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { can, isOwnerOrLocal, getRole, visibleRigs, getCurrentRig, currentUser } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, btn, field, input, seg, openSheet, item, label, pill } from '../../ui/sheet.js';
import { todayYmd } from '../workers/workersMath.js';
import { shortDate } from '../tools/toolsMath.js';
import {
    PAID_BY, FROM, TO, LOCAL_HOLDER, categories, addCategory, renameCategory, removeCategory, makeEntry, markReceived,
    undoReceived, adoptLocalEntries, cashBook, holders, pendingHandovers, spendSummary, bunkNames, entryTitle, entryLine, inr
} from './cashMath.js';

export const readCash = () => storage.getList(STORAGE_KEYS.cash) || [];
function saveCash(app, list) {
    if (app?.saveToStorage) return app.saveToStorage(STORAGE_KEYS.cash, list);
    storage.setList(STORAGE_KEYS.cash, list);
    return true;
}
export const me = () => currentUser() || LOCAL_HOLDER;
/** Owner / office: tick hand-overs, see everyone's cash. */
const isReceiver = () => isOwnerOrLocal() || getRole() === 'office';
const OFFICE = 'office';
const LOCAL = 'local';
const ICONS = { expense: 'receipt', diesel: 'fuel', in: 'arrow-down-left', handover: 'arrow-up-right', advance: 'hand-coins', wage: 'indian-rupee' };
const PERIODS = [{ key: 'this', label: 'This month' }, { key: 'last', label: 'Last month' }, { key: 'all', label: 'All' }];

function periodRange(key, today = todayYmd()) {
    const [y, m] = today.split('-').map(Number);
    const ym = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}`;
    if (key === 'this') return { start: `${ym(y, m)}-01`, end: today };
    if (key === 'last') {
        const py = m === 1 ? y - 1 : y;
        const pm = m === 1 ? 12 : m - 1;
        return { start: `${ym(py, pm)}-01`, end: `${ym(py, pm)}-${String(new Date(py, pm, 0).getDate()).padStart(2, '0')}` };
    }
    return { start: '', end: '9999-12-31' };
}

/** My cash in hand right now (for the Settings row). */
export function myCashLine(app) {
    const b = cashBook(readCash(), app?.history || [], me().id);
    return b.lines.length ? `Cash in hand ${inr(b.balance)}${b.pendingCount ? ` · ${inr(b.pending)} waiting` : ''}` : 'Expenses, diesel, cash in hand';
}

export function openCash(app, { start = null } = {}) {
    if (!can('expenses')) { app?.showToast?.('You do not have access to expenses. Ask the owner.'); return; }
    const rigs = visibleRigs();
    // Places: the rigs this person has; owner / office also "Office" (no rig). No cloud: one place.
    const places = rigs.length
        ? [...rigs.map((r) => ({ key: r.id, label: r.name })), ...(isReceiver() ? [{ key: OFFICE, label: 'Office' }] : [])]
        : [{ key: LOCAL, label: '' }];
    let place = places.some((p) => p.key === getCurrentRig()?.id) ? getCurrentRig().id : places[0].key;
    let adding = ['expense', 'diesel', 'in', 'handover'].includes(start) ? start : null; // 'expense' | 'diesel' | 'in' | 'handover' | 'collect'
    let period = 'this';
    let shown = 40;

    // Old bills without a rig belong to the first rig.
    const defaultRigId = (rigs.find((r) => r.is_default) || rigs[0])?.id || null;
    const rigIdOf = (p) => (p === OFFICE || p === LOCAL ? null : p);
    const placeName = (rigId) => (rigId ? (rigs.find((r) => r.id === rigId)?.name || 'Rig') : (rigs.length ? 'Office' : ''));
    const onChange = () => render();
    const sheet = openSheet({ title: 'Expenses & cash', sub: '', ic: 'wallet', onClose: () => window.removeEventListener('drillrig:cash-changed', onChange) });

    function upsert(entry) {
        const list = readCash();
        const next = list.some((x) => x.id === entry.id) ? list.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...list];
        return saveCash(app, next);
    }
    // Server rule (0016): managers change only their own entries; office staff (with "expenses") any.
    // A manager's hand-over is fixed once saved (the owner / office may tick it at any moment).
    const mayEdit = (e) => isReceiver() || (!e.receivedAt && e.type !== 'handover' && e.holderId === me().id);

    // ------------------------------------------------------------------ forms
    function entryForm(type, existing, onDone) {
        const uid = existing ? existing.id.slice(-6) : `n${type}`;
        const cats = categories(app.brand);
        const v = existing || {};
        let category = v.category || cats[0]?.key;
        let paidBy = v.paidBy || 'cash';
        let source = v.source || 'bunk';
        let from = v.from || 'owner';
        let to = v.to || 'owner';
        const amount = input(`caAmt${uid}`, { type: 'number', inputmode: 'numeric', min: '1', step: '1', placeholder: 'e.g. 500', value: v.amount ?? '' });
        const date = input(`caDate${uid}`, { type: 'date', value: v.date || todayYmd(), max: todayYmd() });
        const note = input(`caNote${uid}`, { type: 'text', maxlength: '200', placeholder: 'Optional', value: v.note || '' });
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        const kids = [];
        let litres;
        let rate;
        let bunk;
        let name;
        if (type === 'expense') {
            kids.push(el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'What for' }), seg(`caCat${uid}`, cats, category, (k) => { category = k; })]));
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(amount.id, 'Amount (₹)', amount), field(date.id, 'Date', date)]));
            kids.push(el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Paid by' }), seg(`caPaid${uid}`, PAID_BY, paidBy, (k) => { paidBy = k; })]));
        } else if (type === 'diesel') {
            litres = input(`caLit${uid}`, { type: 'number', inputmode: 'decimal', min: '0', step: '0.01', placeholder: 'e.g. 50', value: v.litres ?? '' });
            rate = input(`caRate${uid}`, { type: 'number', inputmode: 'decimal', min: '0', step: '0.01', placeholder: 'e.g. 92.50', value: v.rate ?? '' });
            const listId = `caBunks${uid}`;
            bunk = input(`caBunk${uid}`, { type: 'text', maxlength: '60', list: listId, placeholder: 'Type 1–2 letters to pick', value: v.bunk || '' });
            const total = el('strong', { class: 'ca-total' });
            const showTotal = () => {
                const l = Number(litres.value);
                const r = Number(rate.value);
                total.textContent = l > 0 && r > 0 ? `Total ${inr(l * r)}` : source === 'vehicle' ? 'No cost (from a vehicle)' : 'Total —';
            };
            litres.addEventListener('input', showTotal);
            rate.addEventListener('input', showTotal);
            const bunkField = field(bunk.id, 'Bunk name', bunk);
            const bunkLabel = bunkField.querySelector('label');
            const showSource = () => { bunkLabel.textContent = source === 'vehicle' ? 'Which vehicle' : 'Bunk name'; showTotal(); };
            kids.push(seg(`caSrc${uid}`, [{ key: 'bunk', label: 'From a bunk' }, { key: 'vehicle', label: 'From a vehicle' }], source, (k) => { source = k; showSource(); }));
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(litres.id, 'Litres', litres), field(rate.id, '₹ per litre', rate)]));
            kids.push(total);
            kids.push(bunkField, el('datalist', { id: listId }, bunkNames(readCash()).map((b) => el('option', { value: b }))));
            kids.push(field(date.id, 'Date', date));
            kids.push(el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Paid by' }), seg(`caPaid${uid}`, PAID_BY, paidBy, (k) => { paidBy = k; })]));
            showSource();
        } else if (type === 'in') {
            name = input(`caName${uid}`, { type: 'text', maxlength: '80', placeholder: 'Optional', value: v.fromName || '' });
            kids.push(el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Who gave it' }), seg(`caFrom${uid}`, FROM, from, (k) => { from = k; })]));
            kids.push(field(name.id, 'Name', name));
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(amount.id, 'Amount (₹)', amount), field(date.id, 'Date', date)]));
        } else {
            name = input(`caName${uid}`, { type: 'text', maxlength: '80', placeholder: 'Optional', value: v.toName || '' });
            kids.push(el('p', { class: 'ca-note', text: 'It leaves your cash in hand when the owner / office ticks "Received ✓".' }));
            kids.push(el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Given to' }), seg(`caTo${uid}`, TO, to, (k) => { to = k; })]));
            kids.push(field(name.id, 'Name', name));
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(amount.id, 'Amount (₹)', amount), field(date.id, 'Date', date)]));
        }
        kids.push(field(note.id, 'Note', note), err);
        const save = btn(existing ? 'Save' : 'Add', {
            kind: 'pri', ic: 'check',
            onclick: () => {
                const res = makeEntry({
                    type, date: date.value, note: note.value, amount: amount.value, category, paidBy, source,
                    litres: litres?.value, rate: rate?.value, bunk: bunk?.value,
                    from, fromName: type === 'in' ? name.value : '', to, toName: type === 'handover' ? name.value : '',
                    rigId: existing ? existing.rigId : rigIdOf(place)
                }, { existing, me: me(), cats });
                if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                if (!upsert(res.entry)) return;
                onDone?.();
                sheet.say(`${entryTitle(res.entry)}${res.entry.amount ? ` · ${inr(res.entry.amount)}` : ''} ${existing ? 'saved' : 'added'}.`, true);
                render();
            }
        });
        return el('div', { class: 'tt-form' }, [...kids, el('div', { class: 'tt-acts is-two' }, [
            existing ? null : btn('Cancel', { onclick: () => { adding = null; render(); } }), save
        ])]);
    }

    /** Take a payment on an unpaid bill of this rig: opens the normal payment window. */
    function collectList() {
        const rigId = rigIdOf(place);
        const bills = (app.history || []).filter((b) => b && b.snapshot?.docType === 'INVOICE'
            && (!rigs.length || (b.rigId || defaultRigId) === rigId)
            && (app.isBillItemUnpaid ? app.isBillItemUnpaid(b) : true))
            .sort((a, b) => String(b.billDate || '').localeCompare(String(a.billDate || '')))
            .slice(0, 30);
        if (!bills.length) return el('p', { class: 'tt-empty', text: 'No unpaid bills on this rig.' });
        return el('div', { class: 'tt-card' }, [
            el('p', { class: 'ca-note', text: 'Pick the bill. Choose Cash in the payment window: it is added to the bill and to your cash in hand.' }),
            el('div', { class: 'tt-list' }, bills.map((b) => item({
                avatar: el('span', { class: 'tt-avatar is-tool ca-av is-in', 'aria-hidden': 'true' }, [icon('indian-rupee')]),
                title: b.custName || 'Customer',
                subText: `Due ${inr(app.getBillPendingAmount ? app.getBillPendingAmount(b) : 0)} · #${b.billNo || ''} · ${shortDate(String(b.billDate || '').slice(0, 10))}`,
                pill: btn('Collect', {
                    kind: 'soft', ic: 'hand-coins',
                    onclick: () => { sheet.close(); adding = null; app.openRecordPaymentModal?.(b.id); }
                })
            })))
        ]);
    }

    // ------------------------------------------------------------------ parts
    function myCashCard(list) {
        const b = cashBook(list, app.history || [], me().id);
        return el('div', { class: 'tt-card ca-cash' }, [
            el('div', { class: 'ca-cash-top' }, [
                el('small', { text: rigs.length ? 'Your cash in hand' : 'Cash in hand' }),
                el('strong', { class: `ca-bal${b.balance < 0 ? ' is-neg' : ''}`, text: inr(b.balance) })
            ]),
            el('div', { class: 'tt-stats ca-stats' }, [
                el('div', {}, [el('small', { text: 'Received' }), el('strong', { text: inr(b.received) })]),
                el('div', {}, [el('small', { text: 'From customers' }), el('strong', { text: inr(b.collected) })]),
                el('div', {}, [el('small', { text: 'Spent (cash)' }), el('strong', { text: inr(b.spent) })]),
                el('div', {}, [el('small', { text: 'Handed over' }), el('strong', { text: inr(b.handedOver) })])
            ]),
            b.pendingCount ? el('p', { class: 'wk-warn' }, [icon('clock'), el('span', { text: `${inr(b.pending)} handed over, waiting for "Received ✓". Still counted in your cash.` })]) : null,
            b.balance < 0 ? el('p', { class: 'wk-warn' }, [icon('triangle-alert'), el('span', { text: 'Spent more than you had. Add the cash you received.' })]) : null
        ]);
    }

    function actions() {
        const a = (key, text, ic) => btn(text, { kind: adding === key ? 'pri' : 'soft', ic, onclick: () => { adding = adding === key ? null : key; render(); } });
        return el('div', { class: 'ca-acts' }, [
            a('expense', 'Expense', 'receipt'),
            a('diesel', 'Diesel', 'fuel'),
            a('in', 'Cash received', 'arrow-down-left'),
            a('handover', 'Hand over', 'arrow-up-right'),
            can('bills') && rigs.length && place !== OFFICE ? a('collect', 'Customer payment', 'hand-coins') : null
        ]);
    }

    function waiting(list) {
        const p = pendingHandovers(list);
        if (!p.length) return [];
        return [label('Waiting for "Received ✓"', p.length), el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, p.map((e) => item({
            avatar: el('span', { class: 'tt-avatar is-tool ca-av is-handover', 'aria-hidden': 'true' }, [icon('arrow-up-right')]),
            title: `${inr(e.amount)} to ${e.to === 'office' ? 'office' : 'owner'}`,
            subText: [`from ${e.holderName || 'someone'}`, shortDate(e.date), placeName(e.rigId), e.toName, e.note].filter(Boolean).join(' · '),
            pill: btn('Received ✓', {
                kind: 'pri',
                onclick: () => { upsert(markReceived(e, me())); sheet.say(`${inr(e.amount)} from ${e.holderName || 'them'} received.`, true); render(); }
            })
        })))])];
    }

    function everyone(list) {
        const hs = holders(list, app.history || [], null).filter((h) => h.id !== me().id && (h.balance || h.pending));
        if (!hs.length) return [];
        return [label('Cash with your team', hs.length), el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, hs.map((h) => item({
            avatar: el('span', { class: 'tt-avatar', 'aria-hidden': 'true', text: (h.name || '?').charAt(0).toUpperCase() }),
            title: h.name,
            subText: h.pendingCount ? `${inr(h.pending)} handed over, not ticked yet` : 'Cash in hand',
            pill: pill(inr(h.balance), h.balance < 0 ? 'is-warn' : 'is-ok')
        })))])];
    }

    function summaryCard(list) {
        const r = periodRange(period);
        const s = spendSummary(list, { rigId: place === LOCAL ? null : place, ...r });
        const max = Math.max(1, ...s.byCategory.map((c) => c.amount));
        return el('div', { class: 'tt-card ca-sum' }, [
            el('div', { class: 'ca-sum-top' }, [el('small', { text: `Spent${placeName(rigIdOf(place)) ? ` · ${placeName(rigIdOf(place))}` : ''}` }), el('strong', { text: inr(s.total) })]),
            s.diesel.count ? el('p', { class: 'ca-note', text: `Diesel ${s.diesel.litres.toLocaleString('en-IN')} L${s.diesel.rate ? ` · avg ₹${s.diesel.rate}/L` : ''}` }) : null,
            s.byCategory.length ? el('div', { class: 'ca-bars' }, s.byCategory.map((c) => el('div', { class: 'ca-bar' }, [
                el('div', { class: 'ca-bar-head' }, [el('span', { text: `${c.label} (${c.count})` }), el('strong', { text: inr(c.amount) })]),
                el('div', { class: 'ca-track' }, [el('div', { style: `width:${Math.max(2, (c.amount / max) * 100)}%` })])
            ]))) : el('p', { class: 'tt-empty', text: 'Nothing spent in this period.' })
        ]);
    }

    function row(e) {
        const mine = e.holderId === me().id;
        const amt = e.type === 'diesel' && !e.amount ? `${e.litres} L` : `${e.type === 'in' ? '+' : '−'}${inr(e.amount)}`;
        return item({
            avatar: el('span', { class: `tt-avatar is-tool ca-av is-${e.type}`, 'aria-hidden': 'true' }, [icon(ICONS[e.type] || 'receipt')]),
            title: entryTitle(e),
            subText: [shortDate(e.date), !mine ? e.holderName : '', entryLine(e)].filter(Boolean).join(' · '),
            pill: pill(amt, e.type === 'in' ? 'is-ok' : e.type === 'handover' && !e.receivedAt ? 'is-warn' : 'is-muted'),
            bodyKids: () => [
                e.type === 'advance' || e.type === 'wage' ? el('p', { class: 'ca-note', text: 'Given from Attendance & wages. The owner can delete it here if it was a mistake.' })
                    : mayEdit(e) && !e.receivedAt ? entryForm(e.type, e, null) : el('p', { class: 'ca-note', text: e.receivedAt
                    ? (isReceiver() ? 'Received. Tap "Not received" to change it.' : 'Received — only the owner or office can change it.')
                    : e.type === 'handover' && e.holderId === me().id ? 'A hand-over cannot be changed once saved. Ask the owner if it is wrong.'
                        : 'Only the person who added it (or the owner) can change it.' }),
                el('div', { class: 'tt-acts' }, [
                    e.type === 'handover' && isReceiver() ? btn(e.receivedAt ? 'Not received' : 'Received ✓', {
                        kind: e.receivedAt ? '' : 'pri', ic: e.receivedAt ? 'rotate-ccw' : null,
                        onclick: () => { upsert(e.receivedAt ? undoReceived(e) : markReceived(e, me())); render(); }
                    }) : null,
                    isOwnerOrLocal() ? btn('Delete', {
                        kind: 'danger', ic: 'trash-2',
                        onclick: () => app.confirmDeleteModal({
                            title: 'Delete this entry?',
                            subtitle: 'Only if it was added by mistake',
                            itemLabel: `${entryTitle(e)} · ${inr(e.amount)}`,
                            message: 'Cash in hand and the expense totals change. This cannot be undone.',
                            confirmBtnLabel: 'Delete',
                            onConfirm: () => { saveCash(app, readCash().filter((x) => x.id !== e.id)); render(); }
                        })
                    }) : null
                ])
            ]
        });
    }

    function categoriesFold() {
        let list = categories(app.brand);
        const body = el('div', { class: 'tt-fold-body' });
        const saveCats = (next) => {
            app.brand.expenseCategories = next;
            app.saveToStorage(STORAGE_KEYS.brand, app.brand);
            list = next;
            draw();
        };
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        const fail = (m) => { err.hidden = !m; err.textContent = m || ''; };
        function draw() {
            const add = input('caCatNew', { type: 'text', maxlength: '40', placeholder: 'e.g. Staff salary, Tea' });
            body.replaceChildren(
                el('div', { class: 'ca-cats' }, list.map((c) => {
                    const box = input(`caCat_${c.key}`, { type: 'text', maxlength: '40', value: c.label, 'aria-label': `Category ${c.label}` });
                    box.addEventListener('change', () => { const r = renameCategory(list, c.key, box.value); if (r.error) { fail(r.error); box.value = c.label; } else { fail(''); saveCats(r.list); } });
                    return el('div', { class: 'ca-cat' }, [box, c.key === 'other' ? null : el('button', {
                        type: 'button', class: 'tt-icon-btn', 'aria-label': `Remove ${c.label}`,
                        onclick: () => { const r = removeCategory(list, c.key); if (r.error) fail(r.error); else { fail(''); saveCats(r.list); } }
                    }, [icon('x')])]);
                })),
                el('div', { class: 'ca-cat' }, [add, btn('Add', { kind: 'soft', ic: 'plus', onclick: () => { const r = addCategory(list, add.value); if (r.error) fail(r.error); else { fail(''); saveCats(r.list); } } })]),
                err,
                el('small', { class: 'tt-hint', text: 'Diesel has its own button. Old entries keep their category name.' })
            );
            paintIcons();
        }
        draw();
        return el('details', { class: 'tt-fold tt-card' }, [
            el('summary', {}, [el('span', { class: 'tt-tile is-grey' }, [icon('tags')]), el('span', { class: 'tt-fold-title', text: 'Expense categories' }), el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])]),
            body
        ]);
    }

    function render() {
        const all = readCash().filter((e) => e && !e.deleted);
        const r = periodRange(period);
        const here = all.filter((e) => (place === LOCAL ? true : place === OFFICE ? !e.rigId : e.rigId === place) && e.date >= r.start && e.date <= r.end)
            .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const b = cashBook(all, app.history || [], me().id);
        sheet.setSub(`${placeName(rigIdOf(place)) ? `${placeName(rigIdOf(place))} · ` : ''}cash in hand ${inr(b.balance)}`);
        sheet.body.replaceChildren(...[
            places.length > 1 ? seg('caPlace', places, place, (v) => { place = v; adding = adding === 'collect' && v === OFFICE ? null : adding; shown = 40; render(); }) : null,
            myCashCard(all),
            actions(),
            adding === 'collect' ? collectList()
                : adding ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-form-head' }, [el('strong', { text: { expense: 'New expense', diesel: 'Diesel', in: 'Cash received', handover: 'Hand over cash' }[adding] })]), entryForm(adding, null, () => { adding = null; })])
                    : null,
            ...(isReceiver() ? waiting(all) : []),
            ...(isReceiver() ? everyone(all) : []),
            seg('caPeriod', PERIODS, period, (v) => { period = v; shown = 40; render(); }),
            summaryCard(all),
            here.length ? label('Entries', here.length) : null,
            here.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, here.slice(0, shown).map(row))]) : el('p', { class: 'tt-empty', text: 'No entries in this period.' }),
            here.length > shown ? btn(`Show ${Math.min(40, here.length - shown)} more`, { cls: 'tt-wide', onclick: () => { shown += 40; render(); } }) : null,
            isOwnerOrLocal() ? categoriesFold() : null
        ].filter(Boolean));
        paintIcons();
    }

    // The owner's entries made before this phone knew who is signed in become theirs. Not for staff:
    // "Me" entries on a staff phone may be from whoever used the phone before.
    const adopted = getRole() === 'owner' ? adoptLocalEntries(readCash(), me()) : null;
    if (adopted) saveCash(app, adopted);
    window.addEventListener('drillrig:cash-changed', onChange);
    render();
}
