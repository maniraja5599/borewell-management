// "Make your first bill" checklist on the New Bill screen.
// Many new sign-ups never made a bill (admin console, Nov 2026), so until the first bill is
// saved, the New Bill screen shows the few steps that get there, each one tappable:
//   business name -> check your rates -> add a customer -> save the first bill.
// It goes away for good after the first bill (or "Hide").
// While it shows, the bill form itself guides too: the next thing to fill pulses, with a numbered
// tip above it (① customer → ② village / site → ③ depth → ④ Preview → ⑤ Save) — billCoachStep()
// decides which. (Preview only appears once customer, site and depth are all there.)
import { storage } from '../../data/storage.js';
import { getRole } from '../../cloud/access.js';
import { isPlaceholderCompany, maybeAskProfile } from '../account/profilePrompt.js';

const HIDE_KEY = 'drillrig_first_bill_guide_hidden';
const RATES_SEEN_KEY = 'drillrig_first_bill_rates_seen';

const get = (k) => { try { return storage.getRaw(k); } catch { return null; } };
const set = (k) => { try { storage.setRaw(k, '1'); } catch { /* ignore */ } };

/** The checklist for this app state (pure: used by the card and the tests). */
export function guideSteps({ companyName, role, ratesSeen, customers, bills }) {
    const owner = !role || role === 'owner';
    const steps = [];
    if (owner) {
        steps.push({ id: 'name', title: 'Add your business name', sub: 'Printed at the top of every bill', done: !isPlaceholderCompany(companyName) });
        steps.push({ id: 'rates', title: 'Check your drilling rates', sub: 'Set your per-foot slabs and pipe rates', done: !!ratesSeen });
    }
    steps.push({ id: 'customer', title: 'Add a customer', sub: 'Name, mobile and village', done: customers > 0 });
    steps.push({ id: 'bill', title: 'Save your first bill', sub: 'Enter depth & pipes, then Save and send on WhatsApp', done: bills > 0 });
    return steps;
}

export function shouldShowGuide({ hidden, bills }) {
    return !hidden && bills === 0;
}

/** The next thing to do on the bill form (pure: used by the coach and the tests). */
export function billCoachStep({ custName, custLocation, totalDepth, previewOpen }) {
    if (!String(custName || '').trim()) return { n: 1, id: 'customer', text: 'Pick or add the customer' };
    if (!String(custLocation || '').trim()) return { n: 2, id: 'site', text: 'Type the village / site of this bore' };
    if (!(Number(totalDepth) > 0)) return { n: 3, id: 'depth', text: 'Enter the drilling depth (and pipe feet)' };
    if (!previewOpen) return { n: 4, id: 'preview', text: 'Tap Preview to check the bill' };
    return { n: 5, id: 'save', text: 'Tap Save, then send it on WhatsApp' };
}
const COACH_TARGET = {
    customer: () => document.querySelector('#wizStepPanel1 .wiz-search-input-wrap') || document.getElementById('quickCustSearchInput'),
    site: () => document.getElementById('serviceSiteInputWrap') || document.getElementById('custLocation'),
    depth: () => document.querySelector('.drilling-depth-row') || document.getElementById('totalDepth'),
    preview: () => document.getElementById('openBillPreviewBtn'),
    save: () => document.getElementById('saveBillHistoryBtn')
};

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
}

export function initFirstBillGuide(app) {
    if (!app || typeof document === 'undefined') return;
    const panel = document.getElementById('wizStepPanel1');
    if (!panel) return;

    let card = null;
    let timer = null;

    const state = () => ({
        companyName: app.brand?.companyName,
        role: getRole?.() || null,
        ratesSeen: get(RATES_SEEN_KEY),
        customers: (app.customers || []).length,
        bills: (app.history || []).length
    });

    const act = (id) => {
        if (id === 'name') {
            // The welcome popup when it can open; otherwise Settings > Company profile.
            Promise.resolve(maybeAskProfile(app, { force: true })).catch(() => false).then((shown) => {
                if (shown) return;
                app.switchTab('tab-brand');
                app.switchSettingsView?.('set-view-company');
                setTimeout(() => document.getElementById('brandCompanyName')?.focus(), 300);
            });
        } else if (id === 'rates') {
            set(RATES_SEEN_KEY);
            app.switchTab('tab-rates');
        } else if (id === 'customer') {
            document.getElementById('headerAddCustPopupBtn')?.click();
        } else if (id === 'bill') {
            const step = billCoachStep(coachState());
            const target = COACH_TARGET[step.id]?.();
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (step.id === 'customer') document.getElementById('quickCustSearchInput')?.focus();
            if (step.id === 'site') setTimeout(() => document.getElementById('custLocation')?.focus(), 350);
            if (step.id === 'depth') setTimeout(() => document.getElementById('totalDepth')?.focus(), 350);
        }
    };

    // ---- the coach on the bill form
    const coachState = () => ({
        custName: app.state?.custName || document.getElementById('custName')?.value,
        custLocation: app.state?.custLocation || document.getElementById('custLocation')?.value,
        totalDepth: app.state?.totalDepth,
        previewOpen: !!app.isBillPreviewOpen
    });
    let coachTip = null;
    let coachOn = null;
    const clearCoach = () => {
        coachTip?.remove();
        coachTip = null;
        coachOn?.classList.remove('fbg-coach');
        coachOn = null;
    };
    const coach = () => {
        const s = state();
        const onBill = document.getElementById('tab-bill')?.classList.contains('active');
        if (!card || !onBill || !shouldShowGuide({ hidden: get(HIDE_KEY), bills: s.bills })) { clearCoach(); return; }
        const step = billCoachStep(coachState());
        const target = COACH_TARGET[step.id]?.();
        if (!target || target.offsetParent === null) { clearCoach(); return; }
        if (coachOn === target && coachTip?.dataset.step === String(step.n)) return;
        clearCoach();
        coachOn = target;
        target.classList.add('fbg-coach');
        coachTip = el('div', { class: 'fbg-tip', role: 'status', 'data-step': String(step.n) }, [
            el('span', { class: 'fbg-tip-n', 'aria-hidden': 'true', text: String(step.n) }),
            el('span', { text: step.text })
        ]);
        target.insertAdjacentElement('beforebegin', coachTip);
        const nextLine = card?.querySelector('.fbg-step.is-next small');
        if (nextLine && steps().find((x) => !x.done)?.id === 'bill') nextLine.textContent = `Next: ${step.text.charAt(0).toLowerCase()}${step.text.slice(1)}`;
    };
    const steps = () => guideSteps(state());

    const remove = () => {
        if (timer) { clearInterval(timer); timer = null; }
        clearCoach();
        card?.remove();
        card = null;
    };

    const render = () => {
        const s = state();
        if (!shouldShowGuide({ hidden: get(HIDE_KEY), bills: s.bills })) {
            if (card && s.bills > 0) app.showToast?.('🎉 First bill saved! Send it to the customer on WhatsApp.');
            remove();
            return;
        }
        const steps = guideSteps(s);
        const done = steps.filter((x) => x.done).length;
        const next = steps.find((x) => !x.done);

        const list = el('ol', { class: 'fbg-steps' }, steps.map((st, i) => {
            const row = el('li', { class: `fbg-step${st.done ? ' is-done' : ''}${st === next ? ' is-next' : ''}` }, [
                el('span', { class: 'fbg-dot', 'aria-hidden': 'true', text: st.done ? '✓' : String(i + 1) }),
                el('span', { class: 'fbg-text' }, [el('strong', { text: st.title }), el('small', { text: st.sub })]),
                st.done ? null : el('span', { class: 'fbg-go', 'aria-hidden': 'true', text: '›' })
            ]);
            if (!st.done) {
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.setAttribute('aria-label', `${st.title}: ${st.sub}`);
                row.addEventListener('click', () => act(st.id));
                row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(st.id); } });
            }
            return row;
        }));
        const hide = el('button', { type: 'button', class: 'fbg-hide', text: 'Hide' });
        hide.addEventListener('click', () => { set(HIDE_KEY); remove(); });

        const fresh = el('section', { class: 'ui-card fbg-card', id: 'firstBillGuide', 'aria-label': 'Make your first bill' }, [
            el('div', { class: 'fbg-head' }, [
                el('div', {}, [
                    el('h3', { class: 'fbg-title', text: 'Make your first bill' }),
                    el('p', { class: 'fbg-sub', text: `${done} of ${steps.length} done · takes about 2 minutes` })
                ]),
                hide
            ]),
            el('div', { class: 'fbg-bar', 'aria-hidden': 'true' }, [el('span', { style: `width:${Math.round((done / steps.length) * 100)}%` })]),
            list
        ]);
        if (card) card.replaceWith(fresh); else panel.prepend(fresh);
        card = fresh;
        if (coachTip) coachTip.dataset.step = ''; // card redrawn: write the "Next:" line again
        coach();
        // Customers and bills can also arrive from the cloud or a popup: re-check while shown.
        if (!timer) timer = setInterval(render, 4000);
    };

    // Re-check after the things that change a step.
    const wrap = (name, after) => {
        const orig = app[name];
        if (typeof orig !== 'function') return;
        app[name] = function wrapped(...args) {
            const out = orig.apply(this, args);
            try { after(args); } catch { /* ignore */ }
            Promise.resolve(out).finally(() => setTimeout(render, 50));
            return out;
        };
    };
    wrap('switchTab', ([tabId]) => { if (tabId === 'tab-rates') set(RATES_SEEN_KEY); });
    wrap('saveCurrentBillToHistory', () => {});
    wrap('upsertCustomerRecord', () => {});
    // The form changes with every key: move the coach along (cheap; no redraw of the card).
    const origCalc = app.calculateAndRender;
    if (typeof origCalc === 'function') {
        app.calculateAndRender = function coached(...args) {
            const out = origCalc.apply(this, args);
            try { coach(); } catch { /* ignore */ }
            return out;
        };
    }
    document.querySelectorAll('.b-nav-item[data-tab="tab-rates"]').forEach((b) => b.addEventListener('click', () => set(RATES_SEEN_KEY)));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    render();
}
