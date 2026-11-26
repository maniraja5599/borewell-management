import { decodeAgencyShare, rankAgencies } from '../features/settings/marketplaceUI.js';
import { storage } from '../data/storage.js';

const DIRECTORY_AGENCIES = [
    { id: 'dir_1', name: 'Anjaneya Borewells', city: 'Namakkal', phone: '9659657777', baseRate: 90, bata: 2000, pvc7Rate: 400 },
    { id: 'dir_2', name: 'Sri Murugan Borewells', city: 'Salem', phone: '9842712345', baseRate: 95, bata: 2000, pvc7Rate: 420 },
    { id: 'dir_3', name: 'Kongu Deep Borewells', city: 'Erode', phone: '9443011223', baseRate: 92, bata: 2500, pvc7Rate: 410 },
    { id: 'dir_4', name: 'Kaveri Rig Services', city: 'Karur', phone: '9894055667', baseRate: 88, bata: 2000, pvc7Rate: 390 }
];

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function getAgencies() {
    const list = [...DIRECTORY_AGENCIES];
    const params = new URLSearchParams(window.location.search);
    const shared = decodeAgencyShare(params.get('agency'));
    if (shared) {
        list.unshift({ id: 'shared_live', featured: true, ...shared });
    } else {
        try {
            const localMkt = JSON.parse(storage.getRaw('drillrig_marketplace_v1') || 'null');
            if (localMkt?.live && localMkt?.name) {
                list.unshift({ id: 'local_live', featured: true, ...localMkt });
            }
        } catch { /* ignore */ }
    }
    return list;
}

function render() {
    const city = document.getElementById('mktCity')?.value || '';
    const depth = Number(document.getElementById('mktDepth')?.value) || 450;
    const casingFt = Number(document.getElementById('mktCasing')?.value) || 0;
    const ranked = rankAgencies(getAgencies(), { city, depth, casingFt });
    const listEl = document.getElementById('mktList');
    if (!listEl) return;

    if (!ranked.length) {
        listEl.innerHTML = `<div class="empty">No agencies found for "${esc(city)}". Clear the city filter to see all agencies.</div>`;
        return;
    }

    listEl.innerHTML = ranked.map((a) => {
        const waText = encodeURIComponent(`Hi ${a.name}, I checked your rate on DrillRig Marketplace for ${depth} ft drilling${casingFt ? ` + ${casingFt} ft 7" casing` : ''} in ${a.city} (Est. ${inr(a.estimatedTotal)}). Please share a quotation.`);
        const waHref = a.phone ? `https://wa.me/${a.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${waText}` : '#';
        return `
            <article class="ag-card${a.featured ? ' is-featured' : ''}">
                <div class="ag-info">
                    <div class="ag-badges">
                        <span class="badge live">${esc(a.city)}</span>
                        ${a.featured ? '<span class="badge">Shared Agency</span>' : ''}
                    </div>
                    <h3>${esc(a.name)}</h3>
                    <div class="ag-meta">Base ₹${a.baseRate}/ft · Bata ${inr(a.bata)} · 7" Casing ₹${a.pvc7Rate}/ft</div>
                </div>
                <div class="ag-price">
                    <div class="ag-total">${inr(a.estimatedTotal)}</div>
                    <div class="ag-sub">Est. for ${depth} ft${casingFt ? ` + ${casingFt} ft pipe` : ''}</div>
                    ${a.phone ? `<a class="wa-btn" href="${waHref}" target="_blank" rel="noopener">Get Quote on WhatsApp →</a>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

['mktCity', 'mktDepth', 'mktCasing'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', render);
});
render();
