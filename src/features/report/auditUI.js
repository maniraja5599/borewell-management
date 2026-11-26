// "Audit log" (Rig work tab → Money; owner and staff with reports): who created, changed or
// deleted what — bills and payments, expenses and cash, stock & vendors, everything else — with
// the old → new values the server keeps (activity log 0004 + 0020). Read from the cloud, so it
// needs sign-in and a network; each person sees only what their role may see (can_see).
import { el, openSheet, btn } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { fetchActivity, describeActivity, activityDetails, activityTime } from '../../cloud/activity.js';

const GROUPS = [
    { key: 'money', label: 'Money', kinds: ['bill', 'cash', 'inv'] },
    { key: 'bill', label: 'Bills & payments', kinds: ['bill'] },
    { key: 'cash', label: 'Expenses & cash', kinds: ['cash'] },
    { key: 'stock', label: 'Stock', kinds: ['inv', 'stock', 'tool'] },
    { key: 'all', label: 'Everything', kinds: null }
];
const ACTIONS = [
    { key: 'all', label: 'Any change' },
    { key: 'create', label: 'Added' },
    { key: 'update', label: 'Edited' },
    { key: 'delete', label: 'Deleted' }
];
const PAGE = 100;

export function openAudit(app) {
    let group = 'money';
    let action = 'all';
    let person = '';
    let rows = [];
    let loading = false;
    let done = false;
    let failed = false;
    const sheet = openSheet({ title: 'Audit log', sub: 'Who added, changed or deleted what — old and new values', ic: 'scroll-text' });
    const inr = (n) => (app.formatINR ? app.formatINR(n) : `₹${Math.round(n || 0).toLocaleString('en-IN')}`);

    async function load() {
        if (loading || done) return;
        loading = true; render();
        const before = rows.length ? rows[rows.length - 1].id : null;
        const page = await fetchActivity({ limit: PAGE, before });
        loading = false;
        if (page === null) { failed = true; done = true; render(); return; }
        rows = rows.concat(page);
        if (page.length < PAGE) done = true;
        render();
    }

    const chips = (list, value, set, label) => el('div', { class: 'pa-chips', role: 'radiogroup', 'aria-label': label }, list.map((o) => el('button', {
        type: 'button', class: `pa-chip${o.key === value ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(o.key === value), text: o.label, onclick: () => { set(o.key); render(); }
    })));

    function render() {
        const g = GROUPS.find((x) => x.key === group);
        const people = [...new Set(rows.map((r) => (r.actor_is_me ? 'You' : r.actor_name || 'Someone')))].sort();
        const shown = rows.filter((r) => (!g.kinds || g.kinds.includes(r.kind))
            && (action === 'all' || r.action === action || (action === 'create' && r.action === 'restore'))
            && (!person || (r.actor_is_me ? 'You' : r.actor_name || 'Someone') === person));

        const who = el('select', { class: 'tt-input au-person', 'aria-label': 'Person' }, [
            el('option', { value: '', text: 'Everyone' }),
            ...people.map((p) => el('option', { value: p, text: p, selected: p === person }))
        ]);
        who.addEventListener('change', () => { person = who.value; render(); });

        const list = shown.map((r) => {
            const details = activityDetails(r, inr);
            return el('div', { class: `au-row is-${r.action}` }, [
                el('span', { class: `tx-ic ${r.action === 'delete' ? 'is-out' : 'is-in'}`, 'aria-hidden': 'true' }, [icon(r.action === 'delete' ? 'trash-2' : r.action === 'create' ? 'plus' : r.action === 'restore' ? 'rotate-ccw' : 'pencil')]),
                el('div', { class: 'au-main' }, [
                    el('strong', { text: describeActivity(r, inr) }),
                    details.length ? el('ul', { class: 'au-details' }, details.map((d) => el('li', { text: d }))) : null,
                    el('small', { text: activityTime(r.at) })
                ])
            ]);
        });

        sheet.body.replaceChildren(...[
            chips(GROUPS, group, (v) => { group = v; }, 'What'),
            el('div', { class: 'au-filters' }, [chips(ACTIONS, action, (v) => { action = v; }, 'Change'), people.length > 1 ? who : null]),
            failed ? el('p', { class: 'tt-empty', text: 'The audit log is kept in the cloud. Sign in and connect to the internet to see it.' }) : null,
            list.length ? el('div', { class: 'tt-card au-list' }, list) : (!loading && !failed ? el('p', { class: 'tt-empty', text: rows.length ? 'Nothing matches these filters in what is loaded.' : 'No changes recorded yet.' }) : null),
            loading ? el('p', { class: 'tt-loading', text: 'Loading…' }) : null,
            !done && !loading ? btn('Load older', { ic: 'chevrons-down', cls: 'tt-wide', onclick: () => load() }) : null,
            el('p', { class: 'ca-note', text: `Showing ${shown.length} of ${rows.length} loaded. Old → new values are kept for changes made after the 0020 update. Entries can never be edited or deleted.` })
        ].filter(Boolean));
        paintIcons();
    }
    render();
    load();
}
