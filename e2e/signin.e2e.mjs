// Required sign-in: the gate covers the app until the phone has a Google session.
// Google itself is blocked here (tests cannot sign in), so we check the gate, its messages, and
// that a phone with a saved session (also offline) opens straight into the app.
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   node e2e/signin.e2e.mjs                            (in another)
import { startHarness, wait, BASE } from './harness.mjs';

const { p, OUT, check, app, step, finish } = await startHarness('signin');
const gate = () => app(() => {
    const g = document.getElementById('signInGate');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return {
        covers: r.width >= innerWidth - 1 && r.height >= innerHeight - 1,
        title: g.querySelector('.sg-title')?.textContent,
        points: g.querySelectorAll('.sg-points li').length,
        local: g.querySelector('.sg-local')?.textContent || '',
        msg: g.querySelector('.sg-msg')?.hidden ? '' : g.querySelector('.sg-msg')?.textContent,
        retry: !!g.querySelector('.sg-retry'),
        legal: [...g.querySelectorAll('.sg-legal a')].map((a) => a.getAttribute('href')),
        soon: [...g.querySelectorAll('.sg-hero #signInComingSoon .cs-tk-group:not([aria-hidden]) .cs-tk-chip')].map((a) => ({ name: a.querySelector('.cs-tk-name').textContent, wa: a.href.startsWith('https://wa.me/918300030123?text='), art: !!a.querySelector('svg linearGradient, svg radialGradient') })),
        soonLoop: g.querySelectorAll('#signInComingSoon .cs-tk-group[aria-hidden="true"] .cs-tk-chip[tabindex="-1"]').length,
        caps: [...g.querySelectorAll('.sg-slider .sg-cap')].map((c) => c.textContent),
        dots: g.querySelectorAll('.sg-slider .sg-dot').length,
        buttonOnScreen: (g.querySelector('#signInGateButton')?.getBoundingClientRect().bottom || 1e9) <= innerHeight,
        topmost: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#signInGate') != null
    };
});
const reset = (extra) => app((extra) => {
    localStorage.clear();
    localStorage.setItem('drillrig_setup_skipped', '1');
    localStorage.setItem('drillrig_pwa_prompt_dismissed_at', String(Date.now()));
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
}, extra);

await p.goto(`${BASE}/index.html`);

await step('S1 new phone', async () => {
    await reset();
    await p.reload({ waitUntil: 'networkidle0' }); await wait(1500);
    const g = await gate();
    check('S1 a new phone sees "Sign in to start" over the whole app, with 3 reasons and Terms/Privacy links',
        g && g.covers && g.topmost && g.title === 'Sign in to start' && g.points === 3 && g.legal.join() === './terms.html,./privacy.html', g);
    check('S1 Google blocked → a clear message and a "Try again" button', g && /Google|internet/i.test(g.msg) && g.retry, g);
    check('S1 top picture is 4 slides with a line each and dots', g && g.caps.length === 4 && g.dots === 4 && g.caps[0] === 'Type the feet. Get the full bill.', g && { caps: g.caps, dots: g.dots });
    await app(() => document.querySelectorAll('#signInGate .sg-dot')[2].click()); await wait(700);
    const slid = await app(() => ({ cur: [...document.querySelectorAll('#signInGate .sg-dot')].findIndex((d) => d.getAttribute('aria-current') === 'true'),
        x: getComputedStyle(document.querySelector('#signInGate .sg-slides')).transform }));
    check('S1 tapping the 3rd dot shows the WhatsApp slide', slid.cur === 2 && slid.x !== 'none', slid);
    check('S1 "Coming soon" strip under the title: 4 chips with 3D icons, each opens WhatsApp; Google button still on the first screen',
        g && g.soon.map((t) => t.name).join('|') === 'Expenses|Staff|Stock|Profit & Loss' && g.soon.every((t) => t.wa && t.art) && g.soonLoop === 4 && g.buttonOnScreen,
        g && { soon: g.soon, loop: g.soonLoop, onScreen: g.buttonOnScreen });
    await p.screenshot({ path: `${OUT}/s1_gate.png` });
});

await step('S2 phone with bills from before', async () => {
    await reset({ borebill_history: JSON.stringify([{ id: 'b1', billNo: 'SM-101', snapshot: { docType: 'INVOICE', grandTotal: 45000 } }, { id: 'b2', billNo: 'SM-102', snapshot: { docType: 'INVOICE', grandTotal: 30000 } }]) });
    await p.reload({ waitUntil: 'networkidle0' }); await wait(1500);
    const g = await gate();
    check('S2 says the 2 bills on this phone stay and get backed up', g && /2 bills on this phone stay/.test(g.local), g);
    const kept = await app(() => window.boreBillApp.history.length);
    check('S2 the bills are still on the phone behind the gate', kept === 2, kept);
});

await step('S3 signed-in phone', async () => {
    const session = { access_token: 'x', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: '00000000-0000-4000-8000-000000000001', email: 'owner@x.com', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Owner' }, app_metadata: {} } };
    await reset({ drillrig_auth: JSON.stringify(session) });
    await p.reload({ waitUntil: 'networkidle0' }); await wait(1500);
    check('S3 a phone with a saved session opens straight into the app (no gate)', (await gate()) === null);
    await p.setOfflineMode(true);
    await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await wait(2000);
    const offline = await gate().catch(() => 'error');
    check('S3 …also when it is offline', offline === null, offline);
    await p.setOfflineMode(false);
});

await step('S4 new phone offline', async () => {
    await reset();
    await p.reload({ waitUntil: 'networkidle0' }); await wait(800);
    await p.setOfflineMode(true);
    await p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await wait(400);
    const g = await gate();
    check('S4 offline and never signed in → "Connect to the internet once to sign in"', g && /Connect to the internet once/.test(g.msg || ''), g);
    await p.setOfflineMode(false);
});

await finish();
