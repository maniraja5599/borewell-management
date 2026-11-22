// 7″ casing on a bill: "With pipe" (rate card's 7″ rate, pipe comes out of stock) or "Drilling only"
// (the casing hole is drilled but no pipe stays in the bore — e.g. pulled out of a dry bore — at the
// company's drilling-only rate, default ₹200/ft, named e.g. "Re-cutting charge"). The choice is on
// the 7″ casing card of the bill, and a saved bill can be switched from its pop-up ("Pipe pulled
// out?"): the bill opens for editing with the new rate, the user checks it and saves. Stock follows
// by itself (stockMath only counts pipe bills). Calculation: core/slabEngine.js (state.pvc7Mode).
import { can } from '../../cloud/access.js';
import { stockSettings } from './stockMath.js';

export function initCasingMode(app) {
    const settings = () => stockSettings(app.brand);
    const short = () => app.getCasing1ShortName?.() || '7"';

    app.casing7DrillRate = () => settings().drillRate;
    /** The 7″ line's name on the bill, receipt, PDF and WhatsApp text. */
    app.casing7LineName = (res, pipeName) => (res?.pvc7Mode === 'drill'
        ? `${res.pvc7DrillName || settings().drillName} (${short()}, no pipe)`
        : pipeName);

    /** Switch the bill being edited. */
    app.setPvc7Mode = (mode) => {
        if (app.isSavedBillReadOnly) return false;
        const drill = mode === 'drill';
        const input = document.getElementById('pvc7RateInput');
        app.state.pvc7Mode = drill ? 'drill' : 'pipe';
        if (drill) {
            app.state.pvc7DrillRate = Number(app.state.pvc7DrillRate) > 0 ? app.state.pvc7DrillRate : settings().drillRate;
            app.state.pvc7DrillName = settings().drillName;
            if (input) input.value = app.state.pvc7DrillRate;
        } else {
            app.state.pvc7DrillRate = 0;
            delete app.state.pvc7DrillName;
            if (input) input.value = app.rates.pvc7Rate || 400;
        }
        app.calculateAndRender?.();
        sync();
        return true;
    };

    // ---- the switch on the 7″ casing card
    const card = document.getElementById('pvc7Length')?.closest('.simple-pvc-card');
    const seg = document.createElement('div');
    seg.className = 'spvc-mode';
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', '7 inch casing');
    const btn = (mode) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.mode = mode;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', () => app.setPvc7Mode(mode));
        return b;
    };
    const pipeBtn = btn('pipe');
    const drillBtn = btn('drill');
    seg.append(pipeBtn, drillBtn);
    if (card) card.querySelector('.spvc-top')?.insertAdjacentElement('afterend', seg);

    function sync() {
        const drill = app.state?.pvc7Mode === 'drill';
        pipeBtn.textContent = 'With pipe';
        drillBtn.textContent = 'Drilling only';
        pipeBtn.title = `Pipe left in the bore (comes out of stock)`;
        drillBtn.title = `${settings().drillName}: no pipe, ₹${settings().drillRate}/ft`;
        for (const [b, on] of [[pipeBtn, !drill], [drillBtn, drill]]) {
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-checked', String(on));
            b.disabled = Boolean(app.isSavedBillReadOnly);
        }
        card?.classList.toggle('is-drill', drill);
        const label = document.getElementById('labelPvc7Name');
        if (label) {
            // Remember the normal name (the app may rename it, e.g. from the casing settings).
            const drillText = `${short()} drilling only`;
            if (label.textContent !== drillText) label.dataset.pipeName = label.textContent;
            label.textContent = drill ? drillText : (label.dataset.pipeName || `${short()} Casing`);
        }
    }
    const origCalc = app.calculateAndRender?.bind(app);
    if (origCalc) app.calculateAndRender = (...args) => { const r = origCalc(...args); try { sync(); } catch { /* ignore */ } return r; };

    // ---- a saved bill: "Pipe pulled out?" in its pop-up
    const origOpen = app.openBillDetailModal?.bind(app);
    if (origOpen) {
        app.openBillDetailModal = (billId, ...rest) => {
            const r = origOpen(billId, ...rest);
            try {
                const item = (app.history || []).find((h) => h.id === billId);
                const snap = item?.snapshot;
                const body = document.getElementById('bdmBodyContent');
                if (!item || !snap || !body || (snap.docType || 'QUOTATION') !== 'INVOICE' || !(Number(snap.pvc7Length) > 0) || !can('bills')) return r;
                const drill = snap.pvc7Mode === 'drill';
                const box = document.createElement('div');
                box.className = 'spvc-pulled';
                const text = document.createElement('p');
                text.textContent = drill
                    ? `${short()} casing: drilling only, no pipe (${snap.pvc7Length} ft × ₹${snap.pvc7Rate}).`
                    : `Pipe pulled out of this bore (dry bore)? Change the ${short()} casing to drilling only (₹${settings().drillRate}/ft) — the ${snap.pvc7Length} ft go back to stock.`;
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'spvc-pulled-btn';
                b.textContent = drill ? 'Pipe left in — charge with pipe' : 'Pipe pulled out — drilling only';
                b.addEventListener('click', () => {
                    app.closeBillDetailModal?.();
                    app.loadBillFromHistory(item.id, false, true);
                    if (app.setPvc7Mode(drill ? 'pipe' : 'drill')) {
                        document.getElementById('pvc7Length')?.closest('.simple-pvc-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        app.showToast?.(drill ? `${short()} casing back to "with pipe". Check the bill and tap Save.` : `${short()} casing changed to drilling only. Check the bill and tap Save.`);
                    }
                });
                box.append(text, b);
                body.insertBefore(box, body.querySelector('.act-box'));
            } catch (e) { console.warn('[casing]', e); }
            return r;
        };
    }
    sync();
}
