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
    await clickId('freshBillQuickBtn'); await wait(500);
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

// ---------- 13. dashboard ----------
await step('13 dashboard', async () => {
    await p.goto(`${BASE}/dashboard.html`, { waitUntil: 'networkidle0' }); await wait(800);
    await app(() => document.querySelector('#timePillGroup [data-range="today"]').click()); await wait(300);
    const d = await app(() => document.getElementById('kpiTotalBilled')?.textContent.trim());
    check('13 report, Today: billed ₹1,18,500', d === '₹1,18,500', d);
});

await finish();
