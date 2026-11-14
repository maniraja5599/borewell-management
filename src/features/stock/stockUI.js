// Casing pipe stock screen (Bills tab card + "Pipe stock" sheet) and the low-stock warning
// after a final bill is saved. Maths: stockMath.js. Owner and managers only (drivers see only
// their own bills, so their phone cannot know the real balance); single-user phones = owner.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { getRole, isOwnerOrLocal, visibleRigs, getCurrentRig, onAccessChange } from '../../cloud/access.js';
import { billRigId, multiRig } from '../team/rigFilter.js';
import { stockSummary, lowStock, makeStockEntry, STOCK_TYPES } from './stockMath.js';

const DEFAULT_LOW = { casing1: 200, casing2: 100 };

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
}

function readEntries() {
    try {
        const v = JSON.parse(storage.getRaw(STORAGE_KEYS.stock) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

const canUseStock = () => getRole() !== 'driver';

/** Rigs to show: none (single-user / one rig → company-wide), or each visible rig. */
function rigsToShow() {
    if (!multiRig()) return [{ id: null, name: '' }];
    return visibleRigs().map((r) => ({ id: r.id, name: r.name }));
}

function thresholds(app) {
    return {
        casing1: Number(app.brand?.lowStockCasing1Ft ?? DEFAULT_LOW.casing1) || 0,
        casing2: Number(app.brand?.lowStockCasing2Ft ?? DEFAULT_LOW.casing2) || 0
    };
}

function summaryFor(app, rigId) {
    return stockSummary({ entries: readEntries(), bills: app.history || [], rigId, rigOf: billRigId });
}

const ft = (n) => `${Number(n).toLocaleString('en-IN')} ft`;

export function initStockUI(app) {
    const panel = document.getElementById('tab-history');
    if (!panel) return;
    const card = el('div', { class: 'ui-card stock-card', id: 'stockCard' });
    panel.insertBefore(card, panel.firstChild);

    const render = () => {
        card.textContent = '';
        if (!canUseStock()) { card.hidden = true; return; }
        card.hidden = false;
        const names = [app.getCasing1ShortName?.() || '7"', app.getCasing2ShortName?.() || '10"'];
        const limits = thresholds(app);
        const rows = rigsToShow().map((rig) => {
            const s = summaryFor(app, rig.id);
            const warn = lowStock(s, limits);
            const cell = (key, i) => {
                const w = warn.find((x) => x.key === key);
                return el('span', { class: `stk-bal${w ? (w.negative ? ' is-neg' : ' is-low') : ''}` },
                    [el('small', { text: names[i] }), el('strong', { text: s.tracking ? ft(s[key].balance) : '—' })]);
            };
            return el('div', { class: 'stk-line' }, [
                rig.name ? el('span', { class: 'stk-rig', text: `🚜 ${rig.name}` }) : null,
                cell('casing1', 0), cell('casing2', 1)
            ]);
        });
        const anyTracking = rigsToShow().some((r) => summaryFor(app, r.id).tracking);
        card.append(
            el('div', { class: 'stk-head' }, [
                el('div', {}, [
                    el('strong', { class: 'stk-title', text: '📦 Pipe stock' }),
                    el('span', { class: 'stk-sub', text: anyTracking ? 'Goes down automatically when a final bill is saved' : 'Add your opening stock to start tracking casing pipes' })
                ]),
                el('button', { type: 'button', class: 'stk-open-btn', text: anyTracking ? 'Manage' : 'Start', onclick: () => openSheet(app, render) })
            ]),
            ...(anyTracking ? rows : [])
        );
    };

    onAccessChange(render);
    window.addEventListener('drillrig:stock-changed', render);
    // Bills change stock: re-draw whenever the bill book is saved.
    const origSave = app.saveToStorage.bind(app);
    app.saveToStorage = (key, data, changed) => {
        const ok = origSave(key, data, changed);
        if (key === STORAGE_KEYS.history || key === STORAGE_KEYS.stock || key === STORAGE_KEYS.brand) {
            try { render(); } catch { /* ignore */ }
        }
        return ok;
    };

    // After a final bill is saved: warn when that rig's casing stock is low or negative.
    const origSaveBill = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = async (...args) => {
        const before = (app.history || []).length;
        const result = await origSaveBill(...args);
        try {
            const isNew = (app.history || []).length > before;
            const saved = isNew ? app.history?.[0] : (app.history || []).find((h) => h.id === app.loadedHistoryBillId);
            if (canUseStock() && saved && saved.snapshot?.docType === 'INVOICE'
                && (Number(saved.snapshot?.pvc7Length) > 0 || Number(saved.snapshot?.pvc10Length) > 0)) {
                const rigId = multiRig() ? billRigId(saved) : null;
                const used = { casing1: Number(saved.snapshot?.pvc7Length) > 0, casing2: Number(saved.snapshot?.pvc10Length) > 0 };
                const warn = lowStock(summaryFor(app, rigId), thresholds(app)).filter((w) => used[w.key]); // only casings this bill used
                if (warn.length) {
                    const names = { casing1: app.getCasing1ShortName?.() || '7"', casing2: app.getCasing2ShortName?.() || '10"' };
                    const text = warn.map((w) => `${names[w.key]} ${w.negative ? `short by ${ft(-w.balance)}` : `only ${ft(w.balance)} left`}`).join(', ');
                    setTimeout(() => app.showToast?.(`📦 Pipe stock: ${text}`), 1200);
                }
            }
        } catch (e) {
            console.warn('[stock]', e);
        }
        return result;
    };

    render();
}

function openSheet(app, onChange) {
    const names = [app.getCasing1ShortName?.() || '7"', app.getCasing2ShortName?.() || '10"'];
    const rigs = rigsToShow();
    let rigId = multiRig() ? (getCurrentRig()?.id || rigs[0]?.id) : null;
    const owner = isOwnerOrLocal();

    const body = el('div', { class: 'tm-body' });
    const msg = el('p', { class: 'tm-msg', role: 'alert' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const overlay = el('div', { class: 'tm-overlay' }, [
        el('div', { class: 'tm-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'stkTitle' }, [
            el('div', { class: 'tm-head' }, [
                el('h2', { id: 'stkTitle', text: '📦 Pipe stock' }),
                el('button', { type: 'button', class: 'tm-close', 'aria-label': 'Close', text: '✕', onclick: close })
            ]),
            msg, body
        ])
    ]);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    const say = (text, ok = false) => { msg.textContent = text || ''; msg.className = `tm-msg${ok ? ' ok' : ''}`; };

    const save = (list) => {
        app.saveToStorage(STORAGE_KEYS.stock, list);
        onChange();
        draw();
    };

    function draw() {
        body.textContent = '';
        const s = summaryFor(app, rigId);
        const today = app.toLocalYMD ? app.toLocalYMD(new Date()) : new Date().toISOString().slice(0, 10);

        if (rigs.length > 1) {
            const sel = el('select', { class: 'tm-select', id: 'stkRig', 'aria-label': 'Rig' },
                rigs.map((r) => el('option', { value: r.id, selected: r.id === rigId, text: r.name })));
            sel.addEventListener('change', () => { rigId = sel.value; say(''); draw(); });
            body.append(el('label', { for: 'stkRig', class: 'tm-label', text: 'Rig' }), sel);
        }

        // Balance
        const bal = (key, i) => el('div', { class: 'stk-big' }, [
            el('small', { text: names[i] }),
            el('strong', { class: s[key].balance < 0 ? 'is-neg' : '', text: s.tracking ? ft(s[key].balance) : '—' }),
            s.tracking ? el('span', { text: `In ${ft(s[key].in)} · Used ${ft(s[key].used)}` }) : null
        ]);
        body.append(el('section', { class: 'tm-section' }, [
            el('div', { class: 'stk-big-row' }, [bal('casing1', 0), bal('casing2', 1)]),
            el('p', { class: 'tm-help', text: s.tracking
                ? `Counting final bills from ${s.since} (${s.billsCounted} bill${s.billsCounted === 1 ? '' : 's'} with pipes). Quotations do not use stock.`
                : 'Start with an "Opening stock" entry: the pipes you have today. Final bills from that date on are taken off automatically.' })
        ]));

        // Add entry
        const type = el('select', { class: 'tm-select', id: 'stkType' },
            Object.entries(STOCK_TYPES).map(([k, v]) => el('option', { value: k, selected: k === (s.tracking ? 'purchase' : 'opening'), text: v })));
        const date = el('input', { type: 'date', class: 'tm-input', id: 'stkDate', value: today, max: today });
        const c1 = el('input', { type: 'number', inputmode: 'decimal', class: 'tm-input', id: 'stkC1', placeholder: '0' });
        const c2 = el('input', { type: 'number', inputmode: 'decimal', class: 'tm-input', id: 'stkC2', placeholder: '0' });
        const note = el('input', { type: 'text', class: 'tm-input', id: 'stkNote', maxlength: '200', placeholder: 'Supplier / reason (optional)' });
        body.append(el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Add stock' }),
            el('div', { class: 'stk-form' }, [
                el('div', {}, [el('label', { for: 'stkType', class: 'tm-label', text: 'Type' }), type]),
                el('div', {}, [el('label', { for: 'stkDate', class: 'tm-label', text: 'Date' }), date]),
                el('div', {}, [el('label', { for: 'stkC1', class: 'tm-label', text: `${names[0]} feet` }), c1]),
                el('div', {}, [el('label', { for: 'stkC2', class: 'tm-label', text: `${names[1]} feet` }), c2])
            ]),
            el('label', { for: 'stkNote', class: 'tm-label', text: 'Note' }), note,
            el('p', { class: 'tm-help', text: 'Adjustment: use a minus number to remove damaged or returned pipes.' }),
            el('button', {
                type: 'button', class: 'tm-btn primary wide', text: 'Add to stock',
                onclick: () => {
                    const { entry, error } = makeStockEntry({ type: type.value, date: date.value, casing1Ft: c1.value, casing2Ft: c2.value, note: note.value, rigId });
                    if (error) { say(`⚠️ ${error}`); return; }
                    save([entry, ...readEntries()]);
                    say(`✅ ${STOCK_TYPES[entry.type]} added`, true);
                }
            })
        ]));

        // Low-stock levels (owner: they are company settings)
        if (owner) {
            const l = thresholds(app);
            const l1 = el('input', { type: 'number', inputmode: 'numeric', class: 'tm-input', id: 'stkL1', value: String(l.casing1) });
            const l2 = el('input', { type: 'number', inputmode: 'numeric', class: 'tm-input', id: 'stkL2', value: String(l.casing2) });
            body.append(el('section', { class: 'tm-section' }, [
                el('h3', { text: 'Low-stock alert' }),
                el('div', { class: 'stk-form' }, [
                    el('div', {}, [el('label', { for: 'stkL1', class: 'tm-label', text: `${names[0]} at or below` }), l1]),
                    el('div', {}, [el('label', { for: 'stkL2', class: 'tm-label', text: `${names[1]} at or below` }), l2])
                ]),
                el('button', {
                    type: 'button', class: 'tm-btn', text: 'Save alert levels',
                    onclick: () => {
                        const a = Math.max(0, Math.round(Number(l1.value) || 0));
                        const b = Math.max(0, Math.round(Number(l2.value) || 0));
                        app.brand.lowStockCasing1Ft = a;
                        app.brand.lowStockCasing2Ft = b;
                        app.saveToStorage(STORAGE_KEYS.brand, app.brand);
                        onChange();
                        say('✅ Alert levels saved', true);
                    }
                })
            ]));
        }

        // Entries
        const rows = s.entries.map((e) => el('div', { class: 'tm-row' }, [
            el('div', { class: 'tm-person' }, [
                el('strong', { text: `${STOCK_TYPES[e.type] || e.type} · ${e.date}` }),
                el('span', { text: [
                    Number(e.casing1Ft) ? `${names[0]}: ${Number(e.casing1Ft) > 0 ? '+' : ''}${ft(e.casing1Ft)}` : '',
                    Number(e.casing2Ft) ? `${names[1]}: ${Number(e.casing2Ft) > 0 ? '+' : ''}${ft(e.casing2Ft)}` : '',
                    e.note || ''
                ].filter(Boolean).join(' · ') })
            ]),
            owner && el('div', { class: 'tm-actions' }, [
                el('button', {
                    type: 'button', class: 'tm-btn danger', text: 'Delete',
                    onclick: () => app.confirmDeleteModal({
                        title: 'Delete stock entry?',
                        subtitle: 'The balance changes at once',
                        itemLabel: `📦 ${STOCK_TYPES[e.type] || e.type} · ${e.date}`,
                        message: 'Use this for an entry made by mistake. To record damaged pipes, add an Adjustment instead.',
                        confirmBtnLabel: 'Delete',
                        onConfirm: () => { save(readEntries().filter((x) => x.id !== e.id)); say('Entry deleted', true); }
                    })
                })
            ])
        ]));
        body.append(el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Stock entries' }),
            ...(rows.length ? rows : [el('p', { class: 'tm-help', text: 'No entries yet.' })])
        ]));
    }
    draw();
}
