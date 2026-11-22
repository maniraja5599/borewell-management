// "Coming soon" on the Settings page: the next big parts of DrillRig (beyond billing), each with a
// 3D icon. Tapping one opens WhatsApp to the DrillRig team saying "I want this", so we learn which
// one to build first. Static art only — no user data goes into the markup.
import { comingSoonVoteLink } from '../../config/plans.js';

export const COMING_SOON = [
    { key: 'vehicles', title: 'Vehicles', sub: 'Insurance & service', ask: 'vehicle insurance, tax and service reminders' },
    { key: 'staff', title: 'Staff', sub: 'Attendance & wages', ask: 'staff management' },
    { key: 'stock', title: 'Stock', sub: 'Pipes, bits, diesel', ask: 'stock management' },
    { key: 'pnl', title: 'Profit & Loss', sub: 'Profit on every bore', ask: 'the profit & loss report' }
];

// 64×64 SVG icons drawn with gradients, a darker "side" and a soft floor shadow so they look 3D.
const ART = {
    vehicles: (id) => `<defs>
<linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
</defs>
<ellipse cx="32" cy="57" rx="25" ry="3.2" fill="#0f1a14" opacity=".14"/>
<rect x="5" y="20" width="32" height="26" rx="3" fill="#9a3412"/>
<rect x="5" y="18" width="32" height="26" rx="3" fill="url(#${id}b)"/>
<rect x="8" y="21" width="20" height="2.2" rx="1.1" fill="#fff" opacity=".35"/>
<path d="M37 26h11l9 10v10H37z" fill="#b45309"/>
<path d="M37 24h11l9 10v10H37z" fill="url(#${id}c)"/>
<path d="M41 27h6l6 7H41z" fill="url(#${id}w)"/>
<circle cx="16" cy="47" r="6.5" fill="#1f2937"/><circle cx="16" cy="47" r="2.6" fill="#cbd5e1"/>
<circle cx="47" cy="47" r="6.5" fill="#1f2937"/><circle cx="47" cy="47" r="2.6" fill="#cbd5e1"/>`,
    staff: (id) => `<defs>
<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#ca8a04"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>
<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></linearGradient>
<radialGradient id="${id}f" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fde7d1"/><stop offset="1" stop-color="#e9a979"/></radialGradient>
</defs>
<ellipse cx="32" cy="58" rx="23" ry="3.2" fill="#0f1a14" opacity=".14"/>
<rect x="35" y="36" width="22" height="20" rx="9" fill="#115e59"/>
<rect x="35" y="34" width="22" height="20" rx="9" fill="url(#${id}t)"/>
<circle cx="46" cy="27" r="6.5" fill="url(#${id}f)"/>
<path d="M39 25.5a7 7 0 0 1 14 0z" fill="url(#${id}h)"/>
<rect x="37.5" y="24.6" width="17" height="2.4" rx="1.2" fill="#a16207"/>
<circle cx="43.8" cy="29" r=".9" fill="#3f2a1d"/><circle cx="48.2" cy="29" r=".9" fill="#3f2a1d"/>
<rect x="10" y="38" width="28" height="20" rx="11" fill="#1e3a8a"/>
<rect x="10" y="36" width="28" height="20" rx="11" fill="url(#${id}s)"/>
<rect x="15" y="44" width="18" height="2.4" rx="1.2" fill="#facc15"/>
<circle cx="24" cy="27" r="8.5" fill="url(#${id}f)"/>
<path d="M15 25.5a9 9 0 0 1 18 0z" fill="url(#${id}h)"/>
<rect x="13" y="24.3" width="22" height="3" rx="1.5" fill="#a16207"/>
<ellipse cx="21" cy="19.6" rx="3" ry="1.4" fill="#fff" opacity=".55"/>
<circle cx="21" cy="29.6" r="1.1" fill="#3f2a1d"/><circle cx="27" cy="29.6" r="1.1" fill="#3f2a1d"/>`,
    stock: (id) => {
        const pipe = (cx, cy) => `<circle cx="${cx}" cy="${cy + 1.6}" r="8.6" fill="#1e3a8a"/><circle cx="${cx}" cy="${cy}" r="8.6" fill="url(#${id}p)"/><circle cx="${cx}" cy="${cy}" r="4.8" fill="url(#${id}o)"/><ellipse cx="${cx - 3.4}" cy="${cy - 5}" rx="2.6" ry="1.2" fill="#fff" opacity=".6"/>`;
        return `<defs>
<radialGradient id="${id}p" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#bfdbfe"/><stop offset=".55" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></radialGradient>
<radialGradient id="${id}o" cx=".6" cy=".65" r=".8"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#020617"/></radialGradient>
</defs>
<ellipse cx="32" cy="59" rx="24" ry="3.2" fill="#0f1a14" opacity=".14"/>
${pipe(15, 47)}${pipe(32, 47)}${pipe(49, 47)}${pipe(23.5, 32.5)}${pipe(40.5, 32.5)}${pipe(32, 18)}`;
    },
    pnl: (id) => `<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient>
<linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></linearGradient>
</defs>
<ellipse cx="32" cy="58" rx="23" ry="3.2" fill="#0f1a14" opacity=".14"/>
<rect x="13" y="40" width="11" height="17" rx="2.5" fill="#14532d"/><rect x="11" y="38" width="11" height="17" rx="2.5" fill="url(#${id}g)"/>
<rect x="27" y="30" width="11" height="27" rx="2.5" fill="#14532d"/><rect x="25" y="28" width="11" height="27" rx="2.5" fill="url(#${id}g)"/>
<rect x="41" y="20" width="11" height="37" rx="2.5" fill="#14532d"/><rect x="39" y="18" width="11" height="37" rx="2.5" fill="url(#${id}g)"/>
<rect x="13" y="40" width="3" height="12" rx="1.5" fill="#fff" opacity=".35"/><rect x="27" y="30" width="3" height="22" rx="1.5" fill="#fff" opacity=".35"/><rect x="41" y="20" width="3" height="32" rx="1.5" fill="#fff" opacity=".35"/>
<path d="M8 33 20 24l9 4 17-17" fill="none" stroke="#c2410c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.5)" opacity=".5"/>
<path d="M8 33 20 24l9 4 17-17" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M38 9.5h9.5V19" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="13" cy="15" r="7" fill="#b45309"/><circle cx="13" cy="13.6" r="7" fill="url(#${id}c)"/>
<text x="13" y="17.4" text-anchor="middle" font-size="9.5" font-weight="800" font-family="Inter, sans-serif" fill="#92400e">₹</text>`
};

let seq = 0;
function art(key, size = 54) {
    const id = `cs3${key}${++seq}`;
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ART[key](id)}</svg>`;
}

/**
 * Sign-in page: a "Coming soon" strip under "Sign in to start" that scrolls sideways by itself.
 * The list is drawn twice so the loop has no gap; the second copy is hidden from screen readers
 * and from the keyboard. With reduced motion it does not move (it can be swiped instead).
 */
export function buildComingSoonTicker({ id = 'signInComingSoon' } = {}, doc = document) {
    const wrap = doc.createElement('div');
    wrap.className = 'cs-ticker';
    wrap.id = id;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Coming soon to DrillRig');
    wrap.innerHTML = '<span class="cs-tk-label">Coming soon</span><div class="cs-tk-viewport"><div class="cs-tk-track"></div></div>';
    const track = wrap.querySelector('.cs-tk-track');
    for (let copy = 0; copy < 2; copy++) {
        const group = doc.createElement('div');
        group.className = 'cs-tk-group';
        if (copy) group.setAttribute('aria-hidden', 'true');
        for (const f of COMING_SOON) {
            const a = doc.createElement('a');
            a.className = `cs-tk-chip cs-${f.key}`;
            a.href = comingSoonVoteLink(f.ask);
            a.target = '_blank';
            a.rel = 'noopener';
            if (copy) a.tabIndex = -1;
            else a.setAttribute('aria-label', `${f.title} — coming soon. Tell the DrillRig team on WhatsApp you want it.`);
            a.innerHTML = `<span class="cs-tk-art">${art(f.key, 30)}</span><span class="cs-tk-name"></span>`;
            a.querySelector('.cs-tk-name').textContent = f.title;
            group.append(a);
        }
        track.append(group);
    }
    return wrap;
}

/** Builds the Settings section (detached): 2×2 tiles. */
export function buildComingSoon({ id = 'comingSoonCard', title = 'Coming soon' } = {}, doc = document) {
    const section = doc.createElement('section');
    section.className = 'coming-soon';
    section.id = id;
    section.setAttribute('aria-labelledby', `${id}Title`);
    section.innerHTML = `<div class="cs-head">
    <h3 class="cs-title" id="${id}Title"></h3>
    <span class="cs-hint">Tap the one you want first</span>
</div>
<div class="cs-grid"></div>`;
    section.querySelector('.cs-title').textContent = title;
    const grid = section.querySelector('.cs-grid');
    for (const f of COMING_SOON) {
        const a = doc.createElement('a');
        a.className = `cs-tile cs-${f.key}`;
        a.href = comingSoonVoteLink(f.ask);
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', `${f.title} — coming soon. Tell the DrillRig team on WhatsApp you want it.`);
        a.innerHTML = `<span class="cs-art">${art(f.key)}</span>
<strong class="cs-name"></strong>
<small class="cs-sub"></small>
<span class="cs-badge">Coming soon</span>`;
        a.querySelector('.cs-name').textContent = f.title;
        a.querySelector('.cs-sub').textContent = f.sub;
        grid.append(a);
    }
    return section;
}

/** Puts the section under the Settings menu (hidden together with the menu when a section is open). */
export function initComingSoon() {
    if (document.getElementById('comingSoonCard')) return;
    const menu = document.querySelector('#settingsHubHead .settings-menu');
    if (!menu) return;
    menu.after(buildComingSoon());
}
