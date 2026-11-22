// Owner's change list (22 Nov 2026, after v2.10.0), checked in a phone-sized browser:
//  C1 drilling depth stops at the last slab while typing, message + "Go to Rates"
//  C2 tapping the top bar (FINAL BILL · amount) opens the preview; the tag shows it can be tapped
//  C4 workers added on this phone show at once in Work details > Operator
//  C5 Work details is one row on the bill; the form opens on its own page
//  C6 first-bill coach: customer -> depth -> Preview -> Save
//   npm run build && npx vite preview --port 4173 ;  node e2e/changes.e2e.mjs
import { startHarness, wait } from './harness.mjs';

const { p, OUT, check, app, typeInto, clickId, step, freshCompany, finish } = await startHarness('changes');
const tip = () => app(() => { const t = document.querySelector('.fbg-tip'); return t ? `${t.dataset.step}:${t.textContent}` : ''; });

await freshCompany();
await app(() => window.boreBillApp.switchTab('tab-bill', false, false));
await wait(400);

await step('C6a coach starts at the customer (tip above the customer box)', async () => {
    const t = await tip();
    const where = await app(() => ({ next: document.querySelector('.fbg-tip')?.nextElementSibling?.className || '', box: Math.round(document.querySelector('.wiz-search-input-wrap')?.getBoundingClientRect().width || 0), coached: document.querySelector('.fbg-coach')?.className || '' }));
    // The tip sits above the whole search row, and the search box keeps its width.
    check('C6a coach starts at the customer (tip above the customer row, search box not squeezed)', /^1:.*customer/i.test(t) && /wiz-search-add-row/.test(where.next) && /wiz-search-input-wrap/.test(where.coached) && where.box > 120, { t, where });
});

await step('C2a the top bar before the bill is ready says what is missing', async () => {
    await app(() => document.querySelector('#stickyLiveBar .live-bar-top')?.click());
    await wait(300);
    const toast = await app(() => document.body.innerText);
    check('C2a the top bar before the bill is ready says what is missing', /first add the customer/.test(toast), toast.match(/To see the bill[^\n]*/)?.[0] || 'no message');
});

await step('C6b customer -> village / site -> depth -> Preview', async () => {
    // As a user does: a customer saved earlier, picked from the list (this opens the village box).
    await app(() => {
        const a = window.boreBillApp;
        a.customers = [{ id: 'c_coach', name: 'Coach Test', phone: '+91 98427 12345', countryCode: '+91', village: '', sites: [] }];
        a.saveToStorage('borebill_customers', a.customers);
        a.renderQuickCustomerList?.('');
        const card = [...document.querySelectorAll('#quickCustList button, #quickCustList [data-cust-id], #quickCustList .wiz-cust-card')].find((e) => /Coach Test/.test(e.textContent));
        if (card) card.click(); else a.selectCustomerIntoBill(a.customers[0]);
    });
    await wait(400);
    const t2 = await tip();
    await typeInto('custLocation', 'Salem');
    await wait(200);
    const t3 = await tip();
    await typeInto('totalDepth', '300');
    await wait(300);
    const t4 = await tip();
    check('C6b customer -> village / site -> depth -> Preview', /^2:.*village/i.test(t2) && /^3:.*depth/i.test(t3) && /^4:.*Preview/.test(t4), { t2, t3, t4 });
});

await step('C1 depth past the last slab is stopped while typing; message + Go to Rates', async () => {
    const limit = await app(() => window.boreBillApp.getBillDepthLimit());
    await app(() => { const e = document.getElementById('totalDepth'); e.focus(); e.value = ''; });
    await p.type('#totalDepth', String(limit + 500));
    await wait(200);
    const r = await app(() => ({ v: document.getElementById('totalDepth').value, msg: document.getElementById('depthLimitMsg')?.hidden === false ? document.getElementById('depthLimitMsg').innerText : '' , state: window.boreBillApp.state.totalDepth }));
    await p.screenshot({ path: `${OUT}/c1-depth.png` });
    await app(() => document.querySelector('#depthLimitMsg .depth-limit-btn')?.click());
    await wait(300);
    const onRates = await app(() => document.getElementById('tab-rates')?.classList.contains('active'));
    await app(() => window.boreBillApp.switchTab('tab-bill', false, false));
    await app(() => { const e = document.getElementById('totalDepth'); e.value = '300'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await wait(200);
    const gone = await app(() => document.getElementById('depthLimitMsg')?.hidden);
    check('C1 depth past the last slab is stopped while typing; message + Go to Rates',
        Number(r.v) === limit && r.state === limit && /past your slab rates/.test(r.msg) && /Go to Rates/.test(r.msg) && onRates && gone, { limit, r, onRates, gone });
});

await step('C2 the top bar opens the preview; the tag shows an eye and pulses', async () => {
    const tag = await app(() => document.getElementById('stickyDocTypeTag').className);
    await app(() => document.querySelector('#stickyLiveBar .live-bar-top')?.click());
    await wait(700);
    const open = await app(() => ({ open: !!window.boreBillApp.isBillPreviewOpen, shown: document.getElementById('billReceiptPreviewWrapper')?.offsetParent !== null }));
    const t5 = await tip();
    check('C2 the top bar opens the preview; the tag shows an eye and pulses', /has-preview/.test(tag) && /is-pulsing/.test(tag) && open.open && open.shown && /^5:.*Save/.test(t5), { tag, open, t5 });
});

await step('C5 Work details is one row on the bill; the form opens on its own page', async () => {
    const row = await app(() => { const c = document.getElementById('workCard'); return { hidden: c?.hidden, text: c?.innerText.replace(/\s+/g, ' '), selects: c?.querySelectorAll('select').length }; });
    await app(() => document.querySelector('#workCard .wk-open')?.click());
    await wait(400);
    const page = await app(() => ({ title: document.querySelector('.tt-sheet h2')?.textContent, selects: document.querySelectorAll('.tt-sheet select').length, done: !!document.querySelector('.tt-sheet .wk-done') }));
    await p.screenshot({ path: `${OUT}/c5-work-page.png` });
    check('C5 Work details is one row on the bill; the form opens on its own page', !row.hidden && /Work details/.test(row.text) && row.selects === 0 && page.title === 'Work details' && page.selects >= 3 && page.done, { row, page });
});

await step('C4 a worker added on this phone shows at once in Operator (page open)', async () => {
    const before = await app(() => [...document.querySelector('.tt-sheet select')?.options || []].map((o) => o.textContent));
    await app(() => window.boreBillApp.saveToStorage('borebill_workers', [{ id: 'w1', name: 'Kumar', code: 'OP-001', type: 'operator', status: 'active', rigId: null, wages: [] }]));
    await wait(300);
    const after = await app(() => [...document.querySelector('.tt-sheet select')?.options || []].map((o) => o.textContent));
    await app(() => { const s = document.querySelector('.tt-sheet select'); s.value = 'w1'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await app(() => document.querySelector('.tt-sheet .wk-done')?.click());
    await wait(300);
    const row = await app(() => document.querySelector('#workCard .wk-open-txt small')?.textContent);
    check('C4 a worker added on this phone shows at once in Operator (page open)', /No workers yet/.test(before.join()) && after.some((x) => /Kumar · OP-001/.test(x)) && /Kumar/.test(row || ''), { before, after, row });
});

await step('C6c after the first bill is saved the coach is gone', async () => {
    await clickId('saveBillHistoryBtn'); await wait(900);
    const t = await tip();
    const coached = await app(() => document.querySelectorAll('.fbg-coach').length);
    check('C6c after the first bill is saved the coach is gone', t === '' && coached === 0, { t, coached });
});

await finish();
