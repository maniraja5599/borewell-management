// Large-data check: the real app with many bills (default 50,000) in a phone-sized browser.
// Correctness first (nothing lost, nothing stale, across real reloads), then loose speed budgets.
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npm run e2e:scale                                    (in another; SCALE_N=20000 for a quicker run)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDemo } from './demoData.mjs';
import { DEPTH_SLABS_DEFINITION } from '../src/config/constants.js';

const N = Number(process.env.SCALE_N || 50000);
const BASE = process.env.E2E_BASE || 'http://localhost:4173';
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'drillrig-scale-'));
fs.mkdirSync(OUT, { recursive: true });
const rates = { baseDrillingRate: 90, oldBoreRate: 40, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 2000, slabBufferFt: 5, gstPercentage: 18, slabRates: DEPTH_SLABS_DEFINITION.map((s) => ({ ...s, rate: s.defaultRate })) };
const demo = buildDemo({ std: { rates }, hard: { rates: { ...rates, baseDrillingRate: 100 } }, phone: (p) => '+91 ' + p });

const results = [];
const check = (name, ok, detail = '') => results.push({ ok: !!ok, name, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 900000 });
const p = await browser.newPage();
p.setDefaultTimeout(900000);
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('dialog', async (d) => { errors.push('dialog: ' + d.message()); await d.dismiss(); });
await p.setRequestInterception(true);
p.on('request', (r) => (/supabase\.co|accounts\.google\.com|wa\.me/.test(r.url()) ? r.abort() : r.continue()));
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

// First page load only: N bills in an in-memory localStorage (real localStorage cannot hold them),
// which the app then moves into IndexedDB, exactly as it does for real users' old data.
await p.evaluateOnNewDocument((templates, N) => {
    if (sessionStorage.getItem('scaleSeeded')) {
        localStorage.setItem('drillrig_setup_skipped', '1');
        localStorage.setItem('drillrig_pwa_prompt_dismissed_at', String(Date.now()));
        return;
    }
    sessionStorage.setItem('scaleSeeded', '1');
    const mem = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); },
        removeItem: (k) => { mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; }
    } });
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const custN = Math.max(12, Math.round(N / 4));
    const customers = [];
    for (let i = 0; i < custN; i++) customers.push({ id: `cust_s_${i}`, name: `Customer ${i}`, phone: `+91 ${9000000000 + i * 7}`, countryCode: '+91', village: `Village ${i % 40}`, sites: [], createdAt: '2024-01-01T00:00:00.000Z' });
    const perDay = Math.max(1, Math.ceil(N / 1095));
    const bills = [];
    const now = Date.now();
    let billed = 0;
    for (let i = 0; i < N; i++) {
        const t = templates[i % templates.length];
        const c = JSON.parse(JSON.stringify(t));
        const day = new Date(now - Math.floor(i / perDay) * 86400000);
        const cust = customers[i % custN];
        c.id = String(1600000000000 + (N - i)); c.billNo = (t.snapshot.docType === 'INVOICE' ? 'SM-' : 'SM-Q') + (100 + N - i);
        c.billDate = ymd(day); c.createdAt = day.toISOString();
        c.custName = cust.name; c.custPhone = cust.phone; c.custLocation = cust.village; c.customerId = cust.id;
        (c.payments || []).forEach((p) => { p.date = ymd(day); p.id = p.id + '_' + i; });
        if (c.snapshot.docType === 'INVOICE') billed += c.snapshot.grandTotal;
        bills.push(c);
    }
    sessionStorage.setItem('scaleExpect', JSON.stringify({ first: bills[0].billNo, last: bills[N - 1].billNo, billed, customers: custN }));
    localStorage.setItem('borebill_history', JSON.stringify(bills));
    localStorage.setItem('borebill_customers', JSON.stringify(customers));
    localStorage.setItem('borebill_brand', JSON.stringify({ companyName: 'Scale Borewells', billPrefix: 'SM', nextBillSeq: 100 + N + 1, nextQuoteSeq: 100 + N + 1, phones: '+91 98427 12345' }));
    localStorage.setItem('drillrig_setup_skipped', '1');
    localStorage.setItem('drillrig_pwa_prompt_dismissed_at', String(now));
}, demo.history, N);

const ms = async (fn, ...args) => p.evaluate(async (src, args) => { const f = eval(src); const s = performance.now(); await f(...args); return Math.round(performance.now() - s); }, `(${fn.toString()})`, args);
const ready = async () => {
    await p.waitForFunction(() => window.boreBillApp && window.boreBillApp.history && window.drillrigStorageStatus, { polling: 50 });
    return p.evaluate(() => Math.round(performance.now()));
};
const settled = async () => p.waitForFunction(() => window.drillrigStorageStatus().pending === 0, { polling: 200 });
const reload = async () => { await p.reload({ waitUntil: 'load' }); return ready(); };
const state = () => p.evaluate(() => {
    const h = window.boreBillApp.history;
    return { n: h.length, first: h[0]?.billNo, last: h[h.length - 1]?.billNo, customers: window.boreBillApp.customers.length,
        billed: h.filter((b) => b.snapshot?.docType === 'INVOICE').reduce((s, b) => s + b.snapshot.grandTotal, 0), mode: window.drillrigStorageStatus().mode };
});

// ---------- S1: first open moves everything into IndexedDB ----------
await p.goto(`${BASE}/index.html`, { waitUntil: 'load' });
const firstOpen = await ready();
await settled();
const expect = JSON.parse(await p.evaluate(() => sessionStorage.getItem('scaleExpect')));
const s1 = await state();
check(`S1 first open: ${N.toLocaleString('en-IN')} bills + ${expect.customers.toLocaleString('en-IN')} customers moved to IndexedDB`, s1.mode === 'indexeddb' && s1.n === N && s1.customers === expect.customers, { ...s1, firstOpenMs: firstOpen });

// ---------- S2: normal open: same bills, same order, same money ----------
const openMs = await reload();
const s2 = await state();
check('S2 after reload: every bill back, newest first, billed total exact', s2.n === N && s2.first === expect.first && s2.last === expect.last && s2.billed === expect.billed, { ...s2, expect });

// ---------- S3: new bill survives a reload straight after saving ----------
await p.evaluate(() => window.boreBillApp.switchTab('tab-bill'));
const saveMs = await ms(() => { const a = window.boreBillApp; a.exitSavedBillMode(true); document.getElementById('custName').value = 'Scale Test'; document.getElementById('totalDepth').value = '450'; a.calculateAndRender(); a.saveCurrentBillToHistory(); });
const newNo = await p.evaluate(() => window.boreBillApp.history[0].billNo);
await new Promise((r) => setTimeout(r, 300));
await reload();
const s3 = await p.evaluate(() => ({ n: window.boreBillApp.history.length, top: window.boreBillApp.history[0].custName, no: window.boreBillApp.history[0].billNo }));
check('S3 a bill saved 0.3 s before closing the app is still there', s3.n === N + 1 && s3.top === 'Scale Test' && s3.no === newNo, s3);

// ---------- S4: payment on an old bill (in-place edit, named) ----------
const target = await p.evaluate(() => { const a = window.boreBillApp; const b = a.history.find((x, i) => i > 1000 && x.snapshot.docType === 'INVOICE' && a.getBillPendingAmount(x) > 0); return { id: b.id, due: a.getBillPendingAmount(b) }; });
const payMs = await ms((id) => { const a = window.boreBillApp; const b = a.history.find((x) => x.id === id); b.payments.push({ id: 'scale_pay', date: '2026-11-14', amount: 1234, mode: 'UPI' }); a.syncBillPaymentSnapshot(b); a.saveToStorage('borebill_history', a.history, [b.id]); }, target.id);
await new Promise((r) => setTimeout(r, 300));
await reload();
const s4 = await p.evaluate((id) => { const a = window.boreBillApp; const b = a.history.find((x) => x.id === id); return { paid: b.payments.some((x) => x.id === 'scale_pay'), due: a.getBillPendingAmount(b) }; }, target.id);
check('S4 a payment on an old bill is kept, and its due goes down by ₹1,234', s4.paid && s4.due === Math.max(0, target.due - 1234), { ...s4, before: target.due });

// ---------- S5: in-place edit nobody named: the safety net saves it ----------
const editId = await p.evaluate(() => { const a = window.boreBillApp; const b = a.history[5000]; b.custLocation = 'Edited Without Hint'; a.saveToStorage('borebill_history', a.history); return b.id; });
await new Promise((r) => setTimeout(r, 1500));
await settled();
await p.waitForFunction(() => true);
await new Promise((r) => setTimeout(r, 4000)); // background check runs in idle slices
await settled();
await reload();
const s5 = await p.evaluate((id) => window.boreBillApp.history.find((x) => x.id === id)?.custLocation, editId);
check('S5 an in-place edit saved without naming it is still on disk after reload', s5 === 'Edited Without Hint', s5);

// ---------- S6: delete survives reload ----------
const delId = await p.evaluate(() => window.boreBillApp.history[42].id);
await p.evaluate((id) => { const a = window.boreBillApp; a.history = a.history.filter((h) => h.id !== id); a.saveToStorage('borebill_history', a.history, []); }, delId);
await new Promise((r) => setTimeout(r, 300));
await reload();
const s6 = await p.evaluate((id) => ({ n: window.boreBillApp.history.length, gone: !window.boreBillApp.history.some((h) => h.id === id) }), delId);
check('S6 a deleted bill stays deleted after reload', s6.gone && s6.n === N, s6);

// ---------- S7: customer search is exact ----------
await p.evaluate(() => window.boreBillApp.switchTab('tab-customers'));
const searchMs = await ms(() => window.boreBillApp.renderCustomerDirectory('Customer 12'));
const s7 = await p.evaluate(() => {
    const a = window.boreBillApp;
    const expected = a.customers.filter((c) => c.name.toLowerCase().includes('customer 12')).length;
    const shown = document.querySelectorAll('#crmCustomerList [data-cust-id]').length;
    return { expected, shown };
});
check('S7 customer search "Customer 12" shows the matching customers (first page of 40)', s7.shown === Math.min(40, s7.expected) && s7.expected > 0, s7);

// ---------- S8: report totals ----------
const exp8 = await p.evaluate(() => window.boreBillApp.history.filter((b) => b.snapshot?.docType === 'INVOICE').reduce((s, b) => s + b.snapshot.grandTotal, 0));
await p.goto(`${BASE}/dashboard.html`, { waitUntil: 'load' });
await p.waitForFunction(() => document.getElementById('kpiTotalBilled')?.textContent && document.getElementById('kpiTotalBilled').textContent !== '₹0', { polling: 50 });
const reportMs = await p.evaluate(() => Math.round(performance.now()));
await p.evaluate(() => document.querySelector('#timePillGroup [data-range="all"]').click());
await new Promise((r) => setTimeout(r, 300));
const s8 = await p.evaluate(() => ({ billed: document.getElementById('kpiTotalBilled').textContent, nodes: document.getElementsByTagName('*').length }));
check('S8 report "All": billed total exact, page stays small', s8.billed === '₹' + exp8.toLocaleString('en-IN') && s8.nodes < 10000, { ...s8, expect: exp8 });
await p.screenshot({ path: `${OUT}/scale_report.png` });

// ---------- speed (desktop headless; phones are slower, so budgets are loose) ----------
const budget = { openMs: 6000, saveMs: 1500, payMs: 500, searchMs: 1500, reportMs: 5000 };
const got = { openMs, saveMs, payMs, searchMs, reportMs };
check(`S9 speed within budget: ${Object.entries(got).map(([k, v]) => `${k.replace('Ms', '')} ${v} ms`).join(', ')}`, Object.entries(budget).every(([k, v]) => got[k] <= v), { got, budget });

check('no page errors / native dialogs', errors.length === 0, errors);
const pass = results.filter((r) => r.ok).length;
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  →  ${r.detail}`}`);
console.log(`\n${pass}/${results.length} passed  (N=${N}, first open ${firstOpen} ms)`);
await browser.close();
process.exitCode = pass === results.length ? 0 : 1;
