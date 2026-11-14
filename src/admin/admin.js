// DrillRig developer admin console (admin.html). Every call is checked on the server
// (supabase/drillrig/0007_admin_console.sql); this page only shows what the server returns.
// All text from the database goes in with textContent.
import { getSupabase, getCurrentAccount, onAccountChange, renderGoogleButton, signOut } from '../cloud/auth.js';

const root = document.getElementById('root');
const who = document.getElementById('who');
const signOutBtn = document.getElementById('signOutBtn');

/* ---------- small helpers ---------- */
function h(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') n.textContent = v;
        else if (k === 'class') n.className = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
}
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const mb = (b) => `${(Number(b || 0) / 1e6).toFixed(Number(b) < 1e7 ? 2 : 0)} MB`;
const day = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const when = (s) => {
    if (!s) return '—';
    const mins = Math.round((Date.now() - Date.parse(s)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
    if (mins < 43200) { const d = Math.round(mins / 1440); return `${d} day${d === 1 ? '' : 's'} ago`; }
    return day(s);
};
const ymd = (s) => (s ? new Date(s).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
const endOfDayIst = (v) => (v ? `${v}T23:59:59+05:30` : null);
const STATE_LABEL = { free: 'Free', paid: 'Paid', ended: 'Ended', archived: 'Archived' };
const chip = (state, label) => h('span', { class: `chip ${state}`, text: label || STATE_LABEL[state] || state });

function toast(msg) {
    const t = h('div', { class: 'toast', text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
}

async function rpc(name, args = {}) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message || String(error));
    return data;
}

function show(...nodes) { root.replaceChildren(...nodes); }
function fail(e) { show(h('div', { class: 'card center' }, [h('strong', { text: 'Something went wrong' }), h('p', { text: e.message || String(e) })])); }

/* ---------- sign-in gate ---------- */
async function start() {
    const account = await getCurrentAccount().catch(() => null);
    if (!account) return showSignIn();
    who.textContent = account.email;
    signOutBtn.hidden = false;
    let me;
    try { me = await rpc('drillrig_admin_whoami'); } catch (e) {
        return fail(/drillrig_admin_whoami/.test(e.message) ? new Error('The admin console is not installed on the server yet. Run supabase/drillrig/0007_admin_console.sql.') : e);
    }
    if (!me?.admin) {
        return show(h('div', { class: 'card center' }, [
            h('strong', { text: 'This account is not an admin' }),
            h('p', { text: `${account.email} can use DrillRig, but not this page.` })
        ]));
    }
    renderShell();
}

function showSignIn() {
    who.textContent = '';
    signOutBtn.hidden = true;
    const slot = h('div', { style: 'display:flex;justify-content:center' });
    const msg = h('p', { class: 'muted', text: 'Sign in with the developer Google account.' });
    show(h('div', { class: 'card center' }, [h('strong', { text: 'DrillRig Admin' }), msg, slot]));
    renderGoogleButton(slot, ({ error }) => { if (error) msg.textContent = error; else start(); })
        .catch((e) => { msg.textContent = e.message; });
}

signOutBtn.addEventListener('click', async () => { await signOut(); showSignIn(); });
onAccountChange(() => {}).catch(() => {});

/* ---------- shell + tabs ---------- */
const TABS = [['overview', 'Overview'], ['businesses', 'Businesses'], ['users', 'Users'], ['log', 'Admin log']];
let current = 'overview';
const body = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });

function renderShell() {
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) =>
        h('button', { type: 'button', role: 'tab', 'data-tab': id, class: id === current ? 'on' : '', text: label, onclick: () => go(id) })));
    show(tabs, body);
    go(current);
}

function go(id) {
    current = id;
    root.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    body.replaceChildren(h('div', { class: 'card empty', text: 'Loading…' }));
    ({ overview, businesses, users, log })[id]().catch((e) => body.replaceChildren(h('div', { class: 'card empty', text: e.message })));
}

/* ---------- overview ---------- */
async function overview() {
    const o = await rpc('drillrig_admin_overview');
    const tile = (label, value, note) => h('div', { class: 'tile' }, [h('span', { text: label }), h('strong', { text: value }), note ? h('small', { text: note }) : null]);
    const rigs = o.rigs || {};
    const dbPct = Math.round((Number(o.database_bytes || 0) / 500e6) * 100);
    body.replaceChildren(
        h('div', { class: 'tiles' }, [
            tile('Businesses', num(o.businesses), `+${num(o.new_7d)} this week · +${num(o.new_30d)} in 30 days`),
            tile('Active (7 days)', num(o.active_7d), `${num(o.active_30d)} in 30 days`),
            tile('Users', num(o.users), `${num(o.staff)} staff`),
            tile('Bills in cloud', num(o.bills)),
            tile('Customers in cloud', num(o.customers)),
            tile('Changes (24 h)', num(o.changes_24h)),
            tile('Paused businesses', num(o.paused)),
            tile('Cloud data', mb(o.cloud_bytes), 'DrillRig records'),
            tile('Database', mb(o.database_bytes), `${dbPct}% of the Free plan's 500 MB`)
        ]),
        h('div', { class: 'card' }, [
            h('h2', { text: 'Rigs' }),
            h('div', {}, ['free', 'paid', 'ended', 'archived'].map((s) => h('span', { style: 'margin-right:14px' }, [chip(s), ' ', h('strong', { text: num(rigs[s]) })])))
        ])
    );
}

/* ---------- businesses ---------- */
let bizSearch = '';
async function businesses() {
    const input = h('input', { type: 'search', placeholder: 'Search business name, any member email, or business id', value: bizSearch, 'aria-label': 'Search businesses' });
    const list = h('div', { class: 'scroll' });
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { bizSearch = input.value; load(); }, 250); });
    body.replaceChildren(h('div', { class: 'card' }, [h('div', { class: 'bar' }, [input]), list]));
    async function load() {
        const r = await rpc('drillrig_admin_companies', { p_search: bizSearch || null, p_limit: 100, p_offset: 0 });
        if (!r.rows.length) { list.replaceChildren(h('div', { class: 'empty', text: 'No businesses found' })); return; }
        list.replaceChildren(h('table', {}, [
            h('thead', {}, h('tr', {}, [h('th', { text: 'Business' }), h('th', { text: 'Rigs' }), h('th', { class: 'num', text: 'Users' }), h('th', { class: 'num', text: 'Bills' }),
                h('th', { class: 'num hide-sm', text: 'Customers' }), h('th', { class: 'hide-sm', text: 'Last active' }), h('th', { text: 'Status' })])),
            h('tbody', {}, r.rows.map((c) => h('tr', { class: 'click', tabindex: 0, onclick: () => openBusiness(c.id), onkeydown: (e) => { if (e.key === 'Enter') openBusiness(c.id); } }, [
                h('td', {}, [h('strong', { text: c.name }), h('span', { class: 'sub', text: `${c.owner_email || 'no owner'} · since ${day(c.created_at)}` })]),
                h('td', {}, (c.rigs || []).map((s) => chip(s))),
                h('td', { class: 'num', text: num(c.members) }),
                h('td', { class: 'num', text: num(c.bills) }),
                h('td', { class: 'num hide-sm', text: num(c.customers) }),
                h('td', { class: 'hide-sm', text: when(c.last_change) }),
                h('td', {}, c.suspended_at ? chip('paused', 'Paused') : chip('free', 'Active'))
            ])))
        ]), h('p', { class: 'note', text: `${num(r.total)} business${r.total === 1 ? '' : 'es'}${r.total > r.rows.length ? ` · showing ${r.rows.length}` : ''}` }));
    }
    await load();
}

/* ---------- one business ---------- */
const dlg = h('dialog', { 'aria-label': 'Business' });
document.body.append(dlg);

async function openBusiness(id) {
    dlg.replaceChildren(h('div', { class: 'dlg-body', text: 'Loading…' }));
    if (!dlg.open) dlg.showModal();
    let d;
    try { d = await rpc('drillrig_admin_company', { p_company: id }); } catch (e) { dlg.replaceChildren(h('div', { class: 'dlg-body', text: e.message })); return; }
    const c = d.company;
    const reload = () => openBusiness(id);
    const counts = d.counts || {};

    // Pause / resume
    const reason = h('input', { type: 'text', placeholder: 'Reason shown to the user (e.g. unpaid, misuse)', style: 'flex:1;min-width:200px' });
    const pauseBox = c.suspended_at
        ? h('div', { class: 'bar' }, [chip('paused', `Paused ${day(c.suspended_at)}`), h('span', { class: 'muted', text: c.suspended_reason || '' }),
            h('button', { type: 'button', class: 'btn primary', text: 'Resume cloud sync', onclick: async () => { await rpc('drillrig_admin_pause', { p_company: id, p_pause: false }); toast('Resumed'); reload(); } })])
        : h('div', { class: 'bar' }, [reason,
            h('button', { type: 'button', class: 'btn warn', text: 'Pause cloud sync', onclick: async () => { await rpc('drillrig_admin_pause', { p_company: id, p_pause: true, p_reason: reason.value }); toast('Paused'); reload(); } })]);

    // Delete
    const confirmName = h('input', { type: 'text', placeholder: `Type "${c.name}" to delete`, style: 'flex:1;min-width:200px', 'aria-label': 'Type the business name to delete' });
    const delBtn = h('button', { type: 'button', class: 'btn bad', text: 'Delete business and all its cloud data', disabled: true });
    confirmName.addEventListener('input', () => { delBtn.disabled = confirmName.value !== c.name; });
    delBtn.addEventListener('click', async () => {
        const r = await rpc('drillrig_admin_delete_company', { p_company: id, p_confirm_name: confirmName.value });
        dlg.close();
        toast(`Deleted ${r.deleted}`);
        go(current);
    });

    dlg.replaceChildren(
        h('div', { class: 'dlg-head' }, [h('h3', { text: c.name }), c.suspended_at ? chip('paused', 'Paused') : chip('free', 'Active'),
            h('button', { type: 'button', class: 'btn', text: 'Close', onclick: () => dlg.close() })]),
        h('div', { class: 'dlg-body' }, [
            h('div', { class: 'kv' }, [
                ...[['Created', day(c.created_at)], ['Last active', when(d.last_change)], ['Bills', num(counts.bill)], ['Customers', num(counts.customer)],
                    ['Deleted items', num((counts.bill_deleted || 0) + (counts.customer_deleted || 0))], ['Cloud data', mb(d.bytes)]]
                    .map(([k, v]) => h('div', {}, [h('span', { text: k }), v])),
                h('div', {}, [h('span', { text: 'Business id' }), h('code', { text: c.id, style: 'font-size:0.72rem;word-break:break-all' })])
            ]),
            h('div', { class: 'section' }, [h('h4', { text: 'People' }), h('div', { class: 'scroll' }, h('table', {}, [
                h('thead', {}, h('tr', {}, ['Email', 'Role', 'Status', 'Joined', 'Last sign-in'].map((t) => h('th', { text: t })))),
                h('tbody', {}, d.members.map((m) => h('tr', {}, [
                    h('td', {}, [h('strong', { text: m.email || '—' }), m.name ? h('span', { class: 'sub', text: m.name }) : null]),
                    h('td', { text: m.role }), h('td', { text: m.status }), h('td', { text: day(m.joined) }), h('td', { text: when(m.last_sign_in) })])))
            ])), d.invites.length ? h('p', { class: 'note', text: `Waiting invites: ${d.invites.map((i) => `${i.email} (${i.role})`).join(', ')}` }) : null]),
            h('div', { class: 'section' }, [h('h4', { text: 'Rigs & subscription' }), h('div', { class: 'scroll' }, h('table', {}, [
                h('thead', {}, h('tr', {}, ['Rig', 'State', 'Bills', 'Free until / Paid until'].map((t) => h('th', { text: t })))),
                h('tbody', {}, d.rigs.map((r) => rigRow(r, reload)))
            ]))]),
            h('div', { class: 'section' }, [h('h4', { text: 'Cloud sync' }), pauseBox,
                h('p', { class: 'note', text: 'Paused: the business cannot sync or invite staff. Bills already on their phones stay, and billing on the phone keeps working.' })]),
            h('div', { class: 'section' }, [h('h4', { text: 'Data' }), h('div', { class: 'bar' }, [
                h('button', { type: 'button', class: 'btn', text: 'Export all cloud data (JSON)', onclick: () => exportBusiness(id, c.name) }),
                h('span', { class: 'note', text: 'For support or the user\'s own request. Every export is logged.' })])]),
            h('div', { class: 'section' }, [h('h4', { text: 'Recent activity' }), activityList(d.activity)]),
            h('div', { class: 'danger' }, [h('h4', { text: 'Delete (only when the owner asks)', style: 'margin-bottom:6px' }), h('div', { class: 'bar' }, [confirmName, delBtn]),
                h('p', { class: 'note', text: 'Removes the business, its people, rigs and every cloud record. Phones keep their own copy until they sign out.' })])
        ])
    );
}

function rigRow(r, reload) {
    const trial = h('input', { type: 'date', value: ymd(r.trial_ends_at), 'aria-label': `${r.name} free until` });
    const paid = h('input', { type: 'date', value: ymd(r.paid_until), 'aria-label': `${r.name} paid until` });
    const save = async (args) => {
        await rpc('drillrig_admin_set_rig_dates', { p_rig: r.id, p_trial_ends_at: null, p_paid_until: null, p_clear_paid: false, ...args });
        toast(`${r.name} updated`);
        reload();
    };
    const addMonths = (n) => {
        const base = Math.max(Date.now(), Date.parse(r.paid_until || '') || 0);
        const d = new Date(base); d.setMonth(d.getMonth() + n);
        return save({ p_paid_until: endOfDayIst(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) });
    };
    return h('tr', { class: 'rig-row' }, [
        h('td', {}, [h('strong', { text: r.name }), h('span', { class: 'sub', text: r.bill_prefix })]),
        h('td', {}, chip(r.state)),
        h('td', { text: num(r.bills) }),
        h('td', {}, h('div', { class: 'rig-dates' }, [
            h('label', { class: 'muted', text: 'Free' }), trial, h('label', { class: 'muted', text: 'Paid' }), paid,
            h('button', { type: 'button', class: 'btn', text: 'Save', onclick: () => save({ p_trial_ends_at: endOfDayIst(trial.value), p_paid_until: endOfDayIst(paid.value), p_clear_paid: !paid.value }) }),
            h('button', { type: 'button', class: 'btn', text: '+1 month paid', onclick: () => addMonths(1) }),
            h('button', { type: 'button', class: 'btn', text: '+12 months', onclick: () => addMonths(12) })
        ]))
    ]);
}

function activityList(items) {
    if (!items?.length) return h('div', { class: 'muted', text: 'No activity yet (or 0004 not installed).' });
    return h('div', { class: 'scroll' }, h('table', {}, h('tbody', {}, items.map((a) => h('tr', {}, [
        h('td', { text: when(a.at) }), h('td', { text: `${a.action} ${a.kind}` }),
        h('td', { text: a.summary?.billNo || a.summary?.name || a.record_id }), h('td', { class: 'muted', text: a.by || '' })])))));
}

async function exportBusiness(id, name) {
    const data = await rpc('drillrig_admin_export', { p_company: id });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `drillrig-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Exported ${num(data.records.length)} records`);
}

/* ---------- users ---------- */
let userSearch = '';
async function users() {
    const input = h('input', { type: 'search', placeholder: 'Search email or name', value: userSearch, 'aria-label': 'Search users' });
    const list = h('div', { class: 'scroll' });
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { userSearch = input.value; load(); }, 250); });
    body.replaceChildren(h('div', { class: 'card' }, [h('div', { class: 'bar' }, [input]), list]));
    async function load() {
        const rows = await rpc('drillrig_admin_users', { p_search: userSearch || null, p_limit: 100 });
        if (!rows.length) { list.replaceChildren(h('div', { class: 'empty', text: 'No users found' })); return; }
        list.replaceChildren(h('table', {}, [
            h('thead', {}, h('tr', {}, ['User', 'Businesses', 'Last sign-in', 'Since'].map((t, i) => h('th', { class: i > 1 ? 'hide-sm' : '', text: t })))),
            h('tbody', {}, rows.map((u) => h('tr', {}, [
                h('td', {}, [h('strong', { text: u.email }), u.name ? h('span', { class: 'sub', text: u.name }) : null]),
                h('td', {}, (u.businesses || []).map((b) => h('button', { type: 'button', class: 'btn', style: 'margin:2px', onclick: () => openBusiness(b.company_id) },
                    [`${b.name} · ${b.role}`, b.status !== 'active' ? ` (${b.status})` : '', b.paused ? ' · paused' : '']))),
                h('td', { class: 'hide-sm', text: when(u.last_sign_in) }),
                h('td', { class: 'hide-sm', text: day(u.created_at) })
            ])))
        ]));
    }
    await load();
}

/* ---------- admin log ---------- */
async function log() {
    const rows = await rpc('drillrig_admin_log', { p_limit: 200 });
    const label = { view_business: 'Opened', set_rig_dates: 'Changed rig dates', pause: 'Paused', resume: 'Resumed', export: 'Exported data', delete_business: 'Deleted' };
    body.replaceChildren(h('div', { class: 'card' }, [h('h2', { text: 'Everything done in this console' }), rows.length ? h('div', { class: 'scroll' }, h('table', {}, [
        h('thead', {}, h('tr', {}, ['When', 'Admin', 'Action', 'Business', 'Details'].map((t) => h('th', { text: t })))),
        h('tbody', {}, rows.map((l) => h('tr', {}, [
            h('td', { text: when(l.at) }), h('td', { text: l.admin || '' }), h('td', { text: label[l.action] || l.action }),
            h('td', { text: l.company || l.target || '(deleted)' }),
            h('td', { class: 'muted', text: l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '' })])))
    ])) : h('div', { class: 'empty', text: 'Nothing yet' })]));
}

start().catch(fail);
