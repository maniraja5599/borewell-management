// Bill screen: which rig this bill is for, and whether that rig's subscription allows new bills.
// Hidden completely for single-user (not signed in) phones and companies with one active rig.
import {
    hasRigs, visibleRigs, getCurrentRig, setCurrentRig, canCreateBill, onAccessChange,
    rigDaysLeft, getRole, getAccess
} from '../../cloud/access.js';
import { renewLink, isEarlyAccess } from '../../config/plans.js';

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(c);
    return node;
}

function statusLine(rig) {
    const days = rigDaysLeft(rig);
    if (!rig.active) return 'Subscription ended';
    const paid = Date.parse(rig.paid_until || '') > Date.parse(rig.trial_ends_at || '');
    if (!paid && isEarlyAccess()) return 'Free Early Access';
    return `${paid ? 'Paid' : 'Free trial'} · ${days} day${days === 1 ? '' : 's'} left`;
}

function openPicker(app) {
    const rigs = visibleRigs();
    const current = getCurrentRig();
    const close = () => overlay.remove();
    const list = el('div', { class: 'rig-sheet-list', role: 'radiogroup', 'aria-label': 'Choose rig' },
        rigs.map((r) => el('button', {
            type: 'button',
            class: `rig-option${r.id === current?.id ? ' on' : ''}${r.active ? '' : ' off'}`,
            role: 'radio',
            'aria-checked': String(r.id === current?.id),
            onclick: () => {
                setCurrentRig(r.id);
                if (!app.loadedHistoryBillId) app.syncAutoBillNumber?.(true);
                close();
                app.showToast?.(`🚜 New bills now go to ${r.name}`);
            }
        }, [
            el('strong', { text: r.name }),
            el('span', { text: `${r.is_default ? (app.brand?.billPrefix || r.bill_prefix) : r.bill_prefix} · ${statusLine(r)}` })
        ]))
    );
    const overlay = el('div', { class: 'rig-sheet-overlay', onclick: (e) => { if (e.target === overlay) close(); } }, [
        el('div', { class: 'rig-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose rig' }, [
            el('h3', { text: 'Which rig is this bill for?' }),
            list,
            el('button', { type: 'button', class: 'rig-sheet-close', text: 'Close', onclick: close })
        ])
    ]);
    document.body.appendChild(overlay);
    overlay.querySelector('.rig-option.on, .rig-option')?.focus();
}

export function initRigBar(app) {
    const btn = document.getElementById('rigPickerBtn');
    const banner = document.getElementById('rigStatusBanner');
    if (!btn || !banner) return;

    const render = () => {
        if (!hasRigs()) { btn.hidden = true; banner.hidden = true; return; }
        const rigs = visibleRigs();
        const rig = getCurrentRig();
        btn.hidden = !rig || (rigs.length < 2 && rig.active);
        if (rig) btn.textContent = `🚜 ${rig.name} ▾`;

        banner.textContent = '';
        banner.className = 'rig-status-banner';
        const owner = getRole() === 'owner';
        const days = rig ? rigDaysLeft(rig) : 99;
        let msg = '';
        if (rig && !rig.active) {
            banner.classList.add('is-ended');
            msg = `⛔ ${rig.name}: subscription ended. Old bills, dues and payments still work — new bills are paused.`;
            if (!owner) msg += ' Ask the owner to renew.';
        } else if (rig && owner && days <= 7) {
            banner.classList.add('is-warning');
            msg = `⏳ ${rig.name}: ${statusLine(rig).toLowerCase()}.`;
        }
        if (!msg) { banner.hidden = true; return; }
        banner.appendChild(el('span', { text: msg }));
        if (owner) {
            banner.appendChild(el('a', {
                class: 'rig-renew-btn', target: '_blank', rel: 'noopener', text: 'Renew',
                href: renewLink({ companyName: getAccess()?.companyName, rigName: rig.name, rigId: rig.id })
            }));
        }
        banner.hidden = false;
    };

    btn.addEventListener('click', () => openPicker(app));
    onAccessChange(() => {
        render();
        if (!app.loadedHistoryBillId) { try { app.syncAutoBillNumber?.(true); } catch { /* ignore */ } }
    });
    render();

    // A rig whose subscription has ended takes no NEW bills (the server refuses them too).
    const origSave = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = async (...args) => {
        if (!app.loadedHistoryBillId && !canCreateBill()) {
            const rig = getCurrentRig();
            app.showToast?.(`⛔ ${rig?.name || 'This rig'}: subscription ended — renew to make new bills.`);
            return undefined;
        }
        return origSave(...args);
    };
}
