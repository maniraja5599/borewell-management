// First-run setup: a brand-new user is asked for the few details every bill needs
// (company name, phone, bill numbering) before the first bill, instead of finding
// "Your Borewell Company" and an empty phone number on their first receipt.
//
// It fills the existing Settings form and runs the same save as "Save Company Profile",
// so validation and storage stay in one place.
import { storage } from '../../data/storage.js';

const SKIP_KEY = 'drillrig_setup_skipped';

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(c);
    return node;
}

function field(id, label, input, hint) {
    return el('div', { class: 'sw-field' }, [
        el('label', { for: id, text: label }),
        input,
        hint ? el('small', { class: 'sw-hint', id: `${id}Hint`, text: hint }) : null
    ]);
}

/** Should the wizard open? Only for a phone that has never been set up or used. */
export function needsSetup(app) {
    try {
        if (storage.getRaw(SKIP_KEY)) return false;
        // Signed in (or was): the company's settings are coming from the cloud.
        if (storage.getRaw('drillrig_auth') || storage.getRaw('drillrig_sync_v1')) return false;
    } catch { /* storage blocked: fall through */ }
    const b = app.brand || {};
    const name = String(b.companyName || '').trim();
    const untouched = (!name || name === app.defaultBrand?.companyName)
        && !String(b.phones || '').trim() && !String(b.address || '').trim() && !b.logoDataUrl;
    return untouched && (app.history || []).length === 0;
}

/** Suggest a bill prefix from the company name: "Sri Murugan Borewells" → "SM". */
export function suggestPrefix(name) {
    const words = String(name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
        .filter((w) => w && !['BOREWELL', 'BOREWELLS', 'DRILLING', 'SERVICES', 'AND', 'CO', 'THE'].includes(w));
    const p = words.slice(0, 3).map((w) => w[0]).join('');
    return p.length >= 2 ? p : (words[0] || 'AB').slice(0, 3) || 'AB';
}

export function initSetupWizard(app) {
    if (!app || !needsSetup(app)) return;

    const setVal = (id, v) => { const x = document.getElementById(id); if (x) x.value = v; };
    let step = 1;

    const nameIn = el('input', { id: 'swName', type: 'text', autocomplete: 'organization', maxlength: '80', placeholder: 'e.g. Sri Murugan Borewells' });
    const phoneIn = el('input', { id: 'swPhone', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: '14', placeholder: '98427 12345' });
    const placeIn = el('input', { id: 'swPlace', type: 'text', maxlength: '120', placeholder: 'e.g. Namakkal, Tamil Nadu' });
    const prefixIn = el('input', { id: 'swPrefix', type: 'text', maxlength: '6', autocapitalize: 'characters' });
    const seqIn = el('input', { id: 'swSeq', type: 'number', inputmode: 'numeric', min: '1', value: '101' });
    const example = el('p', { class: 'sw-example' });
    const error = el('p', { class: 'sw-error', role: 'alert' });

    const step1 = el('div', { class: 'sw-step', 'data-step': '1' }, [
        field('swName', 'Company name *', nameIn),
        field('swPhone', 'Mobile number * (shown on bills)', phoneIn),
        field('swPlace', 'Place / address', placeIn, 'Optional — printed on bills')
    ]);
    const step2 = el('div', { class: 'sw-step', 'data-step': '2', hidden: '' }, [
        el('div', { class: 'sw-row' }, [
            field('swPrefix', 'Bill prefix', prefixIn),
            field('swSeq', 'First bill number', seqIn)
        ]),
        example,
        el('p', { class: 'sw-note', text: 'Rates start at ₹90/ft with standard depth slabs. You can change them any time in the Rates tab.' })
    ]);

    const title = el('h2', { id: 'swTitle', class: 'sw-title', text: 'Set up your business' });
    const sub = el('p', { class: 'sw-sub', text: 'Takes 30 seconds. This is printed on every bill.' });
    const dots = el('div', { class: 'sw-dots', 'aria-hidden': 'true' }, [el('span', { class: 'on' }), el('span')]);
    const backBtn = el('button', { type: 'button', class: 'sw-btn ghost', text: 'Back', hidden: '' });
    const nextBtn = el('button', { type: 'button', class: 'sw-btn primary', text: 'Next' });
    const skipBtn = el('button', { type: 'button', class: 'sw-link', text: 'Skip for now' });
    const signInBtn = el('button', { type: 'button', class: 'sw-link', text: 'Joining a team, or already use DrillRig? Sign in' });

    const card = el('div', { class: 'sw-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'swTitle' }, [
        dots, title, sub, step1, step2, error,
        el('div', { class: 'sw-actions' }, [backBtn, nextBtn]),
        el('div', { class: 'sw-links' }, [signInBtn, skipBtn])
    ]);
    const overlay = el('div', { class: 'sw-overlay', id: 'setupWizardOverlay' }, [card]);

    const close = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
    };
    const remember = () => { try { storage.setRaw(SKIP_KEY, String(Date.now())); } catch { /* ignore */ } };
    const showError = (msg, input) => {
        error.textContent = msg;
        if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    };
    const clearError = () => {
        error.textContent = '';
        [nameIn, phoneIn, prefixIn, seqIn].forEach((i) => i.removeAttribute('aria-invalid'));
    };
    const cleanPrefix = () => (prefixIn.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const renderExample = () => {
        const p = cleanPrefix() || 'AB';
        const n = Math.max(1, parseInt(seqIn.value, 10) || 101);
        example.textContent = `Your first bill will be #${p}-${n}, quotations #${p}-Q${n}.`;
    };

    const goTo = (n) => {
        step = n;
        step1.hidden = n !== 1;
        step2.hidden = n !== 2;
        backBtn.hidden = n === 1;
        nextBtn.textContent = n === 1 ? 'Next' : 'Finish';
        title.textContent = n === 1 ? 'Set up your business' : 'Bill numbers';
        sub.textContent = n === 1 ? 'Takes 30 seconds. This is printed on every bill.' : 'How your bills will be numbered.';
        dots.children[1].classList.toggle('on', n === 2);
        clearError();
        (n === 1 ? nameIn : prefixIn).focus();
    };

    const finish = () => {
        const prefix = cleanPrefix();
        const seq = parseInt(seqIn.value, 10);
        if (!prefix) return showError('Enter a bill prefix (letters or numbers).', prefixIn);
        if (!Number.isFinite(seq) || seq < 1) return showError('Enter a first bill number of 1 or more.', seqIn);

        const phone = app.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { digits: phoneIn.value };
        setVal('brandCompanyName', nameIn.value.trim());
        setVal('brandCompanyPhones', phone.digits || phoneIn.value.trim());
        setVal('brandCompanyAddress', placeIn.value.trim());
        setVal('brandBillPrefix', prefix);
        setVal('brandNextBillSeq', String(seq));
        setVal('brandNextQuoteSeq', String(seq));
        try {
            app.syncBrandFromInputs(true);
            app.applyBrandToUI();
            app.syncAutoBillNumber(true);
            app.calculateAndRender();
        } catch (e) {
            console.error('[setup]', e);
            return showError('Could not save. Please fill these in Settings → Company.');
        }
        remember();
        close();
        app.showToast?.(`✅ ${nameIn.value.trim()} is ready — make your first bill!`);
    };

    nextBtn.addEventListener('click', () => {
        clearError();
        if (step === 1) {
            if (!nameIn.value.trim()) return showError('Enter your company name.', nameIn);
            const v = app.validateMobileNumber ? app.validateMobileNumber(phoneIn.value) : { valid: /\d{10}/.test(phoneIn.value) };
            if (!v.valid) return showError('Enter a valid 10-digit mobile number.', phoneIn);
            if (!prefixIn.value) prefixIn.value = suggestPrefix(nameIn.value);
            renderExample();
            return goTo(2);
        }
        return finish();
    });
    backBtn.addEventListener('click', () => goTo(1));
    prefixIn.addEventListener('input', renderExample);
    seqIn.addEventListener('input', renderExample);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); nextBtn.click(); }
    });
    skipBtn.addEventListener('click', () => {
        remember();
        close();
        app.showToast?.('You can set your company details any time in Settings.');
    });
    signInBtn.addEventListener('click', () => {
        remember();
        close();
        try { app.switchTab('tab-brand'); } catch { /* ignore */ }
        setTimeout(() => document.getElementById('accountCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => nameIn.focus(), 300);
}
