// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class PaymentsMixin {
    ensureBillPaymentsArray(item) {
        if (!item || !item.snapshot) return [];
        const snap = item.snapshot;
        if (!Array.isArray(item.payments)) {
            item.payments = [];
            const initAdv = Math.round(snap.initialAdvanceAmount ?? snap.advancePaidAmount ?? 0);
            if (snap.initialAdvanceAmount === undefined) {
                snap.initialAdvanceAmount = initAdv;
            }
            if (initAdv > 0) {
                item.payments.push({
                    id: 'adv_' + (item.id || Date.now()),
                    date: item.billDate || new Date().toISOString().split('T')[0],
                    amount: initAdv,
                    mode: 'Advance',
                    note: 'Initial Advance on Bill',
                    isAdvance: true
                });
            }
        }
        return item.payments;
    }

    getBillPaymentEntries(item) {
        if (!item || !item.snapshot) return [];
        return this.ensureBillPaymentsArray(item);
    }

    getBillPaidAmount(item) {
        if (!item || !item.snapshot) return 0;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') {
            return Math.round(snap.advancePaidAmount || 0);
        }
        const entries = this.getBillPaymentEntries(item);
        const totalPaid = entries.reduce((sum, p) => sum + (Math.round(Number(p.amount) || 0)), 0);
        return Math.max(0, totalPaid);
    }

    getBillPendingAmount(item) {
        if (!item || !item.snapshot) return 0;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return 0;
        const grand = Math.round(snap.grandTotal || 0);
        const paid = this.getBillPaidAmount(item);
        return Math.max(0, grand - paid);
    }

    isBillItemUnpaid(item) {
        return this.getBillPendingAmount(item) > 0;
    }

    syncBillPaymentSnapshot(item) {
        if (!item || !item.snapshot) return;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return;
        const paid = this.getBillPaidAmount(item);
        const pending = this.getBillPendingAmount(item);
        snap.advancePaidAmount = paid;
        snap.balancePayable = pending;
        item.paymentStatus = (pending <= 0 && (snap.grandTotal || 0) > 0) ? 'paid' : 'unpaid';
    }

    formatPaymentDateDisplay(ymdStr) {
        if (!ymdStr) return 'Date N/A';
        try {
            const parts = String(ymdStr).split('-');
            if (parts.length === 3) {
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                }
            }
            return ymdStr;
        } catch (e) {
            return ymdStr;
        }
    }

    openRecordPaymentModal(billId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item || !item.snapshot) return;
        const overlay = document.getElementById('recordPaymentModalOverlay');
        if (!overlay) return;

        this.activeRecordPayBillId = item.id;
        this.ensureBillPaymentsArray(item);
        this.syncBillPaymentSnapshot(item);

        const idInp = document.getElementById('rpmBillIdInput');
        if (idInp) idInp.value = item.id;

        const dateInp = document.getElementById('rpmDateInput');
        if (dateInp) {
            dateInp.value = new Date().toISOString().split('T')[0];
        }

        const amtInp = document.getElementById('rpmAmountInput');
        if (amtInp) amtInp.value = '';

        this.renderRecordPaymentModalContent(item);
        overlay.style.display = 'flex';
        this.refreshIcons();
        setTimeout(() => amtInp?.focus(), 80);
    }

    renderRecordPaymentModalContent(item) {
        if (!item || !item.snapshot) return;
        const snap = item.snapshot;
        const displayCust = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Direct Bill';
        const siteStr = item.custLocation || 'Site N/A';

        const subEl = document.getElementById('rpmSub');
        if (subEl) subEl.textContent = `#${item.billNo} • ${displayCust} (${siteStr})`;

        const grand = Math.round(snap.grandTotal || 0);
        const paid = this.getBillPaidAmount(item);
        const pending = this.getBillPendingAmount(item);
        const hasDue = pending > 0;

        const totEl = document.getElementById('rpmTotalBillVal');
        const paidEl = document.getElementById('rpmTotalPaidVal');
        const dueEl = document.getElementById('rpmBalanceDueVal');
        const dueBox = document.getElementById('rpmDueBox');
        if (totEl) totEl.textContent = this.formatINR(grand);
        if (paidEl) paidEl.textContent = this.formatINR(paid);
        if (dueEl) {
            dueEl.textContent = hasDue ? this.formatINR(pending) : '₹0 (Paid)';
            dueEl.className = `cdm-pt-val ${hasDue ? 'text-danger' : 'text-green'}`;
        }
        if (dueBox) dueBox.classList.toggle('has-due', hasDue);

        const fullBtn = document.getElementById('rpmFillFullBalanceBtn');
        if (fullBtn) {
            if (hasDue) {
                fullBtn.style.display = 'inline-flex';
                fullBtn.textContent = `Full Due: ${this.formatINR(pending)}`;
            } else {
                fullBtn.style.display = 'none';
            }
        }

        const entries = this.getBillPaymentEntries(item);
        const countBadge = document.getElementById('rpmHistoryCountBadge');
        if (countBadge) {
            countBadge.textContent = String(entries.length);
        }

        const listEl = document.getElementById('rpmHistoryList');
        if (!listEl) return;

        if (entries.length === 0) {
            listEl.innerHTML = `
                <div class="rpm-empty-msg">
                    No payments recorded yet. Select date &amp; enter amount above.
                </div>
            `;
            return;
        }

        listEl.innerHTML = entries.map((p, idx) => `
            <div class="rpm-hist-item">
                <div class="rpm-hi-date">
                    <span class="rpm-hi-idx">${idx + 1}.</span>
                    <span>📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                    ${p.mode ? `<span class="rpm-hi-mode">${this.escapeHtml(p.mode)}</span>` : ''}
                </div>
                <div class="rpm-hi-right">
                    <span class="rpm-hi-amt">${this.formatINR(p.amount)}</span>
                    <button type="button" class="rpm-hi-del-btn" data-payid="${p.id}" title="Remove">✕</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.rpm-hi-del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteBillPaymentEntry(item.id, btn.dataset.payid);
            });
        });
    }

    saveNewBillPaymentRecord() {
        const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
        const item = (this.history || []).find(h => h.id === billId);
        if (!item) return;

        const dateVal = (document.getElementById('rpmDateInput')?.value || '').trim() || new Date().toISOString().split('T')[0];
        const amtInput = document.getElementById('rpmAmountInput');
        const rawAmt = Math.round(parseFloat(amtInput?.value) || 0);
        if (rawAmt <= 0) {
            this.showToast('⚠️ Enter payment amount (₹)');
            amtInput?.focus();
            return;
        }

        // Never record more than the bill's balance: a typo (an extra 0) used to be saved
        // as is, e.g. ₹9,99,999 on a ₹1,25,080 bill.
        const pending = Math.round(this.getBillPendingAmount(item));
        if (pending <= 0) {
            this.showToast('✅ This bill is already fully paid');
            return;
        }
        if (rawAmt > pending) {
            this.showToast(`⚠️ ${this.formatINR(rawAmt)} is more than the balance ${this.formatINR(pending)}`);
            if (amtInput) {
                amtInput.value = String(pending);
                amtInput.focus();
            }
            return;
        }

        const mode = document.querySelector('#rpmModePills .rpm-mode-pill.active')?.dataset.mode || 'Cash';
        const entries = this.ensureBillPaymentsArray(item);
        entries.push({
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 100),
            date: dateVal,
            amount: rawAmt,
            mode
        });

        this.syncBillPaymentSnapshot(item);
        this.saveToStorage(STORAGE_KEYS.history, this.history);

        if (amtInput) amtInput.value = '';

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }
        if (this.loadedHistoryBillId === item.id) {
            const advEl = document.getElementById('advancePaidAmount');
            if (advEl) advEl.value = item.snapshot.advancePaidAmount > 0 ? item.snapshot.advancePaidAmount : '';
            this.calculateAndRender();
        }

        this.showToast(`✅ Added ${this.formatINR(rawAmt)} ${mode} (${this.formatPaymentDateDisplay(dateVal)})`);
    }

    deleteBillPaymentEntry(billId, payId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item) return;
        const entries = this.ensureBillPaymentsArray(item);
        const idx = entries.findIndex(p => p.id === payId);
        if (idx === -1) return;

        const removed = entries[idx];
        entries.splice(idx, 1);
        if (removed.isAdvance && item.snapshot) {
            item.snapshot.initialAdvanceAmount = 0;
        }
        this.syncBillPaymentSnapshot(item);
        this.saveToStorage(STORAGE_KEYS.history, this.history);

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }

        this.showUndoToast(`🗑️ Removed payment ${this.formatINR(removed.amount)}`, () => {
            entries.splice(idx, 0, removed);
            this.syncBillPaymentSnapshot(item);
            this.saveToStorage(STORAGE_KEYS.history, this.history);
            this.renderRecordPaymentModalContent(item);
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
                this.openBillDetailModal(item.id);
            }
            if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
                this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
            }
        });
    }

    closeRecordPaymentModal() {
        const overlay = document.getElementById('recordPaymentModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeRecordPayBillId = null;
    }
}
