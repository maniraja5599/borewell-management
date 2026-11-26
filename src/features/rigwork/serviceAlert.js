// Compressor & Engine Service Interval Alerts (per rig).
// Uses the rig's latest compressor reading (workMath.lastClosing) against saved service intervals,
// firing a warning at >= 90% of the interval and an overdue alert at >= 100%.
import { storage } from '../../data/storage.js';
import { getCurrentRig, hasRigs } from '../../cloud/access.js';
import { lastClosing } from '../work/workMath.js';
import { el, openSheet, btn, pill } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';

const SERVICE_KEY = 'drillrig_rig_service_v1';

export function readServiceConfig(rigId = 'default') {
    const key = rigId || 'default';
    let all = {};
    try { all = JSON.parse(storage.getRaw(SERVICE_KEY) || '{}') || {}; } catch { all = {}; }
    const c = all[key] || {};
    return {
        compInterval: Number(c.compInterval) > 0 ? Number(c.compInterval) : 250,
        compLast: Number(c.compLast) >= 0 ? Number(c.compLast) : 0,
        compDate: c.compDate || '',
        engInterval: Number(c.engInterval) > 0 ? Number(c.engInterval) : 500,
        engLast: Number(c.engLast) >= 0 ? Number(c.engLast) : 0,
        engDate: c.engDate || ''
    };
}

export function writeServiceConfig(rigId = 'default', cfg) {
    const key = rigId || 'default';
    let all = {};
    try { all = JSON.parse(storage.getRaw(SERVICE_KEY) || '{}') || {}; } catch { all = {}; }
    all[key] = cfg;
    try { storage.setRaw(SERVICE_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

/** Pure helper: compute service status for one meter (compressor or engine). */
export function evalServiceItem(meter, last, interval) {
    const cur = Math.max(0, Number(meter) || 0);
    const prev = Math.max(0, Number(last) || 0);
    const span = Math.max(1, Number(interval) || 250);
    const used = Math.max(0, Math.round((cur - prev) * 10) / 10);
    const left = Math.round((span - used) * 10) / 10;
    const pct = used / span;
    const overdue = cur > 0 && pct >= 1;
    const dueSoon = cur > 0 && pct >= 0.9;
    return { cur, prev, span, used, left, pct, overdue, dueSoon };
}

export function getRigServiceStatus(app) {
    const rigId = (hasRigs() ? getCurrentRig()?.id : null) || 'default';
    const meter = lastClosing(app?.history || [], hasRigs() ? rigId : null) ?? 0;
    const cfg = readServiceConfig(rigId);
    const comp = evalServiceItem(meter, cfg.compLast, cfg.compInterval);
    const eng = evalServiceItem(meter, cfg.engLast, cfg.engInterval);
    return { rigId, meter, cfg, comp, eng, anyWarn: comp.dueSoon || eng.dueSoon };
}

export function serviceTileSummary(app) {
    const st = getRigServiceStatus(app);
    if (st.meter <= 0) return 'Set compressor & engine service intervals';
    const alerts = [];
    if (st.comp.overdue) alerts.push('Compressor overdue');
    else if (st.comp.dueSoon) alerts.push(`Compressor due in ${Math.max(0, st.comp.left)} h`);
    if (st.eng.overdue) alerts.push('Engine overdue');
    else if (st.eng.dueSoon) alerts.push(`Engine due in ${Math.max(0, st.eng.left)} h`);
    if (alerts.length) return `⚠ ${alerts.join(' · ')}`;
    return `Meter ${st.meter} · Next in ${Math.max(0, Math.min(st.comp.left, st.eng.left))} h`;
}

export function openServiceAlerts(app, { onSaved } = {}) {
    const sheet = openSheet({
        title: 'Vehicle & compressor service',
        sub: 'Alerts fire at 90% of the service interval',
        ic: 'wrench'
    });

    function render() {
        const st = getRigServiceStatus(app);
        const cfg = { ...st.cfg };

        const mkMeterCard = (label, item, intervalKey, lastKey, dateKey) => {
            const pct = Math.min(100, Math.round(item.pct * 100));
            const statusPill = item.overdue
                ? pill(`Overdue (${item.used}/${item.span})`, 'is-bad')
                : item.dueSoon
                    ? pill(`Due soon (${item.used}/${item.span})`, 'is-warn')
                    : pill(`${item.used} / ${item.span}`, 'is-ok');

            const intIn = el('input', { type: 'number', class: 'tt-input', min: '10', step: '10', value: String(cfg[intervalKey]), 'aria-label': `${label} interval` });
            const lastIn = el('input', { type: 'number', class: 'tt-input', min: '0', step: '1', value: String(cfg[lastKey]), 'aria-label': `${label} last serviced reading` });
            const saveInputs = () => {
                cfg[intervalKey] = Math.max(10, Number(intIn.value) || 250);
                cfg[lastKey] = Math.max(0, Number(lastIn.value) || 0);
                writeServiceConfig(st.rigId, cfg);
                onSaved?.();
                render();
            };
            intIn.addEventListener('change', saveInputs);
            lastIn.addEventListener('change', saveInputs);

            const markBtn = btn(`Mark ${label} Serviced`, {
                kind: item.dueSoon ? 'pri' : 'sec',
                ic: 'check',
                onclick: () => {
                    cfg[lastKey] = st.meter;
                    cfg[dateKey] = new Date().toISOString().slice(0, 10);
                    writeServiceConfig(st.rigId, cfg);
                    app?.showToast?.(`✅ ${label} marked serviced at ${st.meter}`);
                    onSaved?.();
                    render();
                }
            });

            return el('div', { class: 'tt-card', style: 'margin-bottom: 10px;' }, [
                el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;' }, [
                    el('strong', { text: label }),
                    statusPill
                ]),
                el('div', { class: 'rw-bar', style: 'height:6px;margin-bottom:10px;' }, [
                    el('span', { style: `width:${pct}%;background:${item.overdue ? '#dc2626' : item.dueSoon ? '#d97706' : '#15803d'};` })
                ]),
                el('div', { class: 'wk-two' }, [
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Interval (hrs / RPM)' }), intIn]),
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Last serviced at' }), lastIn])
                ]),
                cfg[dateKey] ? el('small', { class: 'wk-hint', text: `Last serviced on ${cfg[dateKey]}` }) : null,
                markBtn
            ]);
        };

        sheet.body.replaceChildren(...[
            el('div', { class: 'tt-card', style: 'margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;' }, [
                el('span', { class: 'wk-lbl', text: 'Current compressor reading' }),
                el('strong', { text: st.meter > 0 ? `${st.meter}` : 'No reading yet' })
            ]),
            mkMeterCard('Compressor service', st.comp, 'compInterval', 'compLast', 'compDate'),
            mkMeterCard('Engine service', st.eng, 'engInterval', 'engLast', 'engDate')
        ]);
        paintIcons();
    }
    render();
}
