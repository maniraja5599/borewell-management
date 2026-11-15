// Settings → "Team & Rigs" (owner only, signed in, cloud migration 0003 applied).
// Rigs: add, rename, archive, see trial/paid status, renew.
// Staff: invite by mobile number (WhatsApp link with a one-time code, migration 0010) or by
// Google email; change role/rigs; remove.
// Every action is an owner-only server function; this file is only the screen.
import { getSupabase } from '../../cloud/auth.js';
import { getAccess, getRole, hasRigs, onAccessChange, rigDaysLeft } from '../../cloud/access.js';
import { syncNow } from '../../cloud/sync.js';
import { renewLink, PLANS, isEarlyAccess, earlyAccessDaysLeft } from '../../config/plans.js';
import { fetchActivity, renderActivityList } from '../../cloud/activity.js';

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };
const ROLE_HELP = {
    owner: 'full access',
    manager: 'bills & payments of their rigs',
    driver: 'only their own bills'
};
// Plain words + an example, for the invite cards.
const ROLE_CARD = {
    driver: { icon: '🚚', title: 'Driver', text: 'Makes bills at the bore site. Sees only the bills he made.', eg: 'e.g. your rig driver or operator' },
    manager: { icon: '🧑‍💼', title: 'Manager', text: 'Makes bills, takes payments and sees all bills of his rigs.', eg: 'e.g. your supervisor or office staff' },
    owner: { icon: '👑', title: 'Owner', text: 'Everything you can do: rates, team, settings, all rigs.', eg: 'e.g. your partner or brother' }
};
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
    if (!rig.active) return { text: 'Subscription ended', cls: 'bad' };
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
        body.append(guideSection(team), staffSection(team), inviteSection(team), rigsSection(team), activitySection());
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

    // What this page does, with one example (shown until the owner hides it).
    function guideSection(team) {
        const rig = team.rigs.find((r) => !r.archived)?.name || 'Rig 1';
        const hiddenKey = 'drillrig_team_guide_hidden';
        let hidden = false;
        try { hidden = !!localStorage.getItem(hiddenKey); } catch { /* ignore */ }
        const box = el('details', { class: 'tm-guide', open: !hidden }, [
            el('summary', { text: '💡 How it works' }),
            el('ol', {}, [
                el('li', {}, ['Type your staff member\'s ', el('b', { text: 'name and mobile number' }), ', pick what they can do, and tap ', el('b', { text: 'Send invite on WhatsApp' }), '.']),
                el('li', { text: 'WhatsApp opens with a link for them. They tap it and sign in with their Google account.' }),
                el('li', { text: 'They join your company. Their bills come to your phone too.' })
            ]),
            el('div', { class: 'tm-eg' }, [
                el('strong', { text: 'Example' }),
                el('p', { text: `Your driver Murugan, 98427 12345 → choose Driver and ${rig} → Send. Murugan taps the link on his phone, signs in, and can make bills for ${rig} only. You see every bill he makes.` })
            ])
        ]);
        box.addEventListener('toggle', () => { try { if (box.open) localStorage.removeItem(hiddenKey); else localStorage.setItem(hiddenKey, '1'); } catch { /* ignore */ } });
        return box;
    }

    function staffSection(team) {
        const rows = team.members.map((m, i) => {
            const roleId = `tmRole${i}`;
            const sel = roleSelect(m.role, roleId);
            const checks = rigChecks(team.rigs, m.rig_ids || [], `tmRigs${i}`);
            const syncChecks = () => { checks.hidden = sel.value === 'owner'; };
            sel.addEventListener('change', syncChecks);
            syncChecks();
            const rigNames = (m.rig_ids || []).map((id) => team.rigs.find((r) => r.id === id)?.name).filter(Boolean);
            const sub = [m.phone ? showPhone(m.phone) : '', m.email || ''].filter(Boolean).join(' · ');
            const head = el('div', { class: 'tm-person' }, [
                el('span', { class: 'tm-avatar', 'aria-hidden': 'true', text: (m.name || m.email || '?').trim().charAt(0).toUpperCase() }),
                el('div', { class: 'tm-person-txt' }, [
                    el('strong', { text: `${m.name || m.email || 'Staff'}${m.is_me ? ' (you)' : ''}` }),
                    sub ? el('span', { text: sub }) : null
                ]),
                el('span', { class: `tm-role-tag is-${m.role}`, text: ROLE_LABEL[m.role] || m.role })
            ]);
            if (m.is_me) return el('div', { class: 'tm-row tm-member' }, [head]);
            const editor = el('div', { class: 'tm-edit', hidden: true }, [
                el('label', { for: roleId, class: 'tm-label', text: 'What they can do' }), sel, checks,
                el('div', { class: 'tm-actions' }, [
                    el('button', {
                        type: 'button', class: 'tm-btn primary', text: 'Save',
                        onclick: () => run(() => rpc('drillrig_set_member', {
                            p_company: company, p_user: m.user_id, p_role: sel.value,
                            p_rig_ids: checkedIds(checks, `tmRigs${i}`), p_active: true
                        }), '✅ Access updated — applies on their next sync')
                    }),
                    m.phone && el('a', { class: 'tm-btn', href: `tel:${m.phone}`, text: '📞 Call' }),
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
            ]);
            const meta = el('p', { class: 'tm-help tm-member-rigs', text: m.role === 'owner' ? 'All rigs' : (rigNames.length ? `Rigs: ${rigNames.join(', ')}` : 'No rig yet') });
            const toggle = el('button', { type: 'button', class: 'tm-btn ghost tm-change', text: 'Change', onclick: () => { editor.hidden = !editor.hidden; toggle.textContent = editor.hidden ? 'Change' : 'Close'; } });
            return el('div', { class: 'tm-row tm-member' }, [head, el('div', { class: 'tm-member-foot' }, [meta, toggle]), editor]);
        });
        const invites = team.invites.map((iv) => {
            const who = iv.name || (iv.phone ? showPhone(iv.phone) : iv.email);
            const days = iv.expires_at ? Math.ceil((Date.parse(iv.expires_at) - Date.now()) / 864e5) : null;
            const state = iv.expired || (days !== null && days <= 0) ? 'Link expired — send a new one'
                : iv.code ? `Waiting · link works ${days} more day${days === 1 ? '' : 's'}` : 'Waiting for them to sign in';
            const link = iv.code ? `${appUrl()}?join=${iv.code}` : appUrl();
            const waTo = iv.phone ? iv.phone.replace(/\D/g, '') : '';
            const text = iv.code ? inviteText(iv.name, link) : inviteMessage(iv.email);
            return el('div', { class: 'tm-row is-invite' }, [
                el('div', { class: 'tm-person' }, [
                    el('span', { class: 'tm-avatar is-wait', 'aria-hidden': 'true', text: '⏳' }),
                    el('div', { class: 'tm-person-txt' }, [
                        el('strong', { text: who }),
                        el('span', { text: [iv.name && iv.phone ? showPhone(iv.phone) : '', !iv.code && iv.name ? iv.email : '', state].filter(Boolean).join(' · ') })
                    ]),
                    el('span', { class: `tm-role-tag is-${iv.role}`, text: ROLE_LABEL[iv.role] || iv.role })
                ]),
                el('div', { class: 'tm-actions' }, [
                    !(iv.expired || (days !== null && days <= 0)) && el('a', {
                        class: 'tm-btn wa', target: '_blank', rel: 'noopener', text: 'Resend on WhatsApp',
                        href: `https://wa.me/${waTo}?text=${encodeURIComponent(text)}`
                    }),
                    el('button', {
                        type: 'button', class: 'tm-btn ghost', text: 'Cancel',
                        onclick: () => run(() => rpc('drillrig_revoke_invite', { p_company: company, p_invite: iv.id }), 'Invite cancelled')
                    })
                ])
            ]);
        });
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: `Your team (${team.members.length})` }),
            ...rows,
            invites.length ? el('h4', { class: 'tm-sub', text: 'Invited — not joined yet' }) : null,
            ...invites
        ]);
    }

    function roleCards(name, value, onChange) {
        const wrap = el('div', { class: 'tm-roles', role: 'radiogroup', 'aria-label': 'What can they do?' });
        ['driver', 'manager', 'owner'].forEach((r) => {
            const c = ROLE_CARD[r];
            const input = el('input', { type: 'radio', name, value: r, checked: r === value });
            input.addEventListener('change', () => onChange(r));
            wrap.appendChild(el('label', { class: 'tm-role-card' }, [
                input,
                el('span', { class: 'tm-role-ic', 'aria-hidden': 'true', text: c.icon }),
                el('span', { class: 'tm-role-txt' }, [el('strong', { text: c.title }), el('span', { text: c.text }), el('small', { text: c.eg })])
            ]));
        });
        return wrap;
    }

    function inviteSection(team) {
        let role = 'driver';
        let byEmail = false;
        const nameIn = el('input', { type: 'text', id: 'tmInviteName', placeholder: 'e.g. Murugan', maxlength: '80', autocomplete: 'off', class: 'tm-input' });
        const phoneIn = el('input', { type: 'tel', id: 'tmInvitePhone', placeholder: '98427 12345', maxlength: '14', inputmode: 'numeric', autocomplete: 'off', class: 'tm-input' });
        const email = el('input', { type: 'email', id: 'tmInviteEmail', placeholder: 'their.name@gmail.com', autocomplete: 'off', class: 'tm-input', inputmode: 'email' });
        const activeRigs = team.rigs.filter((r) => !r.archived);
        const checks = rigChecks(team.rigs, activeRigs.length === 1 ? [activeRigs[0].id] : [], 'tmInviteRigs');
        const rigBlock = el('div', { class: 'tm-rigs-block' }, [el('span', { class: 'tm-label', text: 'Which rigs?' }), checks]);
        const cards = roleCards('tmInviteRole', role, (r) => { role = r; rigBlock.hidden = r === 'owner'; });
        const phoneBlock = el('div', {}, [
            el('label', { for: 'tmInviteName', class: 'tm-label', text: 'Name' }), nameIn,
            el('label', { for: 'tmInvitePhone', class: 'tm-label', text: 'Mobile number (WhatsApp)' }), phoneIn
        ]);
        const emailBlock = el('div', { hidden: true }, [
            el('label', { for: 'tmInviteEmail', class: 'tm-label', text: 'Their Google (Gmail) address' }), email,
            el('p', { class: 'tm-help', text: 'When they sign in to DrillRig with this Gmail, they join automatically.' })
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
            const rigIds = role === 'owner' ? [] : checkedIds(checks, 'tmInviteRigs');
            if (byEmail) {
                return run(async () => {
                    await rpc('drillrig_invite', { p_company: company, p_email: email.value, p_role: role, p_rig_ids: rigIds });
                }, `✅ Invite ready. Ask them to open DrillRig and sign in with ${email.value.trim()}.`);
            }
            const v = app.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { valid: /^\d{10}$/.test(phoneIn.value.replace(/\D/g, '')), fullPhone: phoneIn.value };
            if (!v.valid) { say('⚠️ Enter a valid 10-digit mobile number'); phoneIn.focus(); return undefined; }
            if (role !== 'owner' && !rigIds.length) { say('⚠️ Choose at least one rig'); return undefined; }
            // Open WhatsApp in the tap itself (pop-up blockers), then fill it once the link is ready.
            const win = window.open('about:blank', '_blank');
            return run(async () => {
                let res;
                try {
                    res = await rpc('drillrig_invite_link', { p_company: company, p_phone: v.fullPhone || phoneIn.value, p_name: nameIn.value, p_role: role, p_rig_ids: rigIds });
                } catch (err) {
                    win?.close();
                    if (/function .* does not exist|schema cache/i.test(err.message)) throw new Error('Invite by mobile needs a server update (0010). Use "Invite by Gmail" for now.');
                    throw err;
                }
                const url = `https://wa.me/${String(res.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(inviteText(nameIn.value, `${appUrl()}?join=${res.code}`))}`;
                if (win) win.location.href = url; else window.location.href = url;
            }, `✅ Invite sent to ${nameIn.value.trim() || showPhone(v.fullPhone)} — the link works for 7 days`);
        });
        return el('section', { class: 'tm-section' }, [
            el('h3', { text: 'Invite someone' }),
            phoneBlock, emailBlock,
            el('span', { class: 'tm-label', text: 'What can they do?' }), cards,
            rigBlock,
            sendBtn, switchBtn
        ]);
    }

    load();
}

function inviteText(name, link) {
    const hi = String(name || '').trim() ? `Hi ${String(name).trim()}, ` : '';
    return `${hi}you are invited to my DrillRig team (borewell billing app).\n\n1. Tap this link: ${link}\n2. Sign in with your Google account.\n\nThe link works once, for 7 days.`;
}

function inviteMessage(email) {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '');
    return `You are invited to my DrillRig team. Open ${url} and sign in with Google using ${email} (Settings → Sign in with Google).`;
}
