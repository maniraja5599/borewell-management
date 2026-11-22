// "Work details" of a Final Bill: operator, compressor hour meter, 9″ OB section hammer, 6.5″
// hammer and bits (mm before use, bit changes), water. Saved on the bill as bill.work — never on
// the customer's bill. Logic: workMath.js. The owner can make it required (brand.workLogRequired).
//
// On the bill screen it is ONE summary row just above Preview & Save ("Kumar · 9.5 h · bit
// KB-1023 164 mm"); tapping it opens the form on its own page (a full sheet), so the bill screen
// stays simple. The page reads the workers and bits & hammers fresh every time it draws.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { can, isOwnerOrLocal, getCurrentRig, hasRigs } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, openSheet, btn } from '../../ui/sheet.js';
import { readWorkers } from '../workers/workersUI.js';
import { workerLabel, typeOf } from '../workers/workersMath.js';
import { readTools, openTools } from '../tools/toolsUI.js';
import { openWorkers } from '../workers/workersUI.js';
import { toolName, toolLimits } from '../tools/toolsMath.js';
import { cleanWork, checkWork, cachedToolUsage, lastMm, lastClosing, toolWarning, halfMm } from './workMath.js';

const DRAFT_KEY = 'drillrig_work_draft';

const readDraft = () => { try { return JSON.parse(storage.getRaw(DRAFT_KEY) || 'null'); } catch { return null; } };
const writeDraft = (d) => { try { storage.setRaw(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } };

export function initWorkCard(app) {
    const bar = document.getElementById('proceedToPreviewBar');
    if (!bar || !app) return;
    const card = el('section', { class: 'ui-card wk-card wk-row-card', id: 'workCard', hidden: true, 'aria-label': 'Work details' });
    bar.parentNode.insertBefore(card, bar);
    let page = null;     // the open Work details page (sheet), or null

    let key = null;      // which bill the card is showing: a saved bill's id, or 'new'
    let draft = null;    // what the card holds (raw)
    let usage = {};

    const isFinal = () => (app.state?.docType || 'QUOTATION') === 'INVOICE';
    const currentKey = () => app.loadedHistoryBillId || 'new';
    const savedBill = () => (app.loadedHistoryBillId ? (app.history || []).find((h) => h.id === app.loadedHistoryBillId) : null);
    const rigIdNow = () => savedBill()?.rigId || (hasRigs() ? getCurrentRig()?.id : null) || null;
    const onRig = (x) => !hasRigs() || !rigIdNow() || !x.rigId || x.rigId === rigIdNow() || x.rigId === 'local';
    const readOnly = () => !!(app.loadedHistoryBillId && app.isSavedBillReadOnly);

    const persist = () => writeDraft({ key, work: draft });

    function freshDraft() {
        const start = lastClosing(app.history, hasRigs() ? rigIdNow() : null);
        return { compStart: start ?? '', bits: [{}] };
    }

    function loadFor(k) {
        key = k;
        const stored = readDraft();
        if (stored && stored.key === k && stored.work) draft = stored.work;
        else if (k !== 'new') draft = JSON.parse(JSON.stringify(savedBill()?.work || { bits: [{}] }));
        else draft = freshDraft();
        if (!Array.isArray(draft.bits) || !draft.bits.length) draft.bits = [{}];
        persist();
    }

    // ----- small controls -----
    const options = (list, value, placeholder) => {
        const sel = el('select', { class: 'tt-input wk-select' });
        sel.appendChild(el('option', { value: '', text: placeholder }));
        for (const o of list) sel.appendChild(el('option', { value: o.value, text: o.label, selected: o.value === value }));
        if (value && !list.some((o) => o.value === value)) sel.appendChild(el('option', { value, text: '(not in the list any more)', selected: true }));
        sel.disabled = readOnly();
        return sel;
    };
    const numIn = (value, attrs = {}) => {
        const i = el('input', { type: 'number', inputmode: 'decimal', class: 'tt-input', value: value ?? '', ...attrs });
        i.disabled = readOnly();
        return i;
    };
    const row = (labelText, control, extra) => el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: labelText }), control, extra || null]);

    function mmStepper(b, tool) {
        const val = el('input', { type: 'number', inputmode: 'decimal', step: '0.5', class: 'tt-input wk-mm', value: b.mm ?? '', 'aria-label': 'Bit size in mm' });
        const step = (d) => {
            const base = halfMm(val.value) ?? lastMm(tool, usage) ?? 165;
            val.value = String(halfMm(base + d));
            b.mm = val.value; persist(); refreshWarnings();
        };
        val.addEventListener('input', () => { b.mm = val.value; persist(); refreshWarnings(); });
        val.addEventListener('blur', () => { if (val.value) { val.value = String(halfMm(val.value)); b.mm = val.value; persist(); } });
        const minus = el('button', { type: 'button', class: 'wk-step', 'aria-label': 'Minus 0.5 mm', onclick: () => step(-0.5) }, [icon('minus')]);
        const plus = el('button', { type: 'button', class: 'wk-step', 'aria-label': 'Plus 0.5 mm', onclick: () => step(0.5) }, [icon('plus')]);
        [val, minus, plus].forEach((x) => { x.disabled = readOnly(); });
        return el('div', { class: 'wk-mmbox' }, [minus, val, el('span', { class: 'wk-unit', text: 'mm' }), plus]);
    }

    let warnSlots = [];
    function refreshWarnings() {
        const limits = toolLimits(app.brand);
        const tools = readTools();
        for (const { slot, get } of warnSlots) {
            const { toolId, mm } = get();
            const t = tools.find((x) => x.id === toolId);
            let msg = null;
            if (t && t.tool === 'bit') {
                const m = halfMm(mm) ?? lastMm(t, usage);
                if (m !== null && m < limits.bitWarnMm) msg = `Bit is ${m} mm — below ${limits.bitWarnMm} mm. Time to change it?`;
            } else if (t) msg = toolWarning(t, usage, limits) ? `Hammer ${toolWarning(t, usage, limits)}. Check it.` : null;
            slot.hidden = !msg;
            slot.replaceChildren(...(msg ? [icon('triangle-alert'), el('span', { text: msg })] : []));
        }
        paintIcons();
    }

    /** Draw the summary row, and the page when it is open. */
    function render() {
        renderCard();
        if (page) renderForm();
    }

    function summary() {
        const parts = [];
        const w = readWorkers();
        const tl = readTools();
        const op = w.find((x) => x.id === draft?.operatorId);
        if (op) parts.push(op.name);
        const a = Number(draft?.compStart); const b = Number(draft?.compEnd);
        if (draft?.compEnd !== '' && draft?.compEnd !== undefined && draft?.compStart !== '' && b >= a) parts.push(`${Math.round((b - a) * 10) / 10} h`);
        const bit = (draft?.bits || []).find((x) => x?.toolId);
        const bt = bit && tl.find((x) => x.id === bit.toolId);
        if (bt) parts.push(`bit ${toolName(bt)}${bit.mm ? ` ${bit.mm} mm` : ''}`);
        if ((draft?.bits || []).filter((x) => x?.toolId).length > 1) parts.push(`+${draft.bits.filter((x) => x?.toolId).length - 1} bit`);
        if (draft?.waterIn) parts.push(`water ${draft.waterIn}″`);
        return parts;
    }

    function renderCard() {
        const parts = draft ? summary() : [];
        const required = !!app.brand?.workLogRequired;
        const done = !!cleanWork(draft || {}) && !checkWork(cleanWork(draft || {}), { required, totalDepth: Number(app.state?.totalDepth) || 0 });
        card.replaceChildren(el('button', { type: 'button', class: 'wk-open', 'aria-label': 'Open work details', onclick: () => openPage() }, [
            el('span', { class: 'tt-tile is-tools' }, [icon('hard-hat')]),
            el('span', { class: 'wk-open-txt' }, [
                el('strong', { text: 'Work details' }),
                el('small', { text: parts.length ? parts.join(' · ') : 'Operator, compressor, bits — not filled' })
            ]),
            el('span', { class: `tt-pill ${done ? 'is-ok' : required ? 'is-warn' : 'is-muted'}`, text: done ? 'Done' : required ? 'Required' : (readOnly() ? 'View' : 'Add') }),
            el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
        ]));
        paintIcons();
    }

    function openPage() {
        if (page) return;
        if (key !== currentKey()) loadFor(currentKey());
        const bill = savedBill();
        page = openSheet({
            title: 'Work details',
            sub: `${bill ? `#${bill.billNo} · ` : ''}${app.state?.custName || 'This bill'} · not printed on the customer's bill`,
            ic: 'hard-hat',
            onClose: () => { page = null; renderCard(); }
        });
        renderForm();
    }

    function renderForm() {
        if (!page) return;
        warnSlots = [];
        usage = cachedToolUsage(app.history, app._bigListVersion || 0);
        const workers = readWorkers().filter((w) => w && w.status !== 'left' && onRig(w));
        const tools = readTools().filter((t) => t && (t.status || 'active') === 'active' && onRig(t));
        const bits = tools.filter((t) => t.tool === 'bit');
        const hammers = tools.filter((t) => t.tool === 'hammer');
        const ops = [...workers].sort((a, b) => (a.type === 'operator' ? 0 : 1) - (b.type === 'operator' ? 0 : 1) || a.name.localeCompare(b.name))
            .map((w) => ({ value: w.id, label: `${workerLabel(w)}${w.type !== 'operator' ? ` (${typeOf(w.type).label})` : ''}` }));
        const hammerOpts = (first) => [...hammers].sort((a, b) => (a.size === first ? 0 : 1) - (b.size === first ? 0 : 1))
            .map((t) => ({ value: t.id, label: `${toolName({ ...t, firstUsedOn: usage[t.id]?.firstUsedOn })} · ${(usage[t.id]?.feet || 0).toLocaleString('en-IN')} ft` }));
        const bitOpts = bits.map((t) => ({ value: t.id, label: `${toolName(t)} · last ${lastMm(t, usage) ?? '?'} mm` }));
        const repair = app.state?.drillingType === 'repair';
        const obFeet = Math.max(0, Number(app.state?.pvc7Length) || 0);
        const ro = readOnly();

        // Operator(s)
        const op1 = options(ops, draft.operatorId, ops.length ? 'Choose operator' : 'No workers yet');
        op1.addEventListener('change', () => { draft.operatorId = op1.value; persist(); });
        const op2Wrap = el('div', {});
        const showOp2 = () => {
            const op2 = options(ops, draft.operator2Id, 'Second operator');
            op2.addEventListener('change', () => { draft.operator2Id = op2.value; persist(); });
            op2Wrap.replaceChildren(row('Second operator', op2));
        };
        if (draft.operator2Id) showOp2();
        const addOp2 = !draft.operator2Id && !ro && ops.length > 1 ? el('button', { type: 'button', class: 'wk-link', text: '+ Second operator', onclick: (e) => { e.target.remove(); showOp2(); } }) : null;

        // Compressor
        const cs = numIn(draft.compStart, { step: '0.1', placeholder: 'Start', 'aria-label': 'Compressor start reading' });
        const ce = numIn(draft.compEnd, { step: '0.1', placeholder: 'Closing', 'aria-label': 'Compressor closing reading' });
        const hours = el('span', { class: 'wk-hours' });
        const showHours = () => {
            const a = Number(cs.value); const b = Number(ce.value);
            hours.textContent = cs.value !== '' && ce.value !== '' && b >= a ? `= ${(Math.round((b - a) * 10) / 10).toLocaleString('en-IN')} hours` : '';
        };
        cs.addEventListener('input', () => { draft.compStart = cs.value; persist(); showHours(); });
        ce.addEventListener('input', () => { draft.compEnd = ce.value; persist(); showHours(); });
        showHours();

        // 9″ OB section
        const obHammer = options(hammerOpts('9'), draft.obHammerId, hammers.length ? 'Choose hammer' : 'No hammers yet');
        obHammer.addEventListener('change', () => { draft.obHammerId = obHammer.value; persist(); refreshWarnings(); });
        const obWarn = el('p', { class: 'wk-warn', hidden: true });
        warnSlots.push({ slot: obWarn, get: () => ({ toolId: draft.obHammerId }) });

        // 6.5″ hammer (+ rare change)
        const hm = options(hammerOpts('6.5'), draft.hammerId, hammers.length ? 'Choose hammer' : 'No hammers yet');
        hm.addEventListener('change', () => { draft.hammerId = hm.value; persist(); refreshWarnings(); });
        const hmWarn = el('p', { class: 'wk-warn', hidden: true });
        warnSlots.push({ slot: hmWarn, get: () => ({ toolId: draft.hammerId }) });
        const hm2Wrap = el('div', {});
        const showHm2 = () => {
            const at = numIn(draft.hammerChangeFt, { step: '1', placeholder: 'ft', 'aria-label': 'Hammer changed at feet' });
            at.addEventListener('input', () => { draft.hammerChangeFt = at.value; persist(); });
            const h2 = options(hammerOpts('6.5'), draft.hammer2Id, 'New hammer');
            h2.addEventListener('change', () => { draft.hammer2Id = h2.value; persist(); refreshWarnings(); });
            hm2Wrap.replaceChildren(el('div', { class: 'wk-sub' }, [row('Hammer changed at (ft)', at), row('New hammer', h2)]));
        };
        if (draft.hammer2Id) showHm2();
        const addHm2 = !draft.hammer2Id && !ro ? el('button', { type: 'button', class: 'wk-link', text: 'Hammer changed (cracked)?', onclick: (e) => { e.target.remove(); showHm2(); } }) : null;

        // 6.5″ bits
        const bitRows = draft.bits.map((b, i) => {
            const sel = options(bitOpts, b.toolId, bits.length ? 'Choose bit' : 'No bits yet');
            const tool = () => readTools().find((t) => t.id === b.toolId);
            const warn = el('p', { class: 'wk-warn', hidden: true });
            warnSlots.push({ slot: warn, get: () => ({ toolId: b.toolId, mm: b.mm }) });
            const mmBox = el('div', {}, [mmStepper(b, tool())]);
            sel.addEventListener('change', () => {
                b.toolId = sel.value;
                b.mm = lastMm(tool(), usage) ?? ''; // start from its last measured size
                mmBox.replaceChildren(mmStepper(b, tool()));
                persist(); refreshWarnings(); paintIcons();
            });
            const at = i > 0 ? numIn(b.atFt, { step: '1', placeholder: 'ft', 'aria-label': 'Bit changed at feet' }) : null;
            at?.addEventListener('input', () => { b.atFt = at.value; persist(); });
            const remove = i > 0 && !ro ? el('button', { type: 'button', class: 'wk-link is-danger', text: 'Remove', onclick: () => { draft.bits.splice(i, 1); persist(); render(); } }) : null;
            return el('div', { class: `wk-bit${i ? ' is-change' : ''}` }, [
                i > 0 ? row(`Bit changed at (ft)`, at, remove) : null,
                row(i ? 'Next bit' : 'Bit', sel),
                row('Size before drilling', mmBox),
                warn
            ]);
        });
        const addBit = !ro ? el('button', { type: 'button', class: 'wk-link', text: '+ Bit changed', onclick: () => { draft.bits.push({}); persist(); render(); } }) : null;

        // Water + note
        const water = numIn(draft.waterIn, { step: '0.5', placeholder: 'inches', 'aria-label': 'Water in inches' });
        water.addEventListener('input', () => { draft.waterIn = water.value; persist(); });
        const note = el('input', { type: 'text', class: 'tt-input', maxlength: '200', value: draft.note || '', placeholder: 'Optional (rock at 300 ft, ...)' });
        note.disabled = ro;
        note.addEventListener('input', () => { draft.note = note.value; persist(); });

        // Owner: required on/off
        const req = isOwnerOrLocal() ? el('label', { class: 'wk-req' }, [
            el('input', { type: 'checkbox', checked: !!app.brand?.workLogRequired, onchange: (e) => { app.brand.workLogRequired = e.target.checked; app.saveToStorage(STORAGE_KEYS.brand, app.brand); app.showToast?.(e.target.checked ? 'Work details are now required on Final Bills' : 'Work details are now optional'); } }),
            el('span', { text: 'Required' })
        ]) : null;

        const missing = [];
        if (!ops.length) missing.push(el('button', { type: 'button', class: 'wk-link', text: 'Add workers', onclick: () => openWorkers(app) }));
        if (!bits.length || !hammers.length) missing.push(el('button', { type: 'button', class: 'wk-link', text: 'Add bits & hammers', onclick: () => openTools(app) }));

        page.body.replaceChildren(...[
            req ? el('div', { class: 'wk-head' }, [el('small', { class: 'wk-hint', text: 'Owner: make work details required on every Final Bill?' }), req]) : null,
            missing.length ? el('p', { class: 'wk-tip' }, [icon('info'), el('span', { text: 'Add your workers and bits & hammers once, then just pick them here.' }), ...missing]) : null,
            el('div', { class: 'wk-sec' }, [el('h4', { text: 'Operator' }), row('Operator', op1), op2Wrap, addOp2]),
            el('div', { class: 'wk-sec' }, [
                el('h4', { text: 'Compressor hour meter' }),
                el('div', { class: 'wk-two' }, [row('Start', cs), row('Closing', ce)]), hours,
                draft.compStart === '' || draft.compStart === undefined ? null : el('small', { class: 'wk-hint', text: 'Start = this rig’s last closing reading. Change it if needed.' })
            ]),
            !repair ? el('div', { class: 'wk-sec' }, [
                el('h4', { text: '9″ OB section' }),
                el('p', { class: 'wk-hint', text: obFeet ? `${obFeet} ft — same as the 7″ casing on this bill` : 'Enter the 7″ casing feet on the bill; the OB section uses the same feet.' }),
                row('Hammer', obHammer), obWarn
            ]) : null,
            el('div', { class: 'wk-sec' }, [
                el('h4', { text: repair ? 'Re-bore (6.5″)' : '6.5″ bore' }),
                row('Hammer', hm), hmWarn, hm2Wrap, addHm2,
                ...bitRows, addBit
            ]),
            el('div', { class: 'wk-sec' }, [el('h4', { text: 'Water & note' }), el('div', { class: 'wk-two' }, [row('Water (inches)', water), row('Note', note)])]),
            btn(ro ? 'Close' : 'Done', { kind: 'pri', ic: 'check', cls: 'tt-wide wk-done', onclick: () => page?.close() })
        ].filter(Boolean));
        refreshWarnings();
        paintIcons();
    }

    function sync() {
        const show = isFinal() && can('bills');
        card.hidden = !show;
        if (!show) return;
        const k = currentKey();
        // Redraw for another bill, or when the 7″ casing feet / new-bore-or-re-bore / view-or-edit changed.
        const shape = `${Math.max(0, Number(app.state?.pvc7Length) || 0)}|${app.state?.drillingType}|${readOnly()}`;
        if (k !== key) { loadFor(k); lastShape = shape; render(); return; }
        if (shape !== lastShape) { lastShape = shape; render(); return; }
        renderCard();
    }
    let lastShape = '';

    // Draw again whenever the bill changes (new bill, opened bill, casing feet, Final/Quotation).
    const origCalc = app.calculateAndRender.bind(app);
    app.calculateAndRender = (...args) => {
        const out = origCalc(...args);
        try { sync(); } catch (e) { console.warn('[work]', e); }
        return out;
    };
    for (const ev of ['drillrig:workers-changed', 'drillrig:tools-changed']) window.addEventListener(ev, () => { if (!card.hidden) render(); });
    // Workers or bits added on this phone (e.g. from "Add workers" on the page): show them at once.
    const origStore = app.saveToStorage.bind(app);
    app.saveToStorage = (k, data, changed) => {
        const ok = origStore(k, data, changed);
        if ((k === STORAGE_KEYS.workers || k === STORAGE_KEYS.tools) && !card.hidden) { try { render(); } catch { /* ignore */ } }
        return ok;
    };

    // Saving the bill: check (when required) and keep the work details on the bill.
    const origSave = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = (...args) => {
        if (app.loadedHistoryBillId && app.isSavedBillReadOnly) return origSave(...args); // only unlocks editing
        if (!isFinal() || !can('bills')) return origSave(...args);
        if (key !== currentKey()) loadFor(currentKey());
        const work = cleanWork({ ...draft, obFeet: app.state?.drillingType === 'repair' ? null : (Number(app.state?.pvc7Length) || 0) });
        const problem = checkWork(work, { required: !!app.brand?.workLogRequired, totalDepth: Number(app.state?.totalDepth) || 0 });
        if (problem) {
            app.showToast?.(`⚠️ ${problem}`);
            openPage();
            return undefined;
        }
        const before = (app.history || []).length;
        const beforeRef = savedBill();
        const out = origSave(...args);
        Promise.resolve(out).then(() => {
            const id = app.loadedHistoryBillId;
            const idx = (app.history || []).findIndex((h) => h.id === id);
            const saved = idx >= 0 && ((app.history.length > before) || app.history[idx] !== beforeRef);
            if (!saved) return; // the bill itself was not saved (missing name, …)
            const rec = { ...app.history[idx] };
            if (work) rec.work = work; else delete rec.work;
            app.history[idx] = rec;
            app.saveToStorage(STORAGE_KEYS.history, app.history, []);
            key = null; // re-read from the saved bill
            try { storage.remove(DRAFT_KEY); } catch { /* ignore */ }
            sync();
        }).catch(() => { /* the save itself reported its error */ });
        return out;
    };

    sync();
}
