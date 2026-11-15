// Settings → "Team & Rigs" (owner only, signed in, cloud migrations 0003 + 0010 + 0011).
// Rig first: each rig card lists the people who work on it (drivers, managers) and their
// invitations, with "+ Add person to this rig". Owners / partners have their own list.
// Invited people must Accept (or Reject) in their own app — see invitations.js.
// Every action is an owner-only server function; this file is only the screen.
import { getSupabase } from '../../cloud/auth.js';
import { getAccess, getRole, hasRigs, onAccessChange, rigDaysLeft } from '../../cloud/access.js';
import { syncNow } from '../../cloud/sync.js';
import { renewLink, PLANS, isEarlyAccess, earlyAccessDaysLeft } from '../../config/plans.js';
import { fetchActivity, renderActivityList } from '../../cloud/activity.js';
import { ROLE_INFO } from './invitations.js';

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };
const showPhone = (p) => {
    const d = String(p || '').replace(/[^0-9+]/g, '');
    const m = d.match(/^\+91(\d{5})(\d{5})$/);
    return m ? `+91 ${m[1]} ${m[2]}` : d;
};
const appUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '');

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

async function rpc(name, args) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message || 'Request failed');
    return data;
}

function rigStatus(rig) {
    if (rig.archived) return { text: 'Archived', cls: 'muted' };
    const days = rigDaysLeft(rig);
    if (!rig.active) return { text: 'Subscription ended — renew to keep billing', cls: 'bad' };
    const paid = Date.parse(rig.paid_until || '') > Date.parse(rig.trial_ends_at || '');
    if (!paid && isEarlyAccess()) return { text: `Free Early Access · ${earlyAccessDaysLeft()} days left`, cls: 'ok' };
    return { text: `${paid ? 'Paid' : 'Free trial'} · ${days} day${days === 1 ? '' : 's'} left`, cls: days <= 7 ? 'warn' : 'ok' };
}

function rigChecks(rigs, selected, name) {
    const active = rigs.filter((r) => !r.archived);
    return el('div', { class: 'tm-rig-checks', role: 'group', 'aria-label': 'Rigs' }, active.map((r) =>
        el('label', { class: 'tm-check' }, [
            el('input', { type: 'checkbox', name, value: r.id, checked: selected.includes(r.id) }),
            el('span', { text: r.name })
        ])));
}

const checkedIds = (root, name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

/** Short role cards (radio) with what each role means. */
function roleCards(name, roles, value, onChange) {
    const wrap = el('div', { class: 'tm-roles', role: 'radiogroup', 'aria-label': 'What can they do?' });
    roles.forEach((r) => {
        const c = ROLE_INFO[r];
        const input = el('input', { type: 'radio', name, value: r, checked: r === value });
        input.addEventListener('change', () => onChange(r));
        wrap.appendChild(el('label', { class: 'tm-role-card' }, [
            input,
            el('span', { class: 'tm-role-ic', 'aria-hidden': 'true', text: c.icon }),
            el('span', { class: 'tm-role-txt' }, [el('strong', { text: c.title }), el('span', { text: c.text })])
        ]));
    });
    return wrap;
}

export function initTeamUI(app) {
    const account = document.getElementById('accountCard');
    if (!account) return;
    const card = el('div', { class: 'team-card', id: 'teamCard', hidden: true });
    account.insertAdjacentElement('afterend', card);

    const renderCard = () => {
        const a = getAccess();
        const show = !!a && getRole() === 'owner' && hasRigs() && !document.getElementById('accSignedIn')?.hidden;
        card.hidden = !show;
        if (!show) return;
        card.textContent = '';
        const rigs = a.rigs.filter((r) => !r.archived);
        const ended = rigs.filter((r) => !r.active).length;
        card.append(
            el('span', { class: 'tm-card-icon', text: '👷' }),
            el('div', { class: 'tm-card-text' }, [
                el('strong', { text: 'Team & Rigs' }),
                el('span', { text: `${rigs.map((r) => r.name).join(', ') || 'Rig 1'}${ended ? ` · ${ended} need renewal` : ''} · add drivers & managers` })
            ]),
            el('button', { type: 'button', class: 'tm-manage-btn', text: 'Manage', onclick: () => openSheet(app) })
        );
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
    const body = el('div', { class: 'tm-body' }, [el('p', { class: 'tm-loading', text: 'Loading team…' })]);
    const msg = el('p', { class: 'tm-msg', role: 'alert' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const overlay = el('div', { class: 'tm-overlay' }, [
        el('div', { class: 'tm-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tmTitle' }, [
            el('div', { class: 'tm-head' }, [
                el('h2', { id: 'tmTitle', text: 'Team & Rigs' }),
                el('button', { type: 'button', class: 'tm-close', 'aria-label': 'Close', text: '✕', onclick: close })
            ]),
            el('p', { class: 'tm-intro', text: 'Add the people who work on each rig. They get a WhatsApp link, sign in with Google and tap Accept. Every bill shows which rig and who made it.' }),
            msg,
            body
        ])
    ]);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);

    const say = (text, ok = false) => {
        msg.textContent = text || '';
        msg.className = `tm-msg${ok ? ' ok' : ''}`;
        if (text) msg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const run = async (fn, okText) => {
        say('');
        try {
            await fn();
            if (okText) say(okText, true);
            await load();
            syncNow(); // refresh this phone's own rigs/access
        } catch (err) {
            say(`⚠️ ${err.message}`);
        }
    };

    let team = null;
    async function load() {
        try {
            team = await rpc('drillrig_team', { p_company: company });
        } catch (err) {
            body.textContent = '';
            body.appendChild(el('p', { class: 'tm-msg', text: `⚠️ Could not load the team: ${err.message}` }));
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
        const staff = team.members.filter((m) => m.role !== 'owner');
        const noRig = staff.filter((m) => !(m.rig_ids || []).some((id) => activeIds.has(id)));
        const noRigInvites = team.invites.filter((iv) => iv.role !== 'owner' && !(iv.rig_ids || []).some((id) => activeIds.has(id)));
        body.replaceChildren(...[
            el('section', { class: 'tm-section' }, [
                el('h3', { text: active.length === 1 ? 'Your rig' : `Your rigs (${active.length})` }),
                ...active.map((r) => rigCard(r)),
                addRigBox()
            ]),
            ownersSection(),
            noRig.length || noRigInvites.length ? el('section', { class: 'tm-section' }, [
                el('h3', { text: 'Not on a rig yet' }),
                el('p', { class: 'tm-help', text: 'They cannot make bills until you give them a rig: tap Change.' }),
                ...noRig.map((m) => personRow(m)),
                ...noRigInvites.map((iv) => inviteRow(iv))
            ]) : null,
            rolesHelp(),
            archived.length ? el('details', { class: 'tm-more' }, [
                el('summary', { text: `Archived rigs (${archived.length})` }),
                ...archived.map((r) => el('div', { class: 'tm-row is-archived' }, [
                    el('div', { class: 'tm-rig-top' }, [el('strong', { class: 'tm-rig-name', text: `🚛 ${r.name}` }), el('span', { class: 'tm-chip', text: r.bill_prefix })]),
                    el('p', { class: 'tm-help', text: 'Its bills stay in the bill book.' }),
                    el('div', { class: 'tm-actions' }, [el('button', {
                        type: 'button', class: 'tm-btn', text: 'Restore',
                        onclick: () => run(() => rpc('drillrig_archive_rig', { p_company: company, p_rig: r.id, p_archived: false }), '✅ Rig restored')
                    })])
                ]))
            ]) : null,
            activitySection()
        ].filter(Boolean));
    }

    // ----- one rig: name, status, people, invitations, add person -----
    function rigCard(r) {
        const st = rigStatus(r);
        const people = team.members.filter((m) => m.role !== 'owner' && (m.rig_ids || []).includes(r.id));
        const invites = team.invites.filter((iv) => iv.role !== 'owner' && (iv.rig_ids || []).includes(r.id));
        const firstRig = r.is_default && /^rig\s*1$/i.test(String(r.name).trim());
        const editor = rigEditor(r);
        const addPanel = el('div', { class: 'tm-add-panel', hidden: true });
        const addBtn = el('button', {
            type: 'button', class: 'tm-btn tm-add-person', text: '+ Add person to this rig',
            onclick: () => {
                if (!addPanel.hidden) { addPanel.hidden = true; addPanel.textContent = ''; addBtn.hidden = false; return; }
                addPanel.replaceChildren(addPersonForm({ rig: r, roles: ['driver', 'manager'], onCancel: () => { addPanel.hidden = true; addBtn.hidden = false; } }));
                addPanel.hidden = false;
                addBtn.hidden = true;
                addPanel.querySelector('input')?.focus();
            }
        });
        const editBtn = el('button', {
            type: 'button', class: 'tm-btn ghost tm-edit-rig', text: 'Edit',
            onclick: () => { editor.hidden = !editor.hidden; editBtn.textContent = editor.hidden ? 'Edit' : 'Close'; }
        });
        return el('div', { class: 'tm-rig' }, [
            el('div', { class: 'tm-rig-top' }, [
                el('span', { class: 'tm-rig-ic', 'aria-hidden': 'true', text: '🚛' }),
                el('div', { class: 'tm-rig-txt' }, [
                    el('strong', { class: 'tm-rig-name', text: r.name }),
                    el('span', { class: 'tm-rig-bills', text: `Bill numbers ${r.bill_prefix}-1, ${r.bill_prefix}-2…` }),
                    el('span', { class: `tm-status ${st.cls}`, text: st.text })
                ]),
                editBtn
            ]),
            firstRig ? el('p', { class: 'tm-made-for-you', text: '✨ We made this rig for you when you signed up. Tap Edit to use your lorry number, e.g. TN 28 AB 1234.' }) : null,
            editor,
            el('div', { class: 'tm-people' }, [
                ...people.map((m) => personRow(m)),
                ...invites.map((iv) => inviteRow(iv)),
                people.length || invites.length ? null : el('p', { class: 'tm-empty', text: 'No driver or manager yet. Only you (owner) bill on this rig.' })
            ]),
            addBtn,
            addPanel
        ]);
    }

    function rigEditor(r) {
        const nameIn = el('input', { type: 'text', value: r.name, maxlength: '60', 'aria-label': 'Rig name', class: 'tm-input' });
        const prefixIn = el('input', {
            type: 'text', value: r.bill_prefix, maxlength: '6', 'aria-label': 'Bill prefix', class: 'tm-input tm-prefix',
            disabled: r.is_default, title: r.is_default ? 'The first rig uses the prefix from Settings → Company' : null
        });
        const activeCount = team.rigs.filter((x) => !x.archived).length;
        return el('div', { class: 'tm-edit', hidden: true }, [
            el('div', { class: 'tm-fields' }, [
                el('label', { class: 'tm-label', text: 'Rig name / lorry number' }), el('label', { class: 'tm-label', text: 'Bill prefix' }),
                nameIn, prefixIn
            ]),
            r.is_default ? el('p', { class: 'tm-help', text: 'This rig uses the bill prefix from Settings → Company.' }) : null,
            el('div', { class: 'tm-actions' }, [
                el('button', {
                    type: 'button', class: 'tm-btn primary', text: 'Save',
                    onclick: () => run(() => rpc('drillrig_save_rig', { p_company: company, p_rig: r.id, p_name: nameIn.value, p_prefix: prefixIn.value }), '✅ Rig saved')
                }),
                el('a', {
                    class: 'tm-btn', target: '_blank', rel: 'noopener', text: 'Renew',
                    href: renewLink({ companyName: getAccess()?.companyName, rigName: r.name, rigId: r.id })
                }),
                activeCount > 1 && el('button', {
                    type: 'button', class: 'tm-btn ghost', text: 'Archive',
                    onclick: () => app.confirmDeleteModal({
                        title: 'Archive this rig?',
                        subtitle: 'No new bills on it',
                        itemLabel: `🚛 ${r.name}`,
                        message: 'Its bills stay in the bill book. People on this rig cannot make new bills on it. You can restore it later.',
                        confirmBtnLabel: 'Archive',
                        onConfirm: () => run(() => rpc('drillrig_archive_rig', { p_company: company, p_rig: r.id, p_archived: true }), '✅ Rig archived — its bills stay in the bill book')
                    })
                })
            ])
        ]);
    }

    function addRigBox() {
        const newName = el('input', { type: 'text', placeholder: 'e.g. TN 28 AB 1234', maxlength: '60', class: 'tm-input', 'aria-label': 'New rig name' });
        const newPrefix = el('input', { type: 'text', placeholder: 'R2', maxlength: '6', class: 'tm-input tm-prefix', 'aria-label': 'New rig bill prefix' });
        const price = PLANS.pricePerRigMonthlyInr ? ` Then ₹${PLANS.pricePerRigMonthlyInr}/month per rig.` : '';
        return el('details', { class: 'tm-more tm-add-rig' }, [
            el('summary', { text: '+ Add another rig' }),
            el('p', { class: 'tm-help', text: `Each rig has its own bill numbers (prefix) and its own subscription. A new rig gets a ${PLANS.trialDays}-day free trial.${price}` }),
            el('div', { class: 'tm-fields' }, [
                el('label', { class: 'tm-label', text: 'Rig name / lorry number' }), el('label', { class: 'tm-label', text: 'Bill prefix' }),
                newName, newPrefix
            ]),
            el('button', {
                type: 'button', class: 'tm-btn primary', text: 'Add rig',
                onclick: () => run(() => rpc('drillrig_save_rig', { p_company: company, p_rig: null, p_name: newName.value, p_prefix: newPrefix.value }), '✅ Rig added with a free trial')
            })
        ]);
    }

    // ----- owners / partners -----
    function ownersSection() {
        const owners = team.members.filter((m) => m.role === 'owner');
        const invites = team.invites.filter((iv) => iv.role === 'owner');
        const panel = el('div', { class: 'tm-add-panel', hidden: true });
        const addBtn = el('button', {
            type: 'button', class: 'tm-btn tm-add-person', text: '+ Add a partner (owner)',
            onclick: () => {
                panel.replaceChildren(addPersonForm({ rig: null, roles: ['owner'], onCancel: () => { panel.hidden = true; addBtn.hidden = false; } }));
                panel.hidden = false;
                addBtn.hidden = true;
                panel.querySelector('input')?.focus();
            }
        });
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Owners & partners' }),
            el('p', { class: 'tm-help', text: 'Full access to every rig, bill, rate and setting. Add only family or business partners.' }),
            ...owners.map((m) => personRow(m)),
            ...invites.map((iv) => inviteRow(iv)),
            addBtn, panel
        ]);
    }

    // ----- a person (member) -----
    function personRow(m) {
        const sub = m.phone ? showPhone(m.phone) : m.email || ''; // one line: mobile, else Gmail
        const tag = m.is_creator ? 'Started the company' : ROLE_LABEL[m.role] || m.role;
        const head = el('div', { class: 'tm-person' }, [
            el('span', { class: 'tm-avatar', 'aria-hidden': 'true', text: (m.name || m.email || '?').trim().charAt(0).toUpperCase() }),
            el('div', { class: 'tm-person-txt' }, [
                el('div', { class: 'tm-name-line' }, [
                    el('strong', { text: `${m.name || m.email || 'Staff'}${m.is_me ? ' (you)' : ''}` }),
                    el('span', { class: `tm-role-tag is-${m.role}`, text: tag })
                ]),
                sub ? el('span', { text: sub }) : null
            ])
        ]);
        // You cannot change yourself here, and nobody else can change the person who started the company.
        if (m.is_me || m.is_creator) return el('div', { class: 'tm-row tm-member' }, [head]);

        const i = m.user_id;
        const sel = el('select', { class: 'tm-select', 'aria-label': 'Role' },
            ['driver', 'manager', 'owner'].map((r) => el('option', { value: r, selected: r === m.role, text: ROLE_INFO[r].title })));
        const help = el('p', { class: 'tm-help tm-role-help', text: ROLE_INFO[m.role]?.text || '' });
        const checks = rigChecks(team.rigs, m.rig_ids || [], `tmRigs${i}`);
        const sync = () => { checks.hidden = sel.value === 'owner'; help.textContent = ROLE_INFO[sel.value]?.text || ''; };
        sel.addEventListener('change', sync);
        sync();
        const editor = el('div', { class: 'tm-edit', hidden: true }, [
            el('span', { class: 'tm-label', text: 'Role' }), sel, help,
            el('span', { class: 'tm-label', text: 'Rigs' }), checks,
            el('div', { class: 'tm-actions' }, [
                el('button', {
                    type: 'button', class: 'tm-btn primary', text: 'Save',
                    onclick: () => {
                        const rigIds = checkedIds(checks, `tmRigs${i}`);
                        if (sel.value !== 'owner' && !rigIds.length) { say('⚠️ Choose at least one rig'); return; }
                        run(() => rpc('drillrig_set_member', { p_company: company, p_user: m.user_id, p_role: sel.value, p_rig_ids: rigIds, p_active: true }),
                            '✅ Updated — their phone changes on its next sync');
                    }
                }),
                m.phone && el('a', { class: 'tm-btn', href: `tel:${m.phone}`, text: '📞 Call' }),
                el('button', {
                    type: 'button', class: 'tm-btn danger', text: 'Remove',
                    onclick: () => app.confirmDeleteModal({
                        title: 'Remove from team?',
                        subtitle: 'They lose access on their next sync',
                        itemLabel: `👷 ${m.name || m.email}`,
                        message: 'The bills they made stay in your bill book. You can invite them again later.',
                        confirmBtnLabel: 'Remove',
                        onConfirm: () => run(() => rpc('drillrig_set_member', {
                            p_company: company, p_user: m.user_id, p_role: m.role, p_rig_ids: [], p_active: false
                        }), '✅ Removed')
                    })
                })
            ])
        ]);
        const toggle = el('button', {
            type: 'button', class: 'tm-btn ghost tm-change', text: 'Change',
            onclick: () => { editor.hidden = !editor.hidden; toggle.textContent = editor.hidden ? 'Change' : 'Close'; }
        });
        head.insertBefore(toggle, null);
        return el('div', { class: 'tm-row tm-member' }, [head, editor]);
    }

    // ----- an invitation: waiting / declined / expired -----
    function inviteRow(iv) {
        const who = iv.name || (iv.phone ? showPhone(iv.phone) : iv.email);
        const days = iv.expires_at ? Math.ceil((Date.parse(iv.expires_at) - Date.now()) / 864e5) : null;
        const expired = !iv.declined && (iv.expired || (days !== null && days <= 0));
        const state = iv.declined ? { icon: '✕', cls: 'is-declined', text: 'Rejected the invitation' }
            : expired ? { icon: '⌛', cls: 'is-expired', text: 'Link expired — invite again' }
                : { icon: '⏳', cls: 'is-wait', text: iv.code ? `Waiting for them to accept · ${days} day${days === 1 ? '' : 's'} left` : 'Waiting for them to sign in and accept' };
        const link = iv.code ? `${appUrl()}?join=${iv.code}` : appUrl();
        const waTo = iv.phone ? iv.phone.replace(/\D/g, '') : '';
        const text = iv.code ? inviteText(iv.name, link) : inviteMessage(iv.email);
        const open = !iv.declined && !expired;
        return el('div', { class: `tm-row is-invite ${state.cls}` }, [
            el('div', { class: 'tm-person' }, [
                el('span', { class: `tm-avatar ${state.cls}`, 'aria-hidden': 'true', text: state.icon }),
                el('div', { class: 'tm-person-txt' }, [
                    el('div', { class: 'tm-name-line' }, [
                        el('strong', { text: who }),
                        el('span', { class: `tm-role-tag is-${iv.role}`, text: ROLE_LABEL[iv.role] || iv.role })
                    ]),
                    el('span', { text: [iv.name && iv.phone ? showPhone(iv.phone) : '', !iv.code && iv.name ? iv.email : ''].filter(Boolean).join(' · ') || null }),
                    el('span', { class: `tm-inv-state ${state.cls}`, text: state.text })
                ])
            ]),
            el('div', { class: 'tm-actions' }, [
                open && el('a', {
                    class: 'tm-btn wa', target: '_blank', rel: 'noopener', text: waTo ? 'Resend on WhatsApp' : 'Share on WhatsApp',
                    href: `https://wa.me/${waTo}?text=${encodeURIComponent(text)}`
                }),
                el('button', {
                    type: 'button', class: 'tm-btn ghost', text: open ? 'Cancel invite' : 'Remove',
                    onclick: () => run(() => rpc('drillrig_revoke_invite', { p_company: company, p_invite: iv.id }), open ? 'Invite cancelled' : null)
                })
            ])
        ]);
    }

    // ----- add a person: name + mobile (WhatsApp link) or Gmail; role -----
    function addPersonForm({ rig, roles, onCancel }) {
        let role = roles[0];
        let byEmail = false;
        const uid = Math.random().toString(36).slice(2, 7);
        const nameIn = el('input', { type: 'text', id: `tmName${uid}`, placeholder: 'e.g. Murugan', maxlength: '80', autocomplete: 'off', class: 'tm-input' });
        const phoneIn = el('input', { type: 'tel', id: `tmPhone${uid}`, placeholder: '98427 12345', maxlength: '14', inputmode: 'numeric', autocomplete: 'off', class: 'tm-input' });
        const email = el('input', { type: 'email', id: `tmEmail${uid}`, placeholder: 'their.name@gmail.com', autocomplete: 'off', class: 'tm-input', inputmode: 'email' });
        const phoneBlock = el('div', {}, [
            el('label', { for: `tmName${uid}`, class: 'tm-label', text: 'Name' }), nameIn,
            el('label', { for: `tmPhone${uid}`, class: 'tm-label', text: 'Mobile number (WhatsApp)' }), phoneIn
        ]);
        const emailBlock = el('div', { hidden: true }, [
            el('label', { for: `tmEmail${uid}`, class: 'tm-label', text: 'Their Google (Gmail) address' }), email,
            el('p', { class: 'tm-help', text: 'When they sign in to DrillRig with this Gmail, they see your invitation and tap Accept.' })
        ]);
        const sendBtn = el('button', { type: 'button', class: 'tm-btn primary wide wa', text: 'Send invite on WhatsApp' });
        const switchBtn = el('button', { type: 'button', class: 'tm-linkbtn', text: 'Invite by Gmail address instead' });
        switchBtn.addEventListener('click', () => {
            byEmail = !byEmail;
            phoneBlock.hidden = byEmail;
            emailBlock.hidden = !byEmail;
            sendBtn.textContent = byEmail ? 'Send invite' : 'Send invite on WhatsApp';
            sendBtn.classList.toggle('wa', !byEmail);
            switchBtn.textContent = byEmail ? 'Invite by mobile number instead' : 'Invite by Gmail address instead';
        });
        sendBtn.addEventListener('click', () => {
            const rigIds = role === 'owner' || !rig ? [] : [rig.id];
            const where = rig ? ` on ${rig.name}` : '';
            if (byEmail) {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { say('⚠️ Enter their Gmail address'); email.focus(); return undefined; }
                return run(() => rpc('drillrig_invite', { p_company: company, p_email: email.value, p_role: role, p_rig_ids: rigIds }),
                    `✅ Invitation ready${where}. Ask them to open DrillRig, sign in with ${email.value.trim()} and tap Accept.`);
            }
            const v = app.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { valid: /^\d{10}$/.test(phoneIn.value.replace(/\D/g, '')), fullPhone: phoneIn.value };
            if (!v.valid) { say('⚠️ Enter a valid 10-digit mobile number'); phoneIn.focus(); return undefined; }
            // Open WhatsApp in the tap itself (pop-up blockers), then fill it once the link is ready.
            const win = window.open('about:blank', '_blank');
            return run(async () => {
                let res;
                try {
                    res = await rpc('drillrig_invite_link', { p_company: company, p_phone: v.fullPhone || phoneIn.value, p_name: nameIn.value, p_role: role, p_rig_ids: rigIds });
                } catch (err) {
                    win?.close();
                    throw err;
                }
                const url = `https://wa.me/${String(res.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(inviteText(nameIn.value, `${appUrl()}?join=${res.code}`))}`;
                if (win) win.location.href = url; else window.location.href = url;
            }, `✅ Invite sent to ${nameIn.value.trim() || showPhone(v.fullPhone)}${where}. They tap the link, sign in and Accept (link works 7 days).`);
        });
        return el('div', { class: 'tm-add-form' }, [
            el('p', { class: 'tm-add-title', text: rig ? `Add a person to ${rig.name}` : 'Add a partner (owner)' }),
            phoneBlock, emailBlock,
            roles.length > 1 ? el('span', { class: 'tm-label', text: 'What will they do?' }) : null,
            roles.length > 1 ? roleCards(`tmRole${uid}`, roles, role, (r) => { role = r; }) : el('p', { class: 'tm-help', text: ROLE_INFO.owner.text }),
            sendBtn,
            el('div', { class: 'tm-form-links' }, [switchBtn, el('button', { type: 'button', class: 'tm-linkbtn is-muted', text: 'Cancel', onclick: onCancel })])
        ]);
    }

    function rolesHelp() {
        return el('details', { class: 'tm-more tm-roles-help' }, [
            el('summary', { text: 'What can each person do?' }),
            ...['owner', 'manager', 'driver'].map((r) => el('div', { class: 'tm-role-line' }, [
                el('span', { 'aria-hidden': 'true', text: ROLE_INFO[r].icon }),
                el('div', {}, [el('strong', { text: ROLE_INFO[r].title }), el('span', { text: ROLE_INFO[r].text })])
            ])),
            el('div', { class: 'tm-eg' }, [
                el('strong', { text: 'Example' }),
                el('p', { text: 'Your driver Murugan works on TN 28 AB 1234. Tap "+ Add person to this rig", type Murugan and his mobile, choose Driver, Send. He taps the WhatsApp link, signs in and taps Accept. His bills come under TN 28 AB 1234 with "by Murugan" on them — on your phone too.' })
            ]),
            el('p', { class: 'tm-help', text: 'Already using DrillRig for their own business? They keep it. After Accept they can switch between the two companies in Settings; nothing is mixed.' })
        ]);
    }

    // Company-wide log of who changed what (needs migration 0004; loads when opened).
    function activitySection() {
        const list = el('div', { class: 'act-list', text: 'Loading…' });
        const more = el('button', { type: 'button', class: 'tm-btn ghost', text: 'Show older', hidden: true });
        const box = el('details', { class: 'tm-more' }, [
            el('summary', { text: 'Recent activity' }),
            el('p', { class: 'tm-help', text: 'Who created, edited, deleted or took payments on bills — from every phone.' }),
            list, more
        ]);
        let shown = [];
        let started = false;
        const page = async (before) => {
            const entries = await fetchActivity({ limit: 30, before });
            if (entries === null) { if (!before) box.remove(); return; }
            shown = shown.concat(entries);
            renderActivityList(list, shown, (n) => app.formatINR(n));
            more.hidden = entries.length < 30;
        };
        more.addEventListener('click', () => page(shown[shown.length - 1]?.id));
        box.addEventListener('toggle', () => { if (box.open && !started) { started = true; page(null); } });
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
