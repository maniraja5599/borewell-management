// Expenses & cash (Settings → Rig work) in a real phone-sized browser.
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:cash                                     (in another)
// Part A: a phone without the cloud (owner): cash in, expenses, diesel, hand-over + Received, categories.
// Part B: a manager (role from the cloud, cloud traffic blocked): customer cash payments count, no
//         office / Received / categories, "Customer payment" lists the rig's unpaid bills.
import { startHarness, wait } from './harness.mjs';

const { p, OUT, check, app, typeInto, step, freshCompany, finish } = await startHarness('cash');

const sheetText = () => app(() => document.querySelector('.tt-sheet')?.innerText || '');
const balance = () => app(() => document.querySelector('.ca-bal')?.textContent.trim() || '');
const clickText = (t, scope = '.tt-sheet') => app((t, scope) => {
    const b = [...document.querySelectorAll(`${scope} button, ${scope} label`)].find((x) => x.offsetParent !== null && x.textContent.trim() === t);
    if (!b) return false;
    b.click();
    return true;
}, t, scope);
const pick = (name, value) => app((name, value) => {
    const r = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!r) return false;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}, name, value);
const noSideScroll = () => app(() => {
    const s = document.querySelector('.tt-body');
    return document.documentElement.scrollWidth <= window.innerWidth + 1 && (!s || s.scrollWidth <= s.clientWidth + 1);
});
async function openCash() {
    await app(() => window.boreBillApp.switchTab('tab-brand', false, false));
    await wait(300);
    const row = await app(() => {
        const r = [...document.querySelectorAll('#rigWorkCard .rw-row')].find((x) => /Expenses & cash/.test(x.textContent));
        if (!r) return null;
        const t = r.innerText;
        r.click();
        return t;
    });
    await wait(400);
    return row;
}
const closeSheet = () => app(() => document.querySelector('.tt-sheet .is-close')?.click());

// ---------------------------------------------------------------- Part A: no cloud (owner)
await freshCompany();

await step('A1 Settings → Rig work shows Expenses & cash and opens it', async () => {
    const row = await openCash();
    check('A1 Settings → Rig work shows Expenses & cash and opens it', row && /Expenses, diesel, cash in hand/.test(row) && (await balance()) === '₹0', row);
});

await step('A2 cash received from the owner', async () => {
    await clickText('Cash received');
    await typeInto('caAmtnin', '10000');
    await clickText('Add');
    await wait(200);
    check('A2 cash received from the owner', (await balance()) === '₹10,000', await balance());
});

await step('A3 an expense without an amount is refused, with a clear message', async () => {
    await clickText('Expense');
    await pick('caCatnexpense', 'food');
    await clickText('Add');
    const msg = await app(() => [...document.querySelectorAll('.tt-form .tt-msg')].find((m) => !m.hidden)?.textContent || '');
    check('A3 an expense without an amount is refused, with a clear message', /amount/i.test(msg) && (await balance()) === '₹10,000', msg);
});

await step('A4 food ₹500 in cash lowers the cash; spares ₹2,000 by UPI does not', async () => {
    await typeInto('caAmtnexpense', '500');
    await clickText('Add');
    await wait(200);
    const afterFood = await balance();
    await clickText('Expense');
    await pick('caCatnexpense', 'spares');
    await pick('caPaidnexpense', 'upi');
    await typeInto('caAmtnexpense', '2000');
    await clickText('Add');
    await wait(200);
    check('A4 food ₹500 in cash lowers the cash; spares ₹2,000 by UPI does not', afterFood === '₹9,500' && (await balance()) === '₹9,500', [afterFood, await balance()]);
});

await step('A5 diesel: litres × rate shown as you type; bunk name saved', async () => {
    await clickText('Diesel');
    await typeInto('caLitndiesel', '50');
    await typeInto('caRatendiesel', '92.5');
    const total = await app(() => document.querySelector('.ca-total')?.textContent || '');
    await typeInto('caBunkndiesel', 'IOC Mohanur');
    await clickText('Add');
    await wait(200);
    check('A5 diesel: litres × rate shown as you type; bunk name saved', total === 'Total ₹4,625' && (await balance()) === '₹4,875' && /IOC Mohanur/.test(await sheetText()), [total, await balance()]);
});

await step('A6 the next diesel suggests the old bunk name', async () => {
    await clickText('Diesel');
    const opts = await app(() => [...document.querySelectorAll('#caBunksndiesel option')].map((o) => o.value));
    await clickText('Cancel');
    check('A6 the next diesel suggests the old bunk name', opts.includes('IOC Mohanur'), opts);
});

await step('A7 hand-over waits for "Received ✓", then leaves the cash', async () => {
    await clickText('Hand over');
    await typeInto('caAmtnhandover', '3000');
    await clickText('Add');
    await wait(200);
    const before = await balance();
    const waitingShown = /Waiting for "Received ✓"/i.test(await sheetText()) && /₹3,000 to owner/.test(await sheetText());
    await p.screenshot({ path: `${OUT}/cash-handover-waiting.png`, fullPage: false });
    await clickText('Received ✓');
    await wait(200);
    check('A7 hand-over waits for "Received ✓", then leaves the cash', before === '₹4,875' && waitingShown && (await balance()) === '₹1,875', [before, waitingShown, await balance()]);
});

await step('A8 spent this month = all expenses and diesel (cash or not)', async () => {
    const spent = await app(() => document.querySelector('.ca-sum-top strong')?.textContent || '');
    const diesel = await app(() => [...document.querySelectorAll('.ca-sum .ca-note')].map((x) => x.textContent).join(' '));
    check('A8 spent this month = all expenses and diesel (cash or not)', spent === '₹7,125' && /50 L · avg ₹92.5\/L/.test(diesel), [spent, diesel]);
});

await step('A9 owner adds a category; it is offered for the next expense', async () => {
    await app(() => document.querySelector('.tt-sheet details.tt-fold')?.setAttribute('open', ''));
    await typeInto('caCatNew', 'Tea');
    await app(() => [...document.querySelectorAll('.tt-fold .tt-btn')].find((b) => b.textContent.trim() === 'Add')?.click());
    await wait(200);
    await clickText('Expense');
    const has = await app(() => !!document.querySelector('input[name="caCatnexpense"][value="tea"]'));
    await clickText('Cancel');
    check('A9 owner adds a category; it is offered for the next expense', has);
});

await step('A10 phone width: nothing sticks out at 390 px and 320 px', async () => {
    const at390 = await noSideScroll();
    await p.screenshot({ path: `${OUT}/cash-390.png`, fullPage: false });
    await p.setViewport({ width: 320, height: 700, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    await wait(300);
    const at320 = await noSideScroll();
    await p.screenshot({ path: `${OUT}/cash-320.png`, fullPage: false });
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    check('A10 phone width: nothing sticks out at 390 px and 320 px', at390 && at320, { at390, at320 });
});

await step('A11 Settings row shows the cash; everything is still there after a reload', async () => {
    await closeSheet();
    await wait(200);
    const rowTxt = await app(() => [...document.querySelectorAll('#rigWorkCard .rw-row')].find((x) => /Expenses/.test(x.textContent))?.innerText || '');
    await p.reload({ waitUntil: 'networkidle0' });
    await wait(800);
    await openCash();
    const n = await app(() => document.querySelectorAll('.tt-sheet .tt-list .tt-item').length);
    check('A11 Settings row shows the cash; everything is still there after a reload', /Cash in hand ₹1,875/.test(rowTxt) && (await balance()) === '₹1,875' && n >= 5, [rowTxt, await balance(), n]);
    await closeSheet();
});

// ---------------------------------------------------------------- Part B: a manager
await step('B1 manager: cash payments they took on bills count in their cash', async () => {
    await app(() => {
        const rig = { id: '00000000-0000-4000-8000-00000000aa01', name: 'Rig 1', bill_prefix: 'SM', is_default: true, active: true, archived: false };
        localStorage.setItem('drillrig_access_v1', JSON.stringify({
            userId: 'u-mgr', userName: 'Ravi', companyId: 'c1', companyName: 'Sri Murugan Borewells', role: 'manager', perms: {},
            rigs: [rig], companies: [], invites: [], currentRigId: rig.id, updatedAt: Date.now()
        }));
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await wait(800);
    await app(() => {
        const a = window.boreBillApp;
        const rigId = '00000000-0000-4000-8000-00000000aa01';
        const bill = (id, no, total, payments) => ({
            id, billNo: no, billDate: '2026-11-20', createdAt: '2026-11-20T10:00:00Z', custName: `Customer ${no}`, rigId,
            snapshot: { docType: 'INVOICE', grandTotal: total, totalDepth: 400 }, payments
        });
        a.history = [
            bill('b1', 'SM-101', 50000, [{ id: 'p1', date: '2026-11-20', amount: 7000, mode: 'Cash', by: { id: 'u-mgr', name: 'Ravi' } },
                { id: 'p2', date: '2026-11-20', amount: 3000, mode: 'UPI', by: { id: 'u-mgr', name: 'Ravi' } }]),
            bill('b2', 'SM-102', 20000, [{ id: 'p3', date: '2026-11-21', amount: 20000, mode: 'Cash', by: { id: 'u-other', name: 'Kumar' } }]),
            ...a.history
        ];
        a.saveToStorage('borebill_history', a.history);
    });
    await openCash();
    const txt = await sheetText();
    check('B1 manager: cash payments they took on bills count in their cash', (await balance()) === '₹7,000' && /From customers\s*₹7,000/.test(txt), [await balance(), txt.slice(0, 300)]);
});

await step('B2 manager: no Office place, no "Received ✓" list, no categories', async () => {
    const txt = await sheetText();
    const office = await app(() => !!document.querySelector('input[name="caPlace"][value="office"]'));
    const cats = await app(() => !!document.querySelector('.tt-sheet details.tt-fold'));
    check('B2 manager: no Office place, no "Received ✓" list, no categories', !office && !cats && !/Waiting for "Received/i.test(txt) && !/Cash with your team/i.test(txt), { office, cats });
});

await step('B3 manager: "Customer payment" lists the unpaid bill of the rig', async () => {
    await clickText('Customer payment');
    await wait(200);
    const txt = await sheetText();
    await p.screenshot({ path: `${OUT}/cash-manager-collect.png`, fullPage: false });
    check('B3 manager: "Customer payment" lists the unpaid bill of the rig', /Due ₹40,000 · #SM-101/.test(txt) && !/#SM-102/.test(txt), txt.slice(0, 400));
});

await step('B4 manager: "Collect" opens the payment window for that bill', async () => {
    await clickText('Collect');
    await wait(400);
    const sub = await app(() => document.getElementById('recordPaymentModalOverlay')?.style.display === 'flex' ? document.getElementById('rpmSub')?.textContent : '');
    await app(() => document.getElementById('recordPaymentModalOverlay') && (document.getElementById('recordPaymentModalOverlay').style.display = 'none'));
    check('B4 manager: "Collect" opens the payment window for that bill', /#SM-101/.test(sub || ''), sub);
});

await finish();
