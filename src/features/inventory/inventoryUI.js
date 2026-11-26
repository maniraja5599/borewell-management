// "Stock & vendors" page (Rig work tab). Items: spares, consumables, oil, fittings, tools — stock,
// minimum, value, low-stock alerts; Add stock / Use / Count. Vendors: purchases (item lines add
// stock, free lines like bits or service do not), payments, what is still to pay.
// Logic: inventoryMath.js. Saved on this phone (like Vehicles & docs) — not synced yet.
// Items belong to the rig picked on this phone; vendors are for the whole business.
import { storage } from '../../data/storage.js';
import { getCurrentRig, hasRigs, isOwnerOrLocal } from '../../cloud/access.js';
import { el, openSheet, btn, item as row, pill, avatar } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import {
    CATEGORIES, UNITS, catLabel, makeItem, makeMove, stockOf, inventorySummary,
    makeVendor, makePurchase, makeVendorPayment, vendorBook, totalPayable
} from './inventoryMath.js';

const KEY = 'drillrig_inventory_v1';
const EMPTY = () => ({ items: [], moves: [], vendors: [], purchases: [], payments: [] });
const inr = (n) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(Number(n) || 0)).toLocaleString('en-IN')}`;
const qtyTxt = (q, unit) => `${Number(q).toLocaleString('en-IN')} ${unit || 'nos'}`;
const niceDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const MODES = [{ key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' }, { key: 'bank', label: 'Bank' }, { key: 'cheque', label: 'Cheque' }];

export function readInventory() {
    try {
        const d = JSON.parse(storage.getRaw(KEY) || 'null');
        if (!d || typeof d !== 'object') return EMPTY();
        const e = EMPTY();
        for (const k of Object.keys(e)) e[k] = Array.isArray(d[k]) ? d[k] : [];
        return e;
    } catch { return EMPTY(); }
}
function writeInventory(d) {
    try { storage.setRaw(KEY, JSON.stringify(d)); return true; } catch { return false; }
}
const rigKey = () => (hasRigs() ? getCurrentRig()?.id : null) || 'local';
const mine = (x) => (x?.rigId || 'local') === rigKey() || !hasRigs();

/** Rig work tile line + warn flag. */
export function inventoryTile() {
    const d = readInventory();
    const s = inventorySummary(d.items.filter(mine), d.moves);
    const due = totalPayable(vendorBook(d.vendors, d.purchases, d.payments));
    if (!s.items.length && !d.vendors.length) return { sub: 'Spares, oil, fittings · vendors & dues', warn: false };
    const parts = [];
    if (s.items.length) parts.push(`${s.items.length} items · ${inr(s.value)}`);
    if (s.alerts.length) parts.push(`${s.alerts.length} low`);
    if (due > 0) parts.push(`${inr(due)} to pay`);
    return { sub: parts.join(' · '), warn: s.alerts.length > 0 };
}

const selectOf = (list, value, attrs = {}) => {
    const s = el('select', { class: 'tt-input', ...attrs });
    for (const o of list) s.appendChild(el('option', { value: o.value, text: o.label, selected: o.value === value }));
    return s;
};
const field = (label, control) => el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: label }), control]);
const two = (...kids) => el('div', { class: 'wk-two' }, kids);
const dateIn = (v = todayYmd()) => el('input', { type: 'date', class: 'tt-input', value: v, max: todayYmd() });
const numIn = (attrs = {}) => el('input', { type: 'number', inputmode: 'decimal', min: '0', class: 'tt-input', ...attrs });

export function openInventory(app, { start = 'items', onSaved } = {}) {
    let view = start;
    let form = null;      // { kind: 'item' | 'move' | 'vendor' | 'purchase' | 'pay', ... }
    let cat = 'all';
    let q = '';
    const sheet = openSheet({ title: 'Stock & vendors', sub: `${hasRigs() ? `${getCurrentRig()?.name || 'Rig'} · ` : ''}spares, oil, fittings and who you buy from`, ic: 'boxes', onClose: () => onSaved?.() });

    function commit(mutator, toast) {
        const d = readInventory();
        mutator(d);
        if (!writeInventory(d)) { sheet.say('Could not save on this phone (storage full?).'); return false; }
        if (toast) app.showToast?.(toast);
        form = null;
        render();
        return true;
    }
    const fail = (msg) => { sheet.say(msg); return false; };
    const openForm = (f) => { form = f; render(); sheet.scroller?.scrollTo({ top: 0, behavior: 'smooth' }); };
    const cancelBtn = () => btn('Cancel', { onclick: () => { form = null; render(); } });

    // ---------- forms ----------
    function itemForm(existing) {
        const name = el('input', { type: 'text', class: 'tt-input', maxlength: '60', value: existing?.name || '', placeholder: 'e.g. Grease, Collar 7″, Welding rod' });
        const c = selectOf(CATEGORIES.map((x) => ({ value: x.key, label: x.label })), existing?.category || 'spares');
        const u = selectOf(UNITS.map((x) => ({ value: x, label: x })), existing?.unit || 'nos');
        const min = numIn({ value: existing?.minQty ?? '', placeholder: 'Alert below' });
        const cost = numIn({ value: existing?.cost || '', placeholder: '₹ per unit' });
        const open = existing ? null : numIn({ placeholder: 'How many now?' });
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: existing ? 'Edit item' : 'New item' }),
            field('Name', name), two(field('Category', c), field('Unit', u)), two(field('Minimum stock', min), field('Cost per unit (₹)', cost)),
            open ? field('Stock now (optional)', open) : null,
            el('div', { class: 'ag-acts' }, [cancelBtn(), btn('Save item', { kind: 'pri', ic: 'check', onclick: () => {
                const d = readInventory();
                const res = makeItem({ name: name.value, category: c.value, unit: u.value, minQty: min.value, cost: cost.value, rigId: rigKey() }, { existing, items: d.items });
                if (res.error) return fail(res.error);
                let mv = null;
                if (open && open.value !== '') {
                    const m = makeMove({ item: res.item, type: 'set', qty: open.value, note: 'Opening stock' });
                    if (m.error) return fail(m.error);
                    mv = m.move;
                }
                return commit((x) => {
                    x.items = existing ? x.items.map((i) => (i.id === existing.id ? res.item : i)) : [res.item, ...x.items];
                    if (mv) x.moves.unshift(mv);
                }, existing ? '✅ Item saved' : `✅ ${res.item.name} added`);
            } })])
        ]);
    }

    function moveForm(it, type) {
        const qty = numIn({ placeholder: type === 'set' ? 'Counted' : 'Quantity', step: 'any' });
        const rate = type === 'in' ? numIn({ value: it.cost || '', placeholder: '₹ per unit' }) : null;
        const date = dateIn();
        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '120', placeholder: type === 'out' ? 'Where used? (bore no., repair …)' : 'Note (optional)' });
        const title = type === 'in' ? 'Add stock' : type === 'out' ? 'Use stock' : 'Count stock';
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: `${title} · ${it.name}` }),
            el('p', { class: 'wk-hint', text: `Now: ${qtyTxt(it.qty, it.unit)}${type === 'set' ? ' — enter what you actually counted.' : ''}${type === 'in' ? ' — bought from a vendor? Use New purchase in Vendors so the bill and dues are kept.' : ''}` }),
            two(field(`Quantity (${it.unit})`, qty), field('Date', date)),
            rate ? field('Rate per unit (₹)', rate) : null,
            field('Note', note),
            el('div', { class: 'ag-acts' }, [cancelBtn(), btn(title, { kind: type === 'out' ? 'danger' : 'pri', ic: 'check', onclick: () => {
                if (type === 'out' && Number(qty.value) > it.qty) return fail(`Only ${qtyTxt(it.qty, it.unit)} in stock. Count the stock first if it is wrong.`);
                const res = makeMove({ item: it, type, qty: qty.value, rate: rate?.value, date: date.value, note: note.value });
                if (res.error) return fail(res.error);
                return commit((x) => {
                    x.moves.unshift(res.move);
                    if (type === 'in' && res.move.rate) x.items = x.items.map((i) => (i.id === it.id ? { ...i, cost: res.move.rate, updatedAt: new Date().toISOString() } : i));
                }, `✅ ${it.name}: ${title.toLowerCase()} saved`);
            } })])
        ]);
    }

    function vendorForm(existing) {
        const name = el('input', { type: 'text', class: 'tt-input', maxlength: '60', value: existing?.name || '', placeholder: 'Shop / supplier name' });
        const phone = el('input', { type: 'tel', class: 'tt-input', maxlength: '15', inputmode: 'tel', value: existing?.phone || '', placeholder: 'Mobile (optional)' });
        const place = el('input', { type: 'text', class: 'tt-input', maxlength: '60', value: existing?.place || '', placeholder: 'Town (optional)' });
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: existing ? 'Edit vendor' : 'New vendor' }),
            field('Name', name), two(field('Mobile', phone), field('Place', place)),
            el('div', { class: 'ag-acts' }, [cancelBtn(), btn('Save vendor', { kind: 'pri', ic: 'check', onclick: () => {
                const d = readInventory();
                const res = makeVendor({ name: name.value, phone: phone.value, place: place.value }, { existing, vendors: d.vendors });
                if (res.error) return fail(res.error);
                return commit((x) => { x.vendors = existing ? x.vendors.map((v) => (v.id === existing.id ? res.vendor : v)) : [res.vendor, ...x.vendors]; }, '✅ Vendor saved');
            } })])
        ]);
    }

    function purchaseForm(vendorId) {
        const d = readInventory();
        const vendors = d.vendors.filter((v) => !v.deleted);
        if (!vendors.length) return el('div', { class: 'tt-card bd-form' }, [el('p', { class: 'wk-hint', text: 'Add the vendor first.' }), el('div', { class: 'ag-acts' }, [cancelBtn(), btn('Add vendor', { kind: 'pri', ic: 'plus', onclick: () => openForm({ kind: 'vendor' }) })])]);
        const items = d.items.filter((i) => mine(i) && !i.deleted && i.active !== false);
        const ven = selectOf(vendors.map((v) => ({ value: v.id, label: v.name })), vendorId || vendors[0].id);
        const date = dateIn();
        const billNo = el('input', { type: 'text', class: 'tt-input', maxlength: '30', placeholder: 'Their bill no. (optional)' });
        const lines = [{}];
        const linesBox = el('div', { class: 'wk-log' });
        const totalEl = el('p', { class: 'wk-hint wk-rod-total' });
        const paid = numIn({ placeholder: '0 = on credit' });
        const mode = selectOf(MODES.map((m) => ({ value: m.key, label: m.label })), 'cash');
        const lineTotal = () => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
        const showTotal = () => { totalEl.textContent = `Bill total ${inr(lineTotal())}`; };
        const drawLines = () => {
            linesBox.replaceChildren(...lines.map((l, i) => {
                const pick = selectOf([{ value: '', label: 'Other (type name)' }, ...items.map((it) => ({ value: it.id, label: `${it.name} (${it.unit})` }))], l.itemId || '');
                const name = el('input', { type: 'text', class: 'tt-input wk-log-note', maxlength: '60', value: l.name || '', placeholder: 'e.g. Button bit 6.5″, lathe work', hidden: !!l.itemId });
                const qty = numIn({ value: l.qty ?? '', placeholder: 'Qty', step: 'any' });
                const rate = numIn({ value: l.rate ?? '', placeholder: '₹ rate', step: 'any' });
                pick.addEventListener('change', () => {
                    l.itemId = pick.value || undefined;
                    name.hidden = !!l.itemId;
                    const it = items.find((x) => x.id === l.itemId);
                    if (it && !rate.value && it.cost) { rate.value = it.cost; l.rate = it.cost; }
                    showTotal();
                });
                name.addEventListener('input', () => { l.name = name.value; });
                qty.addEventListener('input', () => { l.qty = qty.value; showTotal(); });
                rate.addEventListener('input', () => { l.rate = rate.value; showTotal(); });
                const del = lines.length > 1 ? el('button', { type: 'button', class: 'wk-step', 'aria-label': 'Remove line', onclick: () => { lines.splice(i, 1); drawLines(); showTotal(); } }, [icon('x')]) : el('span', {});
                return el('div', { class: 'wk-log-row iv-line' }, [pick, qty, rate, del, name]);
            }));
            paintIcons();
        };
        drawLines(); showTotal();
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: 'New purchase' }),
            field('Vendor', ven), two(field('Date', date), field('Bill no.', billNo)),
            el('label', { class: 'wk-lbl', text: 'Items (stock items go into stock)' }), linesBox,
            el('button', { type: 'button', class: 'wk-link', text: '+ Add line', onclick: () => { lines.push({}); drawLines(); } }),
            totalEl,
            two(field('Paid now (₹)', paid), field('Paid by', mode)),
            el('div', { class: 'ag-acts' }, [cancelBtn(), btn('Save purchase', { kind: 'pri', ic: 'check', onclick: () => {
                const x0 = readInventory();
                const vendor = x0.vendors.find((v) => v.id === ven.value);
                const res = makePurchase({ vendor, rigId: rigKey(), date: date.value, billNo: billNo.value, lines, paidNow: paid.value, mode: mode.value }, { items: x0.items });
                if (res.error) return fail(res.error);
                return commit((x) => {
                    x.purchases.unshift(res.purchase);
                    x.moves.unshift(...res.moves);
                    if (res.payment) x.payments.unshift(res.payment);
                    for (const m of res.moves) x.items = x.items.map((i) => (i.id === m.itemId ? { ...i, cost: m.rate, updatedAt: new Date().toISOString() } : i));
                }, `✅ Purchase ${inr(res.purchase.total)} saved${res.payment ? '' : ' (on credit)'}`);
            } })])
        ]);
    }

    function payForm(v) {
        const amt = numIn({ value: v.due > 0 ? v.due : '', placeholder: '₹ amount' });
        const date = dateIn();
        const mode = selectOf(MODES.map((m) => ({ value: m.key, label: m.label })), 'cash');
        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '120', placeholder: 'Note (optional)' });
        return el('div', { class: 'tt-card bd-form' }, [
            el('h4', { class: 'dr-h', text: `Pay ${v.name}` }),
            el('p', { class: 'wk-hint', text: v.due > 0 ? `Still to pay: ${inr(v.due)}` : 'Nothing due — this will be an advance.' }),
            two(field('Amount (₹)', amt), field('Date', date)), two(field('Paid by', mode), field('Note', note)),
            el('p', { class: 'wk-hint', text: 'Shows in the Transaction log as money out. Do not add it again as an expense.' }),
            el('div', { class: 'ag-acts' }, [cancelBtn(), btn('Save payment', { kind: 'pri', ic: 'check', onclick: () => {
                const res = makeVendorPayment({ vendor: v, rigId: rigKey(), date: date.value, amount: amt.value, mode: mode.value, note: note.value });
                if (res.error) return fail(res.error);
                return commit((x) => { x.payments.unshift(res.payment); }, `✅ Paid ${inr(res.payment.amount)} to ${v.name}`);
            } })])
        ]);
    }

    // ---------- lists ----------
    const twice = (label, onSure) => el('button', { type: 'button', class: 'wk-link is-danger', text: label, onclick: (e) => {
        const t = e.currentTarget;
        if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Tap again'; setTimeout(() => { t.dataset.sure = ''; t.textContent = label; }, 3000); return; }
        onSure();
    } });

    function itemsView(d) {
        const s = inventorySummary(d.items.filter(mine), d.moves);
        const cats = CATEGORIES.filter((c) => s.items.some((i) => i.category === c.key));
        const nd = q.trim().toLowerCase();
        const shown = s.items.filter((i) => (cat === 'all' || i.category === cat) && (!nd || i.name.toLowerCase().includes(nd)));
        const search = el('input', { type: 'search', class: 'tt-input', placeholder: 'Search items', value: q });
        search.addEventListener('input', () => { q = search.value; const pos = search.selectionStart; render(); const again = sheet.body.querySelector('input[type=search]'); again?.focus(); again?.setSelectionRange(pos, pos); });
        return [
            el('div', { class: 'tt-card pa-head' }, [
                el('div', {}, [el('small', { text: 'Stock value' }), el('strong', { text: inr(s.value) })]),
                el('div', {}, [el('small', { text: 'Items' }), el('strong', { text: String(s.items.length) })]),
                el('div', {}, [el('small', { text: 'Low / out' }), el('strong', { class: s.alerts.length ? 'is-due' : '', text: String(s.alerts.length) })])
            ]),
            s.alerts.length ? el('p', { class: 'wk-tip iv-alert' }, [icon('triangle-alert'), el('span', { text: `Buy soon: ${s.alerts.map((i) => `${i.name} (${qtyTxt(i.qty, i.unit)})`).join(', ')}` })]) : null,
            form ? null : btn('Add item', { kind: 'soft', ic: 'plus', cls: 'tt-wide', onclick: () => openForm({ kind: 'item' }) }),
            cats.length > 1 ? el('div', { class: 'pa-chips' }, [{ key: 'all', label: 'All' }, ...cats].map((c) => el('button', { type: 'button', class: `pa-chip${cat === c.key ? ' is-on' : ''}`, text: c.label, onclick: () => { cat = c.key; render(); } }))) : null,
            s.items.length > 8 ? search : null,
            shown.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, shown.map((it) => row({
                avatar: avatar(it.name, it.out && it.minQty > 0 ? 'is-warn' : ''),
                title: it.name,
                subText: [qtyTxt(it.qty, it.unit), it.minQty ? `min ${it.minQty}` : '', it.value ? inr(it.value) : '', catLabel(it.category)].filter(Boolean).join(' · '),
                pill: it.minQty > 0 && it.out ? pill('Out', 'is-warn') : it.low ? pill('Low', 'is-warn') : pill(qtyTxt(it.qty, it.unit), 'is-muted'),
                bodyKids: () => {
                    const moves = d.moves.filter((m) => m.itemId === it.id && !m.deleted).sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 10);
                    return [
                        el('div', { class: 'ag-acts' }, [
                            btn('Use', { ic: 'minus', onclick: () => openForm({ kind: 'move', id: it.id, type: 'out' }) }),
                            btn('Add', { ic: 'plus', onclick: () => openForm({ kind: 'move', id: it.id, type: 'in' }) }),
                            btn('Count', { ic: 'list-checks', onclick: () => openForm({ kind: 'move', id: it.id, type: 'set' }) })
                        ]),
                        moves.length ? el('ul', { class: 'iv-moves' }, moves.map((m) => el('li', {}, [
                            el('span', { text: `${niceDay(m.date)} · ${m.type === 'in' ? `+${m.qty}` : m.type === 'out' ? `−${m.qty}` : `counted ${m.qty}`}${m.rate ? ` @ ₹${m.rate}` : ''}` }),
                            m.note ? el('small', { text: m.note }) : null
                        ]))) : el('p', { class: 'wk-hint', text: 'No stock moves yet.' }),
                        el('div', { class: 'wk-acts' }, [
                            el('button', { type: 'button', class: 'wk-link', text: 'Edit item', onclick: () => openForm({ kind: 'item', id: it.id }) }),
                            isOwnerOrLocal() ? twice('Delete item', () => commit((x) => { x.items = x.items.filter((i) => i.id !== it.id); x.moves = x.moves.filter((m) => m.itemId !== it.id); }, '🗑️ Item removed')) : null
                        ])
                    ];
                }
            })))]) : el('p', { class: 'tt-empty', text: s.items.length ? 'No item matches.' : 'No items yet. Add spares, oil, collars, caps … with a minimum to get low-stock alerts.' })
        ];
    }

    function vendorsView(d) {
        const book = vendorBook(d.vendors, d.purchases, d.payments);
        const month = todayYmd().slice(0, 7);
        const boughtMonth = d.purchases.filter((p) => !p.deleted && p.date.startsWith(month)).reduce((s, p) => s + (Number(p.total) || 0), 0);
        return [
            el('div', { class: 'tt-card pa-head' }, [
                el('div', {}, [el('small', { text: 'To pay' }), el('strong', { class: totalPayable(book) ? 'is-due' : '', text: inr(totalPayable(book)) })]),
                el('div', {}, [el('small', { text: 'Vendors' }), el('strong', { text: String(book.length) })]),
                el('div', {}, [el('small', { text: 'Bought this month' }), el('strong', { text: inr(boughtMonth) })])
            ]),
            form ? null : el('div', { class: 'ag-acts' }, [
                btn('New purchase', { kind: 'pri', ic: 'shopping-cart', onclick: () => openForm({ kind: 'purchase' }) }),
                btn('Add vendor', { ic: 'plus', onclick: () => openForm({ kind: 'vendor' }) })
            ]),
            book.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, book.map((v) => row({
                avatar: avatar(v.name, v.due > 0 ? 'is-warn' : ''),
                title: v.name,
                subText: [v.phone, v.place, v.last ? `last ${niceDay(v.last)}` : ''].filter(Boolean).join(' · '),
                pill: v.due > 0 ? pill(`${inr(v.due)} due`, 'is-warn') : v.due < 0 ? pill(`${inr(-v.due)} advance`, 'is-ok') : pill('Settled', 'is-ok'),
                bodyKids: () => [
                    el('div', { class: 'tt-stats ag-stats' }, [
                        el('div', {}, [el('small', { text: 'Bought' }), el('strong', { text: inr(v.bought) })]),
                        el('div', {}, [el('small', { text: 'Paid' }), el('strong', { text: inr(v.paid) })]),
                        el('div', {}, [el('small', { text: 'Due' }), el('strong', { class: v.due > 0 ? 'is-due' : '', text: inr(v.due) })])
                    ]),
                    el('div', { class: 'ag-acts' }, [
                        btn('Pay', { kind: 'pri', ic: 'indian-rupee', onclick: () => openForm({ kind: 'pay', id: v.id }) }),
                        btn('Purchase', { ic: 'shopping-cart', onclick: () => openForm({ kind: 'purchase', id: v.id }) }),
                        v.phone ? el('a', { class: 'tt-btn', href: `tel:${v.phone}` }, [icon('phone'), el('span', { text: 'Call' })]) : null
                    ]),
                    el('ul', { class: 'iv-moves' }, [
                        ...v.purchases.map((p) => ({ date: p.date, el: el('li', {}, [
                            el('span', { text: `${niceDay(p.date)} · Bought ${inr(p.total)}${p.billNo ? ` · bill ${p.billNo}` : ''}` }),
                            el('small', { text: p.lines.map((l) => `${l.name} ${l.qty}${l.unit ? ` ${l.unit}` : ''}`).join(', ') })
                        ]) })),
                        ...v.payments.map((p) => ({ date: p.date, el: el('li', { class: 'is-pay' }, [
                            el('span', { text: `${niceDay(p.date)} · Paid ${inr(p.amount)} · ${p.mode}` }),
                            p.note ? el('small', { text: p.note }) : null
                        ]) }))
                    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((x) => x.el)),
                    el('div', { class: 'wk-acts' }, [
                        el('button', { type: 'button', class: 'wk-link', text: 'Edit vendor', onclick: () => openForm({ kind: 'vendor', id: v.id }) }),
                        isOwnerOrLocal() && !v.purchases.length && !v.payments.length ? twice('Delete vendor', () => commit((x) => { x.vendors = x.vendors.filter((y) => y.id !== v.id); }, '🗑️ Vendor removed')) : null
                    ])
                ]
            })))]) : el('p', { class: 'tt-empty', text: 'No vendors yet. Add the shops you buy spares, oil, bits and pipes from.' })
        ];
    }

    function render() {
        sheet.say('');
        const d = readInventory();
        const s = inventorySummary(d.items.filter(mine), d.moves);
        const due = totalPayable(vendorBook(d.vendors, d.purchases, d.payments));
        let formEl = null;
        if (form?.kind === 'item') formEl = itemForm(form.id ? d.items.find((i) => i.id === form.id) : null);
        else if (form?.kind === 'move') { const it = s.items.find((i) => i.id === form.id); if (it) formEl = moveForm(it, form.type); }
        else if (form?.kind === 'vendor') formEl = vendorForm(form.id ? d.vendors.find((v) => v.id === form.id) : null);
        else if (form?.kind === 'purchase') formEl = purchaseForm(form.id);
        else if (form?.kind === 'pay') { const v = vendorBook(d.vendors, d.purchases, d.payments).find((x) => x.id === form.id); if (v) formEl = payForm(v); }
        const tabs = el('div', { class: 'tt-seg is-wrap', role: 'radiogroup' }, [
            { key: 'items', label: `Items (${s.items.length})` },
            { key: 'vendors', label: due > 0 ? `Vendors · ${inr(due)}` : 'Vendors' }
        ].map((o) => {
            const r = el('input', { type: 'radio', name: 'ivView', value: o.key, checked: o.key === view });
            r.addEventListener('change', () => { view = o.key; form = null; render(); });
            return el('label', {}, [r, el('span', { text: o.label })]);
        }));
        sheet.body.replaceChildren(...[
            tabs,
            formEl,
            ...(view === 'items' ? itemsView(d) : vendorsView(d)),
            el('p', { class: 'ca-note', text: 'Casing pipes and bits & hammers have their own pages. Vendor purchases on credit are not money out until you pay; payments show in the Transaction log. Saved on this phone.' })
        ].filter(Boolean));
        paintIcons();
    }
    render();
}

export { stockOf };
