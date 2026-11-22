// "Make your first bill" checklist on the New Bill screen.
// Many new sign-ups never made a bill (admin console, Nov 2026), so until the first bill is
// saved, the New Bill screen shows the few steps that get there, each one tappable:
//   business name -> check your rates -> add a customer -> save the first bill.
// It goes away for good after the first bill (or "Hide").
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
            document.getElementById('quickCustSearchInput')?.focus();
            app.showToast?.('Pick a customer below, then enter the depth');
        }
    };

    const remove = () => {
        if (timer) { clearInterval(timer); timer = null; }
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
    document.querySelectorAll('.b-nav-item[data-tab="tab-rates"]').forEach((b) => b.addEventListener('click', () => set(RATES_SEEN_KEY)));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    render();
}
