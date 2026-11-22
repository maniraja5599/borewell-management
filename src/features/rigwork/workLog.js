// Work log (Rig work tab): every Final Bill of this rig with its work details — operator, compressor
// hours, bit — and the recent ones still missing them on top. Tapping a bill opens it on the bill
// screen with its Work details page (work/workCard.js, app.openWorkDetails).
import { billOnCurrentRig } from '../../cloud/access.js';
import { el, openSheet, pill, seg } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { readWorkers } from '../workers/workersUI.js';
import { readTools } from '../tools/toolsUI.js';
import { toolName } from '../tools/toolsMath.js';
import { shortDate } from '../tools/toolsMath.js';
import { todayYmd } from '../workers/workersMath.js';
import { addDays } from '../workers/attendanceMath.js';

const RECENT_DAYS = 30;
const isFinal = (b) => (b?.snapshot?.docType || 'QUOTATION') === 'INVOICE';
const dayOf = (b) => String(b?.billDate || b?.createdAt || '').slice(0, 10);

/** Final bills of the current rig from the last 30 days without work details (pure enough to test). */
export function pendingWorkBills(bills, { today = todayYmd(), onRig = () => true } = {}) {
    const since = addDays(today, -RECENT_DAYS);
    return (bills || []).filter((b) => b && isFinal(b) && onRig(b) && !b.work && dayOf(b) >= since && dayOf(b) <= today)
        .sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
}
export const workLogPending = (app) => pendingWorkBills(app?.history || [], { onRig: (b) => billOnCurrentRig(b) }).length;

/** "Kumar · 9.5 h · KB-1023 164 mm" */
export function workSummary(work, workers = [], tools = []) {
    if (!work) return '';
    const parts = [];
    const op = workers.find((w) => w.id === work.operatorId);
    if (op) parts.push(op.name);
    const a = Number(work.compStart); const b = Number(work.compEnd);
    if (work.compStart !== null && work.compEnd !== null && work.compStart !== undefined && work.compEnd !== undefined && b >= a) parts.push(`${Math.round((b - a) * 10) / 10} h`);
    const bit = (work.bits || []).find((x) => x?.toolId);
    const t = bit && tools.find((x) => x.id === bit.toolId);
    if (t) parts.push(`${toolName(t)}${bit.mm ? ` ${bit.mm} mm` : ''}`);
    return parts.join(' · ') || 'Filled';
}

export function openWorkLog(app) {
    let show = 'needs';
    const sheet = openSheet({ title: 'Work log', sub: 'Operator, compressor and bits on every bore', ic: 'clipboard-list' });
    const open = (b) => {
        sheet.close();
        app.loadBillFromHistory(b.id, false, true);
        setTimeout(() => app.openWorkDetails?.(), 250);
    };
    function render() {
        const today = todayYmd();
        const workers = readWorkers();
        const tools = readTools();
        const finals = (app.history || []).filter((b) => b && isFinal(b) && billOnCurrentRig(b))
            .sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const needs = pendingWorkBills(finals, { today });
        const month = finals.filter((b) => dayOf(b).startsWith(today.slice(0, 7)));
        const list = show === 'needs' ? needs : show === 'month' ? month : finals.slice(0, 100);
        const row = (b) => {
            const s = b.snapshot || {};
            const done = !!b.work;
            return el('div', { class: 'tt-item wl-row' }, [el('button', { type: 'button', class: 'tt-row', onclick: () => open(b) }, [
                el('span', { class: `tt-avatar is-tool ca-av ${done ? 'is-in' : 'is-expense'}`, 'aria-hidden': 'true' }, [icon(done ? 'check' : 'clipboard-pen')]),
                el('span', { class: 'tt-row-main' }, [
                    el('strong', { text: `#${b.billNo || ''} · ${b.custName || 'Customer'}` }),
                    el('small', { text: done ? workSummary(b.work, workers, tools) : [shortDate(dayOf(b)), b.custLocation, `${Number(s.totalDepth) || 0} ft`, s.drillingType === 'repair' ? 're-bore' : 'new bore'].filter(Boolean).join(' · ') })
                ]),
                done ? pill('Done', 'is-ok') : pill('Add details', 'is-warn'),
                el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
            ])]);
        };
        sheet.body.replaceChildren(...[
            seg('wlShow', [{ key: 'needs', label: `Needs details (${needs.length})` }, { key: 'month', label: 'This month' }, { key: 'all', label: 'All' }], show, (v) => { show = v; render(); }),
            list.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, list.map(row))])
                : el('p', { class: 'tt-empty', text: show === 'needs' ? `Every final bill of the last ${RECENT_DAYS} days has its work details.` : 'No final bills yet.' }),
            el('p', { class: 'ca-note', text: 'Tap a bill: it opens with its work details page. The same page opens from the bill screen.' })
        ]);
        paintIcons();
    }
    render();
}
