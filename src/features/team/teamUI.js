// Settings → "Team & Rigs" (owner only, signed in, cloud migration 0003 applied).
// Rigs: add, rename, archive, see trial/paid status, renew.
// Staff: invite by Google email with a role and rigs; change role/rigs; remove.
// Every action is an owner-only server function; this file is only the screen.
import { getSupabase } from '../../cloud/auth.js';
import { getAccess, getRole, hasRigs, onAccessChange, rigDaysLeft } from '../../cloud/access.js';
import { syncNow } from '../../cloud/sync.js';
import { renewLink, PLANS } from '../../config/plans.js';
import { fetchActivity, renderActivityList } from '../../cloud/activity.js';

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };
const ROLE_HELP = {
    owner: 'full access',
    manager: 'bills & payments of their rigs',
    driver: 'only their own bills'
};

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
    if (!rig.active) return { text: 'Subscription ended', cls: 'bad' };
    const paid = Date.parse(rig.paid_until || '') > Date.parse(rig.trial_ends_at || '');
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

function roleSelect(value, id, allowOwner = true) {
    return el('select', { id, class: 'tm-select', 'aria-label': 'Role' },
        ['manager', 'driver', ...(allowOwner ? ['owner'] : [])].map((r) =>
            el('option', { value: r, selected: r === value, text: `${ROLE_LABEL[r]} — ${ROLE_HELP[r]}` })));
}

const checkedIds = (root, name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

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
                el('span', { text: `${rigs.length} rig${rigs.length === 1 ? '' : 's'}${ended ? ` · ${ended} need renewal` : ''} · invite managers & drivers` })
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
            msg,
            body
        ])
    ]);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);

    const say = (text, ok = false) => { msg.textContent = text || ''; msg.className = `tm-msg${ok ? ' ok' : ''}`; };
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

    async function load() {
        let team;
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
        body.textContent = '';
        body.append(rigsSection(team), staffSection(team), inviteSection(team), activitySection());
    }

    function rigsSection(team) {
        const rows = team.rigs.map((r) => {
            const st = rigStatus(r);
            const nameIn = el('input', { type: 'text', value: r.name, maxlength: '60', 'aria-label': 'Rig name', class: 'tm-input' });
            const prefixIn = el('input', {
                type: 'text', value: r.bill_prefix, maxlength: '6', 'aria-label': 'Bill prefix', class: 'tm-input tm-prefix',
                disabled: r.is_default, title: r.is_default ? 'The first rig uses the prefix from Settings → Company' : null
            });
            const activeCount = team.rigs.filter((x) => !x.archived).length;
            return el('div', { class: `tm-row${r.archived ? ' is-archived' : ''}` }, [
                el('div', { class: 'tm-row-main' }, [
                    el('div', { class: 'tm-fields' }, [nameIn, prefixIn]),
                    el('span', { class: `tm-status ${st.cls}`, text: st.text })
                ]),
                el('div', { class: 'tm-actions' }, [
                    el('button', {
                        type: 'button', class: 'tm-btn', text: 'Save',
                        onclick: () => run(() => rpc('drillrig_save_rig', { p_company: company, p_rig: r.id, p_name: nameIn.value, p_prefix: prefixIn.value }), '✅ Rig saved')
                    }),
                    !r.archived && el('a', {
                        class: 'tm-btn', target: '_blank', rel: 'noopener', text: 'Renew',
                        href: renewLink({ companyName: getAccess()?.companyName, rigName: r.name, rigId: r.id })
                    }),
                    (r.archived || activeCount > 1) && el('button', {
                        type: 'button', class: 'tm-btn ghost', text: r.archived ? 'Restore' : 'Archive',
                        onclick: () => run(() => rpc('drillrig_archive_rig', { p_company: company, p_rig: r.id, p_archived: !r.archived }),
                            r.archived ? '✅ Rig restored' : '✅ Rig archived — its bills stay in the bill book')
                    })
                ])
            ]);
        });

        const newName = el('input', { type: 'text', placeholder: 'e.g. Rig 2 / TN 28 AB 1234', maxlength: '60', class: 'tm-input', 'aria-label': 'New rig name' });
        const newPrefix = el('input', { type: 'text', placeholder: 'R2', maxlength: '6', class: 'tm-input tm-prefix', 'aria-label': 'New rig bill prefix' });
        const price = PLANS.pricePerRigMonthlyInr ? ` Then ₹${PLANS.pricePerRigMonthlyInr}/month per rig.` : '';
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Rigs' }),
            el('p', { class: 'tm-help', text: `Each rig has its own bill numbers and its own subscription. New rigs get a ${PLANS.trialDays}-day free trial.${price}` }),
            ...rows,
            el('div', { class: 'tm-add' }, [
                el('div', { class: 'tm-fields' }, [newName, newPrefix]),
                el('button', {
                    type: 'button', class: 'tm-btn primary', text: '+ Add rig',
                    onclick: () => run(async () => {
                        await rpc('drillrig_save_rig', { p_company: company, p_rig: null, p_name: newName.value, p_prefix: newPrefix.value });
                    }, '✅ Rig added with a free trial')
                })
            ])
        ]);
    }

    // Company-wide log of who changed what (needs migration 0004; hidden until then).
    function activitySection() {
        const list = el('div', { class: 'act-list', text: 'Loading…' });
        const more = el('button', { type: 'button', class: 'tm-btn ghost', text: 'Show older', hidden: true });
        const section = el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Recent activity' }),
            el('p', { class: 'tm-help', text: 'Who created, edited, deleted or took payments on bills — from every phone.' }),
            list, more
        ]);
        let shown = [];
        const page = async (before) => {
            const entries = await fetchActivity({ limit: 30, before });
            if (entries === null) { if (!before) section.remove(); return; }
            shown = shown.concat(entries);
            renderActivityList(list, shown, (n) => app.formatINR(n));
            more.hidden = entries.length < 30;
        };
        more.addEventListener('click', () => page(shown[shown.length - 1]?.id));
        page(null);
        return section;
    }

    function staffSection(team) {
        const rows = team.members.map((m, i) => {
            const roleId = `tmRole${i}`;
            const sel = roleSelect(m.role, roleId);
            const checks = rigChecks(team.rigs, m.rig_ids || [], `tmRigs${i}`);
            const syncChecks = () => { checks.hidden = sel.value === 'owner'; };
            sel.addEventListener('change', syncChecks);
            syncChecks();
            return el('div', { class: 'tm-row' }, [
                el('div', { class: 'tm-person' }, [
                    el('strong', { text: `${m.name || m.email || 'Staff'}${m.is_me ? ' (you)' : ''}` }),
                    el('span', { text: m.email || '' })
                ]),
                m.is_me
                    ? el('p', { class: 'tm-help', text: 'Owner — you can make another staff member an owner too.' })
                    : el('div', {}, [
                        el('label', { for: roleId, class: 'tm-label', text: 'Role' }), sel, checks,
                        el('div', { class: 'tm-actions' }, [
                            el('button', {
                                type: 'button', class: 'tm-btn', text: 'Save',
                                onclick: () => run(() => rpc('drillrig_set_member', {
                                    p_company: company, p_user: m.user_id, p_role: sel.value,
                                    p_rig_ids: checkedIds(checks, `tmRigs${i}`), p_active: true
                                }), '✅ Access updated — applies on their next sync')
                            }),
                            el('button', {
                                type: 'button', class: 'tm-btn danger', text: 'Remove',
                                onclick: () => app.confirmDeleteModal({
                                    title: 'Remove from team?',
                                    subtitle: 'They lose access on their next sync',
                                    itemLabel: `👷 ${m.name || m.email}`,
                                    message: 'Their bills stay in your bill book. You can invite them again later.',
                                    confirmBtnLabel: 'Remove',
                                    onConfirm: () => run(() => rpc('drillrig_set_member', {
                                        p_company: company, p_user: m.user_id, p_role: m.role, p_rig_ids: [], p_active: false
                                    }), '✅ Removed')
                                })
                            })
                        ])
                    ])
            ]);
        });
        const invites = team.invites.map((iv) => el('div', { class: 'tm-row is-invite' }, [
            el('div', { class: 'tm-person' }, [
                el('strong', { text: iv.email }),
                el('span', { text: `Invited as ${ROLE_LABEL[iv.role] || iv.role} · waiting for sign-in` })
            ]),
            el('div', { class: 'tm-actions' }, [
                el('a', {
                    class: 'tm-btn', target: '_blank', rel: 'noopener', text: 'Send on WhatsApp',
                    href: `https://wa.me/?text=${encodeURIComponent(inviteMessage(iv.email))}`
                }),
                el('button', {
                    type: 'button', class: 'tm-btn ghost', text: 'Cancel invite',
                    onclick: () => run(() => rpc('drillrig_revoke_invite', { p_company: company, p_invite: iv.id }), 'Invite cancelled')
                })
            ])
        ]));
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Staff' }),
            ...rows,
            ...invites
        ]);
    }

    function inviteSection(team) {
        const email = el('input', { type: 'email', id: 'tmInviteEmail', placeholder: 'their.name@gmail.com', autocomplete: 'off', class: 'tm-input', inputmode: 'email' });
        const sel = roleSelect('driver', 'tmInviteRole');
        const checks = rigChecks(team.rigs, team.rigs.filter((r) => !r.archived).length === 1 ? [team.rigs.find((r) => !r.archived).id] : [], 'tmInviteRigs');
        sel.addEventListener('change', () => { checks.hidden = sel.value === 'owner'; });
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Invite staff' }),
            el('p', { class: 'tm-help', text: 'Enter the Google (Gmail) address they will sign in with. When they open DrillRig and sign in, they join your team automatically.' }),
            el('label', { for: 'tmInviteEmail', class: 'tm-label', text: 'Google email' }), email,
            el('label', { for: 'tmInviteRole', class: 'tm-label', text: 'Role' }), sel,
            el('span', { class: 'tm-label', text: 'Rigs they work on' }), checks,
            el('button', {
                type: 'button', class: 'tm-btn primary wide', text: 'Send invite',
                onclick: () => run(async () => {
                    await rpc('drillrig_invite', {
                        p_company: company, p_email: email.value, p_role: sel.value,
                        p_rig_ids: sel.value === 'owner' ? [] : checkedIds(checks, 'tmInviteRigs')
                    });
                }, `✅ Invite ready. Ask them to open DrillRig and sign in with ${email.value.trim()}.`)
            })
        ]);
    }

    load();
}

function inviteMessage(email) {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '');
    return `You are invited to my DrillRig team. Open ${url} and sign in with Google using ${email} (Settings → Sign in with Google).`;
}
