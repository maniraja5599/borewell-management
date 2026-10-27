// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class BillDetailMixin {
    openBillDetailModal(billId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item || !item.snapshot) return;
        const overlay = document.getElementById('billDetailModalOverlay');
        const bodyEl = document.getElementById('bdmBodyContent');
        const footEl = document.getElementById('bdmFooterActions');
        if (!overlay || !bodyEl || !footEl) return;

        this.activeDetailBillId = item.id;
        const snap = item.snapshot;
        const isInvoice = (snap.docType || 'QUOTATION') === 'INVOICE';
        const displayCust = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Direct Bill';
        const dateStr = this.getHistoryItemDateStr(item) || 'N/A';
        const siteName = item.custLocation || 'Site N/A';
        const phoneStr = this.formatPhoneWithCountryCode(item.custPhone || '');

        const avatarEl = document.getElementById('bdmAvatar');
        const titleEl = document.getElementById('bdmTitle');
        const subEl = document.getElementById('bdmSub');
        if (avatarEl) avatarEl.textContent = this.getInitials(displayCust);
        if (titleEl) titleEl.textContent = `${isInvoice ? 'Bill' : 'Quotation'} #${item.billNo} — ${displayCust}`;
        if (subEl) subEl.textContent = `📍 ${siteName}${phoneStr ? ` • 📞 ${phoneStr}` : ''} • 📅 ${dateStr}`;

        const isRepair = snap.drillingType === 'repair';
        const workTypeLabel = isRepair ? `Re-Bore (${snap.boreDia || '6.5"'})` : `New Bore (${snap.boreDia || '6.5"'})`;
        const depthFt = Number(snap.totalDepth || 0);
        const oldBoreFt = Number(snap.oldBoreDepth || 0);
        const drillCost = Math.round(snap.drillingCost || 0);

        const pvc7Ft = Number(snap.pvc7Length || 0);
        const pvc10Ft = Number(snap.pvc10Length || 0);
        const totalPipeFt = pvc7Ft + pvc10Ft;
        const pvc7Rate = snap.pvc7Rate || this.rates.pvc7Rate || 400;
        const pvc10Rate = snap.pvc10Rate || this.rates.pvc10Rate || 700;
        const pvc7Cost = Math.round(snap.pvc7Cost || (pvc7Ft * pvc7Rate));
        const pvc10Cost = Math.round(snap.pvc10Cost || (pvc10Ft * pvc10Rate));
        const totalPipeCost = pvc7Cost + pvc10Cost;

        const bataCost = Math.round(snap.boreBataCost || 0);
        const collarCost = Math.round(snap.collarCapCost || 0);
        const transportCost = Math.round(snap.transportSurveyCost || 0);
        const customExtraCost = Math.round(snap.customExtraAmount || 0);
        const customExtraLbl = (snap.customExtraLabel || 'Other Extra').trim();
        const extrasTotal = bataCost + collarCost + transportCost + customExtraCost;

        const extrasParts = [];
        if (bataCost > 0) extrasParts.push(`Bata: ${this.formatINR(bataCost)}`);
        if (collarCost > 0) extrasParts.push(`Collar: ${this.formatINR(collarCost)}`);
        if (transportCost > 0) extrasParts.push(`Transport: ${this.formatINR(transportCost)}`);
        if (customExtraCost > 0) extrasParts.push(`${this.escapeHtml(customExtraLbl)}: ${this.formatINR(customExtraCost)}`);

        const discountAmt = Math.round(snap.discountAmount || 0);
        const gstAmt = Math.round(snap.gstAmount || 0);
        const grandTotal = Math.round(snap.grandTotal || 0);
        const paidAmt = this.getBillPaidAmount(item);
        const pendingAmt = this.getBillPendingAmount(item);
        const hasDue = pendingAmt > 0;
        const payEntries = this.getBillPaymentEntries(item);
        const slabRows = Array.isArray(snap.slabDetails) ? snap.slabDetails : [];

        bodyEl.innerHTML = `
            <div class="cdm-bore-card ${isInvoice ? (hasDue ? 'is-unpaid-bore' : 'is-paid-bore') : 'is-quote-bore'}" style="margin-bottom:0;">
                <div class="cbc-head">
                    <div class="cbc-head-left">
                        <span class="cbc-bore-num-badge ${isInvoice ? '' : 'quote-badge'}">
                            ${isInvoice ? '🧾 FINAL BILL' : '📋 QUOTATION'}
                        </span>
                        <span class="cbc-bill-no">#${this.escapeHtml(item.billNo || '')}</span>
                        <span class="cbc-date">📅 ${dateStr}</span>
                    </div>
                    <div class="cbc-head-right">
                        ${isInvoice
                            ? (hasDue
                                ? `<span class="status-pill due static-badge">Due: ${this.formatINR(pendingAmt)}</span>`
                                : `<span class="status-pill paid static-badge">✅ Paid</span>`)
                            : `<span class="status-pill quote static-badge">📋 Quotation</span>`
                        }
                    </div>
                </div>

                <div class="cbc-clean-rows">
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Customer</span>
                        <span class="cbc-r-val">${this.escapeHtml(displayCust)}${phoneStr ? ` <small>(${this.escapeHtml(phoneStr)})</small>` : ''}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Site Location</span>
                        <span class="cbc-r-val">${this.escapeHtml(siteName)}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Bore Type &amp; Rate</span>
                        <span class="cbc-r-val">${workTypeLabel} <small>(Base ₹${snap.baseDrillingRate || 90}/ft)</small></span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Depth Drilled</span>
                        <span class="cbc-r-val">
                            ${depthFt.toLocaleString('en-IN')} ft
                            ${isRepair && oldBoreFt > 0 ? `<small>(Flush ${oldBoreFt} ft)</small>` : ''}
                            • <strong class="text-brand">${this.formatINR(drillCost)}</strong>
                        </span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">7" Casing Pipe</span>
                        <span class="cbc-r-val">${pvc7Ft} ft <small>(@ ₹${pvc7Rate}/ft)</small> • <strong>${this.formatINR(pvc7Cost)}</strong></span>
                    </div>
                    ${pvc10Ft > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">10" Casing Pipe</span>
                        <span class="cbc-r-val">${pvc10Ft} ft <small>(@ ₹${pvc10Rate}/ft)</small> • <strong>${this.formatINR(pvc10Cost)}</strong></span>
                    </div>
                    ` : ''}
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Total Casing</span>
                        <span class="cbc-r-val">${totalPipeFt.toLocaleString('en-IN')} ft • <strong class="text-brand">${this.formatINR(totalPipeCost)}</strong></span>
                    </div>
                    ${extrasTotal > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Bata &amp; Extras</span>
                        <span class="cbc-r-val"><small>${extrasParts.join(', ')}</small> • <strong>${this.formatINR(extrasTotal)}</strong></span>
                    </div>
                    ` : ''}
                    ${discountAmt > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Discount</span>
                        <span class="cbc-r-val text-green">−${this.formatINR(discountAmt)}</span>
                    </div>
                    ` : ''}
                    ${gstAmt > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">GST</span>
                        <span class="cbc-r-val">+${this.formatINR(gstAmt)}</span>
                    </div>
                    ` : ''}
                    <div class="cbc-row highlight-row">
                        <span class="cbc-r-lbl">${isInvoice ? 'Total Bill Amount' : 'Estimated Total'}</span>
                        <span class="cbc-r-val" style="font-size: 0.92rem;">${this.formatINR(grandTotal)}</span>
                    </div>
                    ${isInvoice ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Paid Amount</span>
                        <span class="cbc-r-val text-green">${this.formatINR(paidAmt)}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">Balance Due</span>
                        <span class="cbc-r-val ${hasDue ? 'text-danger' : 'text-green'}">${hasDue ? this.formatINR(pendingAmt) : '₹0 (Settled)'}</span>
                    </div>
                    ` : ''}
                </div>

                ${isInvoice ? `
                <div class="cbc-pay-history-box">
                    <div class="cphb-head">
                        <span>💳 Payments (${payEntries.length})</span>
                        <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''}" id="bdmInlineRecordPayBtn">
                            ${hasDue ? '＋ Add Payment' : 'Edit Payments'}
                        </button>
                    </div>
                    <div class="cphb-rows">
                        ${payEntries.length > 0
                            ? payEntries.map((p, idx) => `
                                <div class="cphb-row">
                                    <span class="cphb-r-left">${idx + 1}. 📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                                    <span class="cphb-r-amt">${this.formatINR(p.amount)}</span>
                                </div>
                            `).join('')
                            : `<div style="padding:8px 0; color:#64748b; font-size:0.74rem; font-weight:600;">No payment recorded yet.</div>`
                        }
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        footEl.innerHTML = `
            <div class="bdm-foot-left">
                ${isInvoice ? `
                    <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''}" id="bdmFootRecordPayBtn">
                        ${hasDue ? '＋ Payment' : 'Payments'}
                    </button>
                ` : ''}
                <button type="button" class="btn-wa-xs" id="bdmFootWaBtn">💬 WhatsApp</button>
            </div>
            <div class="bdm-foot-right">
                <button type="button" class="btn-secondary-sm" id="bdmFootEditBtn">✏️ Edit</button>
                <button type="button" class="btn-brand-sm" id="bdmFootReceiptBtn">🧾 Receipt / PDF</button>
            </div>
        `;

        document.getElementById('bdmInlineRecordPayBtn')?.addEventListener('click', () => {
            this.openRecordPaymentModal(item.id);
        });
        document.getElementById('bdmFootRecordPayBtn')?.addEventListener('click', () => {
            this.openRecordPaymentModal(item.id);
        });
        document.getElementById('bdmFootWaBtn')?.addEventListener('click', () => {
            this.shareSavedHistoryBillOnWhatsApp(item.id);
        });
        document.getElementById('bdmFootEditBtn')?.addEventListener('click', () => {
            this.closeBillDetailModal();
            this.loadBillFromHistory(item.id, false, true);
        });
        document.getElementById('bdmFootReceiptBtn')?.addEventListener('click', () => {
            this.closeBillDetailModal();
            this.loadBillFromHistory(item.id, true, true);
        });

        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeBillDetailModal() {
        const overlay = document.getElementById('billDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailBillId = null;
    }
}
