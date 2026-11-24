// Settings → "Team & Rigs" (owner only, signed in, cloud migrations 0003 + 0010 + 0011 (+ 0012)).
// Rig first: each rig card lists the people who work on it (drivers, managers) and their
// invitations, with "Add person". Owners / partners have their own card.
// Invited people must Accept (or Reject) in their own app — see invitations.js.
// Looks like the customer popup: white header, pale body, white cards, rows that open
// (tap a person to change role / rigs / remove), one button style, line icons.
// Every action is an owner-only server function; this file is only the screen.
import { getSupabase } from '../../cloud/auth.js';
import { getAccess, getRole, hasRigs, onAccessChange, rigDaysLeft, can } from '../../cloud/access.js';
import { syncNow } from '../../cloud/sync.js';
import { renewLink, PLANS, isEarlyAccess, earlyAccessDaysLeft } from '../../config/plans.js';
import { fetchActivity, renderActivityList } from '../../cloud/activity.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { ROLE_INFO } from './invitations.js';
import { STORAGE_KEYS } from '../../data/storage.js';
import { paymentEditSettings, PAYMENT_EDIT_HOUR_CHOICES } from '../payments/paymentEditRules.js';

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', office: 'Office staff', driver: 'Manager' };
/** What the owner can tick for office staff (server: drillrig.clean_perms, migration 0014). */
const PERM_INFO = [
    ['bills', 'Make bills & take payments', 'All rigs'],
    ['reports', 'See bills & reports', 'Bill book, dashboard'],
    ['workers', 'Workers & attendance', 'Operators, helpers, drivers'],
    ['stock', 'Stock & purchases', 'Bits, hammers, casing pipes'],
    ['expenses', 'Expenses & cash', 'Expenses, diesel, cash; tick hand-overs received'],
    ['team', 'Add managers', 'Invite managers and change their rigs'],
    ['pnl', 'Profit & loss', 'Coming soon']
];
const DEFAULT_OFFICE_PERMS = { reports: true, workers: true, stock: true };
const showPhone = (p) => {
    const d = String(p || '').replace(/[^0-9+]/g, '');
    const m = d.match(/^\+91(\d{5})(\d{5})$/);
    return m ? `+91 ${m[1]} ${m[2]}` : d;
};
const appUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '');
const initial = (s) => String(s || '?').trim().charAt(0).toUpperCase() || '?';

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
}

/** One button style everywhere: [icon] label. kind: '' (white), 'pri' (green), 'soft' (light green), 'danger'. */
function btn(label, { kind = '', ic = null, onclick, href, cls = '', type = 'button' } = {}) {
    const k = `tt-btn${kind ? ` is-${kind}` : ''}${cls ? ` ${cls}` : ''}`;
    const kids = [ic ? icon(ic) : null, el('span', { text: label })];
    if (href) return el('a', { class: k, href, target: '_blank', rel: 'noopener' }, kids);
    return el('button', { type, class: k, onclick }, kids);
}

async function rpc(name, args) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) {
        const e = new Error(error.message || 'Request failed');
        e.missing = /function .* does not exist|schema cache/i.test(error.message || '');
        throw e;
    }
    return data;
}

function rigStatus(rig) {
    if (rig.archived) return { text: 'Archived', cls: 'muted' };
    const days = rigDaysLeft(rig);
    if (!rig.active) return { text: 'Ended · renew to keep billing', cls: 'bad' };
    const paid = Date.parse(rig.paid_until || '') > Date.parse(rig.trial_ends_at || '');
    if (!paid && isEarlyAccess()) return { text: `Free · ${earlyAccessDaysLeft()} days left`, cls: 'ok' };
    return { text: `${paid ? 'Paid' : 'Free trial'} · ${days} day${days === 1 ? '' : 's'} left`, cls: days <= 7 ? 'warn' : 'ok' };
}

const checkedIds = (root, name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

/** Permission tick boxes for office staff. */
function permChecks(selected, name) {
    return el('div', { class: 'tt-perms', role: 'group', 'aria-label': 'What can they do?' }, PERM_INFO.map(([k, t, d]) =>
        el('label', { class: 'tt-perm' }, [
            el('input', { type: 'checkbox', name, value: k, checked: !!selected?.[k] }),
            el('span', { class: 'tt-perm-box', 'aria-hidden': 'true' }, [icon('check')]),
            el('span', { class: 'tt-perm-txt' }, [el('strong', { text: t }), el('small', { text: d })])
        ])));
}
const permsOf = (root, name) => Object.fromEntries(checkedIds(root, name).map((k) => [k, true]));

/** Rig chips (tick the rigs this person works on). */
function rigChips(rigs, selected, name) {
    return el('div', { class: 'tt-chips', role: 'group', 'aria-label': 'Rigs' }, rigs.filter((r) => !r.archived).map((r) =>
        el('label', { class: 'tt-chip' }, [
            el('input', { type: 'checkbox', name, value: r.id, checked: selected.includes(r.id) }),
            icon('check', 'tt-chip-tick'),
            el('span', { text: r.name })
        ])));
}

/** Role cards (radio) with what each role means. */
function roleCards(name, roles, value, onChange) {
    const wrap = el('div', { class: 'tt-roles', role: 'radiogroup', 'aria-label': 'What will they do?' });
    roles.forEach((r) => {
        const c = ROLE_INFO[r];
        const input = el('input', { type: 'radio', name, value: r, checked: r === value });
        input.addEventListener('change', () => onChange(r));
        wrap.appendChild(el('label', { class: `tt-role is-${r}` }, [
            input,
            el('span', { class: 'tt-tile' }, [icon(c.icon)]),
            el('span', { class: 'tt-role-txt' }, [el('strong', { text: c.title }), el('span', { text: c.text })]),
            el('span', { class: 'tt-radio', 'aria-hidden': 'true' })
        ]));
    });
    return wrap;
}

/** Team page (owners): may staff change a saved payment, and for how long. Company setting, synced. */
export function paymentEditCard(app) {
    const cur = paymentEditSettings(app.brand);
    const save = (next) => {
        app.brand.staffPaymentEdit = next;
        app.saveToStorage(STORAGE_KEYS.brand, app.brand);
        app.showToast?.(next.on
            ? `✅ Staff can change a payment for ${next.hours} hours after entering it`
            : '🔒 Only owners can change payments');
    };
    const hoursBlock = el('div', { class: 'tt-block' }, [
        el('span', { class: 'tt-mini', text: 'For how long after entry' }),
        el('div', { class: 'tt-seg tt-seg-hours', role: 'radiogroup', 'aria-label': 'Hours' }, PAYMENT_EDIT_HOUR_CHOICES.map((h) => {
            const input = el('input', { type: 'radio', name: 'ttPayEditHours', value: String(h), checked: h === cur.hours });
            input.addEventListener('change', () => save({ on: true, hours: h }));
            return el('label', {}, [input, el('span', { text: `${h} hrs` })]);
        }))
    ]);
    hoursBlock.hidden = !cur.on;
    const tick = el('input', { type: 'checkbox', id: 'ttPayEditOn', checked: cur.on });
    tick.addEventListener('change', () => {
        hoursBlock.hidden = !tick.checked;
        const hours = Number(hoursBlock.querySelector('input:checked')?.value) || cur.hours;
        save({ on: tick.checked, hours });
    });
    return el('div', { class: 'tt-card' }, [
        el('label', { class: 'tt-perm' }, [
            tick,
            el('span', { class: 'tt-perm-box', 'aria-hidden': 'true' }, [icon('check')]),
            el('span', { class: 'tt-perm-txt' }, [
                el('strong', { text: 'Staff can change payments' }),
                el('small', { text: 'Managers and office staff who take payments can fix a wrong amount, date or mode. Owners can always change any payment.' })
            ])
        ]),
        hoursBlock
    ]);
}

export function initTeamUI(app) {
    const account = document.getElementById('accountCard');
    if (!account) return;
    const card = el('button', { type: 'button', class: 'team-card tt-entry', id: 'teamCard', hidden: true, onclick: () => openSheet(app) });
    account.insertAdjacentElement('afterend', card);

    const renderCard = () => {
        const a = getAccess();
        const show = !!a && can('team') && hasRigs() && !document.getElementById('accSignedIn')?.hidden;
        card.hidden = !show;
        if (!show) return;
        const rigs = a.rigs.filter((r) => !r.archived);
        const ended = rigs.filter((r) => !r.active).length;
        card.replaceChildren(
            el('span', { class: 'tt-tile' }, [icon('users')]),
            el('span', { class: 'tt-entry-txt' }, [
                el('strong', { text: 'Team & Rigs' }),
                el('small', { text: `${rigs.map((r) => r.name).join(', ') || 'Rig 1'}${ended ? ` · ${ended} need renewal` : ' · add managers & office staff'}` })
            ]),
            el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
        );
        paintIcons();
    };
    onAccessChange(renderCard);
    // The signed-in/out card toggles without an access change.
    new MutationObserver(renderCard).observe(document.getElementById('accSignedIn') || account, { attributes: true, attributeFilter: ['hidden'] });
    renderCard();
}

function openSheet(app) {
    const a = getAccess();
    if (!a) return;
    const company = a.companyId;
    const body = el('div', { class: 'tt-content' }, [el('p', { class: 'tt-loading', text: 'Loading team…' })]);
    const msg = el('div', { class: 'tt-msg', role: 'alert', hidden: true });
    const sub = el('p', { text: 'Who works on which rig' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const scroller = el('div', { class: 'tt-body' }, [msg, body]);
    const overlay = el('div', { class: 'tm-overlay tt-overlay', onclick: (e) => { if (e.target === overlay) close(); } }, [
        el('div', { class: 'tt-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tmTitle' }, [
            el('div', { class: 'tt-head' }, [
                el('span', { class: 'tt-tile is-head' }, [icon('users')]),
                el('div', { class: 'tt-head-txt' }, [el('h2', { id: 'tmTitle', text: 'Team & Rigs' }), sub]),
                el('button', { type: 'button', class: 'tt-icon-btn is-close', 'aria-label': 'Close', onclick: close }, [icon('x')])
            ]),
            scroller
        ])
    ]);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    paintIcons();

    const say = (text, ok = false) => {
        msg.hidden = !text;
        msg.className = `tt-msg${ok ? ' is-ok' : ''}`;
        msg.replaceChildren(...(text ? [icon(ok ? 'circle-check' : 'circle-alert'), el('span', { text })] : []));
        if (text) { scroller.scrollTo({ top: 0, behavior: 'smooth' }); paintIcons(); }
    };
    const run = async (fn, okText) => {
        say('');
        try {
            await fn();
            await load();
            if (okText) say(okText, true);
            syncNow(); // refresh this phone's own rigs/access
        } catch (err) {
            say(err.message);
        }
    };

    let team = null;
    async function load() {
        try {
            team = await rpc('drillrig_team', { p_company: company });
        } catch (err) {
            body.replaceChildren(el('p', { class: 'tt-loading is-bad', text: `Could not load the team: ${err.message}` }));
            return;
        }
        // The first rig always uses the company's Settings prefix; keep the server in step.
        const def = team.rigs.find((r) => r.is_default);
        const brandPrefix = String(app.brand?.billPrefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (def && brandPrefix && def.bill_prefix !== brandPrefix) {
            try {
                await rpc('drillrig_save_rig', { p_company: company, p_rig: def.id, p_name: def.name, p_prefix: brandPrefix });
                def.bill_prefix = brandPrefix;
            } catch { /* another rig already uses it: shown as is */ }
        }
        const active = team.rigs.filter((r) => !r.archived);
        const archived = team.rigs.filter((r) => r.archived);
        const activeIds = new Set(active.map((r) => r.id));
        const isOwner = (team.my_role || 'owner') === 'owner';
        const onRig = (role) => role !== 'owner' && role !== 'office';
        const staff = team.members.filter((m) => m.role !== 'owner');
        const noRig = staff.filter((m) => onRig(m.role) && !(m.rig_ids || []).some((id) => activeIds.has(id)));
        const noRigInvites = team.invites.filter((iv) => onRig(iv.role) && !(iv.rig_ids || []).some((id) => activeIds.has(id)));
        const people = team.members.length;
        sub.textContent = `${active.length} rig${active.length === 1 ? '' : 's'} · ${people} ${people === 1 ? 'person' : 'people'}`;
        // No staff and nobody invited yet: the 3 steps open at the top; later they sit under "More".
        const firstTime = !staff.length && !team.invites.some((iv) => iv.role !== 'owner');
        body.replaceChildren(...[
            firstTime ? howToSteps(true) : null,
            label(active.length === 1 ? 'Your rig' : 'Your rigs', active.length > 1 ? String(active.length) : null),
            ...active.map((r) => rigCard(r)),
            isOwner ? addRigCard() : null,
            isOwner ? label('Office staff') : null,
            isOwner ? officeCard() : null,
            isOwner ? label('Payments by staff') : null,
            isOwner ? paymentEditCard(app) : null,
            isOwner ? label('Owners & partners') : null,
            isOwner ? ownersCard() : null,
            noRig.length || noRigInvites.length ? label('Not on a rig yet') : null,
            noRig.length || noRigInvites.length ? el('div', { class: 'tt-card' }, [
                el('p', { class: 'tt-note' }, [icon('info'), el('span', { text: 'They cannot make bills until you give them a rig. Tap a name.' })]),
                el('div', { class: 'tt-list' }, [...noRig.map((m) => personItem(m)), ...noRigInvites.map((iv) => inviteItem(iv))])
            ]) : null,
            label('More'),
            el('div', { class: 'tt-card tt-folds' }, [firstTime ? null : howToSteps(false), rolesHelp(), isOwner && archived.length ? archivedFold(archived) : null, activityFold()])
        ].filter(Boolean));
        paintIcons();
    }

    function label(text, count = null) {
        return el('div', { class: 'tt-label' }, [el('span', { text }), count ? el('span', { class: 'tt-count', text: count }) : null]);
    }

    /** A row that opens (people, invites). */
    function item({ avatar, title, subText, pill, bodyKids, cls = '' }) {
        const main = el('span', { class: 'tt-row-main' }, [
            el('strong', { text: title }),
            subText ? el('small', { text: subText }) : null
        ]);
        if (!bodyKids) {
            return el('div', { class: `tt-item ${cls}` }, [el('div', { class: 'tt-row is-static' }, [avatar, main, pill])]);
        }
        const bodyEl = el('div', { class: 'tt-item-body', hidden: true }, bodyKids);
        const row = el('button', { type: 'button', class: 'tt-row', 'aria-expanded': 'false' }, [
            avatar, main, pill, el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
        ]);
        const wrap = el('div', { class: `tt-item ${cls}` }, [row, bodyEl]);
        row.addEventListener('click', () => {
            const open = bodyEl.hidden;
            bodyEl.hidden = !open;
            wrap.classList.toggle('is-open', open);
            row.setAttribute('aria-expanded', String(open));
        });
        return wrap;
    }

    const avatarOf = (name, cls = '') => el('span', { class: `tt-avatar ${cls}`, 'aria-hidden': 'true', text: initial(name) });
    const pillOf = (text, cls) => el('span', { class: `tt-pill ${cls}`, text });

    // ----- one rig: name, status, people, invitations, add person -----
    function rigCard(r) {
        const st = rigStatus(r);
        const people = team.members.filter((m) => m.role !== 'owner' && m.role !== 'office' && (m.rig_ids || []).includes(r.id));
        const invites = team.invites.filter((iv) => iv.role !== 'owner' && iv.role !== 'office' && (iv.rig_ids || []).includes(r.id));
        const isOwner = (team.my_role || 'owner') === 'owner';
        const firstRig = isOwner && r.is_default && /^rig\s*1$/i.test(String(r.name).trim());
        const editor = rigEditor(r);
        const addPanel = el('div', { class: 'tt-add-panel', hidden: true });
        const foot = el('div', { class: 'tt-card-foot' });
        const addBtn = btn('Add person to this rig', {
            kind: 'soft', ic: 'user-plus', cls: 'tt-wide',
            onclick: () => {
                addPanel.replaceChildren(addPersonForm({ rig: r, roles: ['manager'], onCancel: () => { addPanel.hidden = true; foot.hidden = false; } }));
                addPanel.hidden = false;
                foot.hidden = true;
                paintIcons();
                addPanel.querySelector('input')?.focus();
            }
        });
        foot.append(addBtn);
        const editBtn = el('button', {
            type: 'button', class: 'tt-icon-btn', 'aria-label': `Edit ${r.name}`, title: 'Edit rig',
            onclick: () => { editor.hidden = !editor.hidden; editBtn.classList.toggle('is-on', !editor.hidden); }
        }, [icon('pencil')]);
        return el('div', { class: 'tt-card tt-rig' }, [
            el('div', { class: 'tt-rig-head' }, [
                el('span', { class: 'tt-tile' }, [icon('truck')]),
                el('div', { class: 'tt-rig-txt' }, [
                    el('strong', { text: r.name }),
                    el('small', { text: `Bills ${r.bill_prefix}-1, ${r.bill_prefix}-2 …` })
                ]),
                isOwner ? editBtn : null
            ]),
            el('div', { class: 'tt-rig-meta' }, [pillOf(st.text, `is-${st.cls}`)]),
            firstRig ? el('p', { class: 'tt-note is-tip' }, [icon('lightbulb'), el('span', { text: 'We made this rig when you signed up. Tap the pencil to change the name to your lorry number.' })]) : null,
            editor,
            el('div', { class: 'tt-list' }, [
                ...people.map((m) => personItem(m)),
                ...invites.map((iv) => inviteItem(iv)),
                people.length || invites.length ? null : el('p', { class: 'tt-empty', text: 'No manager yet. Only you bill on this rig.' })
            ]),
            foot,
            addPanel
        ]);
    }

    function rigEditor(r) {
        const uid = r.id.slice(0, 6);
        const nameIn = el('input', { type: 'text', id: `ttRn${uid}`, value: r.name, maxlength: '60', class: 'tt-input' });
        const prefixIn = el('input', {
            type: 'text', id: `ttRp${uid}`, value: r.bill_prefix, maxlength: '6', class: 'tt-input tt-prefix',
            disabled: r.is_default, title: r.is_default ? 'The first rig uses the prefix from Settings → Company' : null
        });
        const activeCount = team.rigs.filter((x) => !x.archived).length;
        return el('div', { class: 'tt-editor', hidden: true }, [
            el('div', { class: 'tt-fields' }, [
                el('div', { class: 'tt-field' }, [el('label', { for: `ttRn${uid}`, text: 'Rig name / lorry number' }), nameIn]),
                el('div', { class: 'tt-field is-short' }, [el('label', { for: `ttRp${uid}`, text: 'Bill prefix' }), prefixIn])
            ]),
            r.is_default ? el('p', { class: 'tt-hint', text: 'This rig uses the bill prefix from Settings → Company profile.' }) : null,
            el('div', { class: 'tt-acts' }, [
                btn('Save', { kind: 'pri', ic: 'check', onclick: () => run(() => rpc('drillrig_save_rig', { p_company: company, p_rig: r.id, p_name: nameIn.value, p_prefix: prefixIn.value }), 'Rig saved') }),
                btn('Renew', { ic: 'refresh-cw', href: renewLink({ companyName: getAccess()?.companyName, rigName: r.name, rigId: r.id }) }),
                activeCount > 1 ? btn('Archive', {
                    kind: 'danger', ic: 'archive',
                    onclick: () => app.confirmDeleteModal({
                        title: 'Archive this rig?',
                        subtitle: 'No new bills on it',
                        itemLabel: r.name,
                        message: 'Its bills stay in the bill book. People on this rig cannot make new bills on it. You can restore it later.',
                        confirmBtnLabel: 'Archive',
                        onConfirm: () => run(() => rpc('drillrig_archive_rig', { p_company: company, p_rig: r.id, p_archived: true }), 'Rig archived. Its bills stay in the bill book.')
                    })
                }) : null
            ])
        ]);
    }

    function addRigCard() {
        const newName = el('input', { type: 'text', id: 'ttNewRig', placeholder: 'e.g. TN 28 AB 1234', maxlength: '60', class: 'tt-input' });
        const newPrefix = el('input', { type: 'text', id: 'ttNewPrefix', placeholder: 'R2', maxlength: '6', class: 'tt-input tt-prefix' });
        const price = PLANS.pricePerRigMonthlyInr ? ` Then ₹${PLANS.pricePerRigMonthlyInr}/month per rig.` : '';
        const form = el('div', { class: 'tt-card tt-form', hidden: true }, [
            el('div', { class: 'tt-form-head' }, [el('strong', { text: 'Add another rig' })]),
            el('p', { class: 'tt-hint', text: `Each rig has its own bill numbers and its own subscription. A new rig gets a ${PLANS.trialDays}-day free trial.${price}` }),
            el('div', { class: 'tt-fields' }, [
                el('div', { class: 'tt-field' }, [el('label', { for: 'ttNewRig', text: 'Rig name / lorry number' }), newName]),
                el('div', { class: 'tt-field is-short' }, [el('label', { for: 'ttNewPrefix', text: 'Bill prefix' }), newPrefix])
            ]),
            el('div', { class: 'tt-acts is-two' }, [
                btn('Cancel', { onclick: () => { form.hidden = true; open.hidden = false; } }),
                btn('Add rig', { kind: 'pri', ic: 'plus', onclick: () => run(() => rpc('drillrig_save_rig', { p_company: company, p_rig: null, p_name: newName.value, p_prefix: newPrefix.value }), 'Rig added with a free trial') })
            ])
        ]);
        const open = el('button', {
            type: 'button', class: 'tt-dashed',
            onclick: () => { form.hidden = false; open.hidden = true; newName.focus(); }
        }, [icon('plus'), el('span', { text: 'Add another rig' })]);
        return el('div', {}, [open, form]);
    }

    // ----- office staff: every rig, only what the owner ticks -----
    function officeCard() {
        const people = team.members.filter((m) => m.role === 'office');
        const invites = team.invites.filter((iv) => iv.role === 'office');
        const panel = el('div', { class: 'tt-add-panel', hidden: true });
        const foot = el('div', { class: 'tt-card-foot' }, [btn('Add office staff', {
            ic: 'user-plus', cls: 'tt-wide',
            onclick: () => {
                panel.replaceChildren(addPersonForm({ rig: null, roles: ['office'], onCancel: () => { panel.hidden = true; foot.hidden = false; } }));
                panel.hidden = false;
                foot.hidden = true;
                paintIcons();
                panel.querySelector('input')?.focus();
            }
        })]);
        return el('div', { class: 'tt-card' }, [
            el('p', { class: 'tt-hint is-top', text: ROLE_INFO.office.text }),
            el('div', { class: 'tt-list' }, [
                ...people.map((m) => personItem(m)), ...invites.map((iv) => inviteItem(iv)),
                people.length || invites.length ? null : el('p', { class: 'tt-empty', text: 'No office staff yet.' })
            ]),
            foot, panel
        ]);
    }

    // ----- owners / partners -----
    function ownersCard() {
        const owners = team.members.filter((m) => m.role === 'owner');
        const invites = team.invites.filter((iv) => iv.role === 'owner');
        const panel = el('div', { class: 'tt-add-panel', hidden: true });
        const foot = el('div', { class: 'tt-card-foot' }, [btn('Add a partner (owner)', {
            ic: 'user-plus', cls: 'tt-wide',
            onclick: () => {
                panel.replaceChildren(addPersonForm({ rig: null, roles: ['owner'], onCancel: () => { panel.hidden = true; foot.hidden = false; } }));
                panel.hidden = false;
                foot.hidden = true;
                paintIcons();
                panel.querySelector('input')?.focus();
            }
        })]);
        return el('div', { class: 'tt-card' }, [
            el('p', { class: 'tt-hint is-top', text: 'Full access to every rig, bill, rate and setting. Add only family or business partners.' }),
            el('div', { class: 'tt-list' }, [...owners.map((m) => personItem(m)), ...invites.map((iv) => inviteItem(iv))]),
            foot, panel
        ]);
    }

    // ----- a person (member) -----
    function personItem(m) {
        const name = `${m.name || m.email || 'Staff'}${m.is_me ? ' (you)' : ''}`;
        const contact = m.phone ? showPhone(m.phone) : m.email || '';
        const subText = [m.is_creator ? 'Started the company' : '', contact].filter(Boolean).join(' · ');
        const pill = pillOf(ROLE_LABEL[m.role] || m.role, `is-${m.role}`);
        // You cannot change yourself here, and nobody else can change the person who started the company.
        if (m.is_me || m.is_creator) return item({ avatar: avatarOf(m.name || m.email), title: name, subText, pill });

        const i = m.user_id;
        const isOwner = (team.my_role || 'owner') === 'owner';
        let role = m.role === 'driver' ? 'manager' : m.role;
        const help = el('p', { class: 'tt-hint', text: ROLE_INFO[role]?.text || '' });
        const chips = rigChips(team.rigs, m.rig_ids || [], `ttRigs${i}`);
        const rigsBlock = el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Works on' }), chips]);
        const perms = permChecks(m.perms || {}, `ttPerms${i}`);
        const permsBlock = el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'What can they do?' }), perms]);
        const showFor = (r) => { rigsBlock.hidden = r !== 'manager'; permsBlock.hidden = r !== 'office'; };
        // Office staff (with "team") change managers' rigs only; the owner chooses roles.
        const seg = isOwner ? el('div', { class: 'tt-seg', role: 'radiogroup', 'aria-label': 'Role' }, ['manager', 'office', 'owner'].map((r) => {
            const input = el('input', { type: 'radio', name: `ttRole${i}`, value: r, checked: r === role });
            input.addEventListener('change', () => { role = r; help.textContent = ROLE_INFO[r]?.text || ''; showFor(r); });
            return el('label', {}, [input, el('span', { text: ROLE_LABEL[r] })]);
        })) : null;
        showFor(role);
        return item({
            avatar: avatarOf(m.name || m.email), title: name, subText, pill,
            bodyKids: [
                el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Role' }), seg, help]),
                rigsBlock,
                permsBlock,
                el('div', { class: 'tt-acts' }, [
                    btn('Save', {
                        kind: 'pri', ic: 'check',
                        onclick: () => {
                            const rigIds = role === 'manager' ? checkedIds(chips, `ttRigs${i}`) : [];
                            if (role === 'manager' && !rigIds.length) { say('Choose at least one rig'); return; }
                            const args = { p_company: company, p_user: m.user_id, p_role: role, p_rig_ids: rigIds, p_active: true };
                            if (role === 'office') args.p_perms = permsOf(perms, `ttPerms${i}`);
                            run(() => rpc('drillrig_set_member', args),
                                `${m.name || 'Updated'}: saved. Their phone changes on its next sync.`);
                        }
                    }),
                    m.phone ? el('a', { class: 'tt-btn', href: `tel:${m.phone}` }, [icon('phone'), el('span', { text: 'Call' })]) : null,
                    btn('Remove', {
                        kind: 'danger', ic: 'user-minus',
                        onclick: () => app.confirmDeleteModal({
                            title: 'Remove from team?',
                            subtitle: 'They lose access on their next sync',
                            itemLabel: m.name || m.email,
                            message: 'The bills they made stay in your bill book. You can invite them again later.',
                            confirmBtnLabel: 'Remove',
                            onConfirm: () => run(() => rpc('drillrig_set_member', {
                                p_company: company, p_user: m.user_id, p_role: m.role, p_rig_ids: [], p_active: false
                            }), 'Removed from the team')
                        })
                    })
                ])
            ]
        });
    }

    // ----- an invitation: waiting / rejected / expired -----
    function inviteItem(iv) {
        const who = iv.name || (iv.phone ? showPhone(iv.phone) : iv.email);
        const days = iv.expires_at ? Math.ceil((Date.parse(iv.expires_at) - Date.now()) / 864e5) : null;
        const expired = !iv.declined && (iv.expired || (days !== null && days <= 0));
        const open = !iv.declined && !expired;
        const state = iv.declined ? { pill: 'Rejected', cls: 'is-bad', ic: 'x', text: 'They rejected the invitation.' }
            : expired ? { pill: 'Expired', cls: 'is-muted', ic: 'clock', text: 'The link expired. Remove it and invite again.' }
                : { pill: 'Waiting', cls: 'is-warn', ic: 'clock', text: iv.code ? `Waiting for them to tap Accept · link works ${days} more day${days === 1 ? '' : 's'}.` : 'Waiting for them to sign in with this Gmail and tap Accept.' };
        const contact = iv.name ? (iv.phone ? showPhone(iv.phone) : iv.email) : '';
        const link = iv.code ? `${appUrl()}?join=${iv.code}` : appUrl();
        const waTo = iv.phone ? iv.phone.replace(/\D/g, '') : '';
        const text = iv.code ? inviteText(iv.name, link) : inviteMessage(iv.email);
        return item({
            cls: `is-invite ${state.cls}`,
            avatar: el('span', { class: `tt-avatar ${state.cls}`, 'aria-hidden': 'true' }, [icon(state.ic)]),
            title: who,
            subText: [ROLE_LABEL[iv.role] || iv.role, contact].filter(Boolean).join(' · '),
            pill: pillOf(state.pill, state.cls),
            bodyKids: [
                el('p', { class: 'tt-hint', text: state.text }),
                el('div', { class: 'tt-acts' }, [
                    open ? btn(waTo ? 'Send again' : 'Share link', { kind: 'soft', ic: 'message-circle', href: `https://wa.me/${waTo}?text=${encodeURIComponent(text)}` }) : null,
                    btn(open ? 'Cancel invite' : 'Remove', {
                        kind: 'danger', ic: open ? 'x' : 'trash-2',
                        onclick: () => run(() => rpc('drillrig_revoke_invite', { p_company: company, p_invite: iv.id }), open ? 'Invite cancelled' : null)
                    })
                ])
            ]
        });
    }

    // ----- add a person: mobile (shows who it is) + name, or Gmail; role -----
    function addPersonForm({ rig, roles, onCancel }) {
        let role = roles[0];
        let byEmail = false;
        let blocked = false;
        const uid = Math.random().toString(36).slice(2, 7);
        const nameIn = el('input', { type: 'text', id: `ttName${uid}`, placeholder: 'e.g. Murugan', maxlength: '80', autocomplete: 'off', class: 'tt-input' });
        const phoneIn = el('input', { type: 'tel', id: `ttPhone${uid}`, placeholder: '98427 12345', maxlength: '14', inputmode: 'numeric', autocomplete: 'off', class: 'tt-input' });
        const email = el('input', { type: 'email', id: `ttEmail${uid}`, placeholder: 'their.name@gmail.com', autocomplete: 'off', class: 'tt-input', inputmode: 'email' });
        const found = el('div', { class: 'tt-found', hidden: true, 'aria-live': 'polite' });
        const sendBtn = btn('Send on WhatsApp', { kind: 'pri', ic: 'send' });
        const perms = roles.includes('office') ? permChecks(DEFAULT_OFFICE_PERMS, `ttNewPerms${uid}`) : null;
        const extra = () => (role === 'office' && perms ? { p_perms: permsOf(perms, `ttNewPerms${uid}`) } : {});
        const setSendLabel = () => { sendBtn.querySelector('span').textContent = byEmail ? 'Send invite' : 'Send on WhatsApp'; };

        // Who is this number? (owner-only lookup, migration 0012; quietly skipped on an older server)
        let lookupTimer = null;
        let lookupFor = '';
        let autoName = '';
        const showFound = (kind, iconName, title, text) => {
            found.hidden = !kind;
            found.className = `tt-found ${kind ? `is-${kind}` : ''}`;
            found.replaceChildren(...(kind ? [
                el('span', { class: 'tt-found-ic' }, [icon(iconName)]),
                el('span', { class: 'tt-found-txt' }, [title ? el('strong', { text: title }) : null, el('span', { text })])
            ] : []));
            paintIcons();
        };
        const lookup = async () => {
            const digits = phoneIn.value.replace(/\D/g, '');
            const ten = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
            blocked = false;
            sendBtn.disabled = false;
            if (!ten) { lookupFor = ''; showFound(null); return; }
            if (lookupFor === digits) return;
            lookupFor = digits;
            let r;
            try {
                r = await rpc('drillrig_phone_lookup', { p_company: company, p_phone: phoneIn.value });
            } catch { showFound(null); return; }
            if (lookupFor !== digits || !r) return; // typed on
            const nm = r.name || '';
            if (r.is_me) { blocked = true; showFound('bad', 'circle-alert', 'This is your own number', 'Enter the mobile number of the person you want to add.'); }
            else if (r.member_role) { blocked = true; showFound('warn', 'user-check', nm || 'Already in your team', `Already in your team as ${ROLE_LABEL[r.member_role] || r.member_role}. Tap their name in the list to change their rig.`); }
            else if (r.found) {
                showFound('ok', 'badge-check', nm || 'Uses DrillRig', r.invited ? 'Uses DrillRig. Already invited and waiting; sending again makes a new link.' : 'Uses DrillRig. They will see your invitation and tap Accept.');
                if (nm && (!nameIn.value.trim() || nameIn.value === autoName)) { nameIn.value = nm; autoName = nm; }
            } else showFound('new', 'smartphone', null, r.invited ? 'Already invited and waiting. Sending again makes a new link.' : 'Not on DrillRig yet. They get a WhatsApp link to open it and sign in.');
            sendBtn.disabled = blocked;
        };
        phoneIn.addEventListener('input', () => { clearTimeout(lookupTimer); lookupTimer = setTimeout(lookup, 350); });

        const phoneBlock = el('div', { class: 'tt-block' }, [
            el('div', { class: 'tt-field' }, [el('label', { for: `ttPhone${uid}`, text: 'Mobile number (WhatsApp)' }), phoneIn]),
            found,
            el('div', { class: 'tt-field' }, [el('label', { for: `ttName${uid}`, text: 'Name' }), nameIn])
        ]);
        const emailBlock = el('div', { class: 'tt-block', hidden: true }, [
            el('div', { class: 'tt-field' }, [el('label', { for: `ttEmail${uid}`, text: 'Their Google (Gmail) address' }), email]),
            el('p', { class: 'tt-hint', text: 'When they sign in to DrillRig with this Gmail, they see your invitation and tap Accept.' })
        ]);
        const switchBtn = el('button', { type: 'button', class: 'tt-link', text: 'Invite by Gmail address instead' });
        switchBtn.addEventListener('click', () => {
            byEmail = !byEmail;
            phoneBlock.hidden = byEmail;
            emailBlock.hidden = !byEmail;
            sendBtn.disabled = !byEmail && blocked;
            setSendLabel();
            switchBtn.textContent = byEmail ? 'Invite by mobile number instead' : 'Invite by Gmail address instead';
        });
        sendBtn.addEventListener('click', () => {
            const rigIds = role !== 'manager' || !rig ? [] : [rig.id];
            const where = rig ? ` on ${rig.name}` : '';
            if (byEmail) {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { say('Enter their Gmail address'); email.focus(); return undefined; }
                return run(() => rpc('drillrig_invite', { p_company: company, p_email: email.value, p_role: role, p_rig_ids: rigIds, ...extra() }),
                    `Invitation ready${where}. Ask them to open DrillRig, sign in with ${email.value.trim()} and tap Accept.`);
            }
            const v = app.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { valid: /^\d{10}$/.test(phoneIn.value.replace(/\D/g, '')), fullPhone: phoneIn.value };
            if (!v.valid) { say('Enter a valid 10-digit mobile number'); phoneIn.focus(); return undefined; }
            if (blocked) return undefined;
            // Open WhatsApp in the tap itself (pop-up blockers), then fill it once the link is ready.
            const win = window.open('about:blank', '_blank');
            return run(async () => {
                let res;
                try {
                    res = await rpc('drillrig_invite_link', { p_company: company, p_phone: v.fullPhone || phoneIn.value, p_name: nameIn.value, p_role: role, p_rig_ids: rigIds, ...extra() });
                } catch (err) {
                    win?.close();
                    throw err;
                }
                const url = `https://wa.me/${String(res.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(inviteText(nameIn.value, `${appUrl()}?join=${res.code}`))}`;
                if (win) win.location.href = url; else window.location.href = url;
            }, `Invite sent to ${nameIn.value.trim() || showPhone(v.fullPhone)}${where}. They tap the link, sign in and tap Accept (link works 7 days).`);
        });
        return el('div', { class: 'tt-form' }, [
            el('div', { class: 'tt-form-head' }, [
                el('strong', { text: rig ? `Add a manager to ${rig.name}` : roles.includes('office') ? 'Add office staff' : 'Add a partner (owner)' }),
                el('button', { type: 'button', class: 'tt-icon-btn is-sm', 'aria-label': 'Cancel', onclick: onCancel }, [icon('x')])
            ]),
            phoneBlock, emailBlock,
            roles.length > 1 ? el('span', { class: 'tt-mini', text: 'What will they do?' }) : null,
            roles.length > 1 ? roleCards(`ttRole${uid}`, roles, role, (r) => { role = r; }) : el('p', { class: 'tt-hint', text: ROLE_INFO[roles[0]].text }),
            perms ? el('span', { class: 'tt-mini', text: 'What can they do?' }) : null,
            perms,
            el('div', { class: 'tt-acts is-two' }, [btn('Cancel', { onclick: onCancel }), sendBtn]),
            switchBtn
        ]);
    }

    function fold(ic, title, kids, onOpen) {
        const d = el('details', { class: 'tt-fold' }, [
            el('summary', {}, [
                el('span', { class: 'tt-tile is-grey' }, [icon(ic)]),
                el('span', { class: 'tt-fold-title', text: title }),
                el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
            ]),
            el('div', { class: 'tt-fold-body' }, kids)
        ]);
        if (onOpen) d.addEventListener('toggle', () => { if (d.open) onOpen(); });
        return d;
    }

    /** "How to add your staff": 3 steps (open card the first time, a fold after that). */
    function howToSteps(open) {
        const steps = [
            ['user-plus', 'Add them here', 'On their rig below, tap "Add person to this rig". Type their mobile number and name. They join as Manager of that rig.'],
            ['message-circle', 'Send the invite on WhatsApp', 'DrillRig opens WhatsApp with a ready message and link. Tap Send.'],
            ['circle-check', 'They tap Accept', 'They open the link, sign in with their Google account and tap Accept. Their bills then come under your rig, on your phone too.']
        ];
        const list = el('ol', { class: 'tt-how' }, steps.map(([ic, t, d], i) => el('li', {}, [
            el('span', { class: 'tt-how-n', 'aria-hidden': 'true', text: String(i + 1) }),
            el('div', {}, [el('strong', {}, [icon(ic), ' ', t]), el('span', { text: d })])
        ])));
        const tip = el('p', { class: 'tt-hint', text: 'Staff who installed DrillRig before you invited them: ask them to choose "I work on a rig" after sign-in, then send the invite. They must not create their own business.' });
        if (!open) return fold('list-checks', 'How to add your staff', [list, tip]);
        return el('div', { class: 'tt-card tt-how-card' }, [
            el('div', { class: 'tt-how-head' }, [el('span', { class: 'tt-tile is-manager' }, [icon('users')]),
                el('div', {}, [el('strong', { text: 'Add your drivers & managers' }), el('small', { text: '3 steps · about 1 minute per person' })])]),
            list, tip
        ]);
    }

    function rolesHelp() {
        return fold('circle-help', 'What can each person do?', [
            ...['owner', 'office', 'manager'].map((r) => el('div', { class: 'tt-role-line' }, [
                el('span', { class: `tt-tile is-${r}` }, [icon(ROLE_INFO[r].icon)]),
                el('div', {}, [el('strong', { text: ROLE_INFO[r].title }), el('span', { text: ROLE_INFO[r].text })])
            ])),
            el('div', { class: 'tt-example' }, [
                el('span', { class: 'tt-mini', text: 'Example' }),
                el('p', { text: 'Murugan manages TN 28 AB 1234. Tap "Add person to this rig", type his mobile and name, Send. He taps the WhatsApp link, signs in and taps Accept. His bills come under TN 28 AB 1234 with "by Murugan" on them, on your phone too. Operators and helpers who do not use the app go in Workers instead.' })
            ]),
            el('p', { class: 'tt-hint', text: 'Already using DrillRig for their own business? They keep it. After Accept they can switch between the two in Settings; nothing is mixed.' })
        ]);
    }

    function archivedFold(archived) {
        return fold('archive', `Archived rigs (${archived.length})`, archived.map((r) => el('div', { class: 'tt-arch' }, [
            el('div', { class: 'tt-rig-txt' }, [el('strong', { text: r.name }), el('small', { text: `Bills ${r.bill_prefix} · bills stay in the bill book` })]),
            btn('Restore', { ic: 'rotate-ccw', onclick: () => run(() => rpc('drillrig_archive_rig', { p_company: company, p_rig: r.id, p_archived: false }), 'Rig restored') })
        ])));
    }

    // Company-wide log of who changed what (needs migration 0004; loads when opened).
    function activityFold() {
        const list = el('div', { class: 'act-list', text: 'Loading…' });
        const more = btn('Show older', { cls: 'tt-wide' });
        more.hidden = true;
        let shown = [];
        let started = false;
        let box = null;
        const page = async (before) => {
            const entries = await fetchActivity({ limit: 30, before });
            if (entries === null) { if (!before) box?.remove(); return; }
            shown = shown.concat(entries);
            renderActivityList(list, shown, (n) => app.formatINR(n));
            more.hidden = entries.length < 30;
        };
        more.addEventListener('click', () => page(shown[shown.length - 1]?.id));
        box = fold('history', 'Recent activity', [
            el('p', { class: 'tt-hint', text: 'Who created, edited, deleted or took payments on bills, from every phone.' }),
            list, more
        ], () => { if (!started) { started = true; page(null); } });
        return box;
    }

    load();
}

function inviteText(name, link) {
    const hi = String(name || '').trim() ? `Hi ${String(name).trim()}, ` : '';
    return `${hi}you are invited to my DrillRig team (borewell billing app).\n\n1. Tap this link: ${link}\n2. Sign in with your Google account.\n3. Tap Accept.\n\nThe link works once, for 7 days.`;
}

function inviteMessage(email) {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '');
    return `You are invited to my DrillRig team. Open ${url}, sign in with Google using ${email} and tap Accept.`;
}
