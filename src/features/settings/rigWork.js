// "Rig work" tab (bottom bar): the business beyond billing, in one place.
//   Today: people at work, cash in hand, hand-overs waiting; quick buttons (Attendance, + Expense, + Diesel)
//   One line of warnings (bills without work details, bits / hammers to check, low pipe)
//   Tiles with a live line: Attendance & wages, Expenses & cash, Work log, Casing pipes, Bits & Hammers, Workers
//   Rig report (dashboard.html, "Rig work" section)
// Each tile shows only for people who may use it (cloud/access.js can()). The tiles keep the
// #rigWorkCard / .rw-row names the older Settings rows had.
import { can, onAccessChange, getCurrentRig } from '../../cloud/access.js';
import { STORAGE_KEYS } from '../../data/storage.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el } from '../../ui/sheet.js';
import { openWorkers, readWorkers } from '../workers/workersUI.js';
import { openTools, readTools } from '../tools/toolsUI.js';
import { openCash, myCashLine, readCash, me } from '../cash/cashUI.js';
import { openAttendance, attendanceLine, readAttendance } from '../workers/attendanceUI.js';
import { openPipeStock, pipeStockLine } from '../stock/stockUI.js';
import { openWorkLog, workLogPending } from '../rigwork/workLog.js';
import { openServiceAlerts, getRigServiceStatus, serviceTileSummary } from '../rigwork/serviceAlert.js';
import { openVehicles, countExpiringDocs, vehiclesTileSummary } from '../rigwork/vehiclesUI.js';
import { openMarketplaceSheet, readMarketplaceConfig } from './marketplaceUI.js';
import { openAgents, agentsTileSummary } from '../agents/agentsUI.js';
import { openPending, pendingTileSummary, pendingTileWarn } from '../payments/pendingUI.js';
import { openDailyReport, dailyTileSummary } from '../report/dailyUI.js';
import { FEATURES } from '../../config/features.js';
import { cashBook, spendSummary, inr } from '../cash/cashMath.js';
import { daySummary, isActive, payNow } from '../workers/attendanceMath.js';
import { todayYmd } from '../workers/workersMath.js';
import { cachedToolUsage, toolWarning } from '../work/workMath.js';
import { toolLimits } from '../tools/toolsMath.js';

export function initRigWork(app) {
    const panel = document.getElementById('tab-rigwork');
    if (!panel) return;

    const tile = (ic, cls, title, sub, onclick, warn = false) => el('button', { type: 'button', class: `rw-row rw-tile${warn ? ' is-warn' : ''}`, onclick }, [
        el('span', { class: `tt-tile ${cls}` }, [icon(ic)]),
        el('span', { class: 'rw-tile-txt' }, [el('strong', { text: title }), el('small', { text: sub })])
    ]);

    function today() {
        const t = todayYmd();
        const workers = can('workers') ? readWorkers().filter(isActive) : [];
        const day = workers.length ? daySummary(workers, readAttendance(), t) : null;
        const book = can('expenses') ? cashBook(readCash(), app.history || [], me().id) : null;
        if (!day && !book) return null;
        const pct = day && workers.length ? Math.round(((day.present + day.half) / workers.length) * 100) : 0;
        return el('section', { class: 'rw-today', 'aria-label': 'Today' }, [
            el('div', { class: 'rw-today-stats' }, [
                day ? el('div', {}, [
                    el('small', { text: 'At work today' }),
                    el('strong', {}, [`${day.present + day.half}`, el('span', { text: ` / ${workers.length}` })]),
                    el('span', { class: 'rw-bar', 'aria-hidden': 'true' }, [el('span', { style: `width:${pct}%` })])
                ]) : null,
                book ? el('div', {}, [
                    el('small', { text: 'Cash in hand' }),
                    el('strong', { text: inr(book.balance) }),
                    el('span', { class: 'rw-today-note', text: book.pendingCount ? `${inr(book.pending)} waiting ✓` : 'All handed over' })
                ]) : null
            ]),
            el('div', { class: 'rw-quick' }, [
                can('workers') ? el('button', { type: 'button', class: 'rw-q is-pri', text: 'Attendance', onclick: () => openAttendance(app) }) : null,
                can('expenses') ? el('button', { type: 'button', class: 'rw-q', text: '+ Expense', onclick: () => openCash(app, { start: 'expense' }) }) : null,
                can('expenses') ? el('button', { type: 'button', class: 'rw-q', text: '+ Diesel', onclick: () => openCash(app, { start: 'diesel' }) }) : null
            ])
        ]);
    }

    function warnings() {
        const parts = [];
        const pending = can('bills') ? workLogPending(app) : 0;
        if (pending) parts.push(`${pending} bill${pending === 1 ? ' needs' : 's need'} work details`);
        if (can('stock')) {
            const usage = cachedToolUsage(app.history, app._bigListVersion || 0);
            const limits = toolLimits(app.brand);
            const rig = getCurrentRig()?.id;
            const n = readTools().filter((t) => t && (t.status || 'active') === 'active' && (!rig || !t.rigId || t.rigId === rig || t.rigId === 'local') && toolWarning(t, usage, limits)).length;
            if (n) parts.push(`${n} bit / hammer to check`);
            if (FEATURES.pipeStock && /⚠/.test(pipeStockLine(app))) parts.push('pipe stock low');
        }
        const svc = getRigServiceStatus(app);
        if (svc.comp.overdue) parts.push('compressor service overdue');
        else if (svc.comp.dueSoon) parts.push(`compressor service in ${Math.max(0, svc.comp.left)} h`);
        if (svc.eng.overdue) parts.push('engine service overdue');
        else if (svc.eng.dueSoon) parts.push(`engine service in ${Math.max(0, svc.eng.left)} h`);
        const docAlerts = countExpiringDocs();
        if (docAlerts) parts.push(`${docAlerts} vehicle doc${docAlerts === 1 ? '' : 's'} expiring`);
        if (!parts.length) return null;
        return el('button', { type: 'button', class: 'rw-warn', onclick: () => (svc.anyWarn ? openServiceAlerts(app, { onSaved: render }) : docAlerts ? openVehicles(app, { onSaved: render }) : pending ? openWorkLog(app) : null) }, [
            icon('triangle-alert'), el('span', { text: parts.join(' · ') }), el('span', { class: 'rw-chev', 'aria-hidden': 'true', text: '›' })
        ]);
    }

    const render = () => {
        const rig = getCurrentRig();
        const tiles = [];
        if (can('workers')) {
            const wages = readWorkers().filter(isActive).reduce((s, w) => s + payNow(w, readAttendance(), readCash()).toPay, 0);
            tiles.push(tile('calendar-check', 'is-att', 'Attendance & wages', `${attendanceLine()}${wages ? ` · ${inr(wages)} to pay` : ''}`, () => openAttendance(app)));
        }
        if (can('expenses')) tiles.push(tile('wallet', 'is-cash', 'Expenses & cash', myCashLine(app), () => openCash(app)));
        if (can('bills')) {
            const pending = workLogPending(app);
            tiles.push(tile('calendar-days', 'is-report', 'Daily site report', dailyTileSummary(app), () => openDailyReport(app)));
            tiles.push(tile('hourglass', 'is-cash', 'Pending payments', pendingTileSummary(app), () => openPending(app, { onSaved: render }), pendingTileWarn(app)));
            tiles.push(tile('handshake', 'is-report', 'Agents', agentsTileSummary(app), () => openAgents(app)));
            tiles.push(tile('clipboard-list', 'is-tools', 'Work log', pending ? `${pending} to fill` : 'Operator, compressor, bits per bore', () => openWorkLog(app), pending > 0));
            const svcWarn = getRigServiceStatus(app).anyWarn;
            tiles.push(tile('wrench', 'is-tools', 'Service alerts', serviceTileSummary(app), () => openServiceAlerts(app, { onSaved: render }), svcWarn));
            const docWarn = countExpiringDocs() > 0;
            tiles.push(tile('truck', 'is-tools', 'Vehicles & docs', vehiclesTileSummary(), () => openVehicles(app, { onSaved: render }), docWarn));
            const mkt = readMarketplaceConfig(app);
            tiles.push(tile('store', 'is-report', 'Online marketplace', mkt.live ? `Live · ${mkt.city} · share link` : 'Go live & let customers compare prices', () => openMarketplaceSheet(app, { onSaved: render })));
        }
        if (can('stock') && FEATURES.pipeStock) tiles.push(tile('cylinder', 'is-pipes', 'Casing pipes', pipeStockLine(app), () => openPipeStock(app), /⚠/.test(pipeStockLine(app))));
        if (can('stock')) {
            const inUse = readTools().filter((t) => t && (t.status || 'active') === 'active').length;
            tiles.push(tile('hammer', 'is-tools', 'Bits & Hammers', inUse ? `${inUse} in use · purchases, finished, scrap` : 'Purchases, in use, finished, scrap', () => openTools(app)));
        }
        if (can('workers')) {
            const n = readWorkers().filter(isActive).length;
            tiles.push(tile('hard-hat', 'is-workers', 'Workers', n ? `${n} active · operators, drivers, helpers` : 'Operators, drivers, helpers — for wages', () => openWorkers(app)));
        }
        const month = spendSummary(can('expenses') ? readCash() : [], { start: `${todayYmd().slice(0, 7)}-01` }).total;
        panel.replaceChildren(...[
            el('div', { class: 'rw-head' }, [
                el('div', {}, [
                    el('h2', { class: 'rw-title', text: 'Rig work' }),
                    el('span', { class: 'rw-sub', text: `${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}${rig?.name ? ` · ${rig.name}` : ''}` })
                ])
            ]),
            today(),
            warnings(),
            tiles.length ? el('div', { class: 'rw-grid', id: 'rigWorkCard' }, tiles)
                : el('p', { class: 'tt-empty', text: 'Nothing here for your role. Ask the owner for access to workers, stock or expenses.' }),
            can('reports') ? el('a', { class: 'rw-report', href: 'dashboard.html#workReport' }, [
                el('span', { class: 'tt-tile is-report' }, [icon('chart-line')]),
                el('span', { class: 'rw-tile-txt' }, [el('strong', { text: 'Rig report' }), el('small', { text: month ? `Spent ${inr(month)} this month · operators, compressor, bit wear` : 'Operators, compressor hours, bit wear' })]),
                el('span', { class: 'rw-chev', 'aria-hidden': 'true', text: '›' })
            ]) : null
        ].filter(Boolean));
        paintIcons();
    };

    onAccessChange(render);
    for (const ev of ['workers', 'tools', 'cash', 'attendance', 'stock']) window.addEventListener(`drillrig:${ev}-changed`, render);
    const origSave = app.saveToStorage?.bind(app);
    if (origSave) {
        app.saveToStorage = (key, data, changed) => {
            const ok = origSave(key, data, changed);
            if ([STORAGE_KEYS.workers, STORAGE_KEYS.tools, STORAGE_KEYS.cash, STORAGE_KEYS.history, STORAGE_KEYS.attendance, STORAGE_KEYS.stock, STORAGE_KEYS.brand].includes(key)) {
                try { render(); } catch { /* ignore */ }
            }
            return ok;
        };
    }
    // Drawn fresh each time the tab is opened.
    const origSwitch = app.switchTab.bind(app);
    app.switchTab = (tabId, ...rest) => {
        const r = origSwitch(tabId, ...rest);
        if (tabId === 'tab-rigwork') { try { render(); } catch (e) { console.warn('[rigwork]', e); } }
        return r;
    };
    // Keep the old guard: office staff without "bills" never stay on New Bill.
    onAccessChange(() => {
        if (!can('bills') && document.getElementById('tab-bill')?.classList.contains('active')) {
            try { app.switchTab(can('reports') ? 'tab-history' : 'tab-rigwork', false, false); } catch { /* ignore */ }
        }
    });
    render();
}
