// Online Marketplace & Shareable Price Estimate Card (per agency).
// Encodes the agency's public profile & slab rates into a compact shareable URL for marketplace.html,
// and saves local marketplace settings in storage.
import { storage } from '../../data/storage.js';
import { calculateNewBoreSlabs } from '../../core/slabEngine.js';
import { el, openSheet, btn, pill } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';

const MKT_KEY = 'drillrig_marketplace_v1';

export function readMarketplaceConfig(app) {
    let saved = {};
    try { saved = JSON.parse(storage.getRaw(MKT_KEY) || '{}') || {}; } catch { saved = {}; }
    const b = app?.brand || {};
    const r = app?.rates || {};
    return {
        live: Boolean(saved.live),
        city: saved.city || (b.address || '').split(',')[0].trim() || 'Namakkal',
        name: saved.name || b.companyName || 'Your Borewell Company',
        phone: saved.phone || (b.phones || '').split(',')[0].trim() || '',
        baseRate: Number(r.baseDrillingRate) || 90,
        bata: Number(r.boreBataRate) ?? 2000,
        pvc7Rate: Number(r.pvc7Rate) || 400
    };
}

export function writeMarketplaceConfig(cfg) {
    try { storage.setRaw(MKT_KEY, JSON.stringify(cfg || {})); } catch { /* ignore */ }
}

/** Pure helper: encode agency profile into compact URL-safe base64 token. */
export function encodeAgencyShare(cfg) {
    const payload = {
        n: String(cfg?.name || '').slice(0, 60),
        c: String(cfg?.city || '').slice(0, 40),
        p: String(cfg?.phone || '').slice(0, 20),
        r: Math.max(1, Number(cfg?.baseRate) || 90),
        b: Math.max(0, Number(cfg?.bata) || 0),
        p7: Math.max(0, Number(cfg?.pvc7Rate) || 400)
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach((x) => { bin += String.fromCharCode(x); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Pure helper: decode agency token from ?agency=... query parameter. */
export function decodeAgencyShare(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64);
        const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
        const obj = JSON.parse(new TextDecoder().decode(bytes));
        if (!obj || !obj.n) return null;
        return {
            name: String(obj.n),
            city: String(obj.c || 'Tamil Nadu'),
            phone: String(obj.p || ''),
            baseRate: Math.max(1, Number(obj.r) || 90),
            bata: Math.max(0, Number(obj.b) || 0),
            pvc7Rate: Math.max(0, Number(obj.p7) || 400)
        };
    } catch {
        return null;
    }
}

/** Pure helper: estimate price & rank agencies for a given city, depth & casing feet. */
export function rankAgencies(agencies, { city = '', depth = 450, casingFt = 0 } = {}) {
    const q = String(city || '').trim().toLowerCase();
    const ft = Math.max(1, Number(depth) || 450);
    const cFt = Math.max(0, Number(casingFt) || 0);
    return (agencies || [])
        .filter((a) => !q || String(a.city || '').toLowerCase().includes(q) || String(a.name || '').toLowerCase().includes(q))
        .map((a) => {
            const slab = calculateNewBoreSlabs({ baseDrillingRate: a.baseRate, slabBufferFt: 5 }, ft, a.baseRate);
            const drillCost = (Number(slab.totalCost) || 0) + (Number(a.bata) || 0);
            const casingCost = cFt * (Number(a.pvc7Rate) || 0);
            return { ...a, drillCost, casingCost, estimatedTotal: drillCost + casingCost };
        })
        .sort((a, b) => a.estimatedTotal - b.estimatedTotal);
}

export function openMarketplaceSheet(app, { onSaved } = {}) {
    const sheet = openSheet({
        title: 'Online marketplace',
        sub: 'Let customers compare your borewell rates & send WhatsApp enquiries',
        ic: 'store'
    });

    function render() {
        const cfg = readMarketplaceConfig(app);
        const liveBtn = el('input', { type: 'checkbox', checked: cfg.live });
        const cityIn = el('input', { type: 'text', class: 'tt-input', value: cfg.city, placeholder: 'e.g. Namakkal' });
        const nameIn = el('input', { type: 'text', class: 'tt-input', value: cfg.name, placeholder: 'Agency name' });
        const phoneIn = el('input', { type: 'tel', class: 'tt-input', value: cfg.phone, placeholder: 'WhatsApp number' });

        const shareUrl = () => {
            const base = new URL('./marketplace.html', window.location.href).href.split('?')[0];
            return `${base}?agency=${encodeAgencyShare({ ...cfg, city: cityIn.value.trim(), name: nameIn.value.trim(), phone: phoneIn.value.trim() })}`;
        };

        const save = (toastMsg) => {
            const next = {
                ...cfg,
                live: liveBtn.checked,
                city: cityIn.value.trim() || 'Namakkal',
                name: nameIn.value.trim() || cfg.name,
                phone: phoneIn.value.trim()
            };
            writeMarketplaceConfig(next);
            onSaved?.();
            if (toastMsg) app?.showToast?.(toastMsg);
            render();
        };

        liveBtn.addEventListener('change', () => save(liveBtn.checked ? '✅ Marketplace listing is LIVE' : 'Marketplace listing set to Offline'));

        sheet.body.replaceChildren(...[
            el('div', { class: 'tt-card', style: 'margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;' }, [
                el('div', {}, [
                    el('strong', { text: cfg.live ? 'Your agency is LIVE' : 'Your agency is OFFLINE' }),
                    el('small', { class: 'wk-hint', style: 'margin:2px 0 0;', text: 'Customers can estimate prices using your slab rates' })
                ]),
                el('label', { class: 'wk-req' }, [liveBtn, pill(cfg.live ? 'Online' : 'Offline', cfg.live ? 'is-ok' : 'is-muted')])
            ]),
            el('div', { class: 'tt-card', style: 'margin-bottom:10px;' }, [
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Agency name' }), nameIn]),
                el('div', { class: 'wk-two' }, [
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'City / Area' }), cityIn]),
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'WhatsApp number' }), phoneIn])
                ]),
                el('small', { class: 'wk-hint', text: `Using live rates: ₹${cfg.baseRate}/ft · Bata ₹${cfg.bata} · 7" Casing ₹${cfg.pvc7Rate}/ft` }),
                btn('Save Listing', { kind: 'pri', ic: 'check', onclick: () => save('✅ Marketplace profile saved') })
            ]),
            el('div', { class: 'tt-card', style: 'display:flex;flex-direction:column;gap:8px;' }, [
                el('strong', { text: 'Share & Preview' }),
                btn('Copy Public Price Link', {
                    kind: 'sec',
                    ic: 'copy',
                    onclick: async () => {
                        try { await navigator.clipboard.writeText(shareUrl()); app?.showToast?.('📋 Marketplace link copied'); }
                        catch { app?.showToast?.('⚠️ Copy not supported'); }
                    }
                }),
                el('a', { href: shareUrl(), target: '_blank', rel: 'noopener', class: 'tt-btn is-pri', style: 'text-decoration:none;justify-content:center;', text: 'Open Marketplace & Compare Prices ↗' })
            ])
        ]);
        paintIcons();
    }
    render();
}
