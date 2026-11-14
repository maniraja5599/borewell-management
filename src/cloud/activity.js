// Activity log reader (server side: supabase/drillrig/0004_activity_log.sql).
// Returns null whenever the log is not available — not signed in, offline, or the
// migration has not been run — so screens can simply hide the section.
import { getSupabase } from './auth.js';
import { getAccess } from './access.js';

export async function fetchActivity({ kind = null, record = null, limit = 30, before = null } = {}) {
    const companyId = getAccess()?.companyId;
    if (!companyId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
    try {
        const sb = await getSupabase();
        const { data: session } = await sb.auth.getSession();
        if (!session?.session) return null;
        const { data, error } = await sb.rpc('drillrig_activity', {
            p_company: companyId, p_kind: kind, p_record: record, p_limit: limit, p_before: before
        });
        if (error) return null;
        return Array.isArray(data) ? data : [];
    } catch {
        return null;
    }
}

const SETTING_NAMES = {
    brand: 'company profile', rates: 'rates', rateProfiles: 'rate cards',
    waFormat: 'WhatsApp format', savedExtras: 'saved extras', savedNotes: 'saved notes'
};

/** One plain-language line for an entry, e.g. "Murugan recorded a payment on #SM-121: paid ₹0 → ₹10,000". */
export function describeActivity(entry, formatINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`) {
    const s = entry?.summary || {};
    const who = entry?.actor_is_me ? 'You' : (entry?.actor_name || 'Someone');
    const money = (n) => formatINR(Number(n) || 0);

    if (entry?.kind === 'setting') {
        return `${who} changed the ${SETTING_NAMES[s.setting] || s.setting || 'settings'}`;
    }
    if (entry?.kind === 'customer') {
        const name = s.name || 'a customer';
        const verb = { create: 'added customer', update: 'edited customer', delete: 'deleted customer', restore: 'restored customer' }[entry.action] || 'changed customer';
        return `${who} ${verb} ${name}`;
    }
    const what = `${s.docType === 'QUOTATION' ? 'quotation' : 'bill'} #${s.billNo || entry?.record_id || ''}`;
    switch (entry?.action) {
        case 'create': return `${who} created ${what} (${money(s.total)})`;
        case 'delete': return `${who} deleted ${what}`;
        case 'restore': return `${who} restored ${what}`;
        default: {
            const parts = [];
            if (s.prevTotal !== undefined) parts.push(`total ${money(s.prevTotal)} → ${money(s.total)}`);
            if (s.prevPaid !== undefined) parts.push(`paid ${money(s.prevPaid)} → ${money(s.paid)}`);
            const onlyPayment = s.prevPaid !== undefined && s.prevTotal === undefined;
            const verb = onlyPayment ? (Number(s.paid) > Number(s.prevPaid) ? 'recorded a payment on' : 'changed payments on') : 'edited';
            return `${who} ${verb} ${what}${parts.length ? `: ${parts.join(', ')}` : ''}`;
        }
    }
}

/** "14 Nov, 6:42 pm" in the phone's own time. */
export function activityTime(at) {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Render entries into `container` with safe DOM calls (names come from other people's phones). */
export function renderActivityList(container, entries, formatINR) {
    container.textContent = '';
    if (!entries.length) {
        const p = document.createElement('p');
        p.className = 'act-empty';
        p.textContent = 'No changes recorded yet.';
        container.appendChild(p);
        return;
    }
    for (const e of entries) {
        const row = document.createElement('div');
        row.className = `act-row act-${e.action}`;
        const text = document.createElement('span');
        text.className = 'act-text';
        text.textContent = describeActivity(e, formatINR);
        const time = document.createElement('span');
        time.className = 'act-time';
        time.textContent = activityTime(e.at);
        row.append(text, time);
        container.appendChild(row);
    }
}
