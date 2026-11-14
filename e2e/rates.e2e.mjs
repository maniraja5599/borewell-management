// Rates top-to-bottom check in a real browser, driven like a user: rate cards, slab editing,
// quick rates, per-bill rates, default card, delete + undo, and old bills keeping their prices.
// All cloud traffic is blocked. Run before a release:
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:rates                                    (in another)
import { computeBillTotals } from '../src/core/slabEngine.js';
import { startHarness, wait } from './harness.mjs';

const { p, OUT, check, app, typeInto, clickId, step, freshCompany, finish } = await startHarness('rates');

const bill = () => app(() => { const a = window.boreBillApp; return { res: a.lastResult, state: a.state, rates: a.rates, profiles: a.rateProfiles, activeId: a.activeRateProfileId }; });
const toasts = [];
await p.exposeFunction('__toast', (t) => toasts.push(t));
const watchToasts = () => app(() => {
    const c = document.getElementById('toastContainer');
    if (!c || c.__watched) return;
    c.__watched = true;
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.textContent && window.__toast(n.textContent)))).observe(c, { childList: true });
});
const nav = (tab) => app((tab) => document.querySelector(`.b-nav-item[data-tab="${tab}"]`)?.click() ?? window.boreBillApp.switchTab(tab), tab);
async function saveCurrentBill(name = 'Ravi Kumar') {
    if (!(await app(() => document.getElementById('custName').value.trim()))) await typeInto('custName', name);
    await clickId('openBillPreviewBtn'); await wait(500);
    await clickId('saveBillHistoryBtn'); await wait(900);
}
async function freshBill() {
    await nav('tab-bill'); await wait(300);
    await clickId('freshBillQuickBtn'); await wait(500);
}

await freshCompany();
await watchToasts();

// A new company starts with two cards (Standard ₹90, Hard Rock ₹100); Standard is applied.
// Standard ladder: 1–300 @90, 301–400 @100, 401–500 @120 …, bata ₹2,000.
await step('R1 bill on the standard rate', async () => {
    await typeInto('totalDepth', 450); await wait(300);
    await saveCurrentBill();
    const h = await app(() => window.boreBillApp.history[0]);
    // 300×90 + 100×100 + 50×120 = 43,000 + bata 2,000
    check('R1 standard rate: 450 ft bill #SM-101 = ₹45,000', h?.billNo === 'SM-101' && h.snapshot.drillingCost === 43000 && h.snapshot.grandTotal === 45000,
        { billNo: h?.billNo, drill: h?.snapshot.drillingCost, total: h?.snapshot.grandTotal });
});

let vipId = '';
await step('R2 new rate card', async () => {
    await freshBill();
    await nav('tab-rates'); await wait(400);
    await clickId('createNewRateProfileBtn'); await wait(400);
    await typeInto('masterProfileName', 'VIP 4.5in');
    await clickId('rateStage1NextBtn'); await wait(300);
    await typeInto('masterBaseRate', 110);
    await clickId('rateStage2NextBtn'); await wait(300);
    await typeInto('masterPvc7Rate', 450);
    await clickId('rateStage3NextBtn'); await wait(300);
    await p.screenshot({ path: `${OUT}/r1_new_card.png`, fullPage: true });
    await clickId('saveMasterRatesBtn'); await wait(600);
    const s = await bill();
    const vip = s.profiles.find((x) => x.name === 'VIP 4.5in');
    vipId = vip?.id || '';
    const rows = await app(() => document.querySelectorAll('#savedRateProfilesList .rate-clean-row').length);
    const chips = await app(() => [...document.querySelectorAll('#billRateProfilePills .rp-chip[data-rpid]')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
    check('R2 new card "VIP 4.5in" saved and applied: base ₹110, ladder keeps its steps (110/120/140), 7" pipe ₹450',
        s.profiles.length === 3 && vip && s.activeId === vip.id && s.rates.baseDrillingRate === 110
        && vip.rates.slabRates[1].rate === 120 && vip.rates.slabRates[2].rate === 140 && vip.rates.pvc7Rate === 450,
        { n: s.profiles.length, active: s.activeId === vip?.id, base: s.rates.baseDrillingRate, slabs: vip?.rates.slabRates.slice(0, 3).map((x) => x.rate), pvc7: vip?.rates.pvc7Rate });
    check('R2a card list shows 3 cards, bill screen shows 3 rate chips', rows === 3 && chips.length === 3 && /VIP 4\.5in/.test(chips[2]), { rows, chips });
});

await step('R3 bill on the new card', async () => {
    await nav('tab-bill'); await wait(300);
    await typeInto('totalDepth', 450);
    await typeInto('pvc7Length', 10); await wait(300);
    const s = await bill();
    // 300×110 + 100×120 + 50×140 = 52,000; pipe 10×450 = 4,500; bata 2,000 → 58,500
    check('R3 450 ft + 10 ft 7" pipe on VIP = ₹58,500 (hand-calculated) and matches engine',
        s.res.drillingCost === 52000 && s.res.grandTotal === 58500 && computeBillTotals(s.rates, s.state).grandTotal === 58500,
        { drill: s.res.drillingCost, total: s.res.grandTotal });
});

await step('R4 edit one slab row', async () => {
    await nav('tab-rates'); await wait(300);
    await app((id) => document.querySelector(`.rcr-edit-btn[data-editbtn="${id}"]`)?.click(), vipId); await wait(400);
    await app(() => window.boreBillApp.switchStudioTab('slabs')); await wait(300);
    await app(() => { const i = document.querySelector('.slab-edit-input[data-index="1"]'); i.value = '125'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await wait(200);
    const badge = await app(() => document.getElementById('stepBadge_1')?.textContent);
    const basePill = await app(() => document.getElementById('ssgBasePillPreview')?.textContent);
    check('R4a slab calculator shows the card being edited (Base: 1–300 ft @ ₹110/ft)', basePill === 'Base: 1–300 ft @ ₹110/ft', basePill);
    await p.screenshot({ path: `${OUT}/r2_slabs.png`, fullPage: true });
    await clickId('saveMasterRatesBtn'); await wait(600);
    const s = await bill();
    const vip = s.profiles.find((x) => x.id === vipId);
    // 300×110 + 100×125 + 50×140 = 52,500 → total 59,000
    check('R4 slab 301–400 ft set to ₹125: card saved, step badge +₹15, bill re-priced to ₹59,000',
        vip?.rates.slabRates[1].rate === 125 && vip.rates.slabRates[2].rate === 140 && badge === '+₹15' && s.res.drillingCost === 52500 && s.res.grandTotal === 59000,
        { slab: vip?.rates.slabRates.slice(0, 3).map((x) => x.rate), badge, drill: s.res.drillingCost, total: s.res.grandTotal });
});

await step('R5 close editor without saving', async () => {
    await app((id) => document.querySelector(`.rcr-edit-btn[data-editbtn="${id}"]`)?.click(), vipId); await wait(400);
    await app(() => window.boreBillApp.switchStudioTab('core')); await wait(200);
    await app(() => window.boreBillApp.setRateStudioStage(2)); await wait(200);
    await typeInto('masterBaseRate', 200); await wait(200);
    await clickId('closeRateEditorBtn'); await wait(400);
    const s = await bill();
    const vip = s.profiles.find((x) => x.id === vipId);
    check('R5 closing the editor without saving changes nothing (base stays ₹110, bill ₹59,000)',
        s.rates.baseDrillingRate === 110 && vip.rates.baseDrillingRate === 110 && s.res.grandTotal === 59000,
        { live: s.rates.baseDrillingRate, card: vip?.rates.baseDrillingRate, total: s.res.grandTotal });
});

await step('R6 switch cards from the bill screen', async () => {
    await nav('tab-bill'); await wait(300);
    const stdId = await app(() => window.boreBillApp.rateProfiles[0].id);
    await app((id) => document.querySelector(`#billRateProfilePills .rp-chip[data-rpid="${id}"]`)?.click(), stdId); await wait(300);
    const a = await bill();
    await app((id) => document.querySelector(`#billRateProfilePills .rp-chip[data-rpid="${id}"]`)?.click(), vipId); await wait(300);
    const b = await bill();
    // Standard: 43,000 + 10×400 + 2,000 = 49,000.  VIP: 59,000.
    check('R6 rate chips re-price the open bill: Standard ₹49,000 ↔ VIP ₹59,000', a.res.grandTotal === 49000 && b.res.grandTotal === 59000,
        { standard: a.res.grandTotal, vip: b.res.grandTotal });
});

await step('R7 old bill keeps its prices', async () => {
    const id = await app(() => window.boreBillApp.history.find((h) => h.billNo === 'SM-101').id);
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), id); await wait(700);
    const a = await bill();
    await freshBill();
    const b = await bill();
    check('R7 reopening #SM-101 still shows ₹45,000 at ₹90/ft; a new bill after it is back on VIP ₹110',
        a.res.grandTotal === 45000 && a.res.drillingCost === 43000 && b.rates.baseDrillingRate === 110 && b.activeId === vipId,
        { reopened: a.res.grandTotal, newBase: b.rates.baseDrillingRate });
});

await step('R8 quick rates drawer', async () => {
    await typeInto('totalDepth', 450);
    await typeInto('pvc7Length', 10);
    await clickId('inlinePriceSettingsToggleBtn'); await wait(300);
    await typeInto('quickPvc7Rate', 420);
    await typeInto('quickBoreBata', 2500);
    await clickId('saveQuickRatesBtn'); await wait(500);
    const s = await bill();
    const vip = s.profiles.find((x) => x.id === vipId);
    // 52,500 + 10×420 + 2,500 = 59,200
    check('R8 quick rates (7" ₹420, bata ₹2,500) save into the applied card and re-price: ₹59,200',
        vip.rates.pvc7Rate === 420 && vip.rates.boreBataRate === 2500 && s.res.grandTotal === 59200,
        { pvc7: vip.rates.pvc7Rate, bata: vip.rates.boreBataRate, total: s.res.grandTotal });
});

await step('R9 one-bill rate change', async () => {
    await typeInto('pvc7RateInput', 500); await wait(300);
    const s = await bill();
    await saveCurrentBill();
    const h = await app(() => window.boreBillApp.history.find((x) => x.billNo === 'SM-102'));
    // 52,500 + 10×500 + 2,500 = 60,000
    check('R9 changing 7" pipe to ₹500 on one bill: #SM-102 saved at ₹60,000', s.res.grandTotal === 60000 && h?.snapshot.grandTotal === 60000,
        { screen: s.res.grandTotal, saved: h?.snapshot.grandTotal });
    await freshBill();
    const next = await app(() => ({ live: window.boreBillApp.rates.pvc7Rate, field: document.getElementById('pvc7RateInput').value, card: window.boreBillApp.getActiveRateProfile().rates.pvc7Rate }));
    await p.reload({ waitUntil: 'networkidle0' }); await wait(800);
    await watchToasts();
    const afterReload = await app(() => ({ live: window.boreBillApp.rates.pvc7Rate, field: document.getElementById('pvc7RateInput').value }));
    check('R9a the next new bill is back on the card price (₹420), before and after reload',
        next.live === 420 && next.field === '420' && afterReload.live === 420 && afterReload.field === '420', { next, afterReload });
});

await step('R10 default card survives reload', async () => {
    await nav('tab-rates'); await wait(300);
    await app((id) => document.querySelector(`.rcr-default-btn[data-defbtn="${id}"]`)?.click(), vipId); await wait(400);
    await p.reload({ waitUntil: 'networkidle0' }); await wait(800);
    await watchToasts();
    const s = await bill();
    check('R10 VIP set as default: after reload it is default + applied, base ₹110, slab ₹125 kept',
        s.profiles.find((x) => x.isDefault)?.id === vipId && s.activeId === vipId && s.rates.baseDrillingRate === 110 && s.rates.slabRates[1].rate === 125,
        { def: s.profiles.find((x) => x.isDefault)?.name, active: s.activeId === vipId, base: s.rates.baseDrillingRate, slab1: s.rates.slabRates[1]?.rate });
});

await step('R11 delete card + undo', async () => {
    await nav('tab-rates'); await wait(300);
    await app((id) => document.querySelector(`.rcr-del-btn[data-delbtn="${id}"]`)?.click(), vipId); await wait(400);
    await clickId('confirmDelActionBtn'); await wait(500);
    const a = await bill();
    await app(() => document.querySelector('.toast-undo-btn')?.click()); await wait(500);
    const b = await bill();
    check('R11 deleting the applied default card falls back to Standard ₹90; Undo brings VIP back as default + applied',
        a.profiles.length === 2 && a.rates.baseDrillingRate === 90 && a.profiles[0].isDefault
        && b.profiles.length === 3 && b.activeId === vipId && b.profiles.find((x) => x.isDefault)?.id === vipId && b.rates.baseDrillingRate === 110,
        { afterDelete: { n: a.profiles.length, base: a.rates.baseDrillingRate }, afterUndo: { n: b.profiles.length, active: b.activeId === vipId, base: b.rates.baseDrillingRate } });
});

await step('R12 saved bills after all rate changes', async () => {
    const totals = await app(() => window.boreBillApp.history.map((h) => `${h.billNo}:${h.snapshot.grandTotal}`).sort());
    const id = await app(() => window.boreBillApp.history.find((h) => h.billNo === 'SM-102').id);
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), id); await wait(700);
    const s = await bill();
    check('R12 both saved bills keep their totals (₹45,000 / ₹60,000), #SM-102 reopens at ₹60,000 with ₹500 pipe',
        JSON.stringify(totals) === '["SM-101:45000","SM-102:60000"]' && s.res.grandTotal === 60000 && s.rates.pvc7Rate === 500, { totals, reopened: s.res.grandTotal, pvc7: s.rates.pvc7Rate });
    await freshBill();
});

await step('R13 wording', async () => {
    await nav('tab-rates'); await wait(300);
    await app((id) => document.querySelector(`.rcr-edit-btn[data-editbtn="${id}"]`)?.click(), vipId); await wait(400);
    await app(() => window.boreBillApp.switchStudioTab('slabs')); await wait(200);
    await clickId('slabResetStandardBtn'); await wait(300);
    await clickId('closeRateEditorBtn'); await wait(300);
    const s = await bill();
    const brandLeak = toasts.filter((t) => /anjaneya/i.test(t));
    check('R13 no message shows another company\'s name; closing after "reset" keeps VIP ₹110', brandLeak.length === 0 && s.rates.baseDrillingRate === 110, { brandLeak, base: s.rates.baseDrillingRate });
});

await step('R14 new bill depth stops at the last slab', async () => {
    await freshBill();
    const end = await app(() => { const r = window.boreBillApp.rates.slabRates; let e = 0; (r || []).forEach((s) => { e += parseInt(s.span, 10) || 0; }); return e; });
    const before = toasts.length;
    await typeInto('totalDepth', end + 150); await wait(300);
    const s = await bill();
    const field = await app(() => ({ v: document.getElementById('totalDepth').value, max: document.getElementById('totalDepth').max, ph: document.getElementById('totalDepth').placeholder }));
    const msg = toasts.slice(before).find((t) => /Add a slab in Rates/.test(t)) || '';
    check(`R14 typing ${end + 150} ft on a ${end} ft ladder → set to ${end} ft, priced at ${end} ft, with a message`,
        end > 0 && field.v === String(end) && field.max === String(end) && s.res.totalDepth === end && /up to/.test(field.ph) && msg,
        { end, field, priced: s.res.totalDepth, msg, seen: toasts.slice(before) });
    await typeInto('totalDepth', end); await wait(200);
    check('R14 depth exactly at the last slab is allowed', (await bill()).res.totalDepth === end);
});

await step('R15 saved bill keeps the old limit', async () => {
    const id = await app(() => window.boreBillApp.history.find((h) => h.billNo === 'SM-101').id);
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), id); await wait(700);
    const max = await app(() => document.getElementById('totalDepth').max);
    check('R15 reopening a saved bill keeps the 2500 ft limit and its depth (450 ft)', max === '2500' && (await bill()).res.totalDepth === 450, { max });
    await freshBill();
});

await finish();
