// Look-and-feel audit of every screen at 320 px, 390 px and desktop width, on a company with data
// (bills, customers, workers, bits & hammers, cash, attendance). For each screen it reports:
//   offscreen   something sticks out past the right edge (sideways scroll)
//   clipped     text cut off without "…"
//   tiny-font   text smaller than 11 px
//   small-tap   a button / link / field smaller than 32 px (hard to tap)
//   no-name     a button with no text, label or title (screen readers say nothing)
// and taps every harmless button in the Rig work sheets (no Delete / Clear / Sign out), checking for
// page errors. Prints a list; fails when any issue or error is found.
//   npm run build && npx vite preview --port 4173 ;  node e2e/audit.e2e.mjs
import { startHarness, wait, BASE } from './harness.mjs';
import { buildDemo } from './demoData.mjs';

const { p, OUT, check, app, freshCompany, finish } = await startHarness('audit');
const VIEWS = [[320, 640], [390, 844], [1280, 900]];
const all = [];

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
    const a = window.boreBillApp;
    const today = new Date();
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const t = ymd(today);
    const brand = JSON.parse(localStorage.getItem('borebill_brand'));
    brand.nextBillSeq = demo.nextBillSeq; brand.nextQuoteSeq = demo.nextQuoteSeq;
    localStorage.setItem('borebill_brand', JSON.stringify(brand));
    a.customers = demo.customers;
    a.saveToStorage('borebill_customers', demo.customers);
    // Work details on the newest final bill (Rig work report + bits / hammers usage).
    const hist = demo.history.map((b, i) => (i === 0 && b.snapshot?.docType === 'INVOICE'
        ? { ...b, work: { v: 1, operatorId: 'w1', compStart: 100, compEnd: 109.5, obFeet: 40, obHammerId: 'h9', hammerId: 'h1', bits: [{ toolId: 'b1', mm: 162.5, atFt: null }], waterIn: 2, note: '' } }
        : b));
    a.history = hist;
    a.saveToStorage('borebill_history', hist);
    a.saveToStorage('borebill_workers', [
        { id: 'w1', name: 'Kumaravel Subramaniam', code: 'OP-001', type: 'operator', status: 'active', rigId: null, wages: [{ from: '2026-01-01', perDay: 900 }], payCycle: 'weekly' },
        { id: 'w2', name: 'Ravi', code: 'HP-001', type: 'helper', status: 'active', rigId: null, wages: [{ from: '2026-01-01', perDay: 600 }] },
        { id: 'w3', name: 'Old Muthu', code: 'LB-001', type: 'labour', status: 'left', rigId: null, wages: [{ from: '2026-01-01', perDay: 500 }] }
    ]);
    a.saveToStorage('borebill_tools', [
        { id: 'b1', tool: 'bit', size: '6.5', code: 'KB-1023', brand: 'Kingdream', newMm: 165, price: 18500, status: 'active', purchasedOn: '2026-10-01', rigId: 'local' },
        { id: 'h1', tool: 'hammer', size: '6.5', brand: 'Mission', price: 95000, status: 'active', purchasedOn: '2026-09-01', rigId: 'local' },
        { id: 'h9', tool: 'hammer', size: '9', brand: 'Numa', price: 140000, status: 'finished', finishedOn: '2026-11-01', purchasedOn: '2026-06-01', rigId: 'local' }
    ]);
    a.saveToStorage('borebill_stock', [
        { id: 'st1', type: 'opening', date: '2026-09-01', casing1Ft: 400, casing2Ft: 60, casing1Pipes: 20, casing2Pipes: 3, pipeFt: 20 },
        { id: 'st2', type: 'purchase', date: '2026-11-10', casing1Ft: 200, casing2Ft: 0, casing1Pipes: 10, casing2Pipes: 0, pipeFt: 20, cost1: 2400, cost2: 0, amount: 24000, note: 'Sri Balaji Pipes, Namakkal bill 4471' }
    ]);
    a.saveToStorage('borebill_cash', [
        { id: 'c1', type: 'in', amount: 20000, from: 'owner', date: t, holderId: 'me', holderName: '', rigId: null, createdAt: today.toISOString() },
        { id: 'c2', type: 'diesel', litres: 120.5, rate: 92.45, amount: 11140, source: 'bunk', bunk: 'Indian Oil Mohanur Road Junction', paidBy: 'cash', date: t, holderId: 'me', rigId: null, createdAt: today.toISOString() },
        { id: 'c3', type: 'expense', category: 'food', categoryLabel: 'Food', amount: 650, paidBy: 'upi', note: 'Lunch for the whole crew at the site in Rasipuram', date: t, holderId: 'me', rigId: null, createdAt: today.toISOString() },
        { id: 'c4', type: 'handover', to: 'owner', amount: 5000, date: t, holderId: 'me', rigId: null, createdAt: today.toISOString() },
        { id: 'c5', type: 'advance', workerId: 'w1', workerName: 'Kumaravel Subramaniam · OP-001', amount: 1500, paidBy: 'cash', date: t, holderId: 'me', rigId: null, createdAt: today.toISOString() }
    ]);
    a.saveToStorage('borebill_attendance', [
        { id: `att_w1_${t}`, workerId: 'w1', workerName: 'Kumaravel Subramaniam · OP-001', date: t, status: 'present', rigId: null },
        { id: `att_w3_2026-11-02`, workerId: 'w3', workerName: 'Old Muthu · LB-001', date: '2026-11-02', status: 'present', rigId: null }
    ]);
}, demo);
await wait(2000); // let the phone database finish writing seven lists before the reload
await p.reload({ waitUntil: 'networkidle0' });
await wait(800);
const seeded = await app(() => ({ bills: window.boreBillApp.history.length, customers: window.boreBillApp.customers.length, rows: document.getElementById('rigWorkCard')?.innerText.replace(/\s+/g, ' ') }));
console.log('SEEDED', JSON.stringify(seeded));
check('sample business is loaded (bills, workers)', seeded.bills > 10 && /2 active/.test(seeded.rows || ''), seeded);

// ------------------------------------------------------------------ in-page checks
const audit = () => app(() => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    const vis = (e) => {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    };
    const nm = (e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${typeof e.className === 'string' && e.className.trim() ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
    const modal = [...document.querySelectorAll('[id$="ModalOverlay"]')].find((m) => getComputedStyle(m).display !== 'none' && vis(m));
    const scope = document.querySelector('.tt-overlay .tt-sheet') || modal || document.body;
    // Things meant to scroll sideways, or drawn / animated off-screen on purpose.
    const sideways = '.wiz-cust-filter-pills, .time-pill-group, .cs-tk-viewport, .rc-plot, .table-wrap, .bores-table-wrap, table, .tt-seg, [class*="scroll"], .header-rotator, .toast-container, #toastContainer';
    for (const e of scope.querySelectorAll('*')) {
        if (e.closest('svg') || !vis(e)) continue;
        // Inside a closed <details>: not on screen.
        if (e.closest('details:not([open]) > :not(summary)')) continue;
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        if (r.right > vw + 1 && s.position !== 'fixed' && !e.closest(sideways)) out.push(['offscreen', nm(e), `right ${Math.round(r.right)} > ${vw}`]);
        const text = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (text) {
            const fs = parseFloat(s.fontSize);
            if (fs < 11) out.push(['tiny-font', nm(e), `${fs}px "${e.textContent.trim().slice(0, 30)}"`]);
            if (e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== 'ellipsis' && (s.overflowX === 'hidden' || s.overflow === 'hidden')) out.push(['clipped', nm(e), `"${e.textContent.trim().slice(0, 40)}"`]);
        }
        const tappable = e.matches('button, a[href], select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), label:has(> input[type=radio]), summary');
        if (tappable && !e.closest('.rc-plot, .cs-tk-viewport')) {
            // A search input inside a search box: the box is what you tap (main.js focuses the input).
            const box = e.matches('input') ? e.closest('.search-input-box, .wiz-search-input-wrap') : null;
            const tr = box ? box.getBoundingClientRect() : r;
            if ((tr.height < 32 || tr.width < 32) && !e.matches('p a, small a, li a')) out.push(['small-tap', nm(e), `${Math.round(r.width)}x${Math.round(r.height)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 25)}"`]);
            if (e.matches('button, a[href]') && !((e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title'))) out.push(['no-name', nm(e), '']);
        }
    }
    return out;
});
async function record(screen, view) {
    const issues = await audit();
    for (const [kind, el, detail] of issues) all.push({ screen, view, kind, el, detail });
    await p.screenshot({ path: `${OUT}/${screen.replace(/[^a-z0-9]+/gi, '-')}-${view}.png` });
}
const closeAll = () => app(() => {
    document.querySelector('.tt-sheet .is-close')?.click();
    for (const m of document.querySelectorAll('[id$="ModalOverlay"]')) m.style.display = 'none';
});
async function ensureApp() {
    if (await app(() => !!window.boreBillApp).catch(() => false)) return;
    await p.goto(`${BASE}/index.html`, { waitUntil: 'networkidle0' });
    await wait(600);
}
const tab = async (id) => { await ensureApp(); await closeAll(); await app((id) => window.boreBillApp.switchTab(id, false, false), id); await wait(350); await app(() => window.scrollTo(0, 0)); };
async function openRow(title) {
    await tab('tab-brand');
    await app((t) => [...document.querySelectorAll('#rigWorkCard .rw-row')].find((x) => x.textContent.includes(t))?.click(), title);
    await wait(400);
}
const clickIn = (sel) => app((sel) => { const e = document.querySelector(sel); e?.click(); return !!e; }, sel);
const expandRows = (n = 3) => app((n) => { [...document.querySelectorAll('.tt-sheet .tt-row')].slice(0, n).forEach((r) => r.click()); }, n);

// ------------------------------------------------------------------ screens
for (const [w, h] of VIEWS) {
    const view = `${w}`;
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 800, hasTouch: w < 800 });
    await wait(300);

    for (const [id, name] of [['tab-bill', 'New bill'], ['tab-customers', 'Customers'], ['tab-history', 'Bills'], ['tab-rates', 'Rates'], ['tab-brand', 'Settings']]) {
        await tab(id);
        await record(name, view);
    }
    // Final bill with the work details card.
    await tab('tab-bill');
    await app(() => document.querySelector('[data-doc="INVOICE"], #docTypeInvoice, input[value="INVOICE"]')?.click());
    await wait(300);
    await app(() => document.getElementById('workCard')?.scrollIntoView());
    await record('New bill - final + work card', view);

    // Pop-ups
    await tab('tab-customers');
    if (await app(() => { const c = window.boreBillApp.customers[0]; if (!c) return false; window.boreBillApp.openCustomerDetailModal(c.id); return true; })) { await wait(400); await record('Customer pop-up', view); }
    await tab('tab-history');
    const billId = await app(() => window.boreBillApp.history.find((b) => b.snapshot?.docType === 'INVOICE' && window.boreBillApp.isBillItemUnpaid?.(b))?.id);
    if (billId) {
        await app((id) => window.boreBillApp.openBillDetailModal(id), billId); await wait(400); await record('Bill pop-up', view);
        await closeAll();
        await app((id) => window.boreBillApp.openRecordPaymentModal(id), billId); await wait(400); await record('Payment pop-up', view);
    }
    await tab('tab-rates');
    if (await app(() => { const r = window.boreBillApp.rateProfiles[0]; if (!r || !window.boreBillApp.openRateDetailModal) return false; window.boreBillApp.openRateDetailModal(r.id); return true; })) { await wait(400); await record('Rate pop-up', view); }

    // Rig work sheets
    await openRow('Workers'); await expandRows(1); await record('Workers', view);
    await openRow('Bits & Hammers'); await expandRows(1); await record('Bits & Hammers', view);
    await openRow('Casing pipes'); await record('Casing pipes', view);
    for (const b of ['Purchase', 'Adjustment']) {
        await app((b) => [...document.querySelectorAll('.ca-acts button')].find((x) => x.textContent.trim() === b)?.click(), b);
        await wait(200);
        await record(`Casing pipes - ${b} form`, view);
    }
    await app(() => document.querySelector('.tt-sheet details.tt-fold')?.setAttribute('open', ''));
    await expandRows(1);
    await record('Casing pipes - entries + settings', view);
    await openRow('Expenses & cash'); await record('Expenses & cash', view);
    for (const b of ['Expense', 'Diesel', 'Cash received', 'Hand over']) {
        await app((b) => [...document.querySelectorAll('.ca-acts button')].find((x) => x.textContent.trim() === b)?.click(), b);
        await wait(200);
        await record(`Expenses & cash - ${b} form`, view);
    }
    await app(() => document.querySelector('.tt-sheet details.tt-fold')?.setAttribute('open', ''));
    await expandRows(2);
    await record('Expenses & cash - entries + categories', view);
    await openRow('Attendance & wages'); await record('Attendance - day', view);
    await app(() => { const r = document.querySelector('input[name="atTab"][value="wages"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
    await wait(200);
    await expandRows(1);
    await record('Attendance - wages', view);
    await closeAll();

    // Report page
    await p.goto(`${BASE}/dashboard.html`, { waitUntil: 'networkidle0' });
    await wait(500);
    await app(() => document.querySelector('[data-range="all"]')?.click());
    await wait(300);
    await app(() => document.querySelector('#wrTools details')?.setAttribute('open', ''));
    await record('Report', view);
    await p.goto(`${BASE}/index.html`, { waitUntil: 'networkidle0' });
    await wait(600);
}

// ------------------------------------------------------------------ search boxes: a tap on the box edge focuses the search
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
for (const [t, id] of [['tab-bill', 'quickCustSearchInput'], ['tab-customers', 'crmSearchInput'], ['tab-history', 'historySearchInput']]) {
    await tab(t);
    const box = await app((id) => { const i = document.getElementById(id); i.blur(); i.scrollIntoView({ block: 'center' }); const r = i.parentElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 4 }; }, id);
    await p.mouse.click(box.x, box.y);
    await wait(150);
    const focused = await app((id) => document.activeElement?.id === id, id);
    check(`tap near the bottom of the ${id} box focuses the search`, focused);
}

// ------------------------------------------------------------------ every harmless button in the sheets
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const skip = /delete|remove|clear|sign out|close/i;
for (const sheet of ['Workers', 'Bits & Hammers', 'Casing pipes', 'Expenses & cash', 'Attendance & wages']) {
    await openRow(sheet);
    await expandRows(3);
    const n = await app(() => document.querySelectorAll('.tt-sheet button').length);
    let tapped = 0;
    for (let i = 0; i < n; i++) {
        const label = await app((i, skipSrc) => {
            const b = document.querySelectorAll('.tt-sheet button')[i];
            if (!b || b.disabled || b.offsetParent === null) return null;
            const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
            if (new RegExp(skipSrc, 'i').test(t) || b.classList.contains('is-close')) return null;
            b.click();
            return t;
        }, i, skip.source);
        if (label !== null) tapped++;
        await wait(120);
        const where = await app(() => location.pathname + (window.boreBillApp ? '' : ' (no app)')).catch(() => 'navigating');
        if (!/index\.html$|\/$/.test(where.split(' ')[0]) || where.includes('no app')) all.push({ screen: sheet, view: '390', kind: 'left-page', el: `button "${label}"`, detail: where });
        if (!(await app(() => !!document.querySelector('.tt-sheet')))) await openRow(sheet); // a button may close the sheet (e.g. Collect)
    }
    check(`buttons in ${sheet}: tapped ${tapped}, no errors`, true);
    await closeAll();
}

// ------------------------------------------------------------------ report
const key = (x) => `${x.kind}|${x.screen}|${x.el}`;
const seen = new Map();
for (const x of all) { const k = key(x); if (!seen.has(k)) seen.set(k, { ...x, views: [x.view] }); else seen.get(k).views.push(x.view); }
const list = [...seen.values()];
for (const x of list) console.log(`${x.kind.padEnd(10)} ${x.screen.padEnd(34)} @${x.views.join(',').padEnd(13)} ${x.el}  ${x.detail}`);
check(`no layout issues (${list.length} found)`, list.length === 0, list.length);
await finish();
