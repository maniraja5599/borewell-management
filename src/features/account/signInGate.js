// Sign-in is required (decided 14 Nov 2026): until the phone has a Google session, a full-screen
// card asks the user to sign in. Once signed in, the app works offline as before; the saved
// session is enough, so a phone that is offline later is never locked out.
// Bills already on the phone stay; after sign-in, sync uploads them to the user's account
// (accountUI.js handles that, including "another account's data is on this phone").
import { renderGoogleButton, onAccountChange } from '../../cloud/auth.js';
import { isEarlyAccess, earlyAccessEndLabel } from '../../config/plans.js';
import { storage, STORAGE_KEYS } from '../../data/storage.js';
import { versionLabel } from '../../config/version.js';
import { buildComingSoonTicker } from '../settings/comingSoon.js';
import { pendingJoinCode } from '../team/joinLink.js';

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

// ---------- Hero slides: four 3D-icon pictures that slide by themselves ----------
// Static SVG strings, no user data. Gradient ids are prefixed per slide so they never clash.
const FONT = `font-family="Inter, sans-serif"`;
const JK = `font-family="'Plus Jakarta Sans', Inter, sans-serif"`;
const txt = (x, y, size, weight, fill, text, extra = '') => `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${text}</text>`;
const sparkle = (x, y, r, fill, op) => `<path d="M${x} ${y - r}l${r * 0.24} ${r * 0.76} ${r * 0.76} ${r * 0.24}-${r * 0.76} ${r * 0.24}-${r * 0.24} ${r * 0.76}-${r * 0.24}-${r * 0.76}-${r * 0.76}-${r * 0.24} ${r * 0.76}-${r * 0.24}z" fill="${fill}" opacity="${op}"/>`;
const glow = (id) => `<radialGradient id="${id}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4ade80" stop-opacity=".36"/><stop offset="1" stop-color="#4ade80" stop-opacity="0"/></radialGradient>`;
const tick = (cx, cy, r, id) => `<circle cx="${cx}" cy="${cy + 1.5}" r="${r}" fill="#14532d"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}ok)"/><path d="M${cx - r * 0.42} ${cy + 0.2}l${r * 0.3} ${r * 0.3} ${r * 0.55}-${r * 0.6}" fill="none" stroke="#fff" stroke-width="${r * 0.26}" stroke-linecap="round" stroke-linejoin="round"/>`;
const okGrad = (id) => `<radialGradient id="${id}ok" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#86efac"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></radialGradient>`;
const WA_PATH = 'M12 2a10 10 0 0 0-8.66 15l-1.3 4.76 4.88-1.28A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-2.9.76.78-2.83-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.42l-.75-1.8c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.46-.28z';

/** Slide 1: the rig lorry (public/signin-rig.webp, picture supplied by the owner) + "450 ft" + a phone where the feet are typed and the whole bill fills in. */
function slideBill(id) {
    const lines = [['Drilling · 450 ft', '₹43,000'], ['Casing 7" · 60 ft', '₹24,000'], ['Casing 10" · 20 ft', '₹14,000'], ['Bata &amp; extras', '₹2,500']];
    const lineSvg = lines.map(([l, v], i) => `<g class="sgx-s" data-step="${5 + i}">${txt(184, 98 + i * 15, 7.4, 600, '#334155', l)}${txt(292, 98 + i * 15, 7.6, 800, '#0f1a14', v, 'text-anchor="end"')}</g>`).join('');
    return `<defs>${glow(id)}
<linearGradient id="${id}body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4555"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
<linearGradient id="${id}scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eefcf3"/></linearGradient>
<linearGradient id="${id}bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient>
</defs>
<ellipse cx="160" cy="104" rx="150" ry="100" fill="url(#${id}glow)"/>
<ellipse cx="82" cy="178" rx="76" ry="7" fill="#000" opacity=".35"/>
<image href="signin-rig.webp" x="0" y="72" width="164" height="105.7" preserveAspectRatio="xMidYMax meet"/>
<rect x="14" y="40" width="58" height="21" rx="10.5" fill="#b45309"/>
<rect x="14" y="38.5" width="58" height="21" rx="10.5" fill="#facc15"/>
<path d="M25 45.5v7.5M21.6 49.8 25 53.2l3.4-3.4" fill="none" stroke="#1c1917" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
${txt(48, 53.4, 10.5, 800, '#1c1917', '450 ft', 'text-anchor="middle"')}
<path class="sgx-flow" d="M74 49C112 49 134 64 160 66" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
<path d="M159 61.5 164.5 66 159 70.5" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<ellipse cx="240" cy="207" rx="58" ry="5" fill="#000" opacity=".28"/>
<rect x="174" y="10" width="134" height="196" rx="17" fill="#020617"/>
<rect x="170" y="6" width="134" height="196" rx="17" fill="url(#${id}body)"/>
<rect x="176" y="13" width="122" height="183" rx="12" fill="url(#${id}scr)"/>
<rect x="225" y="17" width="24" height="5" rx="2.5" fill="#0b1220"/>
<rect x="184" y="28" width="108" height="16" rx="4.5" fill="url(#${id}bar)"/>
${txt(238, 39, 7.4, 800, '#fff', 'BOREWELL BILL', 'text-anchor="middle" letter-spacing=".8"')}
<rect x="184" y="50" width="108" height="30" rx="6" fill="#fff" stroke="#15803d" stroke-width="1.6"/>
${txt(190, 60, 6.4, 700, '#64748b', 'DEPTH DRILLED', 'letter-spacing=".5"')}
<text x="190" y="75" ${JK} font-size="13" font-weight="800" fill="#0f1a14"><tspan class="sgx-s" data-step="1">4</tspan><tspan class="sgx-s" data-step="2">5</tspan><tspan class="sgx-s" data-step="3">0</tspan><tspan class="sgx-s" data-step="4" fill="#64748b" font-size="10"> ft</tspan></text>
${lineSvg}
<g class="sgx-s" data-step="9"><rect x="184" y="149" width="108" height="1.2" fill="#e2e8f0"/>
${txt(184, 165, 6.6, 700, '#64748b', 'TOTAL', 'letter-spacing=".6"')}
<text x="292" y="167" text-anchor="end" ${JK} font-size="15" font-weight="800" fill="#15803d">₹83,500</text></g>
<g class="sgx-s" data-step="10"><rect x="184" y="174" width="108" height="16" rx="8" fill="#22c55e"/>
${txt(238, 184.6, 7, 800, '#fff', 'Send on WhatsApp', 'text-anchor="middle"')}</g>
<path d="M176 25c0-6.6 5.4-12 12-12h18L176 80z" fill="#fff" opacity=".22"/>
${sparkle(150, 26, 7, '#fde68a', 0.9)}${sparkle(100, 196, 5, '#fff', 0.6)}`;
}

/** Slide 2: 3D calculator + ticked chips: slab rates, casing pipes, bata. */
function slideRates(id) {
    const keys = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const last = r === 2 && c === 2;
        keys.push(`<rect x="${17 + c * 10.6}" y="${29 + r * 8.6}" width="8.6" height="6.6" rx="1.8" fill="${last ? `url(#${id}o)` : '#e2e8f0'}"/>`);
    }
    const chip = (y, title, sub) => `<g transform="translate(0 ${y})">
<rect x="160" y="3" width="148" height="44" rx="14" fill="#052e16" opacity=".55"/>
<rect x="160" y="0" width="148" height="44" rx="14" fill="#fff"/>
${tick(183, 22, 11, id)}
${txt(201, 19, 11.5, 800, '#0f1a14', title)}${txt(201, 33, 9, 600, '#64748b', sub)}</g>`;
    return `<defs>${glow(id)}${okGrad(id)}
<linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
<linearGradient id="${id}sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcfce7"/><stop offset="1" stop-color="#86efac"/></linearGradient>
<linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#ea580c"/></linearGradient>
<radialGradient id="${id}coin" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></radialGradient>
</defs>
<ellipse cx="160" cy="104" rx="150" ry="100" fill="url(#${id}glow)"/>
<g transform="translate(8 30) scale(2.3)">
<ellipse cx="32" cy="59" rx="24" ry="3" fill="#000" opacity=".32"/>
<rect x="13.5" y="8" width="40" height="50" rx="7" fill="#020617"/>
<rect x="12" y="6" width="40" height="50" rx="7" fill="url(#${id}k)"/>
<rect x="16" y="10" width="32" height="14" rx="3" fill="url(#${id}sc)"/>
<text x="32" y="20.2" text-anchor="middle" ${JK} font-size="6.4" font-weight="800" fill="#14532d">₹43,000</text>
${keys.join('')}
<rect x="14" y="8" width="20" height="1.6" rx=".8" fill="#fff" opacity=".25"/>
<circle cx="52" cy="50" r="9" fill="#b45309"/><circle cx="52" cy="48.6" r="9" fill="url(#${id}coin)"/>
<text x="52" y="52.6" text-anchor="middle" ${JK} font-size="11" font-weight="800" fill="#92400e">₹</text>
</g>
${chip(22, 'Slab rates', '450 ft → ₹43,000')}${chip(80, 'Casing pipes', '7" & 10" by the foot')}${chip(138, 'Bata &amp; extras', 'From your rate card')}
${sparkle(150, 18, 6, '#fde68a', 0.9)}`;
}

/** Slide 3: phone with the bill + WhatsApp chat bubbles. */
function slideWhatsApp(id) {
    return `<defs>${glow(id)}
<linearGradient id="${id}body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4555"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
<linearGradient id="${id}bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient>
<radialGradient id="${id}wa" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#6ee7a0"/><stop offset=".55" stop-color="#25d366"/><stop offset="1" stop-color="#128c4a"/></radialGradient>
</defs>
<ellipse cx="160" cy="104" rx="150" ry="100" fill="url(#${id}glow)"/>
<ellipse cx="78" cy="207" rx="52" ry="5" fill="#000" opacity=".28"/>
<g transform="rotate(-6 78 104)">
<rect x="34" y="14" width="96" height="182" rx="16" fill="#020617"/>
<rect x="30" y="10" width="96" height="182" rx="16" fill="url(#${id}body)"/>
<rect x="36" y="17" width="84" height="169" rx="11" fill="#f8fafc"/>
<rect x="66" y="21" width="24" height="5" rx="2.5" fill="#0b1220"/>
<rect x="43" y="34" width="70" height="104" rx="6" fill="#fff" stroke="#e2e8f0"/>
<rect x="43" y="34" width="70" height="14" rx="6" fill="url(#${id}bar)"/><rect x="43" y="42" width="70" height="6" fill="#15803d"/>
${txt(78, 44, 6.4, 800, '#fff', 'BILL SM-101', 'text-anchor="middle" letter-spacing=".6"')}
<g fill="#cbd5e1"><rect x="49" y="56" width="34" height="3.4" rx="1.7"/><rect x="49" y="66" width="28" height="3.4" rx="1.7"/><rect x="49" y="76" width="38" height="3.4" rx="1.7"/><rect x="49" y="86" width="24" height="3.4" rx="1.7"/></g>
<g fill="#94a3b8"><rect x="93" y="56" width="14" height="3.4" rx="1.7"/><rect x="93" y="66" width="14" height="3.4" rx="1.7"/><rect x="93" y="76" width="14" height="3.4" rx="1.7"/><rect x="97" y="86" width="10" height="3.4" rx="1.7"/></g>
<rect x="49" y="97" width="58" height="1" fill="#e2e8f0"/>
${txt(49, 108, 6, 700, '#64748b', 'TOTAL')}
<text x="49" y="126" ${JK} font-size="14" font-weight="800" fill="#15803d">₹83,500</text>
<rect x="43" y="146" width="70" height="22" rx="11" fill="url(#${id}wa)"/>
<path d="${WA_PATH}" fill="#fff" transform="translate(50 150) scale(.58)"/>
${txt(86, 160.6, 7.4, 800, '#fff', 'Share', 'text-anchor="middle"')}
<path d="M36 28c0-6 5-11 11-11h14L36 74z" fill="#fff" opacity=".22"/>
</g>
<circle cx="134" cy="38" r="21" fill="#0e6b37"/><circle cx="134" cy="35" r="21" fill="url(#${id}wa)"/>
<path d="${WA_PATH}" fill="#fff" transform="translate(121 22) scale(1.08)"/>
<ellipse cx="127" cy="24" rx="7" ry="3.5" fill="#fff" opacity=".35"/>
<g transform="translate(0 0)">
<rect x="164" y="74" width="144" height="56" rx="14" fill="#052e16" opacity=".5"/>
<rect x="162" y="70" width="144" height="56" rx="14" fill="#dcf8c6"/>
<path d="M300 112l14 12-18-3z" fill="#dcf8c6"/>
<rect x="172" y="79" width="26" height="30" rx="4" fill="#ef4444"/>${txt(185, 98, 7.6, 800, '#fff', 'PDF', 'text-anchor="middle"')}
${txt(206, 90, 10, 800, '#0f1a14', 'Bill SM-101.pdf')}${txt(206, 104, 8.6, 600, '#3f6212', 'Ravi Kumar · ₹83,500')}
${txt(296, 120, 7, 600, '#64748b', '10:42', 'text-anchor="end"')}
<path d="M262 116.5l2 2 3.6-4M266 116.5l2 2 3.6-4" fill="none" stroke="#34b7f1" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="164" y="146" width="118" height="34" rx="12" fill="#052e16" opacity=".5"/>
<rect x="162" y="142" width="118" height="34" rx="12" fill="#fff"/>
<path d="M168 168l-12 9 16-3z" fill="#fff"/>
${txt(174, 163, 10, 700, '#0f1a14', 'Got it, thank you!')}
</g>
${sparkle(306, 50, 6, '#fde68a', 0.9)}${sparkle(156, 196, 4, '#fff', 0.6)}`;
}

/** Slide 4: 3D ledger book + who still owes you. */
function slideDues(id) {
    // One row: status dot, name + place, amount pill on the right.
    const row = (y, name, sub, amt, due) => `<g transform="translate(0 ${y})">
<circle cx="178" cy="12" r="3.6" fill="${due ? '#dc2626' : '#16a34a'}"/>
${txt(187, 15.4, 10, 800, '#0f1a14', name)}${txt(187, 28, 8, 600, '#64748b', sub)}
<rect x="${due ? 252 : 262}" y="9" width="${due ? 46 : 36}" height="18" rx="9" fill="${due ? '#fef2f2' : '#ecfdf3'}" stroke="${due ? '#fecaca' : '#bbf7d0'}"/>
${txt(due ? 275 : 280, 21.4, 8.6, 800, due ? '#b91c1c' : '#15803d', amt, 'text-anchor="middle"')}</g>`;
    return `<defs>${glow(id)}
<linearGradient id="${id}cv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#14532d"/></linearGradient>
<linearGradient id="${id}due" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#b91c1c"/></linearGradient>
<radialGradient id="${id}coin" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></radialGradient>
</defs>
<ellipse cx="160" cy="104" rx="150" ry="100" fill="url(#${id}glow)"/>
<g transform="translate(10 26) scale(2.25)">
<ellipse cx="31" cy="59" rx="24" ry="3" fill="#000" opacity=".32"/>
<rect x="14" y="10" width="38" height="46" rx="3" fill="#cbd5e1"/>
<rect x="13" y="9" width="38" height="46" rx="3" fill="#f8fafc"/>
<g stroke="#cbd5e1" stroke-width=".8"><path d="M18 18h28M18 24h28M18 30h28M18 36h28M18 42h28"/></g>
<rect x="9" y="8" width="38" height="46" rx="4" fill="#0f3d22"/>
<rect x="8" y="6" width="38" height="46" rx="4" fill="url(#${id}cv)"/>
<rect x="8" y="6" width="6" height="46" rx="3" fill="#14532d"/>
<rect x="19" y="15" width="22" height="11" rx="2.5" fill="#fff" opacity=".92"/>
<text x="30" y="23.6" text-anchor="middle" ${JK} font-size="8" font-weight="800" fill="#14532d">DUES</text>
<path d="M38 52v9l3-2.4 3 2.4v-9z" fill="#dc2626"/>
<rect x="17" y="8" width="20" height="1.6" rx=".8" fill="#fff" opacity=".3"/>
<circle cx="47" cy="45" r="9" fill="#b45309"/><circle cx="47" cy="43.6" r="9" fill="url(#${id}coin)"/>
<text x="47" y="47.6" text-anchor="middle" ${JK} font-size="11" font-weight="800" fill="#92400e">₹</text>
</g>
<rect x="18" y="186" width="112" height="22" rx="11" fill="#7f1d1d"/>
<rect x="18" y="184" width="112" height="22" rx="11" fill="url(#${id}due)"/>
<text x="74" y="199" text-anchor="middle" ${JK} font-size="11" font-weight="800" fill="#fff">₹47,500 to collect</text>
<rect x="164" y="34" width="146" height="146" rx="16" fill="#052e16" opacity=".5"/>
<rect x="162" y="30" width="146" height="146" rx="16" fill="#fff"/>
${txt(174, 50, 7.4, 800, '#14532d', 'WHO OWES YOU', 'letter-spacing=".7"')}
${row(56, 'Ravi Kumar', '450 ft · Attur', '₹35,000', true)}
<rect x="174" y="95" width="122" height="1" fill="#edf1ee"/>
${row(99, 'Murugan', '300 ft · Velur', '₹12,500', true)}
<rect x="174" y="138" width="122" height="1" fill="#edf1ee"/>
${row(142, 'Selvi', '600 ft · Salem', 'Paid', false)}
${sparkle(150, 22, 6, '#fde68a', 0.9)}`;
}

const HERO_SLIDES = [
    { key: 'bill', caption: 'Type the feet. Get the full bill.', art: slideBill },
    { key: 'rates', caption: 'Rates, casing & bata, done for you', art: slideRates },
    { key: 'whatsapp', caption: 'Send the bill on WhatsApp', art: slideWhatsApp },
    { key: 'dues', caption: 'See who still owes you', art: slideDues }
];

/** The hero: slides (picture + one line each) and dots. startHeroSlider makes it move. */
function heroArt() {
    const track = el('div', { class: 'sg-slides' });
    HERO_SLIDES.forEach((sl, i) => {
        const art = el('div', { class: 'sg-hero-art', 'aria-hidden': 'true' });
        art.innerHTML = `<svg viewBox="0 0 320 214" width="320" height="214">${sl.art(`sgh${i}`)}</svg>`;
        track.append(el('div', { class: `sg-slide sg-slide-${sl.key}`, role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${HERO_SLIDES.length}` }, [
            art, el('p', { class: 'sg-cap', text: sl.caption })
        ]));
    });
    const dots = el('div', { class: 'sg-dots' }, HERO_SLIDES.map((sl, i) =>
        el('button', { type: 'button', class: 'sg-dot', 'aria-label': `Show: ${sl.caption}` })));
    return el('div', { class: 'sg-slider', role: 'region', 'aria-roledescription': 'carousel', 'aria-label': 'What DrillRig does' }, [
        el('div', { class: 'sg-slides-view' }, [track]), dots
    ]);
}

/**
 * Moves the slides by themselves (bill slide stays longer while its bill fills in), with swipe and
 * dots. Reduced motion: no auto-move, and the bill shows complete. Stops once the page is closed.
 */
function startHeroSlider(wrap) {
    const track = wrap.querySelector('.sg-slides');
    const slides = [...wrap.querySelectorAll('.sg-slide')];
    const dots = [...wrap.querySelectorAll('.sg-dot')];
    const steps = [...wrap.querySelectorAll('.sgx-s')];
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const STEP_AT = [450, 700, 950, 1200, 1650, 1950, 2250, 2550, 3000, 3450]; // bill demo, ms
    let index = 0;
    let shownAt = performance.now();
    let timer = null;
    const showSteps = (n) => steps.forEach((s) => s.classList.toggle('on', Number(s.dataset.step) <= n));

    function go(n) {
        if (!wrap.isConnected) return;
        index = (n + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        slides.forEach((s, i) => s.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
        dots.forEach((d, i) => d.setAttribute('aria-current', i === index ? 'true' : 'false'));
        shownAt = performance.now();
        if (index === 0) showSteps(reduce ? 99 : 0);
        clearTimeout(timer);
        if (!reduce) timer = setTimeout(() => go(index + 1), index === 0 ? 6200 : 3600);
    }
    function tick() {
        if (!wrap.isConnected) { clearTimeout(timer); return; }
        if (!reduce && index === 0) showSteps(STEP_AT.filter((t) => performance.now() - shownAt >= t).length);
        setTimeout(tick, 120);
    }
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    let startX = null;
    wrap.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    wrap.addEventListener('pointerup', (e) => {
        if (startX == null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    });
    wrap.addEventListener('pointercancel', () => { startX = null; });
    go(0);
    tick();
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

/**
 * Local testing on a phone over Wi-Fi (http://192.168.x.x:4173/?test=1): Google sign-in only works
 * on drillrig.in and localhost, so ?test=1 skips the sign-in screen — but ONLY on this computer's
 * own or home-network addresses, never on drillrig.in.
 */
export function isLocalTestHost(hostname) {
    return /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(String(hostname || ''));
}

export function initSignInGate(app) {
    try {
        if (isLocalTestHost(location.hostname) && new URLSearchParams(location.search).get('test') === '1') localStorage.setItem(SIGNIN_GATE_SKIP_KEY, '1');
    } catch { /* ignore */ }
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
        const hero = heroArt();
        const points = [
            ['cloud', 'Backed up automatically', 'A lost or broken phone loses nothing.'],
            ['phones', 'On every phone you use', 'Open your bills on more phones and add your staff.'],
            isEarlyAccess() ? ['gift', `Free until ${earlyAccessEndLabel()}`, 'Free Early Access: every feature included.'] : null
        ].filter(Boolean);
        gate = el('div', { class: 'signin-gate', id: 'signInGate', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'signInGateTitle' }, [
            el('div', { class: 'sg-card' }, [
                el('header', { class: 'sg-hero' }, [
                    el('div', { class: 'sg-brand' }, [
                        // the full DrillRig. wordmark, light version for the dark hero, no box around it
                        el('img', { class: 'sg-wordmark', src: 'drillrig_logo_light.webp', alt: 'DrillRig.', width: '863', height: '214' }),
                        el('span', { class: 'sg-brand-tag', text: 'Borewell billing' })
                    ]),
                    hero,
                    el('h1', { id: 'signInGateTitle', class: 'sg-title', text: 'Sign in to start' }),
                    buildComingSoonTicker() // what DrillRig adds next, scrolling sideways
                ]),
                el('div', { class: 'sg-body' }, [
                    el('ul', { class: 'sg-points' }, points.map(([icon, title, text]) => el('li', {}, [
                        art3d(icon),
                        el('span', { class: 'sg-pt' }, [el('strong', { text: title }), el('span', { text })])
                    ]))),
                    pendingJoinCode() ? el('p', { class: 'sg-local sg-invite' }, [icon3('check'), el('span', { text: 'You have been invited to a DrillRig team. Sign in with Google to see the invitation and accept it.' })]) : null,
                    bills > 0 ? el('p', { class: 'sg-local' }, [icon3('check'), el('span', { text: bills === 1 ? 'The 1 bill on this phone stays here and is backed up to your account after you sign in.' : `The ${bills} bills on this phone stay here and are backed up to your account after you sign in.` })]) : null,
                    slot,
                    msg,
                    el('p', { class: 'sg-offline-note' }, [icon3('wifi'), el('span', { text: 'After the first sign-in, DrillRig works without internet.' })]),
                    el('p', { class: 'sg-legal' }, ['By continuing you agree to the ',
                        el('a', { href: './terms.html', target: '_blank', rel: 'noopener', text: 'Terms' }), ' and ',
                        el('a', { href: './privacy.html', target: '_blank', rel: 'noopener', text: 'Privacy Policy' }), '.']),
                    el('p', { class: 'sg-version', text: `DrillRig ${versionLabel()}` })
                ])
            ])
        ]);
        document.body.append(gate);
        document.documentElement.classList.add('signin-gate-open');
        startHeroSlider(hero);
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
