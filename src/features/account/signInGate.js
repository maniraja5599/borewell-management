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

    async function renderButton() {
        if (!gate || rendered || rendering) return;
        if (!navigator.onLine) {
            setMsg('You are offline. Connect to the internet once to sign in — after that DrillRig works without internet.', 'warn');
            return;
        }
        rendering = true;
        setMsg('');
        try {
            await renderGoogleButton(slot, ({ error }) => {
                if (error) setMsg(`Sign-in did not work: ${error}. Please try again.`, 'error');
                // Success: onAccountChange below hides the gate.
            });
            rendered = true;
        } catch (e) {
            setMsg(e?.message || 'Could not load Google sign-in. Check your internet and try again.', 'error');
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
        msg = el('p', { class: 'sg-msg', role: 'status', hidden: true });
        const points = [
            ['☁️', 'Your bills are backed up. A lost or broken phone loses nothing.'],
            ['📱', 'Use DrillRig on more phones and add your staff.'],
            isEarlyAccess() ? ['🎁', `Free Early Access — everything free until ${earlyAccessEndLabel()}.`] : null
        ].filter(Boolean);
        gate = el('div', { class: 'signin-gate', id: 'signInGate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'signInGateTitle' }, [
            el('div', { class: 'sg-card' }, [
                el('img', { class: 'sg-logo', src: 'icon.svg', alt: 'DrillRig' }),
                el('h1', { id: 'signInGateTitle', class: 'sg-title', text: 'Sign in to start' }),
                el('p', { class: 'sg-sub', text: 'DrillRig keeps your bills in your own account, so they are safe and on every phone you use.' }),
                el('ul', { class: 'sg-points' }, points.map(([icon, text]) => el('li', {}, [el('span', { class: 'sg-ic', 'aria-hidden': 'true', text: icon }), el('span', { text })]))),
                bills > 0 ? el('p', { class: 'sg-local', text: `The ${bills} ${bills === 1 ? 'bill' : 'bills'} on this phone stay here and are backed up to your account after you sign in.` }) : null,
                slot,
                msg,
                el('p', { class: 'sg-legal' }, ['By continuing you agree to the ',
                    el('a', { href: './terms.html', target: '_blank', rel: 'noopener', text: 'Terms' }), ' and ',
                    el('a', { href: './privacy.html', target: '_blank', rel: 'noopener', text: 'Privacy Policy' }), '.'])
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
