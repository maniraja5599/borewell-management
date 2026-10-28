// Staff management (owner) + "you're invited" prompt (anyone signed in).
// Everything typed by users is put on screen with textContent, never as HTML.
import { rpc, getCloudContext, onCloudContext, refreshCompany, ROLE_RULES } from '../../cloud/sync.js';

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c) node.append(c);
    return node;
}

function roleSelect(value, onChange) {
    const sel = el('select', { class: 'staff-role-select', 'aria-label': 'Role', onchange: (e) => onChange(e.target.value) });
    for (const r of ['manager', 'driver']) {
        const opt = el('option', { value: r, text: ROLE_LABEL[r] });
        if (r === value) opt.selected = true;
        sel.append(opt);
    }
    return sel;
}

export function initStaffUI(app) {
    const panel = document.getElementById('staffPanel');
    const btn = document.getElementById('accStaffBtn');
    const roleLine = document.getElementById('accRole');
    const invitesBox = document.getElementById('accInvites');
    if (!panel || !btn || !roleLine || !invitesBox) return;

    const toast = (t) => { try { app?.showToast?.(t); } catch { /* ignore */ } };
    let open = false;
    let lastCompanyId = null;

    async function call(name, args, okMsg) {
        try {
            const res = await rpc(name, args);
            if (okMsg) toast(okMsg);
            return res;
        } catch (err) {
            toast(`⚠️ ${err?.message || 'Something went wrong'}`);
            throw err;
        }
    }

    async function loadStaff() {
        const c = getCloudContext();
        if (!c?.companyId) return;
        panel.replaceChildren(el('p', { class: 'staff-loading', text: 'Loading staff…' }));
        let data;
        try {
            data = await rpc('drillrig_staff', { p_company: c.companyId });
        } catch (err) {
            panel.replaceChildren(el('p', { class: 'acc-msg', text: err?.message || 'Could not load staff' }));
            return;
        }
        render(c, data || { members: [], invites: [] });
    }

    function render(c, data) {
        const canManage = !!ROLE_RULES[c.role]?.manageStaff;
        const list = el('div', { class: 'staff-list' });

        for (const m of data.members || []) {
            const isOwnerRow = m.role === 'owner';
            const right = el('div', { class: 'staff-row-actions' });
            if (canManage && !isOwnerRow) {
                right.append(roleSelect(m.role, async (role) => {
                    await call('drillrig_set_role', { p_company: c.companyId, p_user: m.user_id, p_role: role }, `✅ ${m.name || m.email} is now ${ROLE_LABEL[role]}`);
                    loadStaff();
                }));
                right.append(el('button', {
                    type: 'button', class: 'staff-remove-btn', text: 'Remove', 'aria-label': `Remove ${m.name || m.email}`,
                    onclick: () => {
                        app.confirmDeleteModal({
                            title: 'Remove staff member?',
                            skipRoleCheck: true,
                            itemLabel: `${m.name || ''} ${m.email ? `(${m.email})` : ''}`.trim(),
                            message: 'They will lose access immediately. Bills they made stay with you.',
                            confirmBtnLabel: 'Yes, Remove',
                            onConfirm: async () => {
                                await call('drillrig_remove_member', { p_company: c.companyId, p_user: m.user_id }, '✅ Removed');
                                loadStaff();
                            }
                        });
                    }
                }));
            } else {
                right.append(el('span', { class: `staff-role-badge role-${m.role}`, text: ROLE_LABEL[m.role] || m.role }));
            }
            list.append(el('div', { class: 'staff-row' },
                el('div', { class: 'staff-who' },
                    el('strong', { text: `${m.name || m.email || 'Staff'}${m.is_me ? ' (you)' : ''}` }),
                    el('span', { text: m.email || '' })),
                right));
        }

        for (const inv of data.invites || []) {
            const right = el('div', { class: 'staff-row-actions' },
                el('span', { class: `staff-role-badge role-${inv.role}`, text: `${ROLE_LABEL[inv.role]} · invited` }));
            if (canManage) {
                right.append(el('button', {
                    type: 'button', class: 'staff-remove-btn', text: 'Cancel',
                    onclick: async () => {
                        await call('drillrig_cancel_invite', { p_company: c.companyId, p_email: inv.email }, 'Invite cancelled');
                        loadStaff();
                    }
                }));
            }
            list.append(el('div', { class: 'staff-row is-invite' },
                el('div', { class: 'staff-who' },
                    el('strong', { text: inv.email }),
                    el('span', { text: 'Waiting for them to sign in with this Gmail' })),
                right));
        }

        const children = [
            el('div', { class: 'staff-head' },
                el('strong', { text: 'Staff' }),
                el('span', { text: canManage ? 'Add people by their Gmail. They join when they sign in.' : 'Only the owner can change staff.' })),
            list
        ];

        if (canManage) {
            const email = el('input', { type: 'email', class: 'staff-email-input', placeholder: 'driver@gmail.com', autocomplete: 'off', 'aria-label': 'Gmail address' });
            const role = roleSelect('driver', () => {});
            const form = el('form', {
                class: 'staff-add-form',
                onsubmit: async (e) => {
                    e.preventDefault();
                    const value = email.value.trim();
                    if (!value) { email.focus(); return; }
                    await call('drillrig_invite', { p_company: c.companyId, p_email: value, p_role: role.value }, `✅ Invited ${value}`);
                    email.value = '';
                    loadStaff();
                }
            }, email, role, el('button', { type: 'submit', class: 'staff-invite-btn', text: 'Invite' }));
            children.push(form);
            children.push(el('p', {
                class: 'staff-note',
                text: 'Testing mode: the Gmail must also be on the Google test-user list before it can sign in.'
            }));
        }
        panel.replaceChildren(...children);
    }

    async function loadMyInvites() {
        invitesBox.hidden = true;
        invitesBox.replaceChildren();
        let rows = [];
        try { rows = await rpc('drillrig_my_invites', {}); } catch { return; }
        if (!Array.isArray(rows) || !rows.length) return;
        for (const inv of rows) {
            invitesBox.append(el('div', { class: 'acc-invite-row' },
                el('span', { text: `📩 ${inv.company_name} invited you as ${ROLE_LABEL[inv.role] || inv.role}` }),
                el('button', {
                    type: 'button', class: 'staff-invite-btn', text: 'Join',
                    onclick: () => {
                        app.confirmDeleteModal({
                            title: `Join ${inv.company_name}?`,
                            skipRoleCheck: true,
                            itemLabel: `${ROLE_LABEL[inv.role] || inv.role} at ${inv.company_name}`,
                            message: 'The app will switch to this company. Bills on this phone are kept as a backup on this phone, not mixed in.',
                            confirmBtnLabel: 'Join',
                            onConfirm: async () => {
                                await call('drillrig_accept_invite', { p_company: inv.company_id }, `✅ Joined ${inv.company_name}`);
                                invitesBox.hidden = true;
                                await refreshCompany();
                            }
                        });
                    }
                })));
        }
        invitesBox.hidden = false;
    }

    btn.addEventListener('click', () => {
        open = !open;
        panel.hidden = !open;
        btn.classList.toggle('is-open', open);
        if (open) loadStaff();
    });

    onCloudContext((c) => {
        const role = c?.role;
        roleLine.hidden = !role;
        roleLine.textContent = role ? `${ROLE_LABEL[role] || role} · ${c.companyName || ''}` : '';
        btn.hidden = !(role && ROLE_RULES[role]?.seeStaff);
        if (btn.hidden) { open = false; panel.hidden = true; btn.classList.remove('is-open'); }
        if (c?.companyId && c.companyId !== lastCompanyId) {
            lastCompanyId = c.companyId;
            loadMyInvites();
            if (open) loadStaff();
        }
        if (!c) { lastCompanyId = null; invitesBox.hidden = true; }
    });
}
