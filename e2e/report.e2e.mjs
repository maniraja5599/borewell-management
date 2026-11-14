// Report page (dashboard.html) check in a real phone-sized browser, on a demo company with
// 22 bills over 75 days. Every figure on screen is compared with the report maths run here.
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:report                                   (in another)
import { startHarness, wait, BASE } from './harness.mjs';
import { buildDemo } from './demoData.mjs';
import { rangeFor, inRange, billDay, isInvoice, summarize, topDues, paymentModes, depthBands, trend } from '../src/features/report/reportMath.js';

const { p, OUT, check, app, clickId, step, freshCompany, finish } = await startHarness('report');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

await freshCompany();
const seed = await app(() => {
    const a = window.boreBillApp;
    const std = a.rateProfiles.find((x) => x.isDefault) || a.rateProfiles[0];
    const hard = a.rateProfiles.find((x) => x.id !== std.id) || std;
    const phones = {};
    for (const raw of ['9876543210', '9443012345', '9842011223', '9790055667', '9600122334', '9944033445', '9488044556', '9566077889', '9025088990', '9361099001', '9894010203', '9751020304']) phones[raw] = a.formatPhoneWithCountryCode(raw);
    return { std, hard, phones };
});
const demo = buildDemo({ std: seed.std, hard: seed.hard, phone: (raw) => seed.phones[raw] });
await app((demo) => {
    const brand = JSON.parse(localStorage.getItem('borebill_brand'));
    brand.nextBillSeq = demo.nextBillSeq; brand.nextQuoteSeq = demo.nextQuoteSeq;
    localStorage.setItem('borebill_brand', JSON.stringify(brand));
    localStorage.setItem('borebill_customers', JSON.stringify(demo.customers));
    localStorage.setItem('borebill_history', JSON.stringify(demo.history));
}, demo);

const invoices = demo.history.filter(isInvoice);
const expectFor = (key) => {
    const r = rangeFor(key, today, {}, invoices);
    const inPeriod = invoices.filter((b) => inRange(billDay(b), r));
    return { r, inPeriod, s: summarize(inPeriod), prev: r.prev ? summarize(invoices.filter((b) => inRange(billDay(b), r.prev))) : null };
};
const screen = () => app(() => {
    const t = (id) => document.getElementById(id)?.textContent.trim() || '';
    const rows = (id) => [...document.querySelectorAll(`#${id} .rc-row`)].map((r) => r.querySelector('.rc-row-name span')?.textContent + ' | ' + r.querySelector('.rc-row-right strong')?.textContent);
    return {
        billed: t('kpiTotalBilled'), collected: t('kpiCollected'), due: t('kpiPendingDue'), pct: t('kpiCollectionRate'), delta: t('kpiBilledDelta'),
        period: t('periodLabel'), bores: t('kpiTotalBores'), feet: t('kpiTotalFeet'), avgBill: t('kpiAvgBill'), casing: t('kpiTotalCasing'),
        trendBars: document.querySelectorAll('#trendChart svg path').length, trendSub: t('trendSub'), trendNote: document.querySelector('#trendChart .rc-empty')?.textContent || '',
        tableRows: document.querySelectorAll('#trendChart .rc-table tr').length - 1,
        dues: rows('duesList'), modes: rows('modesList'), depth: rows('depthList'), modesSub: t('modesSub'),
        billRows: document.querySelectorAll('#boresMobileList .bore-item').length,
        hScroll: document.documentElement.scrollWidth > window.innerWidth + 1
    };
});
const pick = (range) => app((range) => document.querySelector(`#timePillGroup [data-range="${range}"]`).click(), range);

await p.goto(`${BASE}/dashboard.html`, { waitUntil: 'networkidle0' });
await wait(700);

await step('P1 this month', async () => {
    const e = expectFor('this_month');
    const s = await screen();
    check('P1 opens on This month: billed / collected / pending / % match the bills', s.billed === inr(e.s.billed) && s.collected === inr(e.s.collected) && s.due === inr(e.s.due) && s.pct === `${e.s.collectedPct}%`,
        { screen: [s.billed, s.collected, s.due, s.pct], expect: [inr(e.s.billed), inr(e.s.collected), inr(e.s.due), e.s.collectedPct] });
    const pct = e.prev?.billed ? Math.round(((e.s.billed - e.prev.billed) / e.prev.billed) * 100) : null;
    check('P1a comparison with the same days last month', pct === null ? /compare/.test(s.delta) : s.delta.includes(`${Math.abs(pct)}%`) && s.delta.includes(inr(e.prev.billed)), { delta: s.delta, pct });
    check('P1b tiles: bores, footage, average bill, casing', s.bores === String(e.s.bores) && s.feet === `${e.s.feet.toLocaleString('en-IN')} ft` && s.avgBill === inr(e.s.avgBill) && s.casing === `${(e.s.pvc7 + e.s.pvc10).toLocaleString('en-IN')} ft`,
        { screen: [s.bores, s.feet, s.avgBill, s.casing] });
    const t = trend(invoices, e.r);
    const expectBars = t.buckets.reduce((n, b) => n + (b.billed > 0) + (b.received > 0), 0);
    check('P1c trend: one bar per billed / received amount, numbers table lists the active days', s.trendBars === expectBars && s.trendSub === 'By day' && s.tableRows === t.buckets.filter((b) => b.billed || b.received || b.bores).length,
        { bars: s.trendBars, expectBars, sub: s.trendSub, tableRows: s.tableRows });
    const dues = topDues(e.inPeriod, 5).map((x) => `${x.name} | ${inr(x.due)}`);
    const modes = paymentModes(invoices, e.r);
    const got = modes.reduce((a, m) => a + m.amount, 0);
    check('P1d lists: who owes, how paid (with its total), bores by depth', JSON.stringify(s.dues) === JSON.stringify(dues)
        && JSON.stringify(s.modes) === JSON.stringify(modes.map((m) => `${m.mode} | ${inr(m.amount)} · ${Math.round((m.amount / got) * 100)}%`))
        && s.modesSub.startsWith(inr(got)) && JSON.stringify(s.depth.map((x) => x.split(' | ')[1])) === JSON.stringify(depthBands(e.inPeriod).map((b) => `${b.bores} ${b.bores === 1 ? 'bore' : 'bores'}`)),
        { dues: s.dues, modes: s.modes, modesSub: s.modesSub, depth: s.depth });
    check('P1e bills list = bills in the period; no sideways scroll on a phone', s.billRows === e.inPeriod.length && !s.hScroll, { rows: s.billRows, expect: e.inPeriod.length, hScroll: s.hScroll });
    await p.screenshot({ path: `${OUT}/report_month.png`, fullPage: true });
});

await step('P2 tooltip', async () => {
    const r = await app(() => {
        const hit = [...document.querySelectorAll('#trendChart .rc-hit')].find((h) => /Billed ₹[1-9]/.test(h.getAttribute('aria-label')));
        hit?.dispatchEvent(new Event('focus'));
        const tip = document.querySelector('#trendChart .rc-tip');
        return { label: hit?.getAttribute('aria-label'), shown: tip && !tip.hidden, text: tip?.textContent };
    });
    check('P2 tapping / focusing a day shows billed + received for that day', r.shown && /Billed/.test(r.text) && /Received/.test(r.text) && /bore/.test(r.text), r);
    await p.screenshot({ path: `${OUT}/report_tooltip.png` });
});

for (const [key, name] of [['7d', 'P3 7 days'], ['last_month', 'P4 last month'], ['all', 'P5 all time']]) {
    await step(name, async () => {
        await pick(key); await wait(400);
        const e = expectFor(key);
        const s = await screen();
        const size = trend(invoices, e.r).size;
        check(`${name}: totals match and the trend steps by ${size}`, s.billed === inr(e.s.billed) && s.due === inr(e.s.due) && s.bores === String(e.s.bores) && s.billRows === e.inPeriod.length
            && s.trendSub.toLowerCase().includes(size),
            { screen: [s.billed, s.due, s.bores, s.trendSub], expect: [inr(e.s.billed), inr(e.s.due), e.s.bores, size] });
        if (key === 'all') await p.screenshot({ path: `${OUT}/report_all.png`, fullPage: true });
    });
}

await step('P6 today', async () => {
    await pick('today'); await wait(400);
    const e = expectFor('today');
    const s = await screen();
    check('P6 today: totals match, trend asks for a longer period (no one-bar chart)', s.billed === inr(e.s.billed) && /Choose 7 days/.test(s.trendNote) && s.trendBars === 0, { billed: s.billed, note: s.trendNote });
});

await step('P7 custom', async () => {
    await pick('custom'); await wait(300);
    const pre = await app(() => [document.getElementById('dashStartDate').value, document.getElementById('dashEndDate').value]);
    check('P7 custom starts filled with the period being viewed', pre[0] === today && pre[1] === today, pre);
    await app(() => { document.getElementById('dashStartDate').value = ''; document.getElementById('dashEndDate').value = ''; });
    const start = invoices.map(billDay).sort()[0];
    await app((s, t) => { document.getElementById('dashStartDate').value = s; document.getElementById('dashEndDate').value = t; }, start, today);
    await clickId('applyCustomDateBtn'); await wait(400);
    const s = await screen();
    const all = summarize(invoices);
    check('P7a custom range over every bill = all-time totals', s.billed === inr(all.billed) && s.due === inr(all.due), { billed: s.billed, expect: inr(all.billed) });
});

await step('P8 WhatsApp report', async () => {
    await pick('this_month'); await wait(400);
    await clickId('oneTapWhatsAppQuickBtn'); await wait(300);
    const txt = await app(() => document.getElementById('waPreviewContent').textContent);
    const e = expectFor('this_month');
    check('P8 WhatsApp report names the period and its totals', txt.includes('THIS MONTH') && txt.includes(inr(e.s.billed)) && txt.includes(inr(e.s.due)), txt.slice(0, 200));
    await clickId('closeModalBtn');
});

await finish();
