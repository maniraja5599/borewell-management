// Attendance & wages (Settings → Rig work) in a real phone-sized browser.
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:attendance                               (in another)
// A phone without the cloud (owner): only active workers on the day list, one-tap marks that stay
// after a reload, "All present" never undoes a mark, holiday for all, balances, advance + wages
// (out of cash in hand), inactive workers with money still open, 320 px.
import { startHarness, wait } from './harness.mjs';

const { p, OUT, check, app, typeInto, step, freshCompany, finish } = await startHarness('attendance');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = ymd(new Date());
const YESTERDAY = ymd(new Date(Date.now() - 86400000));
const sheetText = () => app(() => document.querySelector('.tt-sheet')?.innerText || '');
const clickText = (t) => app((t) => {
    const b = [...document.querySelectorAll('.tt-sheet button, .tt-sheet label')].find((x) => x.offsetParent !== null && x.textContent.trim() === t);
    if (!b) return false;
    b.click();
    return true;
}, t);
const pick = (name, value) => app((name, value) => {
    const r = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!r) return false;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}, name, value);
const checked = (name) => app((name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '', name);
const sumNote = () => app(() => document.querySelector('.at-sum .ca-note')?.textContent || '');
async function openRow(title) {
    await app(() => window.boreBillApp.switchTab('tab-brand', false, false));
    await wait(300);
    const t = await app((title) => {
        const r = [...document.querySelectorAll('#rigWorkCard .rw-row')].find((x) => x.textContent.includes(title));
        if (!r) return null;
        const txt = r.innerText;
        r.click();
        return txt;
    }, title);
    await wait(400);
    return t;
}
const closeSheet = () => app(() => document.querySelector('.tt-sheet .is-close')?.click());

await freshCompany();
await app(() => {
    const w = (id, name, code, type, perDay, extra = {}) => ({ id, name, code, type, status: 'active', rigId: null, wages: [{ from: '2026-01-01', perDay }], createdAt: '2026-11-01T00:00:00Z', ...extra });
    window.boreBillApp.saveToStorage('borebill_workers', [
        w('w1', 'Kumar', 'OP-001', 'operator', 900),
        w('w2', 'Ravi', 'HP-001', 'helper', 600, { payCycle: 'weekly' }),
        w('w3', 'Old Muthu', 'LB-001', 'labour', 500, { status: 'left' })
    ]);
    // The inactive worker still has one unpaid day from before.
    window.boreBillApp.saveToStorage('borebill_attendance', [{ id: 'att_w3_2026-11-02', workerId: 'w3', workerName: 'Old Muthu · LB-001', date: '2026-11-02', status: 'present', rigId: null }]);
});

await step('T1 Settings shows Attendance & wages; the day list has only active workers', async () => {
    const row = await openRow('Attendance & wages');
    const names = await app(() => [...document.querySelectorAll('.at-row .at-name strong')].map((x) => x.textContent));
    check('T1 Settings shows Attendance & wages; the day list has only active workers', /Today not marked · 2 working/.test(row || '') && names.join('|') === 'Kumar · OP-001|Ravi · HP-001', { row, names });
});

await step('T2 one tap marks present / half day; wages for the day add up', async () => {
    await pick('at_w1', 'present');
    await wait(150);
    await pick('at_w2', 'half');
    await wait(150);
    const note = await sumNote();
    const wages = await app(() => document.querySelectorAll('.at-sum .tt-stats strong')[1]?.textContent);
    check('T2 one tap marks present / half day; wages for the day add up', /1 present · 1 half day · 0 absent/.test(note) && wages === '₹1,200', { note, wages });
});

await step('T3 marks stay after a reload; "All present" does not undo a half day', async () => {
    await closeSheet();
    await p.reload({ waitUntil: 'networkidle0' });
    await wait(800);
    await openRow('Attendance & wages');
    const before = [await checked('at_w1'), await checked('at_w2')];
    await clickText('All present');
    await wait(150);
    const after = [await checked('at_w1'), await checked('at_w2')];
    check('T3 marks stay after a reload; "All present" does not undo a half day', before.join() === 'present,half' && after.join() === 'present,half', { before, after });
});

await step('T4 yesterday: holiday for all; next day stops at today', async () => {
    await app(() => document.querySelector('.at-date .at-step')?.click());
    await wait(150);
    const day = await app(() => document.getElementById('atDate')?.value);
    await clickText('Holiday for all');
    await wait(150);
    const marks = [await checked('at_w1'), await checked('at_w2')];
    await app(() => document.querySelectorAll('.at-date .at-step')[1]?.click());
    await wait(150);
    const back = await app(() => ({ v: document.getElementById('atDate')?.value, nextOff: document.querySelectorAll('.at-date .at-step')[1]?.disabled }));
    check('T4 yesterday: holiday for all; next day stops at today', day === YESTERDAY && marks.join() === 'holiday,holiday' && back.v === TODAY && back.nextOff, { day, marks, back });
});

await step('T5 wages: what to pay; advance and wages leave the cash; then settled', async () => {
    await pick('atTab', 'wages');
    await wait(150);
    const pills = await app(() => [...document.querySelectorAll('.tt-sheet .tt-item .tt-pill')].map((x) => x.textContent));
    await app(() => [...document.querySelectorAll('.tt-sheet .tt-row')].find((r) => r.textContent.includes('Kumar'))?.click());
    await wait(150);
    await clickText('Give advance');
    await typeInto('atAmtw1advance', '500');
    await clickText('Give advance');
    await wait(150);
    const owe1 = await app(() => document.querySelector('.at-bal')?.textContent);
    await clickText('Pay wages');
    const prefill = await app(() => document.getElementById('atAmtw1wage')?.value);
    await clickText('Pay');
    await wait(150);
    const owe2 = await app(() => document.querySelector('.at-bal')?.textContent);
    await p.screenshot({ path: `${OUT}/attendance-wages.png` });
    check('T5 wages: what to pay; advance and wages leave the cash; then settled',
        pills.includes('Pay ₹900') && pills.includes('Pay ₹300') && /You owe Kumar ₹400/.test(owe1 || '') && prefill === '400' && owe2 === 'All settled',
        { pills, owe1, prefill, owe2 });
});

await step('T6 an inactive worker with money still open is listed', async () => {
    const txt = await sheetText();
    check('T6 an inactive worker with money still open is listed', /Inactive, money still open/i.test(txt) && /Old Muthu/.test(txt), txt.slice(-300));
});

await step('T7 Expenses & cash: the advance and wages came out of cash in hand', async () => {
    await closeSheet();
    await openRow('Expenses & cash');
    const bal = await app(() => document.querySelector('.ca-bal')?.textContent);
    const txt = await sheetText();
    await closeSheet();
    check('T7 Expenses & cash: the advance and wages came out of cash in hand', bal === '−₹900' && /Wages & advances/i.test(txt) && /Advance to Kumar/.test(txt), { bal });
});

await step('T8 Workers: "Make inactive" and pay cycle in the form; inactive leaves the day list', async () => {
    await openRow('Workers');
    await app(() => [...document.querySelectorAll('.tt-sheet .tt-row')].find((r) => r.textContent.includes('Ravi'))?.click());
    await wait(150);
    const hasCycle = await app(() => !!document.querySelector('input[name^="wkCycle"][value="weekly"]:checked'));
    const ok = await clickText('Make inactive');
    await wait(150);
    await closeSheet();
    await openRow('Attendance & wages');
    const names = await app(() => [...document.querySelectorAll('.at-row .at-name strong')].map((x) => x.textContent));
    check('T8 Workers: "Make inactive" and pay cycle in the form; inactive leaves the day list', hasCycle && ok && names.join('|') === 'Kumar · OP-001', { hasCycle, ok, names });
});

await step('T9 phone width: nothing sticks out at 320 px', async () => {
    await p.setViewport({ width: 320, height: 700, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    await wait(300);
    const fits = await app(() => { const s = document.querySelector('.tt-body'); return document.documentElement.scrollWidth <= window.innerWidth + 1 && (!s || s.scrollWidth <= s.clientWidth + 1); });
    await p.screenshot({ path: `${OUT}/attendance-320.png` });
    check('T9 phone width: nothing sticks out at 320 px', fits);
});

await finish();
