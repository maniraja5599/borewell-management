// Shared setup for the browser walkthroughs in e2e/. A phone-sized headless Chrome with all cloud
// traffic blocked, plus small helpers that drive the page like a user.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BASE = process.env.E2E_BASE || 'http://localhost:4173';
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startHarness(label) {
    const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), `drillrig-${label}-`));
    const DL = process.argv[3] || path.join(OUT, 'downloads');
    fs.mkdirSync(DL, { recursive: true });
    for (const f of fs.readdirSync(DL)) fs.unlinkSync(`${DL}/${f}`);

    const results = [];
    const check = (name, ok, detail = '') => results.push({ ok: !!ok, name, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
    const p = await browser.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/GSI|supabase|Failed to load resource/i.test(m.text())) errors.push('console: ' + m.text()); });
    p.on('dialog', async (d) => { errors.push('native dialog: ' + d.message()); await d.dismiss(); });
    await p.setRequestInterception(true);
    p.on('request', (r) => (/supabase\.co|accounts\.google\.com|wa\.me|api\.whatsapp/.test(r.url()) ? r.abort() : r.continue()));
    const cdp = await p.target().createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL.replace(/\//g, '\\') });
    // Headless Chrome cannot show a share sheet: test the download path (the share path is checked separately).
    await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });

    const app = (fn, ...args) => p.evaluate(fn, ...args);
    async function typeInto(id, value) {
        const visible = await app((id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }, id);
        if (visible) {
            await p.$eval(`#${id}`, (e) => { e.focus(); e.select?.(); });
            await p.$eval(`#${id}`, (e) => { e.value = ''; });
            await p.type(`#${id}`, String(value));
            await p.$eval(`#${id}`, (e) => e.dispatchEvent(new Event('change', { bubbles: true })));
            await p.$eval(`#${id}`, (e) => e.blur());
        } else {
            await app((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, id, String(value));
        }
        return visible;
    }
    const clickId = (id) => app((id) => { const e = document.getElementById(id); if (!e) return false; e.click(); return true; }, id);
    const text = (id) => app((id) => document.getElementById(id)?.textContent.trim() || '', id);
    const step = async (name, fn) => { try { await fn(); } catch (e) { check(name, false, 'THREW: ' + e.message); } };

    /** A brand-new company with no bills, no customers and the standard rates. */
    async function freshCompany() {
        await p.goto(`${BASE}/index.html`);
        await app(() => {
            localStorage.clear();
            localStorage.setItem('drillrig_setup_skipped', '1');
            localStorage.setItem('drillrig_signin_gate_skip', '1'); // tests cannot sign in to Google
            localStorage.setItem('drillrig_pwa_prompt_dismissed_at', String(Date.now()));
            localStorage.setItem('borebill_brand', JSON.stringify({ companyName: 'Sri Murugan Borewells', phones: '+91 9842712345', billPrefix: 'SM', nextBillSeq: 101, nextQuoteSeq: 101, upiId: 'murugan@okaxis', upiName: 'Sri Murugan Borewells', address: 'Namakkal' }));
        });
        await p.reload({ waitUntil: 'networkidle0' });
        await wait(800);
    }

    async function finish() {
        check('no page errors / native dialogs', errors.length === 0, errors);
        const pass = results.filter((r) => r.ok).length;
        for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  →  ${r.detail}`}`);
        console.log(`\n${pass}/${results.length} passed  (screenshots: ${OUT})`);
        await browser.close();
        process.exitCode = pass === results.length ? 0 : 1;
    }

    return { p, OUT, DL, check, app, typeInto, clickId, text, step, freshCompany, finish };
}
