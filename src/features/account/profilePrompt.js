// Asked once after sign-in (after the first sync, so the company and role are known):
//  - "Your mobile number" for everyone who has not saved one (server: drillrig_set_my_phone, 0010);
//  - "Business name" too, for an owner whose company still has the placeholder name.
// Looks like the first-run setup card (sw-* styles). Before migration 0010 it stays quiet.
import { getSupabase, getCurrentAccount } from '../../cloud/auth.js';
import { getRole } from '../../cloud/access.js';
import { storage } from '../../data/storage.js';
import { suggestPrefix } from '../onboarding/setupWizard.js';

const PLACEHOLDER_NAMES = ['', 'your borewell company', 'my borewell company', 'my borewells'];
const doneKey = (uid) => `drillrig_profile_done_${uid}`;

export const isPlaceholderCompany = (name) => PLACEHOLDER_NAMES.includes(String(name || '').trim().toLowerCase());

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(c);
    return node;
}

let open = false;

export async function maybeAskProfile(app) {
    if (open || typeof document === 'undefined') return;
    const acc = await getCurrentAccount().catch(() => null);
    if (!acc?.id) return;
    try { if (storage.getRaw(doneKey(acc.id))) return; } catch { /* ignore */ }

    let profile = null;
    try {
        const sb = await getSupabase();
        const { data, error } = await sb.rpc('drillrig_my_profile');
        if (error) return; // server not updated yet (0010) or offline: ask another time
        profile = data || {};
    } catch { return; }

    const needName = getRole() === 'owner' && isPlaceholderCompany(app?.brand?.companyName);
    const needPhone = !profile.phone;
    if (!needPhone && !needName) {
        try { storage.setRaw(doneKey(acc.id), '1'); } catch { /* ignore */ }
        return;
    }
    show(app, acc, { needName, needPhone, phone: profile.phone });
}

function show(app, acc, { needName, needPhone }) {
    open = true;
    const nameIn = el('input', { id: 'ppName', type: 'text', autocomplete: 'organization', maxlength: '80', placeholder: 'e.g. Sri Murugan Borewells' });
    const phoneIn = el('input', { id: 'ppPhone', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: '14', placeholder: '98427 12345' });
    const error = el('p', { class: 'sw-error', role: 'alert' });
    const saveBtn = el('button', { type: 'button', class: 'sw-btn primary', text: 'Save' });
    const laterBtn = el('button', { type: 'button', class: 'sw-link', text: 'Later' });
    const first = String(acc.name || '').split(' ')[0];

    const card = el('div', { class: 'sw-card pp-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ppTitle' }, [
        el('h2', { id: 'ppTitle', class: 'sw-title', text: first ? `Welcome, ${first}!` : 'Welcome!' }),
        el('p', { class: 'sw-sub', text: needName ? 'Two quick details for your bills and your account.' : 'One quick detail for your account.' }),
        needName ? el('div', { class: 'sw-field' }, [el('label', { for: 'ppName', text: 'Business name *' }), nameIn,
            el('small', { class: 'sw-hint', text: 'Printed at the top of every bill.' })]) : null,
        needPhone ? el('div', { class: 'sw-field' }, [el('label', { for: 'ppPhone', text: 'Your mobile number *' }), phoneIn,
            el('small', { class: 'sw-hint', text: 'For DrillRig support and for your team. Not shown to your customers unless you add it to bills.' })]) : null,
        error,
        el('div', { class: 'sw-actions' }, [saveBtn]),
        el('div', { class: 'sw-links' }, [laterBtn])
    ]);
    const overlay = el('div', { class: 'sw-overlay', id: 'profilePromptOverlay' }, [card]);
    const close = () => { open = false; overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); };
    const fail = (msg, input) => { error.textContent = msg; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } };

    saveBtn.addEventListener('click', async () => {
        error.textContent = '';
        [nameIn, phoneIn].forEach((i) => i.removeAttribute('aria-invalid'));
        const name = nameIn.value.trim();
        if (needName && !name) return fail('Enter your business name.', nameIn);
        let digits = '';
        if (needPhone) {
            const v = app?.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { valid: /^\d{10}$/.test(phoneIn.value.replace(/\D/g, '')), fullPhone: phoneIn.value };
            if (!v.valid) return fail('Enter a valid 10-digit mobile number.', phoneIn);
            digits = v.fullPhone || v.digits || phoneIn.value;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
            if (needPhone) {
                const sb = await getSupabase();
                const { error: e } = await sb.rpc('drillrig_set_my_phone', { p_phone: digits });
                if (e) throw new Error(e.message);
            }
            if (needName) {
                const set = (id, val) => { const x = document.getElementById(id); if (x) x.value = val; };
                set('brandCompanyName', name);
                if (needPhone && !String(app.brand?.phones || '').trim()) set('brandCompanyPhones', phoneIn.value.replace(/\D/g, '').slice(-10));
                const prefix = String(app.brand?.billPrefix || '').trim();
                if (!prefix || prefix === 'AB') set('brandBillPrefix', suggestPrefix(name));
                app.syncBrandFromInputs(true);
                app.applyBrandToUI?.();
                app.syncAutoBillNumber?.(true);
                app.fitHeaderTitles?.();
            }
            try { storage.setRaw(doneKey(acc.id), '1'); } catch { /* ignore */ }
            close();
            app?.showToast?.('✅ Saved');
        } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            fail(`Could not save: ${err.message || 'try again'}`);
        }
    });
    laterBtn.addEventListener('click', close); // asked again next time the app opens
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); saveBtn.click(); } });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => (needName ? nameIn : phoneIn).focus(), 300);
}
