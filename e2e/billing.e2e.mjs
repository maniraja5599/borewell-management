// Billing top-to-bottom check in a real browser, driven like a user. All cloud traffic is blocked,
// so it never touches real data. Run before a release:
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:billing                                  (in another)
// Needs Google Chrome; set CHROME_PATH if it is not in the default Windows location.
import fs from 'node:fs';
import { computeBillTotals } from '../src/core/slabEngine.js';
import { startHarness, wait, BASE } from './harness.mjs';

const { p, OUT, DL, check, app, typeInto, clickId, text, step, freshCompany, finish } = await startHarness('billing');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

// ---------- fresh company ----------
await freshCompany();

// ---------- 0. header on a brand-new company ----------
await step('0 header keeps the company name', async () => {
    await wait(9000); // two turns of the 4.2 s header rotator
    const h = await app(() => { const s = document.getElementById('marqueeSlide0'); return { text: s?.textContent.trim(), op: s ? getComputedStyle(s).opacity : '0', cls: s?.className }; });
    check('0 new company: header keeps showing the company name (no bills = no rotation)', h.text === 'Sri Murugan Borewells' && h.op === '1', h);
});

// ---------- 1. customer ----------
await step('1 add customer from the bill screen', async () => {
    const opened = await clickId('headerAddCustPopupBtn') || await clickId('pickerAddCustPopupBtn');
    await wait(400);
    await typeInto('crmCustName', 'Ravi Kumar');
    await typeInto('crmCustPhone', '9876543210');
    await typeInto('crmCustVillage', 'Salem');
    await clickId('saveCrmCustomerBtn');
    await wait(600);
    const s = await app(() => ({ name: window.boreBillApp.state.custName, phone: window.boreBillApp.state.custPhone, customers: window.boreBillApp.customers.length }));
    check('1 add customer from the bill screen', opened && s.customers === 1 && s.name === 'Ravi Kumar', s);
});

// ---------- 2. bill entry ----------
await step('2 typed values reach the bill', async () => {
    await typeInto('totalDepth', 450);
    await typeInto('pvc7Length', 60);
    await typeInto('pvc10Length', 20);
    await clickId('extraChargesToggleBtn'); await wait(300);
    await typeInto('collarCapCost', 1500);
    await typeInto('discountAmount', 1000);
    await typeInto('advancePaidAmount', 20000);
    await wait(400);
    const st = await app(() => { const a = window.boreBillApp; return { state: a.state, rates: a.rates, res: a.lastResult }; });
    check('2 typed values reach the bill', st.state.totalDepth === 450 && st.state.pvc7Length === 60 && st.state.pvc10Length === 20 && st.state.collarCapCost === 1500 && st.state.discountAmount === 1000 && st.state.advancePaidAmount === 20000,
        { depth: st.state.totalDepth, p7: st.state.pvc7Length, p10: st.state.pvc10Length, collar: st.state.collarCapCost, disc: st.state.discountAmount, adv: st.state.advancePaidAmount });
    // Hand calculation (default rates): 300×90 + 100×100 + 50×120 = 43,000 drilling
    const r = st.res;
    check('2a drilling 450 ft = ₹43,000 (hand-calculated)', r.drillingCost === 43000, r.drillingCost);
    check('2b total = ₹83,500, balance ₹63,500 (hand-calculated)', r.grandTotal === 83500 && r.balancePayable === 63500, { total: r.grandTotal, bal: r.balancePayable, bata: r.boreBataCost });
    const engine = computeBillTotals(st.rates, st.state);
    check('2c screen result = billing engine', engine.grandTotal === r.grandTotal && engine.balancePayable === r.balancePayable);
    const banner = await text('liveTotalBannerAmount');
    const cta = await text('previewBtnLiveTotal');
    check('2d live total banner + preview button show ₹83,500', banner.includes('83,500') && cta.includes('83,500'), { banner, cta });
    const v3 = await app(() => {
        const vis = (id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null && e.getBoundingClientRect().width > 0; };
        const r = (id) => document.getElementById(id)?.getBoundingClientRect();
        const fresh = r('freshBillCtaBtn');
        const prev = r('openBillPreviewBtn');
        return {
            on: document.documentElement.classList.contains('ui-v3'),
            meta: document.getElementById('stickyBillMeta')?.textContent || '',
            fresh: vis('freshBillCtaBtn'), preview: vis('openBillPreviewBtn'),
            sameRow: !!(fresh && prev) && Math.abs(fresh.top - prev.top) < 2,
            inside: !!prev && prev.right <= window.innerWidth,
            hScroll: document.documentElement.scrollWidth > window.innerWidth + 1
        };
    });
    check('2e new look: top strip shows #SM-101 · date; New bill sits beside Preview; no sideways scroll',
        v3.on && /#SM-101 · \d{2} \w{3} \d{4}/.test(v3.meta) && v3.fresh && v3.preview && v3.sameRow && v3.inside && !v3.hScroll, v3);
    await p.screenshot({ path: `${OUT}/b1_entry.png`, fullPage: true });
});

// ---------- 3. preview / receipt ----------
await step('3 receipt preview', async () => {
    await clickId('openBillPreviewBtn'); await wait(700);
    const rc = await app(() => {
        const t = (id) => document.getElementById(id)?.textContent.replace(/\s+/g, ' ').trim() || '';
        const slabAmts = [...document.querySelectorAll('#receiptSlabRows .r-slab-amt, #receiptSlabRows [class*="amt"]')].map((e) => e.textContent);
        return {
            billNo: t('receiptBillNo'), cust: t('receiptCustomerBox'), depth: t('rcptTotalDepth'), drill: t('rcptDrillingTotal'),
            p7: t('rcptPvc7Amount'), p10: t('rcptPvc10Amount'), bata: t('rcptBataAmount'), collar: t('rcptCollarAmount'),
            sub: t('rcptSubtotal'), disc: t('rcptDiscountAmount'), grand: t('rcptGrandTotal'), adv: t('rcptAdvanceAmount'), bal: t('rcptBalanceAmount'),
            company: t('receiptCompanyName'), slabRows: document.querySelectorAll('#receiptSlabRows > *').length, slabAmts,
            qr: !!document.querySelector('#billReceiptPreviewWrapper canvas, #billReceiptPreviewWrapper img[src^="data:image"]'),
            visible: document.getElementById('billReceiptPreviewWrapper')?.offsetParent !== null
        };
    });
    check('3 receipt preview opens with the right numbers', rc.visible && rc.billNo.includes('SM-101') && rc.cust.includes('Ravi Kumar')
        && rc.drill.includes('43,000') && rc.p7.includes('24,000') && rc.p10.includes('14,000') && rc.bata.includes('2,000')
        && rc.collar.includes('1,500') && rc.sub.includes('84,500') && rc.disc.includes('1,000') && rc.grand.includes('83,500')
        && rc.adv.includes('20,000') && rc.bal.includes('63,500'), rc);
    check('3a receipt shows slab breakup rows and UPI QR', rc.slabRows >= 3 && rc.qr, { slabRows: rc.slabRows, qr: rc.qr });
    const ft = await app(() => {
        const a = document.getElementById('rcptDrillrigLink');
        const r = a?.getBoundingClientRect();
        return { tag: a?.tagName, href: a?.href || '', target: a?.target, text: a?.textContent.replace(/\s+/g, ' ').trim() || '', h: r ? Math.round(r.height) : 0, w: r ? Math.round(r.width) : 0 };
    });
    check('3b bill footer "Made with DrillRig" opens WhatsApp to 83000 30123', ft.tag === 'A' && ft.href.startsWith('https://wa.me/918300030123?text=') && ft.target === '_blank'
        && /Made with DrillRig/.test(ft.text) && /83000 30123/.test(ft.text) && !/Powered by/i.test(ft.text) && ft.h >= 16, ft);
    await p.screenshot({ path: `${OUT}/b2_receipt.png`, fullPage: true });
});

// ---------- 4. save ----------
await step('4 save bill', async () => {
    await clickId('saveBillHistoryBtn'); await wait(900);
    const h = await app(() => ({ n: window.boreBillApp.history.length, b: window.boreBillApp.history[0], share: document.getElementById('postSaveShareContainer')?.offsetParent !== null, date: document.getElementById('billDateInput')?.value }));
    const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    check('4 save: one bill #SM-101, share buttons shown', h.n === 1 && h.b.billNo === 'SM-101' && h.share, { n: h.n, billNo: h.b?.billNo, share: h.share });
    check('4a saved bill: total, advance payment, customer link, local date', h.b.snapshot.grandTotal === 83500 && h.b.payments?.[0]?.amount === 20000 && !!h.b.customerId && h.b.billDate === today,
        { total: h.b.snapshot.grandTotal, payments: h.b.payments, customerId: h.b.customerId, billDate: h.b.billDate, today });
});

// ---------- 5. share: WhatsApp / PDF / image ----------
await step('5 WhatsApp message', async () => {
    await clickId('shareWhatsappBtn'); await wait(700);
    const wa = await app(() => ({ open: getComputedStyle(document.getElementById('whatsappPreviewModalOverlay')).display !== 'none', msg: document.getElementById('waPreviewMessageInput')?.value || '', phone: document.getElementById('waPreviewPhoneInput')?.value }));
    check('5 WhatsApp preview: bill no, total, balance, UPI, customer phone', wa.open && wa.msg.includes('SM-101') && wa.msg.includes('83,500') && wa.msg.includes('63,500') && wa.msg.includes('murugan@okaxis') && /9876543210/.test(wa.phone || ''),
        { open: wa.open, phone: wa.phone, msgStart: wa.msg.slice(0, 160) });
    await clickId('cancelWaPreviewBtn'); await wait(300);
});
await step('5a PDF download', async () => {
    await clickId('downloadPdfBtn'); await wait(5000);
    const pdf = fs.readdirSync(DL).filter((f) => f.endsWith('.pdf'));
    const size = pdf[0] ? fs.statSync(`${DL}/${pdf[0]}`).size : 0;
    check('5a PDF downloads (A4 receipt)', pdf.length === 1 && size > 20000, { files: fs.readdirSync(DL), size });
    const raw = pdf[0] ? fs.readFileSync(`${DL}/${pdf[0]}`, 'latin1') : '';
    check('5a PDF footer is a tappable WhatsApp link', /\/URI\s*\(https:\/\/wa\.me\/918300030123\?text=/.test(raw), raw.match(/\/URI[^>]{0,80}/)?.[0] || 'no link');
});
await step('5b image download', async () => {
    await clickId('downloadImageBtn'); await wait(5000);
    const png = fs.readdirSync(DL).filter((f) => /\.(png|jpe?g)$/.test(f));
    const iosModal = await app(() => document.getElementById('iosImageSaveModal')?.style.display);
    check('5b image downloads', png.length >= 1, { files: fs.readdirSync(DL), iosModal });
});

// ---------- 6. payments ----------
await step('6 record payments', async () => {
    await app(() => window.boreBillApp.switchTab('tab-history')); await wait(500);
    await app(() => document.querySelector('.hist-record-pay-btn')?.click()); await wait(500);
    await typeInto('rpmAmountInput', 10000);
    await app(() => document.querySelector('#rpmModePills [data-mode="UPI"]')?.click());
    await clickId('rpmSavePaymentBtn'); await wait(600);
    let b1 = await app(() => { const a = window.boreBillApp; const b = a.history[0]; return { paid: a.getBillPaidAmount(b), due: a.getBillPendingAmount(b), modes: b.payments.map((x) => x.mode), dueBox: document.getElementById('rpmBalanceDueVal')?.textContent }; });
    check('6 part payment ₹10,000 (UPI): paid ₹30,000, due ₹53,500', b1.paid === 30000 && b1.due === 53500 && b1.modes.includes('UPI'), b1);
    await clickId('rpmFillFullBalanceBtn'); await wait(200);
    const filled = await app(() => document.getElementById('rpmAmountInput').value);
    await clickId('rpmSavePaymentBtn'); await wait(600);
    b1 = await app(() => { const a = window.boreBillApp; const b = a.history[0]; return { paid: a.getBillPaidAmount(b), due: a.getBillPendingAmount(b), unpaid: a.isBillItemUnpaid(b) }; });
    check('6a "full balance" fills ₹53,500 and settles the bill', String(filled).replace(/\D/g, '') === '53500' && b1.due === 0 && !b1.unpaid, { filled, ...b1 });
    await p.keyboard.press('Escape');
    await app(() => { const o = document.getElementById('recordPaymentModalOverlay') || document.querySelector('[id*="rpm"][class*="overlay"]'); if (o) o.style.display = 'none'; window.boreBillApp.closeRecordPaymentModal?.(); });
    await wait(300);
    const card = await app(() => document.querySelector('.khata-card')?.innerText.replace(/\s+/g, ' '));
    check('6b bill book shows the bill as Paid', /Paid/.test(card || ''), card);
});

// ---------- 7. edit a saved bill ----------
await step('7 edit saved bill', async () => {
    await app(() => window.boreBillApp.loadBillFromHistory(window.boreBillApp.history[0].id, false, true)); await wait(800);
    await typeInto('totalDepth', 500); await wait(400);
    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const e = await app(() => { const a = window.boreBillApp; const b = a.history[0]; return { n: a.history.length, billNo: b.billNo, depth: b.snapshot.totalDepth, total: b.snapshot.grandTotal, payments: b.payments.length, due: a.getBillPendingAmount(b) }; });
    // 500 ft: 300×90 + 100×100 + 100×120 = 49,000 → total 89,500; paid 83,500 → due 6,000
    check('7 edit keeps number + payments, re-prices: 500 ft → ₹89,500, now due ₹6,000', e.n === 1 && e.billNo === 'SM-101' && e.depth === 500 && e.total === 89500 && e.payments === 3 && e.due === 6000, e);
});

// ---------- 8. quotation → final bill ----------
await step('8 quotation then convert', async () => {
    await app(() => window.boreBillApp.switchTab('tab-bill'));
    await clickId('startFreshNewBillBtn') || await clickId('freshBillQuickBtn'); await wait(600);
    await app(() => document.querySelector('.b-nav-item[data-tab="tab-bill"]')?.click());
    const picked = await app(() => {
        const card = [...document.querySelectorAll('#quickCustList [data-cust-id], #quickCustList [data-id], #quickCustList .wiz-cust-card, #quickCustList button')].find((e) => /Ravi/.test(e.textContent));
        if (card) { card.click(); return 'card'; }
        const a = window.boreBillApp; a.selectCustomerIntoBill(a.customers[0]); return 'method';
    });
    await wait(400);
    check('8 pick the saved customer from the customer cards', (await app(() => window.boreBillApp.state.custName)) === 'Ravi Kumar', picked);
    await app(() => document.querySelector('#docTypePills [data-doc="QUOTATION"]')?.click()); await wait(300);
    // Leave and come back with the quotation half-typed: it must stay a quotation.
    await app(() => document.querySelector('.b-nav-item[data-tab="tab-customers"]')?.click()); await wait(200);
    await app(() => document.querySelector('.b-nav-item[data-tab="tab-bill"]')?.click()); await wait(300);
    await typeInto('totalDepth', 300); await wait(300);
    const qNo = await app(() => document.getElementById('billNoInput').value);
    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const q = await app(() => { const h = window.boreBillApp.history; return h.map((x) => `${x.billNo}:${x.snapshot.docType}`); });
    check('8 quotation saved as #SM-Q101', qNo === 'SM-Q101' && q.includes('SM-Q101:QUOTATION'), { qNo, q });
    const qId = await app(() => window.boreBillApp.history.find((x) => x.billNo === 'SM-Q101').id);
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), qId); await wait(700);
    await app(() => document.querySelector('#docTypePills [data-doc="INVOICE"]')?.click()); await wait(300);
    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const conv = await app((id) => { const b = window.boreBillApp.history.find((x) => x.id === id); return { billNo: b.billNo, doc: b.snapshot.docType, n: window.boreBillApp.history.length }; }, qId);
    check('8a converting it to a Final Bill gives the next bill number #SM-102', conv.billNo === 'SM-102' && conv.doc === 'INVOICE' && conv.n === 2, conv);
});

// ---------- 9. re-bore + GST ----------
await step('9 re-bore with GST', async () => {
    await p.click('#freshBillCtaBtn').catch(() => clickId('freshBillQuickBtn')); await wait(500);
    check('9 New bill (next to Preview) clears the depth', (await app(() => document.getElementById('totalDepth').value)) === '', await app(() => document.getElementById('totalDepth').value));
    await app(() => document.querySelector('#drillingTypeToggle [data-type="repair"]')?.click()); await wait(300);
    await typeInto('oldBoreDepth', 200);
    await typeInto('totalDepth', 400);
    await app(() => { const t = document.getElementById('gstEnabledToggle'); if (t && !t.checked) t.click(); }); await wait(400);
    const r = await app(() => { const a = window.boreBillApp; return { res: a.lastResult, state: a.state, rates: a.rates }; });
    const engine = computeBillTotals(r.rates, r.state);
    // flushing 200×40 = 8,000; new 201-300 @90 = 9,000, 301-400 @100 = 10,000 → drilling 27,000 (+bata 2,000) = 29,000; GST 18% = 5,220
    check('9 re-bore 200→400 ft with 18% GST = ₹34,220 and matches engine', r.state.drillingType === 'repair' && r.state.gstEnabled
        && r.res.grandTotal === engine.grandTotal && r.res.gstAmount === Math.round(r.res.grossSubtotal * 0.18), { total: r.res.grandTotal, drill: r.res.drillingCost, gst: r.res.gstAmount, sub: r.res.grossSubtotal });
    check('9a re-bore hand check', r.res.drillingCost === 27000 && r.res.grandTotal === 34220, { drill: r.res.drillingCost, total: r.res.grandTotal });
});

// ---------- 10. customer ledger + dashboard ----------
await step('10 customer ledger', async () => {
    await app(() => window.boreBillApp.switchTab('tab-customers')); await wait(600);
    const l = await app(() => ({ billed: document.getElementById('crmTotalBilled')?.textContent, pending: document.getElementById('crmTotalPending')?.textContent }));
    // SM-101 ₹89,500 (due 6,000) + SM-102 (300 ft: 27,000 + bata 2,000 = 29,000, unpaid)
    check('10 ledger totals: billed ₹1,18,500, pending ₹35,000', (l.billed || '').includes('1,18,500') && (l.pending || '').includes('35,000'), l);
    await app(() => window.boreBillApp.switchTab('tab-history')); await wait(500);
    const t = await app(() => ({ billed: document.getElementById('histTotalBilled')?.textContent, received: document.getElementById('histTotalReceived')?.textContent, due: document.getElementById('histTotalDue')?.textContent, shown: document.getElementById('historyTotalsStrip')?.offsetParent !== null }));
    // received = 1,18,500 billed − 35,000 due
    check('10b Bills page totals: billed ₹1,18,500, received ₹83,500, due ₹35,000', t.shown && (t.billed || '').includes('1,18,500') && (t.received || '').includes('83,500') && (t.due || '').includes('35,000'), t);
    await app(() => window.boreBillApp.switchTab('tab-customers')); await wait(300);
});

// ---------- 11. delete + undo ----------
await step('11 delete + undo', async () => {
    await app(() => window.boreBillApp.switchTab('tab-history')); await wait(400);
    await app(() => document.querySelector('.hist-del-btn')?.click()); await wait(400);
    await clickId('confirmDelActionBtn'); await wait(500);
    const after = await app(() => window.boreBillApp.history.length);
    await app(() => document.querySelector('.toast-undo-btn')?.click()); await wait(500);
    const restored = await app(() => window.boreBillApp.history.length);
    check('11 delete asks to confirm, removes, and Undo brings it back', after === 1 && restored === 2, { after, restored });
});

// ---------- 12. survives reload ----------
await step('12 reload', async () => {
    await p.reload({ waitUntil: 'networkidle0' }); await wait(800);
    const r = await app(() => ({ bills: window.boreBillApp.history.map((h) => h.billNo).sort(), customers: window.boreBillApp.customers.length, nextNo: document.getElementById('billNoInput')?.value }));
    check('12 after reload: bills + customer kept, next number continues', JSON.stringify(r.bills) === '["SM-101","SM-102"]' && r.customers === 1 && /^SM-(103|Q102)$/.test(r.nextNo || ''), r);
});

// ---------- 12b. Settings: "Coming soon" tiles ----------
await step('12b coming soon', async () => {
    await app(() => document.querySelector('.b-nav-item[data-tab="tab-brand"]')?.click()); await wait(400);
    const c = await app(() => {
        const card = document.getElementById('comingSoonCard');
        const tiles = [...(card?.querySelectorAll('.cs-tile') || [])];
        return {
            shown: !!card && card.getBoundingClientRect().height > 100,
            names: tiles.map((t) => t.querySelector('.cs-name').textContent),
            links: tiles.every((t) => t.href.startsWith('https://wa.me/918300030123?text=') && t.target === '_blank'),
            art: tiles.every((t) => t.querySelector('.cs-art svg linearGradient, .cs-art svg radialGradient')),
            badges: tiles.filter((t) => /Coming soon/.test(t.textContent)).length,
            sideScroll: document.documentElement.scrollWidth > innerWidth
        };
    });
    check('12b Settings shows 4 "Coming soon" tiles with 3D icons; each opens WhatsApp', c.shown && c.names.join('|') === 'Expenses|Staff|Stock|Profit & Loss'
        && c.links && c.art && c.badges === 4 && !c.sideScroll, c);
});

// ---------- 12c. other items in the casing card + discount while recording a payment ----------
await step('12c other items + payment discount', async () => {
    await app(() => window.boreBillApp.switchTab('tab-bill')); await wait(400);
    await p.click('#freshBillCtaBtn').catch(() => clickId('freshBillQuickBtn')); await wait(500);
    await app(() => { const a = window.boreBillApp; a.selectCustomerIntoBill(a.customers[0]); }); await wait(400);
    await typeInto('totalDepth', 100); await wait(300);
    await app(() => document.getElementById('addExtraItemBtn').click()); await wait(300);
    await p.type('#extraItemsList .ei-row .ei-name', '8" MS pipe');
    await p.type('#extraItemsList .ei-row .ei-qty', '40');
    await p.type('#extraItemsList .ei-row .ei-rate', '550'); await wait(400);
    const live = await app(() => {
        const a = window.boreBillApp; const r = a.lastResult;
        return { items: r.extraItemsCost, total: r.grandTotal, badge: document.getElementById('liveInlineCasingTotalBadge')?.textContent,
            rowAmt: document.querySelector('#extraItemsList .ei-amt')?.textContent, rcpt: document.getElementById('rcptExtraItemRows')?.innerText.replace(/\s+/g, ' ').trim(),
            title: document.querySelector('#progCasingSection .step-t')?.textContent };
    });
    // 100 ft × 90 = 9,000 + bata 2,000 + 40 ft × 550 = 22,000 → 33,000
    check('12c "Add other item": 8" MS pipe 40 ft × ₹550 = ₹22,000; bill ₹33,000; shown on the bill',
        live.items === 22000 && live.total === 33000 && /22,000/.test(live.rowAmt || '') && /22,000/.test(live.badge || '')
        && /8" MS pipe \(40 ft × ₹550\/ft\)/.test(live.rcpt || '') && /other items/i.test(live.title || ''), live);
    const wa = await app(() => { const a = window.boreBillApp; return a.buildCleanBillWhatsAppMessage({ billNo: 'X', billDate: '2026-11-15', custName: 'Ravi Kumar', custPhone: '', custLocation: '', custGst: '', res: a.lastResult }); });
    if (wa) check('12c WhatsApp text lists the item', /8" MS pipe \(40 ft × ₹550\/ft\) : \*₹22,000\*/.test(wa), wa.slice(0, 300));

    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const saved = await app(() => { const b = window.boreBillApp.history[0]; return { no: b.billNo, items: b.snapshot.extraItems, total: b.snapshot.grandTotal }; });
    check('12c saved bill keeps the item (#SM-103, ₹33,000)', saved.no === 'SM-103' && saved.total === 33000 && saved.items?.length === 1 && saved.items[0].amount === 22000, saved);

    // Payment ₹30,000 + "give the rest as discount" (₹3,000) settles the bill.
    const id = await app(() => window.boreBillApp.history[0].id);
    await app((bid) => window.boreBillApp.openRecordPaymentModal(bid), id); await wait(400);
    await p.type('#rpmAmountInput', '30000'); await wait(250);
    const hint = await app(() => { const b = document.getElementById('rpmSettleBtn'); return { shown: !b.hidden, text: b.textContent }; });
    check('12c typing ₹30,000 offers "₹3,000 still left — give it as discount"', hint.shown && /3,000 still left/.test(hint.text), hint);
    await clickId('rpmSettleBtn'); await wait(200);
    const discVal = await app(() => document.getElementById('rpmDiscountInput').value);
    await clickId('rpmSavePaymentBtn'); await wait(600);
    const b = await app((bid) => { const a = window.boreBillApp; const x = a.history.find((h) => h.id === bid);
        return { paid: a.getBillPaidAmount(x), due: a.getBillPendingAmount(x), total: x.snapshot.grandTotal, before: x.snapshot.totalBeforePaymentDiscount, pd: x.snapshot.paymentDiscount, status: x.paymentStatus,
            list: document.getElementById('rpmHistoryList')?.innerText.replace(/\s+/g, ' '), note: document.getElementById('rpmDiscountGivenNote')?.textContent }; }, id);
    b.disc = discVal;
    check('12c payment ₹30,000 + ₹3,000 discount: received ₹30,000, bill ₹33,000 → ₹30,000, due ₹0, Paid',
        String(discVal) === '3000' && b.paid === 30000 && b.due === 0 && b.total === 30000 && b.before === 33000 && b.pd === 3000 && b.status === 'paid'
        && /30,000 \+ ₹3,000 discount/.test(b.list || '') && /33,000 − ₹3,000 discount = ₹30,000/.test(b.note || ''), b);
    await app(() => window.boreBillApp.closeRecordPaymentModal()); await wait(200);

    // Same numbers everywhere: Bills totals, customer totals, bill popup, report data.
    await app(() => window.boreBillApp.switchTab('tab-history')); await wait(500);
    const t = await app(() => ({ billed: document.getElementById('histTotalBilled')?.textContent, received: document.getElementById('histTotalReceived')?.textContent, due: document.getElementById('histTotalDue')?.textContent }));
    check('12c Bills totals add up: billed ₹1,48,500 = received ₹1,13,500 + due ₹35,000',
        /1,48,500/.test(t.billed || '') && /1,13,500/.test(t.received || '') && /35,000/.test(t.due || ''), t);
    await app(() => window.boreBillApp.switchTab('tab-customers')); await wait(500);
    const l = await app(() => ({ billed: document.getElementById('crmTotalBilled')?.textContent, pending: document.getElementById('crmTotalPending')?.textContent }));
    check('12c customer totals match: billed ₹1,48,500, pending ₹35,000', /1,48,500/.test(l.billed || '') && /35,000/.test(l.pending || ''), l);
    await app((bid) => window.boreBillApp.openBillDetailModal(bid), id); await wait(400);
    const pop = await app(() => document.getElementById('billDetailModalOverlay')?.innerText.replace(/\s+/g, ' ') || '');
    check('12c bill popup shows the item, "Discount on payment −₹3,000", total ₹30,000 and the payment line',
        /8" MS pipe/.test(pop) && /Discount on payment −₹3,000/.test(pop) && /₹30,000 \+ ₹3,000 discount/.test(pop) && /Settled|₹0/.test(pop), pop.slice(0, 600));
    await app(() => { const o = document.getElementById('billDetailModalOverlay'); if (o) o.style.display = 'none'; window.boreBillApp.activeDetailBillId = null; });

    // Open + re-save the bill: the discount and items stay, nothing drifts.
    await app((bid) => window.boreBillApp.loadBillFromHistory(bid, false, true), id); await wait(700);
    const ed = await app(() => ({ rows: document.querySelectorAll('#extraItemsList .ei-row').length, name: document.querySelector('#extraItemsList .ei-name')?.value,
        total: window.boreBillApp.lastResult.grandTotal, payDiscRow: document.getElementById('rcptPayDiscountRow')?.style.display, gt: document.getElementById('rcptGrandTotal')?.textContent }));
    check('12c reopening the bill restores the item row and shows "Discount on payment" (total ₹30,000)',
        ed.rows === 1 && ed.name === '8" MS pipe' && ed.total === 30000 && ed.payDiscRow === 'flex' && /30,000/.test(ed.gt || ''), ed);
    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const re = await app((bid) => { const a = window.boreBillApp; const x = a.history.find((h) => h.id === bid); return { total: x.snapshot.grandTotal, due: a.getBillPendingAmount(x), pd: x.snapshot.paymentDiscount, items: x.snapshot.extraItems?.length }; }, id);
    check('12c re-saving keeps ₹30,000 total, ₹3,000 discount, due ₹0', re.total === 30000 && re.due === 0 && re.pd === 3000 && re.items === 1, re);

    // A new bill after it starts clean (no items, no payment discount).
    await p.click('#freshBillCtaBtn').catch(() => clickId('freshBillQuickBtn')); await wait(500);
    const clean = await app(() => ({ rows: document.querySelectorAll('#extraItemsList .ei-row').length, pd: window.boreBillApp.state.paymentDiscount, items: (window.boreBillApp.state.extraItems || []).length }));
    check('12c "New bill" starts without items or payment discount', clean.rows === 0 && !clean.pd && clean.items === 0, clean);
});

// ---------- 12d. Record payment: paid bill locked, Full due + discount, over-balance blocked ----------
await step('12d record payment checks', async () => {
    const ids = await app(() => { const a = window.boreBillApp; const paid = a.history.find((b) => b.billNo === 'SM-103'); const due = a.history.find((b) => b.billNo === 'SM-102'); return { paid: paid.id, due: due.id, pending: a.getBillPendingAmount(due) }; });
    await app((id) => window.boreBillApp.openRecordPaymentModal(id), ids.paid); await wait(300);
    const locked = await app(() => ({ form: document.getElementById('rpmAddPaymentFormCard').hidden, note: !document.getElementById('rpmPaidNote').hidden }));
    check('12d a fully paid bill shows "Fully paid" and no payment form', locked.form && locked.note, locked);
    await app(() => window.boreBillApp.closeRecordPaymentModal());

    await app((id) => window.boreBillApp.openRecordPaymentModal(id), ids.due); await wait(300);
    await clickId('rpmFillFullBalanceBtn'); await wait(150);
    const full = await app(() => document.getElementById('rpmAmountInput').value);
    await clickId('rpmDiscountToggleBtn'); await wait(100);
    await p.type('#rpmDiscountInput', '2000'); await wait(200);
    const after = await app(() => ({ amt: document.getElementById('rpmAmountInput').value, line: document.getElementById('rpmCheckLine').textContent, btn: !document.getElementById('rpmSavePaymentBtn').disabled }));
    check(`12d "Full due" fills ${inr(ids.pending)}; a ₹2,000 discount lowers it to ${inr(ids.pending - 2000)} and the check says it closes the bill`,
        Number(full) === ids.pending && Number(after.amt) === ids.pending - 2000 && /closes the bill/.test(after.line) && after.btn, { full, ...after });
    await app(() => { const e = document.getElementById('rpmAmountInput'); e.value = '999999'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(150);
    const over = await app(() => ({ line: document.getElementById('rpmCheckLine').textContent, bad: document.getElementById('rpmCheckLine').classList.contains('is-bad'), disabled: document.getElementById('rpmSavePaymentBtn').disabled }));
    check('12d more than the balance: red message and the Add button is off', over.bad && over.disabled && /more than the balance/.test(over.line), over);
    const before = await app((id) => window.boreBillApp.history.find((b) => b.id === id).payments.length, ids.due);
    await app(() => document.getElementById('rpmSavePaymentBtn').click()); await wait(200);
    const afterN = await app((id) => window.boreBillApp.history.find((b) => b.id === id).payments.length, ids.due);
    check('12d nothing is saved while it does not add up', before === afterN, { before, afterN });
    await app(() => window.boreBillApp.closeRecordPaymentModal());
});

// ---------- 13. dashboard ----------
await step('13 dashboard', async () => {
    await p.goto(`${BASE}/dashboard.html`, { waitUntil: 'networkidle0' }); await wait(800);
    await app(() => document.querySelector('#timePillGroup [data-range="today"]').click()); await wait(300);
    const d = await app(() => document.getElementById('kpiTotalBilled')?.textContent.trim());
    // 1,18,500 + SM-103 (₹33,000 − ₹3,000 payment discount = ₹30,000)
    check('13 report, Today: billed ₹1,48,500 (bill after its payment discount)', d === '₹1,48,500', d);
});

await finish();
