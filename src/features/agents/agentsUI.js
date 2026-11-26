// Agents on the bill screen and the Agents book (Rig work tab). Logic: agentMath.js.
//
// Bill screen: when "Billed to" is Agent, an Agent name + mobile box shows under it (the
// Customer stays the site owner). Saving keeps the agent on the bill as `bill.agent`, outside
// the snapshot, so the customer's bill, PDF and WhatsApp text never show it.
//
// Agents book: one row per agent with billed / paid / due, their bills (tap = open the bill to
// record a payment), Call, and a WhatsApp statement of what is due.
import { billOnCurrentRig } from '../../cloud/access.js';
import { STORAGE_KEYS } from '../../data/storage.js';
import { el, openSheet, item, pill, avatar, seg } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { cleanAgent, agentsFromBills, knownAgents, agentStatement, isAgentBill } from './agentMath.js';
import { billDay, dueOf, totalOf } from '../report/reportMath.js';

const $ = (id) => document.getElementById(id);
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const niceDay = (d) => { const t = new Date(`${d}T00:00:00`); return isNaN(t) ? '' : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

export function initAgentBill(app) {
    const bar = $('billToTypeBar');
    if (!bar || !app) return;
    const listId = 'agentNameList';
    const datalist = el('datalist', { id: listId });
    const name = el('input', { type: 'text', id: 'agentNameInput', class: 'nb-agent-in', maxlength: '60', autocomplete: 'off', list: listId, placeholder: 'Agent name', 'aria-label': 'Agent name' });
    const phone = el('input', { type: 'tel', id: 'agentPhoneInput', class: 'nb-agent-in', maxlength: '15', inputmode: 'tel', autocomplete: 'off', placeholder: 'Agent mobile (optional)', 'aria-label': 'Agent mobile' });
    const box = el('div', { class: 'nb-agent-box', id: 'agentBox', hidden: true }, [
        el('small', { class: 'nb-agent-hint', text: 'Agent pays for this bore. The customer below is the site owner. Not printed on the bill.' }),
        el('div', { class: 'nb-agent-row' }, [name, phone]),
        datalist
    ]);
    bar.after(box);

    const isAgent = () => app.state?.billToType === 'agent';
    const readOnly = () => !!(app.loadedHistoryBillId && app.isSavedBillReadOnly);

    function fillList() {
        datalist.replaceChildren(...knownAgents(app.history).slice(0, 40).map((a) => el('option', { value: a.name, label: a.phone || '' })));
    }
    function sync() {
        box.hidden = !isAgent();
        if (box.hidden) return;
        if (document.activeElement !== name) name.value = app.state?.agentName || '';
        if (document.activeElement !== phone) phone.value = app.state?.agentPhone || '';
        name.disabled = phone.disabled = readOnly();
        document.querySelectorAll('#billToTypeBar .nb-billto-pill').forEach((b) => b.classList.toggle('active', b.dataset.billto === 'agent'));
    }
    name.addEventListener('focus', fillList);
    name.addEventListener('input', () => {
        app.state.agentName = name.value;
        // Picked a known agent: bring their mobile too.
        const hit = knownAgents(app.history).find((a) => a.name.toLowerCase() === name.value.trim().toLowerCase());
        if (hit && hit.phone && !phone.value.trim()) { phone.value = hit.phone; app.state.agentPhone = hit.phone; }
        app.persistCurrentSession?.();
    });
    phone.addEventListener('input', () => { app.state.agentPhone = phone.value; app.persistCurrentSession?.(); });
    bar.addEventListener('click', () => setTimeout(() => { sync(); if (isAgent() && !name.value) name.focus(); }, 0));

    // A fresh bill: no agent.
    for (const id of ['freshBillCtaBtn', 'freshBillQuickBtn', 'startFreshNewBillBtn']) {
        $(id)?.addEventListener('click', () => setTimeout(() => {
            if (app.state) { app.state.agentName = ''; app.state.agentPhone = ''; }
            name.value = ''; phone.value = '';
            sync();
        }, 0));
    }

    // Opening a saved bill: show its agent.
    const origLoad = app.loadBillFromHistory.bind(app);
    app.loadBillFromHistory = (id, ...rest) => {
        const out = origLoad(id, ...rest);
        const rec = (app.history || []).find((h) => h.id === id);
        if (rec && app.state) {
            const a = cleanAgent(rec.agent);
            app.state.billToType = a ? 'agent' : 'customer';
            app.state.agentName = a?.name || '';
            app.state.agentPhone = a?.phone || '';
            name.value = app.state.agentName;
            phone.value = app.state.agentPhone;
            document.querySelectorAll('#billToTypeBar .nb-billto-pill').forEach((b) => b.classList.toggle('active', b.dataset.billto === app.state.billToType));
            sync();
        }
        return out;
    };

    // Saving: an agent bill needs the agent's name; keep the agent on the bill record.
    const origSave = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = (...args) => {
        if (app.loadedHistoryBillId && app.isSavedBillReadOnly) return origSave(...args); // only unlocks editing
        const agent = isAgent() ? cleanAgent({ name: app.state?.agentName, phone: app.state?.agentPhone }) : null;
        if (isAgent() && !agent) {
            app.showToast?.('⚠️ Enter the agent’s name, or switch Billed to back to Customer.');
            box.hidden = false;
            name.focus();
            return undefined;
        }
        if (agent && !agent.phone && String(app.state?.agentPhone || '').replace(/\D/g, '').length > 0) {
            app.showToast?.('⚠️ Agent mobile looks short. Check it or leave it empty.');
            phone.focus();
            return undefined;
        }
        const before = (app.history || []).length;
        const beforeRef = app.loadedHistoryBillId ? (app.history || []).find((h) => h.id === app.loadedHistoryBillId) : null;
        const out = origSave(...args);
        Promise.resolve(out).then(() => {
            const idx = (app.history || []).findIndex((h) => h.id === app.loadedHistoryBillId);
            const saved = idx >= 0 && ((app.history.length > before) || app.history[idx] !== beforeRef);
            if (!saved) return;
            const cur = app.history[idx];
            const same = JSON.stringify(cleanAgent(cur.agent)) === JSON.stringify(agent);
            if (same && !(cur.agent && !agent)) return;
            const rec = { ...cur };
            if (agent) rec.agent = agent; else delete rec.agent;
            app.history[idx] = rec;
            app.saveToStorage(STORAGE_KEYS.history, app.history, []);
        }).catch(() => { /* the save itself reported its error */ });
        return out;
    };

    // Draw again whenever the bill changes.
    const origCalc = app.calculateAndRender.bind(app);
    app.calculateAndRender = (...a) => {
        const out = origCalc(...a);
        try { sync(); } catch { /* never break the bill */ }
        return out;
    };
    sync();
}

/** Rig work tile line: "3 agents · ₹1,20,000 due". */
export function agentsTileSummary(app) {
    const list = agentsFromBills((app.history || []).filter((b) => billOnCurrentRig(b)));
    if (!list.length) return 'Dealers who pay for bores · dues';
    const due = list.reduce((s, a) => s + a.due, 0);
    return `${list.length} agent${list.length === 1 ? '' : 's'}${due ? ` · ${inr(due)} due` : ' · all paid'}`;
}

export function openAgents(app) {
    let show = 'due';
    let q = '';
    const sheet = openSheet({ title: 'Agents', sub: 'Dealers and contractors who pay for bores', ic: 'handshake' });
    const openBill = (b) => {
        sheet.close();
        app.loadBillFromHistory(b.id, true, true);
    };

    function billRow(b) {
        const due = dueOf(b);
        return el('button', { type: 'button', class: 'tt-row ag-bill', onclick: () => openBill(b) }, [
            el('span', { class: 'tt-row-main' }, [
                el('strong', { text: `#${b.billNo || ''} · ${b.custName || 'Site owner'}` }),
                el('small', { text: [niceDay(billDay(b)), b.custLocation, `${Number(b.snapshot?.totalDepth) || 0} ft`, inr(totalOf(b))].filter(Boolean).join(' · ') })
            ]),
            due > 0 ? pill(`${inr(due)} due`, 'is-warn') : pill('Paid', 'is-ok'),
            el('span', { class: 'ag-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
        ]);
    }

    function agentBody(a) {
        const company = String(app.brand?.companyName || '').trim();
        const text = agentStatement(a, { company });
        const wa = a.phone ? `https://wa.me/${a.phone.length === 10 ? `91${a.phone}` : a.phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
        return [
            el('div', { class: 'tt-stats ag-stats' }, [
                el('div', {}, [el('small', { text: 'Billed' }), el('strong', { text: inr(a.billed) })]),
                el('div', {}, [el('small', { text: 'Paid' }), el('strong', { text: inr(a.paid) })]),
                el('div', {}, [el('small', { text: 'Due' }), el('strong', { class: a.due ? 'is-due' : '', text: inr(a.due) })]),
                el('div', {}, [el('small', { text: 'Oldest due' }), el('strong', { text: a.oldestDue ? niceDay(a.oldestDue) : '—' })])
            ]),
            el('div', { class: 'ag-acts' }, [
                a.phone ? el('a', { class: 'tt-btn', href: `tel:${a.phone}` }, [icon('phone'), el('span', { text: 'Call' })]) : null,
                el('a', { class: 'tt-btn is-pri', href: wa, target: '_blank', rel: 'noopener' }, [icon('message-circle'), el('span', { text: a.due ? 'Send dues on WhatsApp' : 'Send statement' })])
            ]),
            el('div', { class: 'tt-list ag-bills' }, a.bills.map(billRow)),
            el('p', { class: 'ca-note', text: 'Tap a bill to open it and record the payment the agent made.' })
        ];
    }

    function render() {
        const all = agentsFromBills((app.history || []).filter((b) => billOnCurrentRig(b)));
        const totalDue = all.reduce((s, a) => s + a.due, 0);
        const billed = all.reduce((s, a) => s + a.billed, 0);
        const search = el('input', { type: 'search', class: 'tt-input', placeholder: 'Search agent name or mobile', value: q, 'aria-label': 'Search agents' });
        search.addEventListener('input', () => { q = search.value; renderList(); });
        const listBox = el('div', {});
        function renderList() {
            const nd = q.trim().toLowerCase();
            const rows = all
                .filter((a) => show === 'all' || a.due > 0)
                .filter((a) => !nd || a.name.toLowerCase().includes(nd) || (nd.replace(/\D/g, '') && a.phone.includes(nd.replace(/\D/g, ''))));
            listBox.replaceChildren(rows.length
                ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, rows.map((a) => item({
                    avatar: avatar(a.name, a.due ? 'is-warn' : ''),
                    title: a.name,
                    subText: [a.phone, `${a.bills.length} bill${a.bills.length === 1 ? '' : 's'}`, a.last ? `last ${niceDay(a.last)}` : ''].filter(Boolean).join(' · '),
                    pill: a.due ? pill(`${inr(a.due)} due`, 'is-warn') : pill('Paid', 'is-ok'),
                    bodyKids: () => agentBody(a)
                })))])
                : el('p', { class: 'tt-empty', text: all.length ? (show === 'due' ? 'No agent owes you anything.' : 'No agent matches.') : 'No agent bills yet. On a Final Bill, set "Billed to" to Agent and enter the agent’s name.' }));
            paintIcons();
        }
        sheet.body.replaceChildren(...[
            el('div', { class: 'tt-card tt-stats' }, [
                el('div', {}, [el('small', { text: 'Agents' }), el('strong', { text: String(all.length) })]),
                el('div', {}, [el('small', { text: 'Due from agents' }), el('strong', { class: totalDue ? 'is-due' : '', text: inr(totalDue) })]),
                el('div', {}, [el('small', { text: 'Billed to agents' }), el('strong', { text: inr(billed) })]),
                el('div', {}, [el('small', { text: 'Agent bills unpaid' }), el('strong', { text: String(all.reduce((s, a) => s + a.unpaid, 0)) })])
            ]),
            seg('agShow', [{ key: 'due', label: `With dues (${all.filter((a) => a.due > 0).length})` }, { key: 'all', label: `All (${all.length})` }], show, (v) => { show = v; renderList(); }),
            all.length > 5 ? search : null,
            listBox,
            el('p', { class: 'ca-note', text: 'To bill an agent: on a Final Bill, set Billed to → Agent and type the agent’s name. The customer stays the site owner.' })
        ].filter(Boolean));
        renderList();
    }
    render();
}

export { isAgentBill };
