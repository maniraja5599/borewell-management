// Casing pipe stock (Settings → Rig work → "Casing pipes"), per rig:
//   stock of 7″ and 10″ in feet and pipes, low-stock warning, Purchase (pipe count × cost per pipe),
//   Opening stock, Adjustment (feet, minus for cut / damaged pieces), entries, bills that used pipe;
//   owner: pipe length, alert levels, cost per pipe, the drilling-only 7″ rate and its name.
// After a final bill is saved, a toast warns when that rig's casing is low. Also sets up the
// "With pipe / Drilling only" choice on the bill (casingMode.js). Maths: stockMath.js.
// Who: owner everything; managers their rigs; office staff with "stock". Only the owner deletes.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { isOwnerOrLocal, visibleRigs, getCurrentRig, can } from '../../cloud/access.js';
import { billRigId, multiRig } from '../team/rigFilter.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, btn, field, input, seg, openSheet, item, label, pill } from '../../ui/sheet.js';
import { todayYmd } from '../workers/workersMath.js';
import { shortDate } from '../tools/toolsMath.js';
import { stockSummary, lowStock, makeStockEntry, stockSettings, stockUsage, feetAndPipes, STOCK_TYPES } from './stockMath.js';
import { initCasingMode } from './casingMode.js';

export const readStock = () => storage.getList(STORAGE_KEYS.stock) || [];
const saveStock = (app, list) => (app?.saveToStorage ? app.saveToStorage(STORAGE_KEYS.stock, list) : (storage.setList(STORAGE_KEYS.stock, list), true));
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const names = (app) => ({ casing1: app.getCasing1ShortName?.() || '7"', casing2: app.getCasing2ShortName?.() || '10"' });

/** Rigs to show: none (single-user / one rig → company-wide), or each visible rig. */
function rigsToShow() {
    if (!multiRig()) return [{ id: null, name: '' }];
    return visibleRigs().map((r) => ({ id: r.id, name: r.name }));
}
const summaryFor = (app, rigId) => stockSummary({ entries: readStock(), bills: app.history || [], rigId, rigOf: billRigId });

/** Settings row text. */
export function pipeStockLine(app) {
    const n = names(app);
    const st = stockSettings(app.brand);
    const parts = [];
    let low = 0;
    for (const r of rigsToShow()) {
        const s = summaryFor(app, r.id);
        if (!s.tracking) continue;
        low += lowStock(s, st.low).length;
        if (parts.length < 1) parts.push(`${n.casing1} ${s.casing1.balance.toLocaleString('en-IN')} ft · ${n.casing2} ${s.casing2.balance.toLocaleString('en-IN')} ft${rigsToShow().length > 1 ? ` (${r.name})` : ''}`);
    }
    if (!parts.length) return 'Stock of 7″ and 10″ pipes, purchases';
    return `${low ? `⚠ ${low} low · ` : ''}${parts[0]}`;
}

export function initStockUI(app) {
    initCasingMode(app);
    // After a final bill is saved: warn when that rig's casing stock is low or negative.
    const origSaveBill = app.saveCurrentBillToHistory?.bind(app);
    if (!origSaveBill) return;
    app.saveCurrentBillToHistory = async (...args) => {
        const before = (app.history || []).length;
        const result = await origSaveBill(...args);
        try {
            const isNew = (app.history || []).length > before;
            const saved = isNew ? app.history?.[0] : (app.history || []).find((h) => h.id === app.loadedHistoryBillId);
            const snap = saved?.snapshot;
            const used = { casing1: snap?.pvc7Mode !== 'drill' && Number(snap?.pvc7Length) > 0, casing2: Number(snap?.pvc10Length) > 0 };
            if (can('stock') && snap?.docType === 'INVOICE' && (used.casing1 || used.casing2)) {
                const rigId = multiRig() ? billRigId(saved) : null;
                const warn = lowStock(summaryFor(app, rigId), stockSettings(app.brand).low).filter((w) => used[w.key]);
                if (warn.length) {
                    const n = names(app);
                    const text = warn.map((w) => `${n[w.key]} ${w.negative ? `short by ${-w.balance} ft` : `only ${w.balance} ft left`}`).join(', ');
                    setTimeout(() => app.showToast?.(`📦 Pipe stock: ${text}`), 1200);
                }
            }
        } catch (e) {
            console.warn('[stock]', e);
        }
        return result;
    };
}

export function openPipeStock(app) {
    if (!can('stock')) { app?.showToast?.('You do not have access to pipe stock. Ask the owner.'); return; }
    const rigs = rigsToShow();
    let rigId = rigs.some((r) => r.id === getCurrentRig()?.id) ? getCurrentRig().id : rigs[0].id;
    let adding = null; // 'purchase' | 'opening' | 'adjust'
    const onChange = () => render();
    const sheet = openSheet({ title: 'Casing pipes', sub: '', ic: 'cylinder', onClose: () => window.removeEventListener('drillrig:stock-changed', onChange) });

    function entryForm(type) {
        const st = stockSettings(app.brand);
        const n = names(app);
        const uid = type;
        const date = input(`psDate${uid}`, { type: 'date', value: todayYmd(), max: todayYmd() });
        const note = input(`psNote${uid}`, { type: 'text', maxlength: '200', placeholder: type === 'adjust' ? 'Reason (cut, damaged, returned)' : 'Supplier, bill no. (optional)' });
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        const kids = [];
        let a1;
        let a2;
        let cost1;
        let cost2;
        const total = el('strong', { class: 'ca-total' });
        if (type === 'adjust') {
            a1 = input(`psA1${uid}`, { type: 'number', inputmode: 'decimal', step: '1', placeholder: 'e.g. -8' });
            a2 = input(`psA2${uid}`, { type: 'number', inputmode: 'decimal', step: '1', placeholder: '0' });
            kids.push(el('p', { class: 'ca-note', text: 'In feet. A minus number takes pipe out (cut, damaged, returned).' }));
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(a1.id, `${n.casing1} feet`, a1), field(a2.id, `${n.casing2} feet`, a2)]));
        } else {
            a1 = input(`psA1${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: '0' });
            a2 = input(`psA2${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: '0' });
            kids.push(el('div', { class: 'tt-fields is-half' }, [field(a1.id, `${n.casing1} pipes`, a1), field(a2.id, `${n.casing2} pipes`, a2)]));
            if (type === 'purchase') {
                cost1 = input(`psC1${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: 'e.g. 2400', value: st.cost.casing1 || '' });
                cost2 = input(`psC2${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: 'e.g. 6500', value: st.cost.casing2 || '' });
                kids.push(el('div', { class: 'tt-fields is-half' }, [field(cost1.id, `${n.casing1} ₹ per pipe`, cost1), field(cost2.id, `${n.casing2} ₹ per pipe`, cost2)]));
            }
            kids.push(total);
        }
        const show = () => {
            if (type === 'adjust') return;
            const p1 = Math.max(0, Math.floor(Number(a1.value) || 0));
            const p2 = Math.max(0, Math.floor(Number(a2.value) || 0));
            const feet = `${(p1 * st.pipeFt).toLocaleString('en-IN')} ft + ${(p2 * st.pipeFt).toLocaleString('en-IN')} ft`;
            total.textContent = type === 'purchase' ? `${feet} · total ${inr(p1 * (Number(cost1.value) || 0) + p2 * (Number(cost2.value) || 0))}` : feet;
        };
        [a1, a2, cost1, cost2].filter(Boolean).forEach((x) => x.addEventListener('input', show));
        show();
        kids.push(el('div', { class: 'tt-fields is-half' }, [field(date.id, 'Date', date), field(note.id, 'Note', note)]), err);
        return el('div', { class: 'tt-form' }, [...kids, el('div', { class: 'tt-acts is-two' }, [
            btn('Cancel', { onclick: () => { adding = null; render(); } }),
            btn(type === 'purchase' ? 'Add purchase' : type === 'opening' ? 'Save opening stock' : 'Save adjustment', {
                kind: 'pri', ic: 'check',
                onclick: () => {
                    const res = makeStockEntry(type === 'adjust'
                        ? { type, date: date.value, casing1Ft: a1.value, casing2Ft: a2.value, note: note.value, rigId }
                        : { type, date: date.value, casing1Pipes: a1.value || 0, casing2Pipes: a2.value || 0, cost1: cost1?.value, cost2: cost2?.value, pipeFt: st.pipeFt, note: note.value, rigId });
                    if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                    if (!saveStock(app, [res.entry, ...readStock()])) return;
                    adding = null;
                    sheet.say(`${STOCK_TYPES[type]} saved${res.entry.amount ? ` · ${inr(res.entry.amount)}` : ''}.`, true);
                    render();
                }
            })
        ])]);
    }

    function entryRow(e) {
        const n = names(app);
        const part = (key, ftKey, pipesKey, costKey) => {
            const f = Number(e[ftKey]) || 0;
            if (!f) return '';
            const p = Number(e[pipesKey]) || 0;
            return `${n[key]} ${f > 0 && e.type === 'adjust' ? '+' : ''}${f.toLocaleString('en-IN')} ft${p ? ` (${p} pipe${p === 1 ? '' : 's'}${e[costKey] ? ` × ${inr(e[costKey])}` : ''})` : ''}`;
        };
        return item({
            avatar: el('span', { class: `tt-avatar is-tool ca-av is-${e.type === 'adjust' ? 'handover' : e.type === 'purchase' ? 'in' : 'diesel'}`, 'aria-hidden': 'true' }, [icon(e.type === 'adjust' ? 'pencil' : e.type === 'purchase' ? 'shopping-cart' : 'package')]),
            title: `${STOCK_TYPES[e.type] || e.type} · ${shortDate(e.date)}`,
            subText: [part('casing1', 'casing1Ft', 'casing1Pipes', 'cost1'), part('casing2', 'casing2Ft', 'casing2Pipes', 'cost2'), e.note].filter(Boolean).join(' · '),
            pill: e.amount ? pill(inr(e.amount), 'is-muted') : null,
            bodyKids: isOwnerOrLocal() ? () => [el('div', { class: 'tt-acts' }, [btn('Delete', {
                kind: 'danger', ic: 'trash-2',
                onclick: () => app.confirmDeleteModal({
                    title: 'Delete this stock entry?',
                    subtitle: 'Only if it was added by mistake',
                    itemLabel: `${STOCK_TYPES[e.type] || e.type} · ${shortDate(e.date)}`,
                    message: 'The stock changes at once. To record damaged pipes, add an Adjustment instead.',
                    confirmBtnLabel: 'Delete',
                    onConfirm: () => { saveStock(app, readStock().filter((x) => x.id !== e.id)); render(); }
                })
            })])] : null
        });
    }

    function settingsFold() {
        const st = stockSettings(app.brand);
        const n = names(app);
        const pipeFt = input('psPipeFt', { type: 'number', inputmode: 'numeric', min: '1', step: '1', value: String(st.pipeFt) });
        const l1 = input('psL1', { type: 'number', inputmode: 'numeric', min: '0', step: '5', value: String(st.low.casing1) });
        const l2 = input('psL2', { type: 'number', inputmode: 'numeric', min: '0', step: '5', value: String(st.low.casing2) });
        const c1 = input('psCost1', { type: 'number', inputmode: 'numeric', min: '0', step: '1', value: st.cost.casing1 || '' , placeholder: 'e.g. 2400' });
        const c2 = input('psCost2', { type: 'number', inputmode: 'numeric', min: '0', step: '1', value: st.cost.casing2 || '', placeholder: 'e.g. 6500' });
        const dr = input('psDrillRate', { type: 'number', inputmode: 'numeric', min: '1', step: '10', value: String(st.drillRate) });
        const dn = input('psDrillName', { type: 'text', maxlength: '40', value: st.drillName });
        return el('details', { class: 'tt-fold tt-card' }, [
            el('summary', {}, [el('span', { class: 'tt-tile is-grey' }, [icon('settings-2')]), el('span', { class: 'tt-fold-title', text: 'Pipe settings' }), el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])]),
            el('div', { class: 'tt-fold-body' }, [
                field('psPipeFt', 'One pipe is (feet)', pipeFt),
                el('div', { class: 'tt-fields is-half' }, [field('psL1', `Warn when ${n.casing1} is below (ft)`, l1), field('psL2', `Warn when ${n.casing2} is below (ft)`, l2)]),
                el('div', { class: 'tt-fields is-half' }, [field('psCost1', `${n.casing1} ₹ per pipe`, c1), field('psCost2', `${n.casing2} ₹ per pipe`, c2)]),
                el('span', { class: 'tt-mini', text: `${n.casing1} casing without pipe (drilling only)` }),
                el('div', { class: 'tt-fields is-half' }, [field('psDrillRate', '₹ per ft', dr), field('psDrillName', 'Name on the bill', dn)]),
                el('small', { class: 'tt-hint', text: 'For a dry bore where the pipe is pulled out: choose "Drilling only" on the bill.' }),
                btn('Save settings', {
                    kind: 'pri', ic: 'check',
                    onclick: () => {
                        const pos = (v, d) => (Number(v) > 0 ? Math.round(Number(v)) : d);
                        const zero = (v) => Math.max(0, Math.round(Number(v) || 0));
                        Object.assign(app.brand, {
                            pipeLengthFt: pos(pipeFt.value, 20),
                            lowStockCasing1Ft: zero(l1.value), lowStockCasing2Ft: zero(l2.value),
                            pipeCost1: zero(c1.value), pipeCost2: zero(c2.value),
                            casing7DrillRate: pos(dr.value, 200), casing7DrillName: String(dn.value || '').trim().slice(0, 40) || 'Re-cutting charge'
                        });
                        app.saveToStorage(STORAGE_KEYS.brand, app.brand);
                        sheet.say('Pipe settings saved.', true);
                        render();
                    }
                })
            ])
        ]);
    }

    function render() {
        const n = names(app);
        const st = stockSettings(app.brand);
        const s = summaryFor(app, rigId);
        const warn = lowStock(s, st.low);
        const rigName = rigs.find((r) => r.id === rigId)?.name;
        sheet.setSub(`${rigName ? `${rigName} · ` : ''}${s.tracking ? `${n.casing1} ${s.casing1.balance} ft · ${n.casing2} ${s.casing2.balance} ft` : 'Not started yet'}`);
        const box = (key) => {
            const w = warn.find((x) => x.key === key);
            return el('div', { class: `ps-box${w ? (w.negative ? ' is-neg' : ' is-low') : ''}` }, [
                el('small', { text: n[key] }),
                el('strong', { text: s.tracking ? `${s[key].balance.toLocaleString('en-IN')} ft` : '—' }),
                el('span', { text: s.tracking ? feetAndPipes(s[key].balance, st.pipeFt).replace(/^[^(]*\(|\)$/g, '') : 'not tracked' }),
                s.tracking ? el('em', { text: `In ${s[key].in.toLocaleString('en-IN')} · used ${s[key].used.toLocaleString('en-IN')} ft` }) : null
            ]);
        };
        const usage = s.tracking ? stockUsage({ bills: app.history || [], since: s.since, rigId, rigOf: billRigId, limit: 15 }) : [];
        const acts = (key, text, ic) => btn(text, { kind: adding === key ? 'pri' : 'soft', ic, onclick: () => { adding = adding === key ? null : key; render(); } });
        sheet.body.replaceChildren(...[
            rigs.length > 1 ? seg('psRig', rigs.map((r) => ({ key: r.id, label: r.name })), rigId, (v) => { rigId = v; adding = null; render(); }) : null,
            el('div', { class: 'tt-card ps-stock' }, [
                el('div', { class: 'ps-boxes' }, [box('casing1'), box('casing2')]),
                ...warn.map((w) => el('p', { class: 'wk-warn' }, [icon('triangle-alert'), el('span', { text: w.negative ? `${n[w.key]}: bills used ${-w.balance} ft more than you have. Add the purchase or opening stock.` : `${n[w.key]} is low: ${w.balance} ft left (alert below ${w.limit} ft).` })])),
                el('p', { class: 'ca-note', text: s.tracking
                    ? `Goes down by itself when a final bill with pipe is saved (from ${shortDate(s.since)}). "Drilling only" bills and quotations do not use pipe.`
                    : 'Start with your opening stock: the pipes on the rig today. Final bills from that day on take pipe out by themselves.' })
            ]),
            el('div', { class: 'ca-acts' }, [
                acts('purchase', 'Purchase', 'shopping-cart'),
                acts(s.tracking ? 'adjust' : 'opening', s.tracking ? 'Adjustment' : 'Opening stock', s.tracking ? 'pencil' : 'package'),
                s.tracking ? acts('opening', 'Opening stock', 'package') : null
            ]),
            adding ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-form-head' }, [el('strong', { text: STOCK_TYPES[adding] })]), entryForm(adding)]) : null,
            s.entries.length ? label('Stock entries', s.entries.length) : null,
            s.entries.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, s.entries.slice(0, 40).map(entryRow))]) : null,
            usage.length ? label('Used on bills', usage.length) : null,
            usage.length ? el('div', { class: 'tt-card' }, [el('ol', { class: 'tl-mm' }, usage.map((u) => el('li', {}, [
                el('span', { text: `${shortDate(u.day)} · #${u.billNo} ${u.custName}`.trim() }),
                el('strong', { text: [u.casing1 ? `${n.casing1} ${u.casing1} ft` : '', u.casing2 ? `${n.casing2} ${u.casing2} ft` : ''].filter(Boolean).join(' · ') })
            ])))]) : null,
            isOwnerOrLocal() ? settingsFold() : null
        ].filter(Boolean));
        paintIcons();
    }

    window.addEventListener('drillrig:stock-changed', onChange);
    render();
}
