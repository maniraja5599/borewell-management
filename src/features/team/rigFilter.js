// Bill book with several rigs: a rig badge on each bill and a "which rig" filter.
// Nothing shows unless the company has more than one rig.
import { getAccess } from '../../cloud/access.js';

function rigs() {
    return getAccess()?.rigs || [];
}

/** True when the company has more than one rig (archived ones included: their bills still exist). */
export function multiRig() {
    return rigs().length > 1;
}

/** The rig a bill belongs to. Old bills without rigId belong to the company's first rig. */
export function billRigId(bill) {
    if (bill?.rigId) return bill.rigId;
    return (rigs().find((r) => r.is_default) || rigs()[0])?.id || null;
}

export function matchesRigFilter(bill, filter) {
    if (!filter || filter === 'all' || !multiRig()) return true;
    return billRigId(bill) === filter;
}

/** Small "🚜 Rig name" badge for a bill card (escaped), or '' for single-rig companies. */
export function rigBadgeHtml(bill, escapeHtml) {
    if (!multiRig()) return '';
    const rig = rigs().find((r) => r.id === billRigId(bill));
    return rig ? `<span class="party-rig-badge">🚜 ${escapeHtml(rig.name)}</span>` : '';
}

/**
 * A rig dropdown placed just above `listEl`. Created on demand, removed for single-rig companies.
 * Returns the filter value to use (falls back to 'all' when the chosen rig no longer exists).
 */
export function ensureRigFilterUI(listEl, current, onChange, id = 'historyRigFilter') {
    let sel = document.getElementById(id);
    if (!multiRig()) {
        sel?.closest('.rig-filter-row')?.remove();
        return 'all';
    }
    const list = rigs();
    const value = list.some((r) => r.id === current) ? current : 'all';
    if (!sel) {
        const row = document.createElement('div');
        row.className = 'rig-filter-row';
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = 'Rig';
        sel = document.createElement('select');
        sel.id = id;
        sel.className = 'rig-filter-select';
        sel.addEventListener('change', () => onChange(sel.value));
        row.append(label, sel);
        listEl.parentNode.insertBefore(row, listEl);
    }
    sel.textContent = '';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'All rigs';
    sel.appendChild(all);
    for (const r of list) {
        const o = document.createElement('option');
        o.value = r.id;
        o.textContent = r.archived ? `${r.name} (archived)` : r.name;
        sel.appendChild(o);
    }
    sel.value = value;
    return value;
}
