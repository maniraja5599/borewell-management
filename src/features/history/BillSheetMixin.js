// One clean layout for a saved bill, used by the bill popup (Bills page) and by each bore in the
// customer popup, so both always show the same lines and the same totals.
// Numbers come from the saved snapshot + payments (PaymentsMixin), never recomputed here.
import { currentUser } from '../../cloud/access.js';

export class BillSheetMixin {
    /** Status of a saved bill: { kind: 'paid' | 'due' | 'quote', label } */
    billSheetStatus(item) {
        const snap = item?.snapshot || {};
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return { kind: 'quote', label: 'Quotation' };
        const due = this.getBillPendingAmount(item);
        return due > 0 ? { kind: 'due', label: `Due ${this.formatINR(due)}` } : { kind: 'paid', label: 'Paid' };
    }

    /** "New bore · 6.5" · 450 ft" */
    billSheetWorkLine(snap) {
        const type = snap.drillingType === 'repair' ? 'Re-bore' : 'New bore';
        const depth = Number(snap.totalDepth || 0);
        return `${type} · ${snap.boreDia || '6.5"'}${depth > 0 ? ` · ${depth.toLocaleString('en-IN')} ft` : ''}`;
    }

    /** Charge lines of a saved bill, in bill order. Each: { label, detail, amount, kind } */
    billSheetLines(snap) {
        const lines = [];
        const n = (v) => Math.round(Number(v) || 0);
        const slabs = Array.isArray(snap.slabDetails) ? snap.slabDetails : [];
        const drillRates = slabs.filter((s) => s.slabIndex !== -1).map((s) => Number(s.rate) || 0).filter(Boolean);
        const flush = slabs.find((s) => s.slabIndex === -1);
        const rateTxt = drillRates.length
            ? (Math.min(...drillRates) === Math.max(...drillRates) ? `₹${Math.min(...drillRates)}/ft` : `₹${Math.min(...drillRates)}–₹${Math.max(...drillRates)}/ft`)
            : '';
        const depth = Number(snap.totalDepth || 0);
        if (n(snap.drillingCost) > 0 || depth > 0) {
            const parts = [];
            if (depth > 0) parts.push(`${depth.toLocaleString('en-IN')} ft`);
            if (flush) parts.push(`flush ${flush.depth} ft × ₹${flush.rate}`);
            if (rateTxt) parts.push(rateTxt);
            lines.push({ label: 'Drilling', detail: parts.join(' · '), amount: n(snap.drillingCost), slabs });
        }
        const pipe = (len, rate, cost, name) => {
            if (Number(len) > 0) lines.push({ label: name, detail: `${len} ft × ₹${rate}/ft`, amount: n(cost || len * rate) });
        };
        pipe(snap.pvc7Length, snap.pvc7Rate || this.rates?.pvc7Rate || 400, snap.pvc7Cost, this.getCasing1Name?.() || '7" casing pipe');
        pipe(snap.pvc10Length, snap.pvc10Rate || this.rates?.pvc10Rate || 700, snap.pvc10Cost, this.getCasing2Name?.() || '10" casing pipe');
        (snap.extraItems || []).forEach((it) => {
            const qty = Number(it.qty) || 0;
            lines.push({ label: it.name || 'Other item', detail: qty > 0 ? `${qty} ${it.unit} × ₹${Number(it.rate).toLocaleString('en-IN')}/${it.unit}` : '', amount: n(it.amount) });
        });
        if (n(snap.boreBataCost) > 0) lines.push({ label: 'Bore bata', detail: '', amount: n(snap.boreBataCost) });
        if (n(snap.collarCapCost) > 0) lines.push({ label: 'Collar / cap / welding', detail: '', amount: n(snap.collarCapCost) });
        if (n(snap.transportSurveyCost) > 0) lines.push({ label: 'Transport / survey', detail: '', amount: n(snap.transportSurveyCost) });
        if (n(snap.customExtraAmount) > 0) lines.push({ label: (snap.customExtraLabel || 'Extra charges').trim(), detail: '', amount: n(snap.customExtraAmount) });
        if (n(snap.discountAmount) > 0) lines.push({ label: 'Discount', detail: '', amount: -n(snap.discountAmount), kind: 'minus' });
        if (n(snap.gstAmount) > 0) lines.push({ label: `GST (${snap.gstPercentage || 18}%)`, detail: snap.custGst ? `Client GSTIN ${snap.custGst}` : '', amount: n(snap.gstAmount), kind: 'plus' });
        if (n(snap.paymentDiscount) > 0) lines.push({ label: 'Discount on payment', detail: '', amount: -n(snap.paymentDiscount), kind: 'minus' });
        return lines;
    }

    /**
     * The sheet: total + paid/due bar, work line, charge lines, payments.
     * opts.payButtonClass: class for the "+ Add payment" button (wired by the caller).
     */
    billSheetHtml(item, { payButtonClass = 'bs-pay-btn', siteName = '', nested = false } = {}) {
        const snap = item?.snapshot || {};
        const esc = (s) => this.escapeHtml(String(s ?? ''));
        const st = this.billSheetStatus(item);
        const isInvoice = st.kind !== 'quote';
        const total = Math.round(Number(snap.grandTotal) || 0);
        const paid = isInvoice ? this.getBillPaidAmount(item) : 0;
        const due = isInvoice ? this.getBillPendingAmount(item) : 0;
        const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((paid / total) * 100))) : 0;
        const site = siteName || item.custLocation || '';

        const lines = this.billSheetLines(snap).map((l) => {
            const amt = l.amount < 0 ? `−${this.formatINR(-l.amount)}` : (l.kind === 'plus' ? `+${this.formatINR(l.amount)}` : this.formatINR(l.amount));
            const slabs = Array.isArray(l.slabs) && l.slabs.length > 1
                ? `<details class="bs-slabs"><summary>${l.slabs.length} slabs</summary>${l.slabs.map((s) =>
                    `<div class="bs-slab"><span>${esc(s.slabIndex === -1 ? 'Flushing' : s.range)}</span><span>${s.depth} ft × ₹${s.rate}</span><strong>${this.formatINR(s.cost)}</strong></div>`).join('')}</details>`
                : '';
            return `<div class="bs-line${l.amount < 0 ? ' is-minus' : ''}">
                <div class="bs-l-main"><span class="bs-l-lbl">${esc(l.label)}</span>${l.detail ? `<span class="bs-l-det">${esc(l.detail)}</span>` : ''}${slabs}</div>
                <strong class="bs-l-amt">${amt}</strong>
            </div>`;
        }).join('');

        const pays = isInvoice ? this.getBillPaymentEntries(item) : [];
        const payRows = pays.map((p) => {
            const amt = Math.round(Number(p.amount) || 0);
            const disc = Math.max(0, Math.round(Number(p.discount) || 0));
            const mode = p.isAdvance || p.mode === 'Advance' ? 'Advance' : (p.mode || 'Cash');
            return `<div class="bs-pay">
                <div class="bs-p-left"><span class="bs-p-date">${esc(this.formatPaymentDateDisplay(p.date))}</span><span class="bs-p-mode">${esc(mode)}</span></div>
                <div class="bs-p-right">${amt > 0 ? `<strong>${this.formatINR(amt)}</strong>` : '<strong class="bs-p-zero">Discount</strong>'}${disc > 0 ? `<small>${amt > 0 ? '+ ' : ''}${this.formatINR(disc)}${amt > 0 ? ' discount' : ''}</small>` : ''}</div>
            </div>`;
        }).join('');

        return `
        <div class="bill-sheet is-${st.kind}${nested ? ' is-nested' : ''}">
            <div class="bs-hero">
                <div class="bs-hero-top">
                    <span class="bs-doc">${isInvoice ? 'Final bill' : 'Quotation'} · #${esc(item.billNo || '')}</span>
                    <span class="bs-status is-${st.kind}">${esc(st.label)}</span>
                </div>
                <div class="bs-total-row">
                    <span class="bs-total">${this.formatINR(total)}</span>
                    <span class="bs-total-lbl">${isInvoice ? 'Bill total' : 'Estimate'}</span>
                </div>
                ${isInvoice ? `
                <div class="bs-bar" role="img" aria-label="Received ${this.formatINR(paid)} of ${this.formatINR(total)}"><i style="width:${pct}%"></i></div>
                <div class="bs-trio">
                    <div><span>Received</span><strong class="is-paid">${this.formatINR(paid)}</strong></div>
                    <div><span>${due > 0 ? 'Still due' : 'Balance'}</span><strong class="${due > 0 ? 'is-due' : 'is-paid'}">${due > 0 ? this.formatINR(due) : '₹0 · Settled'}</strong></div>
                </div>` : ''}
            </div>
            <div class="bs-work">
                <span class="bs-w-chip">${esc(this.billSheetWorkLine(snap))}</span>
                ${site ? `<span class="bs-w-chip is-site">📍 ${esc(site)}</span>` : ''}
                ${this.getHistoryItemDateStr(item) ? `<span class="bs-w-chip is-date">${esc(this.formatPaymentDateDisplay(this.getHistoryItemDateStr(item)))}</span>` : ''}
                ${item.createdBy?.name && item.createdBy.id !== currentUser()?.id ? `<span class="bs-w-chip is-maker">👤 Made by ${esc(item.createdBy.name)}</span>` : ''}
            </div>
            <div class="bs-section">
                <div class="bs-sec-head">Charges</div>
                ${lines || '<div class="bs-empty">No charges</div>'}
                <div class="bs-line bs-grand"><div class="bs-l-main"><span class="bs-l-lbl">${isInvoice ? 'Total' : 'Estimated total'}</span></div><strong class="bs-l-amt">${this.formatINR(total)}</strong></div>
            </div>
            ${isInvoice ? `
            <div class="bs-section">
                <div class="bs-sec-head">
                    <span>Payments${pays.length ? ` (${pays.length})` : ''}</span>
                    <button type="button" class="bs-add-pay ${payButtonClass}${due > 0 ? ' has-due' : ''}" data-id="${esc(item.id)}">${due > 0 ? '+ Add payment' : 'Edit payments'}</button>
                </div>
                ${payRows || '<div class="bs-empty">No payment yet</div>'}
            </div>` : ''}
        </div>`;
    }
}
