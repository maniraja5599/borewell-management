// Same line icons as the rest of the app (lucide, loaded in index.html) for screens built in JS.
// icon('truck') gives an <i data-lucide> placeholder; paintIcons() turns new ones into SVG.

export function icon(name, cls = 'icon-xs') {
    const i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    i.setAttribute('aria-hidden', 'true');
    if (cls) i.className = cls;
    return i;
}

let queued = false;
export function paintIcons() {
    if (queued || typeof window === 'undefined') return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        try { window.lucide?.createIcons?.(); } catch { /* icons are decoration only */ }
    });
}
