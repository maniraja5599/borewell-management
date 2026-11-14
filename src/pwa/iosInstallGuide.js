// Step-by-step "Add to Home Screen" guide for iPhone / iPad. iOS has no install button for
// web apps, so we show the exact taps, with the same symbols the phone shows.

// Same shapes as Apple's symbols (drawn here; the phone's own icons can't be embedded).
const SVG = {
    // Share: rounded box open at the top, arrow pointing up
    share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 9.5H7a2 2 0 0 0-2 2V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8.5a2 2 0 0 0-2-2h-1.5"/><path d="M12 14.5V2.5"/><path d="M8.5 6 12 2.5 15.5 6"/></svg>',
    // ••• (More) button on newer iPhones' Safari bar
    more: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="16.5" cy="12" r="1.6" fill="currentColor"/></svg>',
    // Add to Home Screen: rounded square with a plus
    addHome: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>',
    safari: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15.8 8.2-2.4 5.2-5.2 2.4 2.4-5.2z"/></svg>'
};

/** Which guide fits this phone: 'safari' (iPhone), 'safari-ipad', 'chrome', or 'other' (in-app / other browsers). */
export function iosBrowserKind(ua = navigator.userAgent || '', platform = navigator.platform || '', touchPoints = navigator.maxTouchPoints || 0) {
    const isIPad = /iPad/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
    if (/CriOS/.test(ua)) return 'chrome';
    // Firefox / Edge / Opera, and apps that open links inside themselves (Facebook, Instagram, LINE …)
    if (/FxiOS|EdgiOS|OPiOS|OPT\/|FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|GSA\//.test(ua)) return 'other';
    return isIPad ? 'safari-ipad' : 'safari';
}

function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
}
/** A small picture of the button to tap: the symbol, plus its label when it has one. */
function chip(svgKey, label, extraCls = '') {
    const c = el('span', `ios-chip ${extraCls}`.trim());
    if (svgKey) {
        const i = el('span', 'ios-chip-ic');
        i.innerHTML = SVG[svgKey]; // fixed markup from this file, never user text
        c.append(i);
    }
    if (label) c.append(el('span', 'ios-chip-tx', label));
    return c;
}
function step(n, parts, hint) {
    const row = el('div', 'pwa-ios-step');
    row.append(el('span', 'pwa-step-num', String(n)));
    const body = el('div', 'ios-step-body');
    const line = el('div', 'ios-step-line');
    parts.forEach((p) => line.append(typeof p === 'string' ? document.createTextNode(p) : p));
    body.append(line);
    if (hint) {
        const h = el('div', 'ios-step-hint');
        (Array.isArray(hint) ? hint : [hint]).forEach((p) => h.append(typeof p === 'string' ? document.createTextNode(p) : p));
        body.append(h);
    }
    row.append(body);
    return row;
}

function safariSteps(kind) {
    const where = kind === 'safari-ipad' ? 'at the top right, next to the address bar.' : 'at the bottom of Safari.';
    return [
        step(1, ['Tap ', chip('share', 'Share'), ' ', where],
            kind === 'safari-ipad' ? null : ['Don’t see it? Tap ', chip('more', null, 'is-icon-only'), ' first, then ', chip('share', 'Share'), '.']),
        step(2, ['Tap ', chip('addHome', 'Add to Home Screen'), '.'],
            'Not in the list? Scroll down, or tap “View More”.'),
        step(3, ['Tap ', chip(null, 'Add', 'is-ios-blue'), ' at the top right.'],
            'DrillRig is now on your Home Screen. Open it from there.')
    ];
}

function chromeSteps() {
    return [
        step(1, ['Tap ', chip('share', 'Share'), ' at the top right, in the address bar.']),
        step(2, ['Tap ', chip('addHome', 'Add to Home Screen'), '.'], 'Not in the list? Scroll down, or tap “View More”.'),
        step(3, ['Tap ', chip(null, 'Add', 'is-ios-blue'), ' at the top right.'], 'DrillRig is now on your Home Screen. Open it from there.')
    ];
}

/** Fills the guide box for this phone's browser. Returns the kind it used. */
export function renderIosInstallGuide(box, { kind = iosBrowserKind(), onCopied } = {}) {
    if (!box) return kind;
    box.textContent = '';
    box.dataset.kind = kind;
    if (kind === 'other') {
        const note = el('div', 'ios-open-safari');
        const head = el('div', 'ios-open-safari-head');
        head.append(chip('safari', 'Safari'));
        head.append(el('strong', '', 'Open this page in Safari first'));
        note.append(head);
        note.append(el('p', '', 'Only Safari can add DrillRig to the Home Screen. Copy the link, open Safari, paste it in the address bar, then follow the steps below.'));
        const btn = el('button', 'ios-copy-link-btn', 'Copy link');
        btn.type = 'button';
        btn.addEventListener('click', async () => {
            const url = location.origin + location.pathname;
            let ok = false;
            try { await navigator.clipboard.writeText(url); ok = true; } catch (_) { ok = false; }
            btn.textContent = ok ? 'Link copied ✓' : url;
            onCopied?.(ok);
        });
        note.append(btn);
        box.append(note, ...safariSteps('safari'));
    } else if (kind === 'chrome') {
        box.append(...chromeSteps());
    } else {
        box.append(...safariSteps(kind));
    }
    return kind;
}
