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
                    date: item.billDate || this.toLocalYMD(new Date()),
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

    /** Discount given while recording payments on this bill (not money received). */
    getBillPaymentDiscount(item) {
        if (!item || !item.snapshot || (item.snapshot.docType || 'QUOTATION') !== 'INVOICE') return 0;
        return this.getBillPaymentEntries(item).reduce((sum, p) => sum + Math.max(0, Math.round(Number(p.discount) || 0)), 0);
    }

    /** "₹30,000 + ₹5,000 discount" style text for one payment entry. */
    describePaymentEntry(p) {
        const amt = Math.round(Number(p?.amount) || 0);
        const disc = Math.max(0, Math.round(Number(p?.discount) || 0));
        if (amt <= 0 && disc > 0) return `Discount ${this.formatINR(disc)}`;
        return disc > 0 ? `${this.formatINR(amt)} + ${this.formatINR(disc)} discount` : this.formatINR(amt);
    }

    syncBillPaymentSnapshot(item) {
        if (!item || !item.snapshot) return;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return;
        // Payment discounts lower the bill's final total (grandTotal). The total before them is
        // kept, so adding or removing a discounted payment always lands on the right figure.
        const prevDisc = Math.max(0, Math.round(Number(snap.paymentDiscount) || 0));
        const hasBase = snap.totalBeforePaymentDiscount !== undefined && snap.totalBeforePaymentDiscount !== null
            && Number.isFinite(Number(snap.totalBeforePaymentDiscount));
        const base = hasBase
            ? Math.round(Number(snap.totalBeforePaymentDiscount))
            : Math.round(Number(snap.grandTotal) || 0) + prevDisc;
        const disc = Math.min(this.getBillPaymentDiscount(item), Math.max(0, base));
        snap.totalBeforePaymentDiscount = base;
        snap.paymentDiscount = disc;
        snap.grandTotal = base - disc;
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
            dateInp.value = this.toLocalYMD(new Date());
        }

        const amtInp = document.getElementById('rpmAmountInput');
        if (amtInp) amtInp.value = '';
        const discInp = document.getElementById('rpmDiscountInput');
        if (discInp) discInp.value = '';
        const discWrap = document.getElementById('rpmDiscountWrap');
        if (discWrap) discWrap.hidden = true;
        const discToggle = document.getElementById('rpmDiscountToggleBtn');
        if (discToggle) discToggle.hidden = false;
        this.rpmAutoFull = false;

        this.renderRecordPaymentModalContent(item);
        this.updateRecordPaymentDiscountHint();
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
        const discNote = document.getElementById('rpmDiscountGivenNote');
        if (discNote) {
            const d = Math.round(Number(snap.paymentDiscount) || 0);
            discNote.hidden = d <= 0;
            discNote.textContent = d > 0 ? `Bill ${this.formatINR(snap.totalBeforePaymentDiscount || grand + d)} − ${this.formatINR(d)} discount = ${this.formatINR(grand)}` : '';
        }
        if (paidEl) paidEl.textContent = this.formatINR(paid);
        if (dueEl) {
            dueEl.textContent = hasDue ? this.formatINR(pending) : '₹0 (Paid)';
            dueEl.className = `cdm-pt-val ${hasDue ? 'text-danger' : 'text-green'}`;
        }
        if (dueBox) dueBox.classList.toggle('has-due', hasDue);
        // Fully paid: no more payments can be typed (remove one below to change it).
        const formCard = document.getElementById('rpmAddPaymentFormCard');
        if (formCard) formCard.hidden = !hasDue;
        const paidNote = document.getElementById('rpmPaidNote');
        if (paidNote) paidNote.hidden = hasDue;

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
                    <span class="rpm-hi-amt">${Math.round(Number(p.amount) || 0) > 0 ? this.formatINR(p.amount) : 'Discount'}${Number(p.discount) > 0 ? `<small class="rpm-hi-disc">${Math.round(Number(p.amount) || 0) > 0 ? '+ ' : ''}${this.formatINR(p.discount)}${Math.round(Number(p.amount) || 0) > 0 ? ' discount' : ''}</small>` : ''}</span>
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

        const dateVal = (document.getElementById('rpmDateInput')?.value || '').trim() || this.toLocalYMD(new Date());
        const amtInput = document.getElementById('rpmAmountInput');
        const discInput = document.getElementById('rpmDiscountInput');
        const rawAmt = Math.max(0, Math.round(parseFloat(amtInput?.value) || 0));
        const rawDisc = Math.max(0, Math.round(parseFloat(discInput?.value) || 0));
        if (rawAmt <= 0 && rawDisc <= 0) {
            this.showToast('⚠️ Enter payment amount (₹)');
            amtInput?.focus();
            return;
        }

        // Never record more than the bill's balance: a typo (an extra 0) used to be saved
        // as is, e.g. ₹9,99,999 on a ₹1,25,080 bill. Payment + discount count together.
        const pending = Math.round(this.getBillPendingAmount(item));
        if (pending <= 0) {
            this.showToast('✅ This bill is already fully paid');
            return;
        }
        if (rawAmt + rawDisc > pending) {
            this.showToast(rawDisc > 0
                ? `⚠️ ${this.formatINR(rawAmt)} + ${this.formatINR(rawDisc)} discount is more than the balance ${this.formatINR(pending)}`
                : `⚠️ ${this.formatINR(rawAmt)} is more than the balance ${this.formatINR(pending)}`);
            if (amtInput) {
                amtInput.value = String(Math.max(0, pending - rawDisc));
                amtInput.focus();
            }
            return;
        }

        const mode = rawAmt > 0 ? (document.querySelector('#rpmModePills .rpm-mode-pill.active')?.dataset.mode || 'Cash') : 'Discount';
        const entries = this.ensureBillPaymentsArray(item);
        const entry = {
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 100),
            date: dateVal,
            amount: rawAmt,
            mode
        };
        if (rawDisc > 0) entry.discount = rawDisc;
        entries.push(entry);

        this.syncBillPaymentSnapshot(item);
        this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);

        if (amtInput) amtInput.value = '';
        if (discInput) discInput.value = '';
        this.rpmAutoFull = false;
        this.updateRecordPaymentDiscountHint();

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }
        this.refreshLoadedBillAfterPaymentChange(item);

        this.showToast(rawAmt > 0
            ? `✅ Added ${this.formatINR(rawAmt)} ${mode}${rawDisc > 0 ? ` + ${this.formatINR(rawDisc)} discount` : ''} (${this.formatPaymentDateDisplay(dateVal)})`
            : `✅ Discount ${this.formatINR(rawDisc)} given (${this.formatPaymentDateDisplay(dateVal)})`);
    }

    /** The bill open in the editor follows its payments (paid amount and payment discount). */
    refreshLoadedBillAfterPaymentChange(item) {
        if (!item || this.loadedHistoryBillId !== item.id) return;
        const advEl = document.getElementById('advancePaidAmount');
        if (advEl) advEl.value = item.snapshot.advancePaidAmount > 0 ? item.snapshot.advancePaidAmount : '';
        this.state.paymentDiscount = Math.round(Number(item.snapshot.paymentDiscount) || 0);
        this.calculateAndRender();
    }

    /** Under the amount: "₹5,000 still left — give it as discount" when a part payment is typed. */
    updateRecordPaymentDiscountHint() {
        const hint = document.getElementById('rpmSettleBtn');
        if (!hint) return;
        const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
        const item = (this.history || []).find(h => h.id === billId);
        const pending = item ? Math.round(this.getBillPendingAmount(item)) : 0;
        const amt = Math.max(0, Math.round(parseFloat(document.getElementById('rpmAmountInput')?.value) || 0));
        const disc = Math.max(0, Math.round(parseFloat(document.getElementById('rpmDiscountInput')?.value) || 0));
        const left = pending - amt - disc;
        if (amt > 0 && left > 0) {
            hint.hidden = false;
            hint.dataset.left = String(left);
            hint.textContent = `${this.formatINR(left)} still left — give it as discount & close the bill`;
        } else {
            hint.hidden = true;
        }
        // Live check of what will be saved; the Add button only works when it adds up.
        const line = document.getElementById('rpmCheckLine');
        const saveBtn = document.getElementById('rpmSavePaymentBtn');
        const over = amt + disc > pending;
        const empty = amt + disc <= 0;
        if (line) {
            line.hidden = empty;
            line.classList.toggle('is-bad', over);
            line.classList.toggle('is-close', !over && left === 0);
            if (over) {
                line.textContent = `✕ ${this.formatINR(amt)}${disc ? ` + ${this.formatINR(disc)} discount` : ''} is more than the balance ${this.formatINR(pending)}`;
            } else if (!empty) {
                const parts = `${this.formatINR(amt)}${disc ? ` + ${this.formatINR(disc)} discount` : ''}`;
                line.textContent = left === 0 ? `✓ ${parts} = ${this.formatINR(pending)} · closes the bill` : `✓ ${parts} · ${this.formatINR(left)} will still be due`;
            }
        }
        if (saveBtn) saveBtn.disabled = over || empty;
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
        this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
        this.refreshLoadedBillAfterPaymentChange(item);

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }

        this.showUndoToast(`🗑️ Removed ${this.describePaymentEntry(removed)}`, () => {
            entries.splice(idx, 0, removed);
            this.syncBillPaymentSnapshot(item);
            this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);
            this.refreshLoadedBillAfterPaymentChange(item);
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
