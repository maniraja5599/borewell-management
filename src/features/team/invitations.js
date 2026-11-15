// "You are invited" card for the person who was invited (server: migration 0011).
// Nobody joins a team without saying yes: after sign-in the app looks for
//   - an invite link opened on this phone (?join=CODE, kept by joinLink.js), and
//   - invites sent to the signed-in Gmail address,
// and shows one card at a time: company, who invited, role (with what it means), rigs ->
//   [Accept]  joins on the server, then opens that company on this phone (safely, see below)
//   [Reject]  tells the owner "Declined"
//   [Later]   nothing changes; asked again next time.
// Someone who already uses DrillRig keeps their own company in the cloud. The phone shows one
// company at a time, so opening the new one first uploads everything (or waits) and they can
// switch back from Settings at any time.
import { getSupabase } from '../../cloud/auth.js';
import { setPreferredCompany, clearPhoneData, flushSync, getSyncInfo } from '../../cloud/sync.js';
import { pendingJoinCode, clearJoinCode, consumeJoinCode } from './joinLink.js';

export const ROLE_INFO = {
    driver: { icon: '🚚', title: 'Driver', text: 'Makes bills at the bore site for their rig. Sees only the bills they made. Cannot change rates or delete bills.' },
    manager: { icon: '🧑‍💼', title: 'Manager', text: 'Makes bills, takes payments and sees every bill of their rigs. Cannot change rates or the team.' },
    owner: { icon: '👑', title: 'Owner / Partner', text: 'Full access: all rigs, all bills, rates, team and settings.' }
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
    if (error) {
        const e = new Error(error.message || 'Request failed');
        e.missing = /function .* does not exist|schema cache/i.test(error.message || '');
        throw e;
    }
    return data;
}

const STATUS_TEXT = {
    used: 'This invite link was already used. Ask the owner for a new one.',
    declined: 'You rejected this invitation earlier. Ask the owner for a new one if you changed your mind.',
    cancelled: 'The owner cancelled this invitation.',
    expired: 'This invite link has expired. Ask the owner for a new one.',
    missing: 'This invite link is not valid. Ask the owner for a new one.'
};

/** Open invitations for the signed-in person: [{ id, code, company_id, company_name, invited_by, role, rig_names }]. */
async function loadInvitations(app) {
    const list = [];
    const code = pendingJoinCode();
    if (code) {
        try {
            const card = await rpc('drillrig_invite_preview', { p_code: code });
            if (card?.status === 'open' && !card.already_member) list.push(card);
            else {
                clearJoinCode();
                if (card?.already_member) app?.showToast?.(`You are already in ${card.company_name}.`);
                else app?.showToast?.(`⚠️ ${STATUS_TEXT[card?.status] || STATUS_TEXT.missing}`);
            }
        } catch (err) {
            if (err.missing) { await consumeJoinCode(app); return null; } // server before 0011: old join
            // offline / network: keep the code for next time
        }
    }
    try {
        const mine = await rpc('drillrig_my_invites', {});
        for (const iv of Array.isArray(mine) ? mine : []) if (iv?.status === 'open' && !list.some((x) => x.id === iv.id)) list.push(iv);
    } catch { /* before 0011 or offline: Settings still shows Gmail invites */ }
    return list;
}

let open = false;

/**
 * Show waiting invitations one by one. Resolves when the person has answered all of them (or
 * chose Later) with the company they accepted and want to open, or null.
 *   phoneHasCompany: this phone already shows a company (it must be uploaded before switching).
 */
export async function checkInvitations(app, { phoneHasCompany = false, only = null } = {}) {
    if (open || typeof document === 'undefined') return null;
    const list = only ? [only] : await loadInvitations(app);
    if (!list?.length) return null;
    open = true;
    try {
        for (const iv of list) {
            const res = await showCard(app, iv, phoneHasCompany);
            if (res === 'later') return null;
            if (res && res.open) return res; // accepted and opening it now
        }
        return null;
    } finally {
        open = false;
    }
}

/** Open another company on this phone: upload first, then clear and reload (one company at a time). */
export async function openCompanySafely(app, companyId, { phoneHasCompany = true } = {}) {
    if (!phoneHasCompany) { setPreferredCompany(companyId); return { ok: true, reload: false }; }
    if (!navigator.onLine) return { ok: false, why: 'You are offline. Connect to the internet so this phone\'s bills are saved to the cloud first.' };
    const left = await flushSync(app);
    if (left > 0) return { ok: false, why: `${left} change${left === 1 ? ' is' : 's are'} still only on this phone. Wait for "Synced", then try again.` };
    setPreferredCompany(companyId);
    clearPhoneData();
    window.location.reload();
    return { ok: true, reload: true };
}

/** Settings → Your businesses → Switch: a calm confirm card (not a delete dialog). */
export function showSwitchCard(app, companyId, name) {
    if (document.getElementById('switchOverlay')) return;
    const mine = getSyncInfo()?.companyName || 'this business';
    const err = el('p', { class: 'sw-error', role: 'alert' });
    const openBtn = el('button', { type: 'button', class: 'sw-btn primary', text: `Open ${name}` });
    const cancelBtn = el('button', { type: 'button', class: 'sw-btn ghost', text: 'Cancel' });
    const card = el('div', { class: 'sw-card iv-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'swcTitle' }, [
        el('p', { class: 'iv-kicker', text: '🔁 Switch business' }),
        el('h2', { id: 'swcTitle', class: 'sw-title', text: name }),
        el('p', { class: 'sw-sub', text: 'This phone shows one business at a time.' }),
        el('ol', { class: 'iv-steps' }, [
            el('li', { text: `Bills of ${mine} on this phone are saved to the cloud first.` }),
            el('li', { text: `Then ${name} opens. Nothing is deleted.` }),
            el('li', { text: 'Switch back any time from Settings.' })
        ]),
        err,
        el('div', { class: 'sw-actions' }, [cancelBtn, openBtn])
    ]);
    const overlay = el('div', { class: 'sw-overlay', id: 'switchOverlay' }, [card]);
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); };
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay && !openBtn.disabled) close(); });
    openBtn.addEventListener('click', async () => {
        err.textContent = '';
        openBtn.disabled = cancelBtn.disabled = true;
        openBtn.textContent = 'Saving bills…';
        const res = await openCompanySafely(app, companyId, { phoneHasCompany: true });
        if (!res.ok) {
            openBtn.disabled = cancelBtn.disabled = false;
            openBtn.textContent = `Open ${name}`;
            err.textContent = res.why;
        }
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => openBtn.focus(), 300);
}

function showCard(app, iv, phoneHasCompany) {
    return new Promise((resolve) => {
        const info = ROLE_INFO[iv.role] || ROLE_INFO.driver;
        const rigs = Array.isArray(iv.rig_names) ? iv.rig_names : [];
        const mine = getSyncInfo();
        const myCompany = phoneHasCompany && mine?.companyName ? mine.companyName : '';
        const error = el('p', { class: 'sw-error', role: 'alert' });
        const acceptBtn = el('button', { type: 'button', class: 'sw-btn primary', text: 'Accept' });
        const rejectBtn = el('button', { type: 'button', class: 'sw-btn ghost iv-reject', text: 'Reject' });
        const laterBtn = el('button', { type: 'button', class: 'sw-link', text: 'Decide later' });

        const step1 = el('div', { class: 'iv-step' }, [
            el('p', { class: 'iv-kicker', text: '📨 Team invitation' }),
            el('h2', { id: 'ivTitle', class: 'sw-title', text: iv.company_name || 'A DrillRig company' }),
            el('p', { class: 'sw-sub', text: `${iv.invited_by || 'The owner'} invited you to join as ${info.title}.` }),
            el('div', { class: 'iv-role' }, [
                el('span', { class: 'iv-role-ic', 'aria-hidden': 'true', text: info.icon }),
                el('div', {}, [el('strong', { text: info.title }), el('span', { text: info.text })])
            ]),
            iv.role !== 'owner' ? el('p', { class: 'iv-rigs' }, [el('b', { text: 'Rig: ' }), rigs.length ? rigs.join(', ') : 'chosen by the owner later']) : null,
            myCompany ? el('p', { class: 'iv-note', text: `Your own company "${myCompany}" stays safe in the cloud. You can switch between the two in Settings.` }) : null,
            error,
            el('div', { class: 'sw-actions' }, [rejectBtn, acceptBtn]),
            el('div', { class: 'sw-links' }, [laterBtn])
        ]);
        const card = el('div', { class: 'sw-card iv-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ivTitle' }, [step1]);
        const overlay = el('div', { class: 'sw-overlay', id: 'inviteOverlay' }, [card]);
        const close = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
            resolve(result);
        };
        const busy = (on, btn, text) => { acceptBtn.disabled = rejectBtn.disabled = on; if (btn) btn.textContent = text; };

        acceptBtn.addEventListener('click', async () => {
            error.textContent = '';
            busy(true, acceptBtn, 'Joining…');
            let companyId = iv.company_id;
            try {
                if (iv.code) {
                    const res = await rpc('drillrig_join_with_code', { p_code: iv.code });
                    companyId = res?.company_id || companyId;
                    clearJoinCode();
                } else {
                    companyId = (await rpc('drillrig_accept_invite', { p_invite: iv.id })) || companyId;
                }
            } catch (err) {
                busy(false, acceptBtn, 'Accept');
                if (/already in this company/i.test(err.message)) { clearJoinCode(); close({ open: false }); app?.showToast?.(`You are already in ${iv.company_name}.`); return; }
                error.textContent = err.message || 'Could not join. Try again.';
                return;
            }
            if (!phoneHasCompany) {
                setPreferredCompany(companyId);
                app?.showToast?.(`✅ You joined ${iv.company_name} as ${info.title}`);
                close({ open: true, companyId, name: iv.company_name });
                return;
            }
            // Already using DrillRig on this phone: offer to open the new company now.
            const openBtn = el('button', { type: 'button', class: 'sw-btn primary', text: `Open ${iv.company_name}` });
            const stayBtn = el('button', { type: 'button', class: 'sw-link', text: myCompany ? `Stay in ${myCompany} for now` : 'Not now' });
            const err2 = el('p', { class: 'sw-error', role: 'alert' });
            card.replaceChildren(el('div', { class: 'iv-step' }, [
                el('p', { class: 'iv-kicker is-ok', text: '✅ You joined' }),
                el('h2', { id: 'ivTitle', class: 'sw-title', text: iv.company_name }),
                el('p', { class: 'sw-sub', text: 'This phone shows one company at a time. Your bills here are uploaded first, then the new company opens.' }),
                el('p', { class: 'iv-note', text: 'Switch back any time: Settings → your account → Switch.' }),
                err2,
                el('div', { class: 'sw-actions' }, [openBtn]),
                el('div', { class: 'sw-links' }, [stayBtn])
            ]));
            openBtn.addEventListener('click', async () => {
                err2.textContent = '';
                openBtn.disabled = true;
                openBtn.textContent = 'Saving this phone\'s bills…';
                const res = await openCompanySafely(app, companyId, { phoneHasCompany: true });
                if (!res.ok) { openBtn.disabled = false; openBtn.textContent = `Open ${iv.company_name}`; err2.textContent = res.why; }
            });
            stayBtn.addEventListener('click', () => { close({ open: false }); app?.showToast?.(`Open ${iv.company_name} any time from Settings.`); });
        });

        rejectBtn.addEventListener('click', async () => {
            error.textContent = '';
            busy(true, rejectBtn, 'Rejecting…');
            try {
                await rpc('drillrig_decline_invite', iv.code ? { p_code: iv.code } : { p_invite: iv.id });
                clearJoinCode();
                app?.showToast?.(`Invitation from ${iv.company_name} rejected`);
                close('rejected');
            } catch (err) {
                busy(false, rejectBtn, 'Reject');
                error.textContent = err.message || 'Could not reject. Try again.';
            }
        });
        laterBtn.addEventListener('click', () => close('later'));

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        setTimeout(() => acceptBtn.focus(), 300);
    });
}
