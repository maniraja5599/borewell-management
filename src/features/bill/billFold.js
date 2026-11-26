// New bill: 1 Customer · 2 Drilling · 3 Casing · 4 Extras, one section open at a time (owner, 25 Nov 2026: "one long page that keeps scrolling
// is hard"; Idea B on the "DrillRig New Bill redesign" canvas).
//
// Bore & drilling, Casing pipes and Extras & advance fold up. Only one is open; the others show
// a one-line summary ("6.5\" · 450 ft · ₹90/ft · bata ₹2,000"). Tap a folded card, or the
// "Next" button at the bottom of the open one, to open it.
//
// Nothing about the fields changes: same markup and ids, same handlers. This file only
//  - builds the Extras & advance card and moves the extras bar, GST row, drawers and the work
//    details row into it (they used to sit at the bottom of the casing card),
//  - moves Preview & Save under the cards, so it never folds away,
//  - adds −50 / +50 buttons beside the depth field.
// A folded card's fields are only visually hidden (not display:none), so Enter / Next and any
// code that focuses a field still works: focusing a field opens its card.

const $ = (id) => document.getElementById(id);
const rupee = (n) => '₹' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');
const num = (id) => parseFloat($(id)?.value) || 0;
const shown = (node) => !!node && node.style.display !== 'none';

function make(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
}

const DEPTH_STEP = 50;

export function initBillFold(app) {
    const drill = $('progDrillingSection');
    const casing = $('progCasingSection');
    const bar = $('proceedToPreviewBar');
    if (!app || !drill || !casing || !bar || $('progExtrasSection')) return;

    // ---------- 1. The Extras & advance card ----------
    const extras = make('div', 'ui-card prog-reveal-card simple-work-card');
    extras.id = 'progExtrasSection';
    extras.style.display = casing.style.display;
    const head = make('div', 'simple-card-head');
    const title = make('span', 'simple-card-title');
    const n4 = make('span', 'step-n', '4');
    n4.setAttribute('aria-hidden', 'true');
    title.append(n4, make('span', 'step-t', 'Extras & advance'));
    const extrasAmt = make('strong', 'simple-card-amount', '₹0');
    extrasAmt.id = 'liveInlineExtrasBadge';
    head.append(title, extrasAmt);
    extras.appendChild(head);
    for (const node of [
        casing.querySelector(':scope > .simple-extras-bar'),
        $('custGstInlineRow'), $('inlinePriceDrawer'), $('extraChargesDrawer'), $('billNotesDrawer'), $('workCard')
    ]) {
        if (node) extras.appendChild(node);
    }
    casing.after(extras);
    extras.after(bar);
    bar.classList.add('nb-save-bar');

    // ---------- 2. Depth −50 / +50 ----------
    const depth = $('totalDepth');
    const heroWrap = depth?.closest('.simple-big-input-wrap');
    if (depth && heroWrap) {
        const bump = (delta) => {
            const max = parseInt(depth.max, 10) || 2500;
            const next = Math.min(max, Math.max(0, (parseInt(depth.value, 10) || 0) + delta));
            depth.value = next ? String(next) : '';
            depth.dispatchEvent(new Event('input', { bubbles: true }));
            depth.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const mkBump = (delta) => {
            const b = make('button', 'nb-depth-bump', (delta < 0 ? '−' : '+') + Math.abs(delta));
            b.type = 'button';
            b.tabIndex = -1;
            b.setAttribute('aria-label', `${delta < 0 ? 'Minus' : 'Plus'} ${Math.abs(delta)} feet`);
            b.addEventListener('click', () => bump(delta));
            return b;
        };
        heroWrap.before(mkBump(-DEPTH_STEP));
        heroWrap.after(mkBump(DEPTH_STEP));
    }

    // ---------- 2b. Rate −1 / +1 & Collapsible Bore Bata ----------
    const rateInput = $('baseDrillingRate');
    const rateItem = rateInput?.closest('.srbb-item');
    const rateBox = rateItem?.querySelector('.srbb-input-box');
    if (rateInput && rateItem && rateBox && !rateItem.querySelector('.nb-rate-bump')) {
        rateItem.classList.add('nb-rate-item');
        const rateRow = make('div', 'nb-rate-row');
        const bumpRate = (delta) => {
            const min = parseInt(rateInput.min, 10) || 1;
            const next = Math.max(min, Math.round((parseFloat(rateInput.value) || 0) + delta));
            rateInput.value = String(next);
            rateInput.dispatchEvent(new Event('input', { bubbles: true }));
            rateInput.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const mkRateBtn = (delta) => {
            const b = make('button', 'nb-rate-bump', (delta < 0 ? '−' : '+') + Math.abs(delta));
            b.type = 'button';
            b.tabIndex = -1;
            b.setAttribute('aria-label', `${delta < 0 ? 'Decrease' : 'Increase'} rate by ₹${Math.abs(delta)}`);
            b.addEventListener('click', () => bumpRate(delta));
            return b;
        };
        rateBox.before(rateRow);
        rateRow.append(mkRateBtn(-1), rateBox, mkRateBtn(1));
    }

    const bataInput = $('billBoreBataInput');
    const bataItem = bataInput?.closest('.srbb-item');
    let bataToggle = $('nbBataToggleBtn');
    const setBataOpen = (show) => {
        if (!bataItem) return;
        bataItem.classList.toggle('is-bata-hidden', !show);
        if (bataToggle) {
            bataToggle.setAttribute('aria-expanded', String(show));
            bataToggle.classList.toggle('is-open', show);
        }
    };
    if (bataInput && bataItem && !bataToggle) {
        bataItem.classList.add('nb-bata-item', 'is-bata-hidden');
        const doneBtn = make('button', 'nb-bata-done', 'Done');
        doneBtn.type = 'button';
        doneBtn.tabIndex = -1;
        doneBtn.addEventListener('click', () => setBataOpen(false));
        bataItem.querySelector('label')?.after(doneBtn);

        bataToggle = make('button', 'nb-bata-toggle');
        bataToggle.id = 'nbBataToggleBtn';
        bataToggle.type = 'button';
        bataToggle.tabIndex = -1;
        bataToggle.setAttribute('aria-expanded', 'false');
        bataToggle.addEventListener('click', () => {
            const opening = bataItem.classList.contains('is-bata-hidden');
            setBataOpen(opening);
            if (opening) {
                bataInput.focus({ preventScroll: true });
                try { bataInput.select(); } catch { /* ignore */ }
            }
        });
        bataInput.addEventListener('focusin', () => setBataOpen(true));
        $('drillingRateBataWrap')?.appendChild(bataToggle);
    }

    // ---------- 3. Folding: 1 Customer · 2 Drilling · 3 Casing · 4 Extras ----------
    // Customer gets the same kind of head as the others (its picker keeps its own search row).
    const cust = $('customerCard');
    let custHead = null;
    if (cust) {
        custHead = make('div', 'simple-card-head nb-cust-head');
        const t = make('span', 'simple-card-title');
        const n1 = make('span', 'step-n', '1');
        n1.setAttribute('aria-hidden', 'true');
        t.append(n1, make('span', 'step-t', 'Customer'));
        custHead.appendChild(t);
        cust.prepend(custHead);

        // Billed to: Customer | Agent switch
        const billToBar = make('div', 'nb-billto-bar');
        billToBar.id = 'billToTypeBar';
        const mkBillTo = (val, label) => {
            const b = make('button', 'nb-billto-pill', label);
            b.type = 'button';
            b.dataset.billto = val;
            b.addEventListener('click', () => {
                if (!app.state) app.state = {};
                app.state.billToType = val;
                syncBillToUI();
                app.persistCurrentSession?.();
                refresh();
            });
            return b;
        };
        const btnCust = mkBillTo('customer', 'Customer');
        const btnAgent = mkBillTo('agent', 'Agent');
        billToBar.append(make('span', 'nb-billto-lbl', 'Billed to'), make('div', 'nb-billto-track', [btnCust, btnAgent]));
        custHead.after(billToBar);
    }
    const syncBillToUI = () => {
        const cur = app.state?.billToType === 'agent' ? 'agent' : 'customer';
        document.querySelectorAll('#billToTypeBar .nb-billto-pill').forEach((b) => {
            b.classList.toggle('active', b.dataset.billto === cur);
        });
    };
    const hasCustomer = () => !!($('custName')?.value || app.state?.custName || '').trim();
    const hasSite = () => !!($('custLocation')?.value || app.state?.custLocation || '').trim();

    const sections = [
        ...(cust ? [{ key: 'cust', node: cust }] : []),
        { key: 'drill', node: drill, next: 'casing', nextLabel: 'Next: Casing pipes' },
        { key: 'casing', node: casing, next: 'extras', nextLabel: 'Next: Extras & advance' },
        { key: 'extras', node: extras }
    ];
    let open = 'drill';
    let wasReady = hasCustomer() && hasSite(); // customer + site picked (then drilling opens)
    const sec = (key) => sections.find((x) => x.key === key);

    for (const s of sections) {
        const h = s.node.querySelector(':scope > .simple-card-head');
        s.node.classList.add('nb-fold');
        s.sum = make('small', 'nb-fold-sum');
        s.btn = make('button', 'nb-fold-btn');
        s.btn.type = 'button';
        s.btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
        h.append(s.btn, s.sum);
        h.addEventListener('click', (e) => {
            // The casing Settings button and any other control in the head keep their own job.
            if (e.target.closest('button, a, input, select') && !e.target.closest('.nb-fold-btn')) return;
            if (!s.node.classList.contains('is-folded')) {
                if (e.target.closest('label')) return; // tapping "Drilling depth" focuses the field
                setOpen('');
            } else {
                e.preventDefault();
                setOpen(s.key);
            }
        });
        s.node.addEventListener('focusin', (e) => {
            if (s.node.classList.contains('is-folded') && !e.target.closest('.simple-card-head')) setOpen(s.key);
        });
        if (s.next) {
            const go = make('button', 'nb-fold-next', s.nextLabel);
            go.type = 'button';
            go.addEventListener('click', () => goTo(s.next));
            s.node.appendChild(go);
        }
    }

    function setOpen(key) {
        open = key;
        for (const s of sections) {
            // No customer yet: the customer card stays open (its picker is the first step).
            const folded = s.key !== key && !(s.key === 'cust' && !hasCustomer());
            s.node.classList.toggle('is-folded', folded);
            s.btn.setAttribute('aria-expanded', String(!folded));
            s.btn.setAttribute('aria-label', `${folded ? 'Open' : 'Close'} ${s.node.querySelector('.step-t')?.textContent || 'section'}`);
        }
    }

    function goTo(key) {
        setOpen(key);
        const s = sections.find((x) => x.key === key);
        if (!s) return;
        if (key === 'casing') {
            const p7 = $('pvc7Length');
            if (p7) { p7.focus({ preventScroll: true }); try { p7.select(); } catch { /* ignore */ } }
        }
        if (key === 'extras' && $('extraChargesDrawer')?.style.display === 'none') $('extraChargesToggleBtn')?.click();
        requestAnimationFrame(() => s.node.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    // ---------- 4. Summaries, amounts, visibility ----------
    const join = (parts) => parts.filter(Boolean).join(' · ');

    function refresh() {
        const res = app.lastResult || {};
        const st = app.state || {};

        // The extras card and the save bar follow the casing card (shown once a depth is typed).
        extras.style.display = casing.style.display;
        bar.classList.toggle('nb-hide', bar.style.display === 'none');
        // Customer and site just picked: move on to drilling.
        const ready = hasCustomer() && hasSite();
        if (ready && !wasReady && (open === 'cust' || open === '') && shown(drill)) setOpen('drill');
        wasReady = ready;
        if (!sections.some((s) => s.key === open && shown(s.node))) {
            if (open !== '' || !shown(casing)) setOpen(shown(drill) && hasCustomer() ? 'drill' : 'cust');
        } else {
            setOpen(open); // the customer card's fold depends on whether a customer is picked
        }

        if (sec('cust')) {
            syncBillToUI();
            const phone = ($('custPhone')?.value || '').trim();
            const who = app.state?.billToType === 'agent' ? 'Agent' : '';
            sec('cust').sum.textContent = hasCustomer()
                ? join([who, ($('custName')?.value || st.custName || '').trim(), ($('custLocation')?.value || '').trim() || 'no site yet', phone])
                : 'Pick or add a customer';
        }

        const depthFt = parseInt($('totalDepth')?.value, 10) || 0;
        const rebore = st.drillingType === 'repair';
        sec('drill').sum.textContent = depthFt
            ? join([
                st.boreDia,
                `${depthFt} ft`,
                rebore && num('oldBoreDepth') ? `flushing ${num('oldBoreDepth')} ft` : '',
                num('baseDrillingRate') ? `₹${num('baseDrillingRate')}/ft` : '',
                num('billBoreBataInput') ? `bata ${rupee(num('billBoreBataInput'))}` : ''
            ])
            : 'Enter the drilling depth';

        const name7 = ($('labelPvc7Name')?.textContent || '7"').replace(/\s*casing.*$/i, '');
        const name10 = ($('labelPvc10Name')?.textContent || '10"').replace(/\s*casing.*$/i, '');
        const items = Array.isArray(st.extraItems) ? st.extraItems.filter((x) => x && (x.name || x.qty || x.rate)).length : 0;
        sec('casing').sum.textContent = join([
            num('pvc7Length') ? `${name7} ${num('pvc7Length')} ft` : '',
            num('pvc10Length') ? `${name10} ${num('pvc10Length')} ft` : '',
            items ? `${items} other item${items > 1 ? 's' : ''}` : ''
        ]) || 'No pipes yet · tap to add';

        const collar = num('collarCapCost');
        const transport = num('transportSurveyCost');
        const custom = num('customExtraAmount');
        const disc = num('discountAmount');
        const adv = num('advancePaidAmount');
        const gstOn = !!$('gstEnabledToggle')?.checked;
        sec('extras').sum.textContent = join([
            collar ? `Collar ${rupee(collar)}` : '',
            transport ? `Transport ${rupee(transport)}` : '',
            custom ? `${($('customExtraLabel')?.value || 'Extra').trim()} ${rupee(custom)}` : '',
            disc ? `discount ${rupee(disc)}` : '',
            gstOn ? `GST ${res.gstPercentage ?? ''}%` : '',
            adv ? `advance ${rupee(adv)}` : '',
            ($('billCustomNoteInput')?.value || '').trim() ? 'note' : ''
        ]) || 'Collar, transport, discount, advance, GST, note';

        const extrasNet = collar + transport + custom - disc + (gstOn ? (Number(res.gstAmount) || 0) : 0);
        extrasAmt.textContent = extrasNet > 0 ? `+${rupee(extrasNet)}` : extrasNet < 0 ? `−${rupee(extrasNet)}` : '₹0';

        if (bataToggle) {
            const bataVal = num('billBoreBataInput');
            bataToggle.textContent = bataVal > 0 ? `Bata ${rupee(bataVal)} · Change` : 'No bata · Add';
        }
    }

    // After every recalculation, and after any typing on the bill (summaries follow the fields).
    const origSync = app.syncProgressiveBillSections?.bind(app);
    if (origSync) {
        app.syncProgressiveBillSections = (...args) => {
            const r = origSync(...args);
            try { refresh(); } catch (err) { console.warn('billFold refresh', err); }
            return r;
        };
    }
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { try { refresh(); } catch { /* never break the bill */ } }); };
    const form = $('billEditorFormsContainer') || $('tab-bill');
    form?.addEventListener('input', later);
    form?.addEventListener('change', later);
    form?.addEventListener('click', later);

    // A fresh bill starts again from 1 Customer (or 2 Drilling when the customer is kept).
    for (const id of ['freshBillCtaBtn', 'freshBillQuickBtn', 'startFreshNewBillBtn']) {
        $(id)?.addEventListener('click', () => setTimeout(() => {
            if (app.state) app.state.billToType = 'customer';
            wasReady = hasCustomer() && hasSite();
            setBataOpen(false);
            setOpen(hasCustomer() ? 'drill' : 'cust');
            refresh();
        }, 0));
    }

    setOpen(hasCustomer() ? 'drill' : 'cust');
    refresh();
    app.openBillSection = (key) => setOpen(key);
}
