// Sign-in is required (decided 14 Nov 2026): until the phone has a Google session, a full-screen
// card asks the user to sign in. Once signed in, the app works offline as before; the saved
// session is enough, so a phone that is offline later is never locked out.
// Bills already on the phone stay; after sign-in, sync uploads them to the user's account
// (accountUI.js handles that, including "another account's data is on this phone").
import { renderGoogleButton, onAccountChange } from '../../cloud/auth.js';
import { isEarlyAccess, earlyAccessEndLabel } from '../../config/plans.js';
import { storage, STORAGE_KEYS } from '../../data/storage.js';

// Automated browser tests only (they cannot sign in to Google). Not a security boundary:
// what the gate protects is the product rule "data lives in the user's account", not secrets.
export const SIGNIN_GATE_SKIP_KEY = 'drillrig_signin_gate_skip';

/** True when this phone has a saved Supabase session (works offline, no network call). */
export function hasStoredSession() {
    try {
        const raw = localStorage.getItem('drillrig_auth');
        if (!raw) return false;
        const s = JSON.parse(raw);
        return !!(s?.user?.id || s?.currentSession?.user?.id);
    } catch {
        return false;
    }
}

function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'text') n.textContent = v;
        else if (k === 'class') n.className = v;
        else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
}

// Art for the sign-in page: 3D-style icons drawn in SVG (gradients, highlights, soft shadows).
// Static strings with no user data; each copy gets its own gradient ids.
const CLOUD_PATH = 'M17 46h29a11 11 0 0 0 1.4-21.9A15 15 0 0 0 18.6 25.5 10.3 10.3 0 0 0 17 46z';
function cloud3d(id) {
    return `<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe0f5"/></linearGradient>
<radialGradient id="${id}b" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#86efac"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></radialGradient>
</defs>
<ellipse cx="32" cy="57" rx="21" ry="3.5" fill="#0f1a14" opacity=".14"/>
<path d="${CLOUD_PATH}" transform="translate(0 3)" fill="#8fb0d8"/>
<path d="${CLOUD_PATH}" fill="url(#${id}a)"/>
<ellipse cx="27" cy="27.5" rx="7.5" ry="3.6" fill="#fff" opacity=".95"/>
<circle cx="45" cy="45" r="11" transform="translate(0 2)" fill="#14532d"/>
<circle cx="45" cy="45" r="11" fill="url(#${id}b)"/>
<ellipse cx="41.5" cy="40.5" rx="4" ry="2.2" fill="#fff" opacity=".45"/>
<path d="M40 45.5l3.4 3.4L50 42" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const ART = {
    cloud: (id) => cloud3d(id),
    phones: (id) => `<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#047857"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4555"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dcfce7"/></linearGradient>
</defs>
<ellipse cx="33" cy="58" rx="21" ry="3.2" fill="#0f1a14" opacity=".14"/>
<g transform="rotate(-14 22 33)">
<rect x="11" y="13" width="22" height="38" rx="5" fill="#065f46"/>
<rect x="9" y="11" width="22" height="38" rx="5" fill="url(#${id}a)"/>
<rect x="12" y="15" width="16" height="28" rx="2.5" fill="#ecfdf5" opacity=".92"/>
<rect x="14" y="18" width="12" height="3.5" rx="1.5" fill="#10b981"/>
<rect x="14" y="25" width="9" height="2" rx="1" fill="#a7f3d0"/>
</g>
<rect x="32" y="14" width="24" height="42" rx="5.5" fill="#020617"/>
<rect x="30" y="12" width="24" height="42" rx="5.5" fill="url(#${id}b)"/>
<rect x="33" y="16" width="18" height="32" rx="3" fill="url(#${id}c)"/>
<rect x="35" y="19" width="14" height="4.5" rx="1.6" fill="#15803d"/>
<rect x="35" y="27" width="10" height="2" rx="1" fill="#94a3b8"/>
<rect x="35" y="31" width="12" height="2" rx="1" fill="#cbd5e1"/>
<rect x="35" y="40" width="14" height="5" rx="2.5" fill="#22c55e"/>
<rect x="39" y="50.6" width="6" height="1.6" rx=".8" fill="#4b5563"/>
<path d="M31.5 17c0-2.5 1.5-4 4-4h3l-7.5 16z" fill="#fff" opacity=".12"/>`,
    gift: (id) => `<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#b91c1c"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#dc2626"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></linearGradient>
</defs>
<ellipse cx="32" cy="58" rx="21" ry="3.2" fill="#0f1a14" opacity=".14"/>
<rect x="13" y="32" width="38" height="24" rx="4" fill="#7f1d1d"/>
<rect x="13" y="30" width="38" height="24" rx="4" fill="url(#${id}a)"/>
<rect x="10" y="24" width="44" height="11" rx="3.5" fill="#991b1b"/>
<rect x="10" y="22" width="44" height="11" rx="3.5" fill="url(#${id}b)"/>
<rect x="28.5" y="22" width="7" height="32" fill="url(#${id}c)"/>
<path d="M32 22c-3-8-13-9-13-3 0 4 7 4 13 3z" fill="url(#${id}c)"/>
<path d="M32 22c3-8 13-9 13-3 0 4-7 4-13 3z" fill="url(#${id}c)"/>
<circle cx="32" cy="22" r="3.2" fill="#f59e0b"/>
<rect x="13" y="24.5" width="12" height="2.2" rx="1.1" fill="#fff" opacity=".5"/>
<rect x="16" y="34" width="2.4" height="14" rx="1.2" fill="#fff" opacity=".25"/>`
};
let artSeq = 0;
function art3d(name, size = 52) {
    const id = `sg3${name}${++artSeq}`;
    const span = el('span', { class: `sg-art sg-art-${name}`, 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}">${ART[name](id)}</svg>`;
    return span;
}

/** Hero picture: a phone showing a paid bill, a cloud with a tick and a gold rupee coin. */
function heroArt() {
    const wrap = el('div', { class: 'sg-hero-art', 'aria-hidden': 'true' });
    wrap.innerHTML = `<svg viewBox="0 0 320 214" width="320" height="214">
<defs>
<radialGradient id="sghGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4ade80" stop-opacity=".42"/><stop offset="1" stop-color="#4ade80" stop-opacity="0"/></radialGradient>
<linearGradient id="sghBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4555"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
<linearGradient id="sghScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eefcf3"/></linearGradient>
<linearGradient id="sghBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient>
<radialGradient id="sghCoin" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></radialGradient>
</defs>
<ellipse cx="160" cy="104" rx="140" ry="100" fill="url(#sghGlow)"/>
<ellipse cx="162" cy="204" rx="62" ry="7" fill="#000" opacity=".28"/>
<g class="sg-phone">
<rect x="120" y="18" width="90" height="182" rx="18" fill="#020617"/>
<rect x="115" y="13" width="90" height="182" rx="18" fill="url(#sghBody)"/>
<rect x="121" y="21" width="78" height="166" rx="12" fill="url(#sghScr)"/>
<rect x="148" y="25" width="24" height="5" rx="2.5" fill="#0b1220"/>
<rect x="129" y="38" width="62" height="17" rx="4.5" fill="url(#sghBar)"/>
<text x="160" y="49.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="7.5" font-weight="800" letter-spacing=".8" fill="#fff">FINAL BILL</text>
<rect x="129" y="63" width="40" height="4" rx="2" fill="#cbd5e1"/><rect x="175" y="63" width="16" height="4" rx="2" fill="#94a3b8"/>
<rect x="129" y="73" width="32" height="4" rx="2" fill="#cbd5e1"/><rect x="175" y="73" width="16" height="4" rx="2" fill="#94a3b8"/>
<rect x="129" y="83" width="44" height="4" rx="2" fill="#cbd5e1"/><rect x="179" y="83" width="12" height="4" rx="2" fill="#94a3b8"/>
<rect x="129" y="93" width="28" height="4" rx="2" fill="#cbd5e1"/><rect x="175" y="93" width="16" height="4" rx="2" fill="#94a3b8"/>
<rect x="129" y="105" width="62" height="1.5" fill="#e2e8f0"/>
<text x="129" y="122" font-family="Inter, sans-serif" font-size="7" font-weight="700" letter-spacing=".6" fill="#64748b">TOTAL</text>
<text x="129" y="142" font-family="'Plus Jakarta Sans', Inter, sans-serif" font-size="14" font-weight="800" fill="#15803d">₹83,000</text>
<rect x="129" y="152" width="38" height="15" rx="7.5" fill="#dcfce7"/>
<text x="148" y="162.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="7.5" font-weight="800" fill="#15803d">PAID</text>
<path d="M121 33c0-6.6 5.4-12 12-12h20L121 92z" fill="#fff" opacity=".35"/>
</g>
<g transform="translate(206 8) scale(1.45)"><g class="sg-float-a">${cloud3d('sghCl')}</g></g>
<g transform="translate(40 112)"><g class="sg-float-b">
<circle cx="32" cy="36" r="27" fill="#92400e"/>
<circle cx="32" cy="31" r="27" fill="url(#sghCoin)"/>
<circle cx="32" cy="31" r="20" fill="none" stroke="#fde68a" stroke-width="2.2" opacity=".85"/>
<text x="32" y="40.5" text-anchor="middle" font-family="'Plus Jakarta Sans', Inter, sans-serif" font-size="26" font-weight="800" fill="#92400e">₹</text>
<ellipse cx="23" cy="18" rx="8" ry="4" fill="#fff" opacity=".55"/>
</g></g>
<path d="M78 34l2.2 5.8 5.8 2.2-5.8 2.2L78 50l-2.2-5.8L70 42l5.8-2.2z" fill="#fff" opacity=".85"/>
<path d="M262 150l1.6 4.2 4.2 1.6-4.2 1.6-1.6 4.2-1.6-4.2-4.2-1.6 4.2-1.6z" fill="#fde68a" opacity=".95"/>
<path d="M96 168l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#fff" opacity=".6"/>
</svg>`;
    return wrap;
}

function googleBadge() {
    const span = el('span', { class: 'sg-gbadge' });
    span.innerHTML = `<svg viewBox="0 0 48 48" width="22" height="22">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;
    return span;
}
function arrowBadge() {
    const span = el('span', { class: 'sg-garrow' });
    span.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
    return span;
}

// Small outline icons for the notes.
const ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    wifi: '<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2.14-1.6"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M12 20h.01"/>'
};
function icon3(name) {
    const span = el('span', { class: `sg-ic sg-ic-${name}`, 'aria-hidden': 'true' });
    span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    return span;
}

export function initSignInGate(app) {
    try { if (localStorage.getItem(SIGNIN_GATE_SKIP_KEY) === '1') return; } catch { /* ignore */ }

    let gate = null;
    let slot = null;
    let msg = null;
    let rendering = false;
    let rendered = false;

    const setMsg = (text, tone = '') => {
        if (!msg) return;
        msg.textContent = text || '';
        msg.hidden = !text;
        msg.dataset.tone = tone;
    };

    // Our own "Continue with Google" button. Google's real button is laid over it, almost
    // invisible, so every tap still goes to Google's sign-in (same ID-token flow as before).
    function buildGoogleSlot() {
        const sub = el('small', { class: 'sg-gsub', text: 'Getting Google ready…' });
        const face = el('div', { class: 'sg-gface', 'aria-hidden': 'true' }, [
            googleBadge(),
            el('span', { class: 'sg-gtxt' }, [el('strong', { text: 'Continue with Google' }), sub]),
            arrowBadge()
        ]);
        const real = el('div', { class: 'sg-greal' });
        slot.replaceChildren(face, real);
        slot.dataset.state = 'loading';
        return { real, sub };
    }

    async function renderButton() {
        if (!gate || rendered || rendering) return;
        if (!navigator.onLine) {
            setMsg('You are offline. Connect to the internet once to sign in — after that DrillRig works without internet.', 'warn');
            return;
        }
        rendering = true;
        setMsg('');
        const { real, sub } = buildGoogleSlot();
        try {
            await renderGoogleButton(real, ({ error }) => {
                if (error) setMsg(`Sign-in did not work: ${error}. Please try again.`, 'error');
                // Success: onAccountChange below hides the gate.
            }, { maxWidth: 400 });
            rendered = true;
            slot.dataset.state = 'ready';
            sub.textContent = 'No new password to remember';
        } catch (e) {
            setMsg(e?.message || 'Could not load Google sign-in. Check your internet and try again.', 'error');
            slot.dataset.state = 'error';
            slot.replaceChildren(el('button', { type: 'button', class: 'sg-retry', text: 'Try again' }));
            slot.firstChild.addEventListener('click', () => { rendered = false; renderButton(); });
        } finally {
            rendering = false;
        }
    }

    function show() {
        if (gate) return;
        let bills = 0;
        try { bills = storage.getList(STORAGE_KEYS.history).length; } catch { /* ignore */ }
        slot = el('div', { class: 'sg-gbtn', id: 'signInGateButton' });
        buildGoogleSlot();
        msg = el('p', { class: 'sg-msg', role: 'status', hidden: true });
        const points = [
            ['cloud', 'Backed up automatically', 'A lost or broken phone loses nothing.'],
            ['phones', 'On every phone you use', 'Open your bills on more phones and add your staff.'],
            isEarlyAccess() ? ['gift', `Free until ${earlyAccessEndLabel()}`, 'Free Early Access: every feature included.'] : null
        ].filter(Boolean);
        gate = el('div', { class: 'signin-gate', id: 'signInGate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'signInGateTitle' }, [
            el('div', { class: 'sg-card' }, [
                el('header', { class: 'sg-hero' }, [
                    el('div', { class: 'sg-brand' }, [
                        el('span', { class: 'sg-logo-tile' }, [el('img', { class: 'sg-logo', src: 'icon.svg', alt: '' })]),
                        el('span', { class: 'sg-brand-name', text: 'DrillRig.' }),
                        el('span', { class: 'sg-brand-tag', text: 'Borewell billing' })
                    ]),
                    heroArt(),
                    el('h1', { id: 'signInGateTitle', class: 'sg-title', text: 'Sign in to start' }),
                    el('p', { class: 'sg-sub', text: 'Your bills live in your own account: safe, and on every phone you use.' })
                ]),
                el('div', { class: 'sg-body' }, [
                    el('ul', { class: 'sg-points' }, points.map(([icon, title, text]) => el('li', {}, [
                        art3d(icon),
                        el('span', { class: 'sg-pt' }, [el('strong', { text: title }), el('span', { text })])
                    ]))),
                    bills > 0 ? el('p', { class: 'sg-local' }, [icon3('check'), el('span', { text: `The ${bills} ${bills === 1 ? 'bill' : 'bills'} on this phone stay here and are backed up to your account after you sign in.` })]) : null,
                    slot,
                    msg,
                    el('p', { class: 'sg-offline-note' }, [icon3('wifi'), el('span', { text: 'After the first sign-in, DrillRig works without internet.' })]),
                    el('p', { class: 'sg-legal' }, ['By continuing you agree to the ',
                        el('a', { href: './terms.html', target: '_blank', rel: 'noopener', text: 'Terms' }), ' and ',
                        el('a', { href: './privacy.html', target: '_blank', rel: 'noopener', text: 'Privacy Policy' }), '.'])
                ])
            ])
        ]);
        document.body.append(gate);
        document.documentElement.classList.add('signin-gate-open');
        renderButton();
    }

    function hide() {
        if (!gate) return;
        gate.remove();
        gate = null;
        rendered = false;
        document.documentElement.classList.remove('signin-gate-open');
    }

    window.addEventListener('online', () => { if (gate) renderButton(); });
    window.addEventListener('offline', () => { if (gate && !rendered) setMsg('You are offline. Connect to the internet once to sign in — after that DrillRig works without internet.', 'warn'); });

    if (!hasStoredSession()) show();
    // Signed in → open the app. Signed out (session removed) → ask again.
    onAccountChange((acc) => {
        if (acc) {
            const wasOpen = !!gate;
            hide();
            if (wasOpen) app?.showToast?.(`✅ Signed in as ${acc.email}`);
        } else if (!hasStoredSession()) {
            show();
        }
    }).catch(() => { /* offline: the gate (if shown) already explains */ });
}
