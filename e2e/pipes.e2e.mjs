// Casing pipes (Phase 7) in a real phone-sized browser, on a phone without the cloud (owner):
// opening stock and a purchase by pipe count, a final bill with pipe takes stock out, "Drilling
// only" on the bill (₹200/ft, no stock), "Pipe pulled out" on a saved bill puts the pipe back,
// low-stock warning, owner settings, and the backup file now carrying the rig-work lists.
//   npm run build && npx vite preview --port 4173 ;  npm run e2e:pipes
import fs from 'node:fs';
import { startHarness, wait } from './harness.mjs';

const { p, DL, check, app, typeInto, clickId, step, freshCompany, finish } = await startHarness('pipes');

const sheetText = () => app(() => document.querySelector('.tt-sheet')?.innerText || '');
const clickText = (t, scope = '.tt-sheet') => app((t, scope) => {
    const b = [...document.querySelectorAll(`${scope} button`)].find((x) => x.offsetParent !== null && x.textContent.trim() === t);
    if (!b) return false;
    b.click();
    return true;
}, t, scope);
const boxes = () => app(() => [...document.querySelectorAll('.ps-box strong')].map((x) => x.textContent));
async function openPipes() {
    await app(() => { document.querySelector('.tt-sheet .is-close')?.click(); window.boreBillApp.switchTab('tab-brand', false, false); });
    await wait(300);
    const row = await app(() => { const r = [...document.querySelectorAll('#rigWorkCard .rw-row')].find((x) => x.textContent.includes('Casing pipes')); r?.click(); return r?.innerText || null; });
    await wait(400);
    return row;
}
const closeSheet = () => app(() => document.querySelector('.tt-sheet .is-close')?.click());
async function newBill(name, depth, pipe7) {
    await closeSheet();
    await app(() => window.boreBillApp.switchTab('tab-bill', false, false));
    await wait(300);
    // A fresh bill, as a user would start one (the last saved bill stays open otherwise).
    await clickId('postSaveNewBillBtn') || await clickId('startFreshNewBillBtn') || await clickId('freshBillQuickBtn');
    await wait(500);
    await typeInto('custName', name);
    await typeInto('totalDepth', String(depth));
    await typeInto('pvc7Length', String(pipe7));
    await wait(200);
}
const casing = () => app(() => ({
    cost: document.getElementById('liveInlinePvc7Cost')?.textContent,
    rate: document.getElementById('pvc7RateInput')?.value,
    label: document.getElementById('labelPvc7Name')?.textContent,
    on: document.querySelector('.spvc-mode .is-on')?.dataset.mode,
    receipt: document.getElementById('rcptPvc7Label')?.textContent || ''
}));

await freshCompany();

await step('P1 Settings → Rig work shows Casing pipes; not started yet', async () => {
    const row = await openPipes();
    check('P1 Settings → Rig work shows Casing pipes; not started yet', /Casing pipes/.test(row || '') && /Not started yet/.test(await sheetText()), row);
});

await step('P2 opening stock by pipe count: 10 × 7″ and 2 × 10″ = 200 ft / 40 ft', async () => {
    await clickText('Opening stock');
    await typeInto('psA1opening', '10');
    await typeInto('psA2opening', '2');
    await clickText('Save opening stock');
    await wait(200);
    check('P2 opening stock by pipe count: 10 × 7″ and 2 × 10″ = 200 ft / 40 ft', (await boxes()).join('|') === '200 ft|40 ft', await boxes());
});

await step('P3 purchase: pipes × cost per pipe, total shown, stock goes up', async () => {
    await clickText('Purchase');
    await typeInto('psA1purchase', '5');
    await typeInto('psC1purchase', '2400');
    const total = await app(() => document.querySelector('.tt-form .ca-total')?.textContent);
    await clickText('Add purchase');
    await wait(200);
    const txt = await sheetText();
    check('P3 purchase: pipes × cost per pipe, total shown, stock goes up', /total ₹12,000/.test(total || '') && (await boxes())[0] === '300 ft' && /5 pipes × ₹2,400/.test(txt), { total, boxes: await boxes() });
});

await step('P4 bill: "Drilling only" charges ₹200/ft with its own name; "With pipe" goes back to ₹400', async () => {
    await newBill('Pipe Customer', 300, 60);
    const pipe = await casing();
    await app(() => document.querySelector('.spvc-mode [data-mode="drill"]')?.click());
    await wait(200);
    const drill = await casing();
    await app(() => document.querySelector('.spvc-mode [data-mode="pipe"]')?.click());
    await wait(200);
    const back = await casing();
    check('P4 bill: "Drilling only" charges ₹200/ft with its own name; "With pipe" goes back to ₹400',
        pipe.cost === '₹24,000' && pipe.on === 'pipe' && drill.cost === '₹12,000' && drill.rate === '200' && drill.on === 'drill' && /drilling only/.test(drill.label)
        && /Re-cutting charge/.test(drill.receipt) && back.cost === '₹24,000' && back.rate === '400' && !/drilling only/.test(back.label),
        { pipe, drill, back });
});

await step('P5 saving a final bill with pipe takes 60 ft out of stock', async () => {
    await clickId('saveBillHistoryBtn'); await wait(900);
    await openPipes();
    const txt = await sheetText();
    check('P5 saving a final bill with pipe takes 60 ft out of stock', (await boxes())[0] === '240 ft' && /Used on bills/i.test(txt) && /7" 60 ft|7″ 60 ft/.test(txt), { boxes: await boxes() });
});

await step('P6 a drilling-only bill does not use stock; the next new bill starts "with pipe"', async () => {
    await newBill('Dry Bore', 250, 40);
    await app(() => document.querySelector('.spvc-mode [data-mode="drill"]')?.click());
    await wait(200);
    await clickId('saveBillHistoryBtn'); await wait(900);
    const saved = await app(() => window.boreBillApp.history[0].snapshot);
    await clickId('postSaveNewBillBtn') || await clickId('startFreshNewBillBtn') || await clickId('freshBillQuickBtn');
    await wait(500);
    const fresh = await casing(); // a new bill starts "with pipe"
    await openPipes();
    check('P6 a drilling-only bill does not use stock; the next new bill starts "with pipe"',
        saved.pvc7Mode === 'drill' && saved.pvc7Rate === 200 && saved.pvc7Cost === 8000 && /Re-cutting/.test(saved.pvc7DrillName) && (await boxes())[0] === '240 ft' && fresh.on === 'pipe' && fresh.rate === '400',
        { mode: saved.pvc7Mode, rate: saved.pvc7Rate, fresh, boxes: await boxes() });
});

await step('P7 opening a saved bill shows its own choice (drilling-only, then a pipe bill)', async () => {
    await closeSheet();
    const ids = await app(() => window.boreBillApp.history.map((b) => b.id));
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), ids[0]);
    await wait(300);
    const a = await casing();
    await app((id) => window.boreBillApp.loadBillFromHistory(id, false, true), ids[1]);
    await wait(300);
    const b = await casing();
    check('P7 opening a saved bill shows its own choice (drilling-only, then a pipe bill)', a.on === 'drill' && a.rate === '200' && b.on === 'pipe' && b.rate === '400', { a, b });
});

await step('P8 "Pipe pulled out" on a saved bill: drilling only after Save, 60 ft back in stock', async () => {
    const pipeBill = await app(() => window.boreBillApp.history.find((b) => b.custName === 'Pipe Customer').id);
    await app((id) => window.boreBillApp.openBillDetailModal(id), pipeBill);
    await wait(300);
    const offer = await app(() => document.querySelector('.spvc-pulled')?.innerText || '');
    await app(() => document.querySelector('.spvc-pulled-btn')?.click());
    await wait(400);
    const c = await casing();
    await clickId('saveBillHistoryBtn'); await wait(900);
    const snap = await app((id) => window.boreBillApp.history.find((b) => b.id === id).snapshot, pipeBill);
    await openPipes();
    check('P8 "Pipe pulled out" on a saved bill: drilling only after Save, 60 ft back in stock',
        /Pipe pulled out/.test(offer) && c.on === 'drill' && c.cost === '₹12,000' && snap.pvc7Mode === 'drill' && snap.pvc7Cost === 12000 && (await boxes())[0] === '300 ft',
        { offer: offer.slice(0, 80), c, mode: snap.pvc7Mode, boxes: await boxes() });
});

await step('P9 low stock: 10″ at 40 ft is not low; after an adjustment of −20 ft it warns (below 25)', async () => {
    const before = await app(() => document.querySelectorAll('.ps-stock .wk-warn').length);
    await clickText('Adjustment');
    await typeInto('psA2adjust', '-20');
    await clickText('Save adjustment');
    await wait(200);
    const warn = await app(() => [...document.querySelectorAll('.ps-stock .wk-warn')].map((x) => x.textContent).join(' '));
    check('P9 low stock: 10″ at 40 ft is not low; after an adjustment of −20 ft it warns (below 25)', before === 0 && /10" is low: 20 ft left|10″ is low: 20 ft left/.test(warn), { before, warn });
});

await step('P10 owner settings: drilling-only rate ₹250 is used on the next bill', async () => {
    await app(() => document.querySelector('.tt-sheet details.tt-fold')?.setAttribute('open', ''));
    await typeInto('psDrillRate', '250');
    await clickText('Save settings');
    await wait(200);
    await newBill('Next', 200, 20);
    await app(() => document.querySelector('.spvc-mode [data-mode="drill"]')?.click());
    await wait(200);
    const c = await casing();
    check('P10 owner settings: drilling-only rate ₹250 is used on the next bill', c.rate === '250' && c.cost === '₹5,000', c);
});

await step('P11 backup file carries workers, bits & hammers, cash and attendance', async () => {
    await app(() => {
        const a = window.boreBillApp;
        a.saveToStorage('borebill_workers', [{ id: 'w1', name: 'Kumar', code: 'OP-001', type: 'operator', status: 'active', wages: [] }]);
        a.saveToStorage('borebill_cash', [{ id: 'c1', type: 'in', amount: 500, date: '2026-11-22', holderId: 'me' }]);
        a.saveToStorage('borebill_attendance', [{ id: 'att_w1_2026-11-22', workerId: 'w1', date: '2026-11-22', status: 'present' }]);
    });
    for (const f of fs.readdirSync(DL)) fs.unlinkSync(`${DL}/${f}`);
    await app(() => window.boreBillApp.switchTab('tab-brand', false, false));
    await clickId('exportDataJsonBtn');
    let file = null;
    for (let i = 0; i < 30 && !file; i++) { await wait(200); file = fs.readdirSync(DL).find((f) => f.endsWith('.json')); }
    const data = file ? JSON.parse(fs.readFileSync(`${DL}/${file}`, 'utf8')) : {};
    check('P11 backup file carries workers, bits & hammers, cash and attendance',
        data.version === '2.4' && data.workers?.length === 1 && Array.isArray(data.tools) && data.cash?.length === 1 && data.attendance?.length === 1 && data.stock?.length === 3,
        { file, version: data.version, workers: data.workers?.length, cash: data.cash?.length, attendance: data.attendance?.length, stock: data.stock?.length });
});

await finish();
