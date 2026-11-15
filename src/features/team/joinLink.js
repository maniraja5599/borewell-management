// Invite links: https://drillrig.in/?join=K7Q2M9XW4P (made in Team & Rigs → Invite by mobile).
// The code is kept on the phone until the person signs in with Google. Then invitations.js shows
// the invitation (Accept / Reject, migration 0011) before the first sync, so an accepted invite
// opens the owner's company instead of a new empty one.
import { getSupabase } from '../../cloud/auth.js';
import { setPreferredCompany } from '../../cloud/sync.js';
import { storage } from '../../data/storage.js';

const KEY = 'drillrig_join_code';
const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };

export const cleanJoinCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

/** Read ?join= from the address bar, keep it, and remove it from the address. */
export function captureJoinCode() {
    try {
        const url = new URL(window.location.href);
        const code = cleanJoinCode(url.searchParams.get('join'));
        if (!code) return null;
        storage.setRaw(KEY, JSON.stringify({ code, at: Date.now() }));
        url.searchParams.delete('join');
        window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
        return code;
    } catch { return null; }
}

export function pendingJoinCode() {
    try {
        const v = JSON.parse(storage.getRaw(KEY) || 'null');
        if (!v?.code) return null;
        if (Date.now() - (v.at || 0) > 8 * 864e5) { clearJoinCode(); return null; }
        return v.code;
    } catch { return null; }
}

export function clearJoinCode() {
    try { storage.remove(KEY); } catch { /* ignore */ }
}

/** Older servers (before 0011) only: join with the waiting code at once. Never throws. */
export async function consumeJoinCode(app) {
    const code = pendingJoinCode();
    if (!code) return null;
    try {
        const sb = await getSupabase();
        const { data, error } = await sb.rpc('drillrig_join_with_code', { p_code: code });
        if (error) throw new Error(error.message || 'Could not join');
        clearJoinCode();
        if (data?.company_id) setPreferredCompany(data.company_id);
        app?.showToast?.(`✅ You joined ${data?.company_name || 'the team'} as ${ROLE_LABEL[data?.role] || 'staff'}`);
        return data;
    } catch (err) {
        clearJoinCode();
        const msg = /function .* does not exist|schema cache/i.test(err?.message || '')
            ? 'Invite links are not switched on yet. Ask the owner to invite your Gmail instead.'
            : err?.message || 'Could not join the team';
        app?.showToast?.(`⚠️ ${msg}`);
        return null;
    }
}
