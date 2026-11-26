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
    const other = describeOther(entry, who, money);
    if (other) return other;
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

const VERB = { create: 'added', update: 'edited', delete: 'deleted', restore: 'restored' };
const CASH_WORD = { expense: 'expense', diesel: 'diesel', in: 'cash given', handover: 'hand-over', advance: 'advance', wage: 'wages' };
const INV_WORD = { item: 'stock item', move: 'stock move', vendor: 'vendor', purchase: 'purchase', vpay: 'vendor payment' };

/** Kinds other than bill / customer / setting (cash, stock, workers, tools, attendance, vehicles, breakdowns, stock & vendors). */
function describeOther(entry, who, money) {
    const s = entry?.summary || {};
    const verb = VERB[entry?.action] || 'changed';
    switch (entry?.kind) {
        case 'cash': {
            const what = CASH_WORD[s.type] || 'cash entry';
            return `${who} ${verb} ${what}${s.amount ? ` ${money(s.amount)}` : ''}${s.category ? ` (${s.category})` : ''}`;
        }
        case 'stock': return `${who} ${verb} casing pipe ${s.type || 'entry'}${s.date ? ` of ${s.date}` : ''}`;
        case 'worker': return `${who} ${verb} worker ${s.name || ''}`.trim();
        case 'tool': return `${who} ${verb} ${s.tool === 'hammer' ? 'hammer' : 'bit'} ${s.code || s.brand || ''}`.trim();
        case 'attendance': return `${who} marked ${s.worker || 'a worker'} ${s.status || ''} on ${s.date || ''}`.replace(/\s+/g, ' ').trim();
        case 'vehicle': return `${who} ${verb} vehicle ${s.name || ''}`.trim();
        case 'breakdown': return `${who} ${entry?.action === 'create' ? 'reported a breakdown' : `${verb} a breakdown`}${s.reason ? ` (${s.reason})` : ''}${s.cost ? ` · repair ${money(s.cost)}` : ''}`;
        case 'inv': return `${who} ${verb} ${INV_WORD[s.t] || 'stock record'}${s.name ? ` ${s.name}` : ''}${s.amount ? ` ${money(s.amount)}` : ''}`;
        default: return null;
    }
}

const FIELD = {
    amount: ['Amount', 'money'], total: ['Total', 'money'], rate: ['Rate', 'money'],
    'snapshot.discountAmount': ['Discount', 'money'], 'snapshot.paymentDiscount': ['Payment discount', 'money'],
    categoryLabel: ['Category'], type: ['Type'], date: ['Date'], billDate: ['Bill date'], paidBy: ['Paid by'], mode: ['Mode'],
    litres: ['Litres'], qty: ['Qty'], note: ['Note'], name: ['Name'], custName: ['Customer'], 'agent.name': ['Agent'],
    'snapshot.docType': ['Bill type'], receivedAt: ['Received', 'flag'], 'approval.status': ['Approval']
};
const show = (v, how, money) => {
    if (v === null || v === undefined || v === '') return how === 'flag' ? 'no' : '—';
    if (how === 'money') return money(v);
    if (how === 'flag') return 'yes';
    return String(v).slice(0, 40);
};
const changeText = (c, money) => {
    const [label, how] = FIELD[c.f] || [c.f];
    return `${label} ${show(c.from, how, money)} → ${show(c.to, how, money)}`;
};

/**
 * The old → new details of an entry (migration 0020), one short line each:
 * "Payment ₹5,000 Cash added (Ravi)", "Payment ₹20,000: Amount ₹20,000 → ₹15,000", "Discount ₹0 → ₹1,000".
 */
export function activityDetails(entry, formatINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`) {
    const s = entry?.summary || {};
    const money = (n) => formatINR(Number(n) || 0);
    const out = [];
    for (const p of Array.isArray(s.payAdded) ? s.payAdded : []) out.push(`Payment ${money(p.amount)}${p.mode ? ` ${p.mode}` : ''} added${p.by ? ` (${p.by})` : ''}`);
    for (const p of Array.isArray(s.payRemoved) ? s.payRemoved : []) out.push(`Payment ${money(p.amount)}${p.mode ? ` ${p.mode}` : ''} removed`);
    for (const p of Array.isArray(s.payChanged) ? s.payChanged : []) {
        const ch = Array.isArray(p.changes) ? p.changes : [];
        out.push(`Payment changed: ${ch.map((c) => changeText(c, money)).join(', ')}`);
    }
    for (const c of Array.isArray(s.changes) ? s.changes : []) out.push(changeText(c, money));
    return out.slice(0, 12);
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
        const details = activityDetails(e, formatINR);
        if (details.length) {
            const ul = document.createElement('ul');
            ul.className = 'act-details';
            for (const d of details) { const li = document.createElement('li'); li.textContent = d; ul.appendChild(li); }
            row.appendChild(ul);
        }
        container.appendChild(row);
    }
}
