// Settings → "Rig work": the business beyond billing. Each row opens its sheet; rows show only for
// people who may use them (cloud/access.js can()). More rows come with later phases
// (vehicles, profit & loss).
import { can, onAccessChange } from '../../cloud/access.js';
import { STORAGE_KEYS } from '../../data/storage.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el } from '../../ui/sheet.js';
import { openWorkers, readWorkers } from '../workers/workersUI.js';
import { openTools, readTools } from '../tools/toolsUI.js';
import { openCash, myCashLine } from '../cash/cashUI.js';
import { openAttendance, attendanceLine } from '../workers/attendanceUI.js';

export function initRigWork(app) {
    const anchor = document.getElementById('teamCard') || document.getElementById('accountCard');
    if (!anchor) return;
    const card = el('div', { class: 'rw-card', id: 'rigWorkCard', hidden: true });
    anchor.insertAdjacentElement('afterend', card);

    const row = (ic, cls, title, sub, onclick) => el('button', { type: 'button', class: 'team-card tt-entry rw-row', onclick }, [
        el('span', { class: `tt-tile ${cls}` }, [icon(ic)]),
        el('span', { class: 'tt-entry-txt' }, [el('strong', { text: title }), el('small', { text: sub })]),
        el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
    ]);

    const render = () => {
        // Office staff without "bills": the New Bill screen is hidden for them, so do not leave them on it.
        if (!can('bills') && document.getElementById('tab-bill')?.classList.contains('active')) {
            try { app.switchTab(can('reports') ? 'tab-history' : 'tab-brand', false, false); } catch { /* ignore */ }
        }
        const rows = [];
        if (can('workers')) {
            const n = readWorkers().filter((w) => w && w.status !== 'left').length;
            rows.push(row('hard-hat', 'is-workers', 'Workers', n ? `${n} active · operators, drivers, helpers` : 'Operators, drivers, helpers — for wages', () => openWorkers(app)));
            rows.push(row('calendar-check', 'is-att', 'Attendance & wages', attendanceLine(), () => openAttendance(app)));
        }
        if (can('stock')) {
            const inUse = readTools().filter((t) => t && (t.status || 'active') === 'active').length;
            rows.push(row('hammer', 'is-tools', 'Bits & Hammers', inUse ? `${inUse} in use · purchases, finished, scrap` : 'Purchases, in use, finished, scrap', () => openTools(app)));
        }
        if (can('expenses')) rows.push(row('wallet', 'is-cash', 'Expenses & cash', myCashLine(app), () => openCash(app)));
        card.hidden = !rows.length;
        card.replaceChildren(...(rows.length ? [el('div', { class: 'rw-label', text: 'Rig work' }), ...rows] : []));
        paintIcons();
    };
    onAccessChange(render);
    window.addEventListener('drillrig:workers-changed', render);
    window.addEventListener('drillrig:tools-changed', render);
    window.addEventListener('drillrig:cash-changed', render);
    window.addEventListener('drillrig:attendance-changed', render);
    // Saved from the sheets on this phone.
    const origSave = app.saveToStorage?.bind(app);
    if (origSave) {
        app.saveToStorage = (key, data, changed) => {
            const ok = origSave(key, data, changed);
            if (key === STORAGE_KEYS.workers || key === STORAGE_KEYS.tools || key === STORAGE_KEYS.cash || key === STORAGE_KEYS.history || key === STORAGE_KEYS.attendance) { try { render(); } catch { /* ignore */ } }
            return ok;
        };
    }
    render();
}
