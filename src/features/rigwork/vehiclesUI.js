// Vehicles, Hired Vehicle Owners & Vehicle Document Expiry Alerts (RC, Insurance, Permit, Fitness).
import { STORAGE_KEYS } from '../../data/storage.js';
import { readMovedList, saveList as saveSynced } from '../../data/movedList.js';
import { el, openSheet, btn, pill, seg } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { todayYmd } from '../workers/workersMath.js';
import { inr } from '../cash/cashMath.js';

// Synced list (kind 'vehicle', migration 0018) — before that it lived on one phone under this key.
const OLD_KEY = 'drillrig_vehicles_v1';

export function readVehicles() {
    return readMovedList(STORAGE_KEYS.vehicles, OLD_KEY).filter((v) => v && v.name);
}

export function writeVehicles(list, app) {
    return saveSynced(app, STORAGE_KEYS.vehicles, list || []);
}

function daysBetween(fromYmd, toYmd) {
    const a = new Date(`${fromYmd}T00:00:00Z`).getTime();
    const b = new Date(`${toYmd}T00:00:00Z`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round((b - a) / 86400000);
}

/** Pure helper: list expired or soon-expiring (<= warnDays) documents for one vehicle. */
export function expiringDocs(v, { today = todayYmd(), warnDays = 30 } = {}) {
    if (!v || typeof v !== 'object') return [];
    const docs = [
        { key: 'rcExpiry', label: 'RC' },
        { key: 'insExpiry', label: 'Insurance' },
        { key: 'permitExpiry', label: 'Permit' },
        { key: 'fitExpiry', label: 'Fitness' }
    ];
    const out = [];
    for (const d of docs) {
        const ymd = String(v[d.key] || '').slice(0, 10);
        if (!ymd) continue;
        const left = daysBetween(today, ymd);
        if (left === null) continue;
        if (left <= warnDays) out.push({ ...d, ymd, daysLeft: left, expired: left < 0 });
    }
    return out;
}

export function countExpiringDocs(vehicles = readVehicles(), opts = {}) {
    return (vehicles || []).reduce((sum, v) => sum + expiringDocs(v, opts).length, 0);
}

export function vehiclesTileSummary() {
    const list = readVehicles();
    if (!list.length) return 'Own & hired vehicles · RC, insurance, fitness';
    const exp = countExpiringDocs(list);
    const hired = list.filter((v) => v.kind === 'hired').length;
    const parts = [`${list.length} vehicle${list.length === 1 ? '' : 's'}`];
    if (hired) parts.push(`${hired} hired`);
    if (exp) parts.push(`⚠ ${exp} doc${exp === 1 ? '' : 's'} expiring`);
    return parts.join(' · ');
}

export function openVehicles(app, { onSaved } = {}) {
    const sheet = openSheet({
        title: 'Vehicles & hired rigs',
        sub: 'Own & hired vehicles, payouts and document expiry alerts',
        ic: 'truck'
    });
    let editing = null; // null | 'new' | vehicle object
    let settling = null; // null | vehicle object

    function saveList(next) {
        writeVehicles(next, app);
        onSaved?.();
        render();
    }

    function renderForm(v) {
        const isNew = v === 'new';
        const cur = isNew ? { id: `veh_${Date.now().toString(36)}`, kind: 'own', settlements: [] } : { ...v };
        let kind = cur.kind === 'hired' ? 'hired' : 'own';
        const inp = (val, ph, type = 'text') => el('input', { type, class: 'tt-input', value: val ?? '', placeholder: ph });
        const nameIn = inp(cur.name, 'e.g. Rig 1 Lorry / Support Truck');
        const regIn = inp(cur.regNo, 'e.g. TN 28 AB 1234');
        const ownerIn = inp(cur.ownerName, 'Hired owner name');
        const phoneIn = inp(cur.ownerPhone, 'Owner mobile', 'tel');
        const rateIn = inp(cur.perFtRate, '₹/ft (optional)', 'number');
        const tripIn = inp(cur.fixedTripRate, '₹/trip (optional)', 'number');
        const rcIn = inp(cur.rcExpiry, '', 'date');
        const insIn = inp(cur.insExpiry, '', 'date');
        const permIn = inp(cur.permitExpiry, '', 'date');
        const fitIn = inp(cur.fitExpiry, '', 'date');
        const hiredBox = el('div', { class: 'wk-sub', hidden: kind !== 'hired' }, [
            el('div', { class: 'wk-two' }, [
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Owner name' }), ownerIn]),
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Owner phone' }), phoneIn])
            ]),
            el('div', { class: 'wk-two' }, [
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Rate (₹/ft)' }), rateIn]),
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Per trip (₹)' }), tripIn])
            ])
        ]);

        const saveBtn = btn('Save Vehicle', {
            kind: 'pri',
            ic: 'check',
            onclick: () => {
                const name = nameIn.value.trim();
                if (!name) { app?.showToast?.('⚠️ Enter vehicle name'); nameIn.focus(); return; }
                const updated = {
                    ...cur,
                    name,
                    regNo: regIn.value.trim().toUpperCase(),
                    kind,
                    ownerName: kind === 'hired' ? ownerIn.value.trim() : '',
                    ownerPhone: kind === 'hired' ? phoneIn.value.trim() : '',
                    perFtRate: kind === 'hired' ? (Number(rateIn.value) || 0) : 0,
                    fixedTripRate: kind === 'hired' ? (Number(tripIn.value) || 0) : 0,
                    rcExpiry: rcIn.value,
                    insExpiry: insIn.value,
                    permitExpiry: permIn.value,
                    fitExpiry: fitIn.value
                };
                const list = readVehicles();
                const idx = list.findIndex((x) => x.id === updated.id);
                if (idx >= 0) list[idx] = updated; else list.unshift(updated);
                editing = null;
                app?.showToast?.('✅ Vehicle saved');
                saveList(list);
            }
        });

        sheet.body.replaceChildren(el('div', { class: 'tt-card' }, [
            seg('vehKind', [{ key: 'own', label: 'Own vehicle' }, { key: 'hired', label: 'Hired vehicle' }], kind, (k) => { kind = k; hiredBox.hidden = k !== 'hired'; }),
            el('div', { class: 'wk-two', style: 'margin-top:10px;' }, [
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Vehicle name *' }), nameIn]),
                el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Reg. number' }), regIn])
            ]),
            hiredBox,
            el('div', { class: 'wk-sec' }, [
                el('h4', { text: 'Document expiry dates' }),
                el('div', { class: 'wk-two' }, [
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'RC expiry' }), rcIn]),
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Insurance expiry' }), insIn])
                ]),
                el('div', { class: 'wk-two' }, [
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Permit expiry' }), permIn]),
                    el('div', { class: 'wk-row' }, [el('label', { class: 'wk-lbl', text: 'Fitness expiry' }), fitIn])
                ])
            ]),
            el('div', { style: 'display:flex;gap:8px;margin-top:8px;' }, [
                btn('Cancel', { kind: 'sec', onclick: () => { editing = null; render(); } }),
                saveBtn
            ])
        ]));
        paintIcons();
    }

    function renderSettle(v) {
        const amtIn = el('input', { type: 'number', class: 'tt-input', min: '1', placeholder: 'Amount (₹)' });
        const noteIn = el('input', { type: 'text', class: 'tt-input', placeholder: 'Note (e.g. Bore #AB-108 payout)' });
        const list = Array.isArray(v.settlements) ? v.settlements : [];
        sheet.body.replaceChildren(el('div', { class: 'tt-card' }, [
            el('strong', { text: `Settlements · ${v.name}` }),
            el('small', { class: 'wk-hint', text: v.ownerName ? `Owner: ${v.ownerName}` : 'Hired vehicle payouts' }),
            el('div', { class: 'wk-two', style: 'margin-top:8px;' }, [amtIn, noteIn]),
            el('div', { style: 'display:flex;gap:8px;margin:8px 0 12px;' }, [
                btn('Back', { kind: 'sec', onclick: () => { settling = null; render(); } }),
                btn('Record Payout', {
                    kind: 'pri',
                    ic: 'check',
                    onclick: () => {
                        const amount = Number(amtIn.value) || 0;
                        if (amount <= 0) { app?.showToast?.('⚠️ Enter valid amount'); return; }
                        const all = readVehicles();
                        const target = all.find((x) => x.id === v.id);
                        if (target) {
                            // a new object (not an edit in place), so the change is seen and synced
                            const next = { ...target, settlements: [{ id: `st_${Date.now().toString(36)}`, date: todayYmd(), amount, note: noteIn.value.trim() }, ...(target.settlements || [])] };
                            settling = next;
                            app?.showToast?.(`✅ Recorded ${inr(amount)} payout`);
                            saveList(all.map((x) => (x.id === next.id ? next : x)));
                        }
                    }
                })
            ]),
            list.length ? el('div', { class: 'tt-list' }, list.map((s) => el('div', { class: 'tt-item', style: 'padding:8px 10px;display:flex;justify-content:space-between;' }, [
                el('span', { text: `${s.date}${s.note ? ` · ${s.note}` : ''}` }),
                el('strong', { text: inr(s.amount) })
            ]))) : el('p', { class: 'tt-empty', text: 'No payouts recorded yet.' })
        ]));
        paintIcons();
    }

    function render() {
        if (editing) return renderForm(editing);
        if (settling) return renderSettle(settling);
        const list = readVehicles();
        const rows = list.map((v) => {
            const exp = expiringDocs(v);
            const paidTotal = (v.settlements || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
            const subParts = [v.regNo, v.kind === 'hired' ? `Hired${v.ownerName ? ` (${v.ownerName})` : ''}` : 'Own'];
            if (v.kind === 'hired' && paidTotal > 0) subParts.push(`Paid ${inr(paidTotal)}`);
            if (exp.length) subParts.push(exp.map((d) => `${d.label} ${d.expired ? 'expired' : `in ${d.daysLeft}d`}`).join(', '));
            return el('div', { class: 'tt-item wl-row' }, [
                el('div', { class: 'tt-row', style: 'cursor:pointer;', onclick: () => { editing = v; render(); } }, [
                    el('span', { class: `tt-avatar is-tool ca-av ${exp.length ? 'is-expense' : 'is-in'}`, 'aria-hidden': 'true' }, [icon('truck')]),
                    el('span', { class: 'tt-row-main' }, [
                        el('strong', { text: v.name }),
                        el('small', { text: subParts.filter(Boolean).join(' · ') })
                    ]),
                    exp.length ? pill(`${exp.length} alert`, 'is-warn') : pill(v.kind === 'hired' ? 'Hired' : 'Own', 'is-ok')
                ]),
                v.kind === 'hired' ? el('div', { style: 'padding:0 12px 10px;display:flex;justify-content:flex-end;' }, [
                    btn('Settlements', { kind: 'sec', onclick: () => { settling = v; render(); } })
                ]) : null
            ]);
        });
        sheet.body.replaceChildren(...[
            btn('+ Add Vehicle', { kind: 'pri', ic: 'plus', onclick: () => { editing = 'new'; render(); } }),
            list.length ? el('div', { class: 'tt-card', style: 'margin-top:10px;' }, [el('div', { class: 'tt-list' }, rows)])
                : el('p', { class: 'tt-empty', text: 'No vehicles added yet. Add your own rig or hired vehicles to track RC, insurance & payouts.' })
        ]);
        paintIcons();
    }
    render();
}
