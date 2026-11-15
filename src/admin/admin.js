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
const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const monthLabel = (ym) => { const [y, m] = String(ym).split('-').map(Number); return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };
const missing0008 = (e) => /drillrig_admin_(report|bills|bill|customers|new_businesses)/.test(e?.message || '') && /function|schema cache|does not exist|Could not find/i.test(e?.message || '');
const need0008 = () => h('div', { class: 'empty', text: 'Not installed on the server yet: run supabase/drillrig/0008_admin_business_data.sql in the Supabase SQL editor.' });
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

// Phones show tables as cards; each cell needs its column name (data-label). Tables are built in
// many places, so label them whenever new rows appear in the page or the business popup.
function labelTables(scope) {
    scope.querySelectorAll('table').forEach((t) => {
        const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        if (!heads.length) return;
        t.querySelectorAll('tbody tr').forEach((tr) => {
            [...tr.children].forEach((td, i) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || ''); });
        });
    });
}
new MutationObserver(() => { labelTables(document.body); }).observe(document.body, { childList: true, subtree: true });
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
        ]),
        newBusinessesCard()
    );
}

// Who joined in the last 30 days, newest first (0008).
function newBusinessesCard() {
    const box = h('div', { class: 'scroll' }, h('div', { class: 'muted', text: 'Loading…' }));
    rpc('drillrig_admin_new_businesses', { p_days: 30 }).then((rows) => {
        if (!rows?.length) { box.replaceChildren(h('div', { class: 'empty', text: 'Nobody new in the last 30 days' })); return; }
        box.replaceChildren(h('table', {}, [
            h('thead', {}, h('tr', {}, [h('th', { text: 'Business' }), h('th', { text: 'Joined' }), h('th', { class: 'num', text: 'Bills' })])),
            h('tbody', {}, rows.map((c) => h('tr', { class: 'click', tabindex: 0, onclick: () => openBusiness(c.id), onkeydown: (e) => { if (e.key === 'Enter') openBusiness(c.id); } }, [
                h('td', {}, [h('strong', { text: c.name }), h('span', { class: 'sub', text: c.owner_email || 'no owner' })]),
                h('td', { text: when(c.created_at) }),
                h('td', { class: 'num', text: num(c.bills) })
            ])))
        ]));
    }).catch((e) => box.replaceChildren(missing0008(e) ? need0008() : h('div', { class: 'empty', text: e.message })));
    return h('div', { class: 'card' }, [h('h2', { text: 'New businesses (last 30 days)' }), box]);
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

async function openBusiness(id, keepView = false) {
    if (!keepView) delete dlg.dataset.view;
    dlg.replaceChildren(h('div', { class: 'dlg-body', text: 'Loading…' }));
    if (!dlg.open) dlg.showModal();
    let d;
    try { d = await rpc('drillrig_admin_company', { p_company: id }); } catch (e) { dlg.replaceChildren(h('div', { class: 'dlg-body', text: e.message })); return; }
    const c = d.company;
    const reload = () => openBusiness(id, true);
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

    const detailsBody = h('div', { class: 'dlg-body' }, [
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
        ]);

    // Tabs: Details | Report | Bills | Customers (the last three read the business's data; each view is logged)
    const pane = h('div');
    const VIEWS = [['profile', 'Profile'], ['details', 'Details'], ['report', 'Report'], ['bills', 'Bills'], ['customers', 'Customers']];
    const tabs = h('div', { class: 'tabs dlg-tabs', role: 'tablist' }, VIEWS.map(([k, label]) =>
        h('button', { type: 'button', role: 'tab', 'data-view': k, text: label, onclick: () => openView(k) })));
    function openView(k) {
        dlg.dataset.view = k;
        tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.view === k));
        if (k === 'details') { pane.replaceChildren(detailsBody); return; }
        const box = h('div', { class: 'dlg-body' }, h('div', { class: 'muted', text: 'Loading…' }));
        pane.replaceChildren(box);
        ({ profile: bizProfile, report: bizReport, bills: bizBills, customers: bizCustomers })[k](id, box)
            .catch((e) => box.replaceChildren(
                k === 'profile' && /drillrig_admin_profile/.test(e?.message || '') ? h('div', { class: 'empty', text: 'Not installed on the server yet: run supabase/drillrig/0009_admin_business_profile.sql in the Supabase SQL editor.' })
                    : missing0008(e) ? need0008() : h('div', { class: 'empty', text: e.message })));
    }
    dlg.replaceChildren(
        h('div', { class: 'dlg-head' }, [h('h3', { text: c.name }), c.suspended_at ? chip('paused', 'Paused') : chip('free', 'Active'),
            h('button', { type: 'button', class: 'btn', text: 'Close', onclick: () => dlg.close() })]),
        h('div', { class: 'dlg-tabbar' }, tabs),
        pane
    );
    openView(dlg.dataset.view || 'profile');
}

/* ---------- one business: what the owner entered in the app (0009) ---------- */
async function bizProfile(id, box) {
    const p = await rpc('drillrig_admin_profile', { p_company: id });
    const b = p.brand || {};
    const o = p.owner || {};
    const val = (v) => (v === undefined || v === null || String(v).trim() === '' ? h('span', { class: 'muted', text: 'Not filled' }) : String(v));
    const kv = (rows) => h('div', { class: 'kv' }, rows.map(([k, v]) => h('div', {}, [h('span', { text: k }), typeof v === 'object' && v?.nodeType ? v : val(v)])));
    const phone = b.phones ? `${b.phoneCountryCode && !String(b.phones).startsWith('+') ? b.phoneCountryCode + ' ' : ''}${b.phones}` : '';
    const logo = b.logoDataUrl ? h('img', { src: b.logoDataUrl, alt: 'Logo', style: 'width:64px;height:64px;object-fit:contain;border-radius:12px;border:1px solid #e2e8f0;background:#fff' })
        : h('span', { class: 'muted', text: b.hasLogo ? 'Logo set (too big to show)' : 'No logo' });
    const cards = (p.rateCards || []);
    box.replaceChildren(
        h('div', { class: 'section' }, [h('h4', { text: 'Google account (owner)' }), kv([
            ['Name', o.name], ['Email', o.email], ['Signed up', day(o.signed_up)], ['Last sign-in', when(o.last_sign_in)]])]),
        p.brand ? h('div', { class: 'section' }, [h('h4', { text: 'Company profile (from the app)' }),
            h('div', { class: 'bar', style: 'align-items:center;gap:12px;margin-bottom:8px' }, [logo, h('div', {}, [h('strong', { text: b.companyName || '—', style: 'font-size:1.05rem' }), b.tagline ? h('div', { class: 'muted', text: b.tagline }) : null])]),
            kv([['Phone', phone], ['Address / place', b.address], ['GSTIN', b.gstNumber], ['UPI ID', b.upiId], ['UPI name', b.upiName], ['Website', b.website],
                ['Bill prefix', b.billPrefix], ['Next bill no.', b.billPrefix && b.nextBillSeq ? `${b.billPrefix}-${b.nextBillSeq}` : b.nextBillSeq],
                ['Next quotation no.', b.billPrefix && b.nextQuoteSeq ? `${b.billPrefix}-Q${b.nextQuoteSeq}` : b.nextQuoteSeq],
                ['Pipe 1 name', b.casing1Name], ['Pipe 2 name', b.casing2Name], ['Colour theme', b.theme],
                ['Final bill footer', b.finalBillTermsNote], ['Quotation footer', b.termsNote]])])
            : h('div', { class: 'section' }, [h('h4', { text: 'Company profile (from the app)' }), h('div', { class: 'empty', text: 'This business has not synced its company profile yet.' })]),
        h('div', { class: 'section' }, [h('h4', { text: `Rate cards (${cards.length})` }), cards.length ? h('div', { class: 'scroll' }, h('table', {}, [
            h('thead', {}, h('tr', {}, ['Rate', 'Drilling', '7" pipe', '10" pipe', 'Bata', 'Flush', 'Grace', 'GST', 'Slabs'].map((t) => h('th', { text: t })))),
            h('tbody', {}, cards.map((c) => h('tr', {}, [
                h('td', {}, [h('strong', { text: c.name || '—' }), c.isDefault ? h('span', { class: 'sub', text: 'Default' }) : null]),
                h('td', { class: 'num', text: c.base != null ? `₹${c.base}/ft` : '—' }), h('td', { class: 'num', text: c.pvc7 != null ? `₹${c.pvc7}` : '—' }),
                h('td', { class: 'num', text: c.pvc10 != null ? `₹${c.pvc10}` : '—' }), h('td', { class: 'num', text: c.bata != null ? inr(c.bata) : '—' }),
                h('td', { class: 'num', text: c.flush != null ? `₹${c.flush}` : '—' }), h('td', { class: 'num', text: c.grace != null ? `${c.grace} ft` : '—' }),
                h('td', { class: 'num', text: c.gst != null ? `${c.gst}%` : '—' }), h('td', { class: 'num', text: `${c.slabs || 0}${c.maxDepth ? ` · to ${num(c.maxDepth)} ft` : ''}` })])))
        ])) : h('div', { class: 'empty', text: 'No rate cards synced yet.' })]),
        h('p', { class: 'note', text: 'Read-only. This view is written to the admin log.' })
    );
}

/* ---------- one business: report / bills / customers (0008) ---------- */
async function bizReport(id, box) {
    const r = await rpc('drillrig_admin_report', { p_company: id });
    const tile = (label, value, note) => h('div', { class: 'tile' }, [h('span', { text: label }), h('strong', { text: value }), note ? h('small', { text: note }) : null]);
    const period = (title, p) => h('div', { class: 'section' }, [h('h4', { text: title }), h('div', { class: 'tiles' }, [
        tile('Bills', num(p.bills), `${num(p.feet)} ft drilled`), tile('Billed', inr(p.billed)), tile('Received', inr(p.received))])]);
    const months = (r.months || []).slice().reverse();
    box.replaceChildren(
        h('div', { class: 'section' }, [h('h4', { text: 'All time (final bills)' }), h('div', { class: 'tiles' }, [
            tile('Bills', num(r.all.bills), `${num(r.quotes)} quotations · ${num(r.all.feet)} ft`),
            tile('Billed', inr(r.all.billed)), tile('Received', inr(r.all.received)),
            tile('Due', inr(r.all.due), `${num(r.all.unpaid_bills)} unpaid bills`)])]),
        period('This month', r.this_month),
        period('Last month', r.last_month),
        h('div', { class: 'section' }, [h('h4', { text: 'Last 12 months' }), h('div', { class: 'scroll' }, h('table', {}, [
            h('thead', {}, h('tr', {}, ['Month', 'Bills', 'Feet', 'Billed', 'Received'].map((t, i) => h('th', { class: i ? 'num' : '', text: t })))),
            h('tbody', {}, months.map((m) => h('tr', {}, [h('td', { text: monthLabel(m.month) }), h('td', { class: 'num', text: num(m.bills) }),
                h('td', { class: 'num', text: num(m.feet) }), h('td', { class: 'num', text: inr(m.billed) }), h('td', { class: 'num', text: inr(m.received) })])))
        ]))]),
        h('div', { class: 'section' }, [h('h4', { text: 'Biggest dues' }), (r.top_dues || []).length ? h('div', { class: 'scroll' }, h('table', {}, [
            h('thead', {}, h('tr', {}, ['Customer', 'Unpaid bills', 'Oldest', 'Due'].map((t, i) => h('th', { class: i ? 'num' : '', text: t })))),
            h('tbody', {}, r.top_dues.map((d) => h('tr', {}, [h('td', {}, [h('strong', { text: d.customer }), d.phone ? h('span', { class: 'sub', text: d.phone }) : null]),
                h('td', { class: 'num', text: num(d.bills) }), h('td', { class: 'num', text: d.oldest ? day(d.oldest) : '—' }), h('td', { class: 'num', text: inr(d.due) })])))
        ])) : h('div', { class: 'muted', text: 'No dues' })]),
        (r.rigs || []).length > 1 ? h('div', { class: 'section' }, [h('h4', { text: 'By rig' }), h('div', { class: 'scroll' }, h('table', {}, [
            h('thead', {}, h('tr', {}, ['Rig', 'Bills', 'Billed', 'Due'].map((t, i) => h('th', { class: i ? 'num' : '', text: t })))),
            h('tbody', {}, r.rigs.map((g) => h('tr', {}, [h('td', { text: g.rig }), h('td', { class: 'num', text: num(g.bills) }),
                h('td', { class: 'num', text: inr(g.billed) }), h('td', { class: 'num', text: inr(g.due) })])))
        ]))]) : null,
        h('p', { class: 'note', text: 'Same maths as the app’s Report page. Opening this report is written to the admin log.' })
    );
}

async function bizBills(id, box) {
    let search = '';
    let status = 'all';
    let offset = 0;
    const input = h('input', { type: 'search', placeholder: 'Search bill no, customer, phone, place', 'aria-label': 'Search bills' });
    const pills = h('div', { class: 'tabs' }, [['all', 'All bills'], ['due', 'Unpaid'], ['paid', 'Paid'], ['quote', 'Quotations']].map(([k, label]) =>
        h('button', { type: 'button', 'data-k': k, class: k === status ? 'on' : '', text: label, onclick: () => { status = k; pills.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); load(true).catch((e) => toast(e.message)); } })));
    const sum = h('p', { class: 'note' });
    const tbody = h('tbody');
    const more = h('button', { type: 'button', class: 'btn', text: 'Load more', hidden: true, onclick: () => load(false).catch((e) => toast(e.message)) });
    const detail = h('div');
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { search = input.value.trim(); load(true).catch((e) => toast(e.message)); }, 300); });
    box.replaceChildren(h('div', { class: 'bar' }, [input]), pills, sum, h('div', { class: 'scroll' }, h('table', {}, [
        h('thead', {}, h('tr', {}, ['Bill', 'Customer', 'Depth', 'Total', 'Paid', 'Due'].map((t, i) => h('th', { class: i >= 2 ? 'num' : '', text: t })))), tbody])), more, detail);
    async function load(reset) {
        if (reset) { offset = 0; tbody.replaceChildren(); detail.replaceChildren(); }
        const r = await rpc('drillrig_admin_bills', { p_company: id, p_search: search || null, p_status: status, p_limit: 50, p_offset: offset });
        offset += r.rows.length;
        sum.textContent = `${num(r.total)} ${status === 'quote' ? 'quotations' : 'bills'} · billed ${inr(r.sum.billed)} · received ${inr(r.sum.received)} · due ${inr(r.sum.due)}`;
        if (!r.rows.length && reset) tbody.replaceChildren(h('tr', {}, h('td', { colspan: 6, class: 'empty', text: 'No bills found' })));
        tbody.append(...r.rows.map((b) => h('tr', { class: 'click', tabindex: 0, onclick: () => showBill(b), onkeydown: (e) => { if (e.key === 'Enter') showBill(b); } }, [
            h('td', {}, [h('strong', { text: b.bill_no || '—' }), h('span', { class: 'sub', text: [b.day ? day(b.day) : '', b.rig].filter(Boolean).join(' · ') })]),
            h('td', {}, [h('strong', { text: b.customer || 'Direct bill' }), h('span', { class: 'sub', text: [b.phone, b.place].filter(Boolean).join(' · ') })]),
            h('td', { class: 'num', text: b.depth ? `${num(b.depth)} ft` : '—' }),
            h('td', { class: 'num', text: inr(b.total) }),
            h('td', { class: 'num', text: inr(b.paid) }),
            h('td', { class: 'num' }, Number(b.due) > 0 ? h('strong', { style: 'color:var(--bad)', text: inr(b.due) }) : (b.doc === 'quote' ? '—' : chip('free', 'Paid')))
        ])));
        more.hidden = offset >= r.total;
    }
    async function showBill(b) {
        detail.replaceChildren(h('div', { class: 'muted', text: 'Loading bill…' }));
        let full;
        try { full = await rpc('drillrig_admin_bill', { p_company: id, p_bill: b.id }); } catch (e) { detail.replaceChildren(h('div', { class: 'empty', text: e.message })); return; }
        const pays = Array.isArray(full.payments) ? full.payments : [];
        detail.replaceChildren(h('div', { class: 'section card', style: 'margin-top:10px' }, [
            h('h4', { text: `${full.billNo || b.bill_no} · ${full.custName || 'Direct bill'}` }),
            h('div', { class: 'kv' }, [['Date', b.day ? day(b.day) : '—'], ['Place', full.custLocation || '—'], ['Phone', full.custPhone || '—'],
                ['Depth', `${num(full.snapshot?.totalDepth)} ft`], ['Total', inr(b.total)], ['Paid', inr(b.paid)], ['Due', inr(b.due)], ['Made by', b.made_by || '—']]
                .map(([k, v]) => h('div', {}, [h('span', { text: k }), v]))),
            pays.length ? h('p', { class: 'note', text: 'Payments: ' + pays.map((p) => `${inr(p.amount)}${Number(p.discount) > 0 ? ` + ${inr(p.discount)} discount` : ''}${p.date ? ` on ${day(p.date)}` : ''}${p.mode ? ` (${p.mode})` : ''}`).join(', ') }) : null,
            h('details', {}, [h('summary', { text: 'Full bill data (JSON)' }), h('pre', { style: 'white-space:pre-wrap;font-size:0.72rem;max-height:320px;overflow:auto', text: JSON.stringify(full, null, 2) })])
        ]));
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    await load(true);
}

async function bizCustomers(id, box) {
    let search = '';
    let offset = 0;
    const input = h('input', { type: 'search', placeholder: 'Search name, phone, village', 'aria-label': 'Search customers' });
    const note = h('p', { class: 'note' });
    const tbody = h('tbody');
    const more = h('button', { type: 'button', class: 'btn', text: 'Load more', hidden: true, onclick: () => load(false).catch((e) => toast(e.message)) });
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { search = input.value.trim(); load(true).catch((e) => toast(e.message)); }, 300); });
    box.replaceChildren(h('div', { class: 'bar' }, [input]), note, h('div', { class: 'scroll' }, h('table', {}, [
        h('thead', {}, h('tr', {}, ['Customer', 'Bills', 'Billed', 'Due', 'Last bill'].map((t, i) => h('th', { class: i ? 'num' : '', text: t })))), tbody])), more);
    async function load(reset) {
        if (reset) { offset = 0; tbody.replaceChildren(); }
        const r = await rpc('drillrig_admin_customers', { p_company: id, p_search: search || null, p_limit: 50, p_offset: offset });
        offset += r.rows.length;
        note.textContent = `${num(r.total)} customers · biggest due first`;
        if (!r.rows.length && reset) tbody.replaceChildren(h('tr', {}, h('td', { colspan: 5, class: 'empty', text: 'No customers found' })));
        tbody.append(...r.rows.map((c) => h('tr', {}, [
            h('td', {}, [h('strong', { text: c.name || '—' }), h('span', { class: 'sub', text: [c.phone, c.village].filter(Boolean).join(' · ') })]),
            h('td', { class: 'num', text: num(c.bills) }),
            h('td', { class: 'num', text: inr(c.billed) }),
            h('td', { class: 'num' }, Number(c.due) > 0 ? h('strong', { style: 'color:var(--bad)', text: inr(c.due) }) : '—'),
            h('td', { class: 'num', text: c.last_day ? day(c.last_day) : '—' })
        ])));
        more.hidden = offset >= r.total;
    }
    await load(true);
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
    const input = h('input', { type: 'search', placeholder: 'Search email, name or mobile', value: userSearch, 'aria-label': 'Search users' });
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
                h('td', {}, [h('strong', { text: u.email }), u.name ? h('span', { class: 'sub', text: u.name }) : null,
                    u.phone ? h('a', { class: 'sub', href: `tel:${u.phone}`, text: `📞 ${u.phone}` }) : null]),
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
    const label = { view_business: 'Opened', set_rig_dates: 'Changed rig dates', pause: 'Paused', resume: 'Resumed', export: 'Exported data', delete_business: 'Deleted',
        view_report: 'Viewed report', view_bills: 'Viewed bills', view_bill: 'Opened a bill', view_customers: 'Viewed customers' };
    body.replaceChildren(h('div', { class: 'card' }, [h('h2', { text: 'Everything done in this console' }), rows.length ? h('div', { class: 'scroll' }, h('table', {}, [
        h('thead', {}, h('tr', {}, ['When', 'Admin', 'Action', 'Business', 'Details'].map((t) => h('th', { text: t })))),
        h('tbody', {}, rows.map((l) => h('tr', {}, [
            h('td', { text: when(l.at) }), h('td', { text: l.admin || '' }), h('td', { text: label[l.action] || l.action }),
            h('td', { text: l.company || l.target || '(deleted)' }),
            h('td', { class: 'muted', text: l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '' })])))
    ])) : h('div', { class: 'empty', text: 'Nothing yet' })]));
}

start().catch(fail);
