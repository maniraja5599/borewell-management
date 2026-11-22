// Bottom bar: 3D-style icons (gradients, a darker "side", a soft shadow) in place of the line icons.
// Static SVG, no user data. Each icon gets its own gradient ids.
const ICONS = {
    'tab-bill': (id) => `<defs>
<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbe4ee"/></linearGradient>
<radialGradient id="${id}g" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#86efac"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></radialGradient>
</defs>
<ellipse cx="30" cy="60" rx="20" ry="2.6" fill="#0f1a14" opacity=".16"/>
<path d="M14 7h22l12 12v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z" fill="#94a3b8" transform="translate(1.5 1.5)"/>
<path d="M14 6h22l12 12v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="url(#${id}p)"/>
<path d="M36 6v9a3 3 0 0 0 3 3h9z" fill="#cbd5e1"/>
<g fill="#cbd5e1"><rect x="16" y="24" width="20" height="3" rx="1.5"/><rect x="16" y="31" width="16" height="3" rx="1.5"/><rect x="16" y="38" width="12" height="3" rx="1.5"/></g>
<circle cx="45" cy="47" r="12" fill="#14532d"/><circle cx="45" cy="45.5" r="12" fill="url(#${id}g)"/>
<path d="M45 39.5v12M39 45.5h12" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
<ellipse cx="41" cy="40" rx="4" ry="2" fill="#fff" opacity=".45"/>`,
    'tab-customers': (id) => `<defs>
<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient>
<radialGradient id="${id}f" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fde7d1"/><stop offset="1" stop-color="#e9a979"/></radialGradient>
</defs>
<ellipse cx="32" cy="60" rx="24" ry="2.6" fill="#0f1a14" opacity=".16"/>
<rect x="34" y="34" width="24" height="22" rx="10" fill="#14532d"/><rect x="34" y="32" width="24" height="22" rx="10" fill="url(#${id}b)"/>
<circle cx="46" cy="22" r="8" fill="url(#${id}f)"/>
<rect x="6" y="36" width="30" height="22" rx="11" fill="#1e3a8a"/><rect x="6" y="34" width="30" height="22" rx="11" fill="url(#${id}a)"/>
<circle cx="21" cy="21" r="10" fill="url(#${id}f)"/>
<ellipse cx="17.5" cy="16.5" rx="3.6" ry="2" fill="#fff" opacity=".5"/>
<path d="M11 19a10 10 0 0 1 20-1c-3-3-7-4-11-3-3 .7-6 2.2-9 4z" fill="#3f2a1d"/>
<path d="M38 20a8 8 0 0 1 16-1c-2.5-2.2-6-3-9-2.4-2.6.5-4.8 1.6-7 3.4z" fill="#3f2a1d"/>`,
    'tab-history': (id) => `<defs>
<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient>
<radialGradient id="${id}c" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></radialGradient>
</defs>
<ellipse cx="30" cy="60" rx="21" ry="2.6" fill="#0f1a14" opacity=".16"/>
<path d="M14 9h30v41l-5-3-5 3-5-3-5 3-5-3-5 3z" fill="#94a3b8" transform="translate(-2 -3)" opacity=".7"/>
<path d="M16 8h30a2 2 0 0 1 2 2v43l-5-3-5 3-5-3-5 3-5-3-5 3-4-3V10a2 2 0 0 1 2-2z" fill="#94a3b8" transform="translate(1.5 1.5)"/>
<path d="M16 8h30a2 2 0 0 1 2 2v43l-5-3-5 3-5-3-5 3-5-3-5 3-4-3V10a2 2 0 0 1 2-2z" fill="url(#${id}p)"/>
<g fill="#cbd5e1"><rect x="20" y="16" width="22" height="3" rx="1.5"/><rect x="20" y="23" width="16" height="3" rx="1.5"/><rect x="20" y="30" width="19" height="3" rx="1.5"/></g>
<rect x="20" y="39" width="12" height="4" rx="2" fill="#16a34a"/>
<circle cx="47" cy="46" r="11" fill="#92400e"/><circle cx="47" cy="44.5" r="11" fill="url(#${id}c)"/>
<text x="47" y="49.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#92400e">₹</text>`,
    'tab-rates': (id) => `<defs>
<linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcfce7"/><stop offset="1" stop-color="#86efac"/></linearGradient>
<linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#ea580c"/></linearGradient>
</defs>
<ellipse cx="32" cy="60" rx="20" ry="2.6" fill="#0f1a14" opacity=".16"/>
<rect x="13.5" y="6.5" width="38" height="52" rx="8" fill="#020617"/>
<rect x="12" y="5" width="38" height="52" rx="8" fill="url(#${id}k)"/>
<rect x="17" y="10" width="28" height="13" rx="3.5" fill="url(#${id}s)"/>
<text x="41" y="20.5" text-anchor="end" font-family="Inter, sans-serif" font-size="9" font-weight="800" fill="#14532d">₹90</text>
${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${17 + c * 10}" y="${28 + r * 9}" width="8" height="6.5" rx="2" fill="${r === 2 && c === 2 ? `url(#${id}o)` : '#e2e8f0'}"/>`).join('')).join('')}
<rect x="14" y="7" width="20" height="1.8" rx=".9" fill="#fff" opacity=".25"/>`,
    'tab-brand': (id) => {
        const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="28" y="6" width="8" height="10" rx="2.2" transform="rotate(${i * 45} 32 32)"/>`).join('');
        return `<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#475569"/></linearGradient>
<radialGradient id="${id}c" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#86efac"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></radialGradient>
</defs>
<ellipse cx="32" cy="60" rx="20" ry="2.6" fill="#0f1a14" opacity=".16"/>
<g transform="translate(1.5 2)" fill="#334155">${teeth}<circle cx="32" cy="32" r="18"/></g>
<g fill="url(#${id}g)">${teeth}<circle cx="32" cy="32" r="18"/></g>
<circle cx="32" cy="32" r="9" fill="#1e293b"/>
<circle cx="32" cy="32" r="7" fill="url(#${id}c)"/>
<ellipse cx="25" cy="22" rx="6" ry="3" fill="#fff" opacity=".35"/>`;
    }
};

let seq = 0;
export function applyNavIcons3d() {
    document.querySelectorAll('.bottom-nav .b-nav-item[data-tab]').forEach((btn) => {
        if (btn.classList.contains('b-nav-fab') || btn.dataset.tab === 'tab-brand') return; // plain icons in the new bar
        const draw = ICONS[btn.dataset.tab];
        const slot = btn.querySelector('.b-nav-icon');
        if (!draw || !slot) return;
        const id = `nav3d${++seq}`;
        slot.classList.add('is-3d');
        slot.innerHTML = `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">${draw(id)}</svg>`;
    });
}
