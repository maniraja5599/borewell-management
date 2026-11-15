// Super admin entry in the app. Shown only when the server says the signed-in Google account is a
// DrillRig admin (drillrig_admin_whoami, checked against drillrig.admin) — never from the email
// alone, so nobody else can switch it on. Opens the admin console (admin.html).
import { getSupabase, onAccountChange } from '../../cloud/auth.js';

const CACHE_KEY = 'drillrig_is_admin'; // per account id, so the card shows at once next time (offline too)

async function checkAdmin() {
    try {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data, error } = await sb.rpc('drillrig_admin_whoami');
        if (error) return null; // server without the admin console, or offline
        return Boolean(data?.admin);
    } catch {
        return null;
    }
}

function render(show, summary = '') {
    let card = document.getElementById('superAdminCard');
    if (!show) { card?.remove(); document.documentElement.classList.remove('is-super-admin'); return; }
    document.documentElement.classList.add('is-super-admin');
    if (!card) {
        card = document.createElement('a');
        card.id = 'superAdminCard';
        card.className = 'super-admin-card';
        card.href = './admin.html';
        card.innerHTML = `
            <span class="sac-ic" aria-hidden="true">🛡️</span>
            <span class="sac-tx"><strong>Super admin</strong><small id="superAdminSub">All businesses, bills, users and rigs</small></span>
            <span class="sac-go" aria-hidden="true">›</span>`;
        const anchor = document.getElementById('accountCard');
        if (anchor) anchor.after(card); else document.getElementById('settingsHubHead')?.prepend(card);
    }
    const sub = document.getElementById('superAdminSub');
    if (sub && summary) sub.textContent = summary;
}

async function loadSummary() {
    try {
        const { data } = await (await getSupabase()).rpc('drillrig_admin_overview');
        if (!data) return '';
        const b = data.businesses ?? data.companies ?? data.total_businesses;
        const bills = data.bills ?? data.bills_in_cloud;
        return [b != null ? `${b} businesses` : '', bills != null ? `${bills} bills in cloud` : ''].filter(Boolean).join(' · ');
    } catch { return ''; }
}

let checkedFor = null;
export function initSuperAdmin() {
    onAccountChange(async (acc) => {
        if (!acc) { render(false); checkedFor = null; return; }
        if (checkedFor === acc.id) return; // token refreshes fire this again; ask once per sign-in
        checkedFor = acc.id;
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { /* ignore */ }
        if (cache[acc.id]) render(true);
        const isAdmin = await checkAdmin();
        if (isAdmin === null) return; // could not ask the server: keep what we had
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ [acc.id]: isAdmin })); } catch { /* ignore */ }
        render(isAdmin);
        if (isAdmin) render(true, await loadSummary());
    });
}
