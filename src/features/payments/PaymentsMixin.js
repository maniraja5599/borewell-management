// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';
import { can, currentUser, isOwnerOrLocal } from '../../cloud/access.js';
import { paymentEditCheck, paymentEditSettings } from './paymentEditRules.js';

export class PaymentsMixin {
    /** May the person on this phone change this saved payment now? (paymentEditRules.js) */
    paymentEditCheckFor(p) {
        return paymentEditCheck(p, { owner: isOwnerOrLocal(), bills: can('bills') }, this.brand);
    }

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

    /** Money received above the bill total (the bill was made smaller after it was paid). */
    getBillOverpaidAmount(item) {
        if (!item || !item.snapshot || (item.snapshot.docType || 'QUOTATION') !== 'INVOICE') return 0;
        return Math.max(0, this.getBillPaidAmount(item) - Math.round(item.snapshot.grandTotal || 0));
    }

    /**
     * How much payment + discount can still go on the bill. While a payment is being edited
     * (exceptPayId), that payment's own amount and discount are free again.
     */
    getRecordPaymentRoom(item, exceptPayId = null) {
        if (!item || !item.snapshot) return 0;
        if (!exceptPayId) return Math.round(this.getBillPendingAmount(item));
        const snap = item.snapshot;
        const hasBase = snap.totalBeforePaymentDiscount !== undefined && snap.totalBeforePaymentDiscount !== null
            && Number.isFinite(Number(snap.totalBeforePaymentDiscount));
        const base = hasBase
            ? Math.round(Number(snap.totalBeforePaymentDiscount))
            : Math.round(Number(snap.grandTotal) || 0) + Math.max(0, Math.round(Number(snap.paymentDiscount) || 0));
        const others = this.getBillPaymentEntries(item).filter((p) => p.id !== exceptPayId);
        const used = others.reduce((sum, p) => sum + Math.round(Number(p.amount) || 0) + Math.max(0, Math.round(Number(p.discount) || 0)), 0);
        return Math.max(0, base - used);
    }

    /** Remember a removed payment, so another phone's copy never brings it back on sync. */
    markBillPaymentRemoved(item, payId) {
        if (!item || payId === undefined || payId === null) return;
        const list = Array.isArray(item.removedPaymentIds) ? item.removedPaymentIds : [];
        if (!list.includes(payId)) list.push(payId);
        item.removedPaymentIds = list;
    }

    unmarkBillPaymentRemoved(item, payId) {
        if (!item || !Array.isArray(item.removedPaymentIds)) return;
        item.removedPaymentIds = item.removedPaymentIds.filter((id) => id !== payId);
        if (!item.removedPaymentIds.length) delete item.removedPaymentIds;
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
        // Same rule as the Bills list (isBillItemUnpaid): nothing due = paid, also for a ₹0 bill.
        item.paymentStatus = pending <= 0 ? 'paid' : 'unpaid';
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
        // Office staff without "bills" only look at bills (the server would refuse the payment).
        if (!can('bills')) { this.showToast?.('🔒 Ask the owner for "Make bills & take payments" to record payments.'); return; }
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
        this.rpmEditingPayId = null;
        this.resetRecordPaymentModePills();
        this.setRecordPaymentFormMode(null);

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
        const over = this.getBillOverpaidAmount(item);
        if (paidEl) paidEl.textContent = this.formatINR(paid);
        if (dueEl) {
            dueEl.textContent = hasDue ? this.formatINR(pending) : (over > 0 ? `${this.formatINR(over)} extra` : '₹0 (Paid)');
            dueEl.className = `cdm-pt-val ${hasDue || over > 0 ? 'text-danger' : 'text-green'}`;
        }
        if (dueBox) dueBox.classList.toggle('has-due', hasDue || over > 0);
        const overNote = document.getElementById('rpmOverpaidNote');
        if (overNote) {
            overNote.hidden = over <= 0;
            overNote.textContent = over > 0
                ? `⚠️ Received ${this.formatINR(over)} more than the bill total. Edit a payment below, or give ${this.formatINR(over)} back to the customer.`
                : '';
        }
        // Fully paid: no new payment can be typed, but any payment below can still be edited (✏️).
        const editing = Boolean(this.rpmEditingPayId);
        const formCard = document.getElementById('rpmAddPaymentFormCard');
        if (formCard) formCard.hidden = !hasDue && !editing;
        const paidNote = document.getElementById('rpmPaidNote');
        if (paidNote) {
            paidNote.hidden = hasDue || editing || over > 0;
            const help = paidNote.querySelector('span');
            if (help) {
                const anyEditable = this.getBillPaymentEntries(item).some((p) => this.paymentEditCheckFor(p).ok);
                help.textContent = anyEditable
                    ? 'Nothing more to collect on this bill. To change a payment, tap ✏️ next to it below.'
                    : 'Nothing more to collect on this bill. Only the owner can change these payments now.';
            }
        }

        const fullBtn = document.getElementById('rpmFillFullBalanceBtn');
        const room = this.getRecordPaymentRoom(item, this.rpmEditingPayId);
        if (fullBtn) {
            if (room > 0) {
                fullBtn.style.display = 'inline-flex';
                fullBtn.textContent = `Full Due: ${this.formatINR(room)}`;
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

        const staffHours = isOwnerOrLocal() ? null : paymentEditSettings(this.brand).hours;
        listEl.innerHTML = entries.map((p, idx) => {
            const ed = this.paymentEditCheckFor(p);
            // Staff see until when they can still change it ("✏️ till 5:30 PM").
            const till = ed.ok && ed.until && staffHours
                ? new Date(ed.until).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
                : '';
            return `
            <div class="rpm-hist-item${p.id === this.rpmEditingPayId ? ' is-editing' : ''}">
                <div class="rpm-hi-date">
                    <span class="rpm-hi-idx">${idx + 1}.</span>
                    <span>📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                    ${p.mode ? `<span class="rpm-hi-mode">${this.escapeHtml(p.mode)}</span>` : ''}
                    ${till ? `<small class="rpm-hi-till">✏️ till ${this.escapeHtml(till)}</small>` : ''}
                </div>
                <div class="rpm-hi-right">
                    <span class="rpm-hi-amt">${Math.round(Number(p.amount) || 0) > 0 ? this.formatINR(p.amount) : 'Discount'}${Number(p.discount) > 0 ? `<small class="rpm-hi-disc">${Math.round(Number(p.amount) || 0) > 0 ? '+ ' : ''}${this.formatINR(p.discount)}${Math.round(Number(p.amount) || 0) > 0 ? ' discount' : ''}</small>` : ''}</span>
                    <span class="rpm-hi-acts">${ed.ok ? `<button type="button" class="rpm-hi-edit-btn" data-payid="${this.escapeHtml(String(p.id))}" title="${till ? `Edit (till ${this.escapeHtml(till)})` : 'Edit'}" aria-label="Edit payment ${idx + 1}">✏️</button>` : ''}
                    <button type="button" class="rpm-hi-del-btn" data-payid="${this.escapeHtml(String(p.id))}" title="Remove" aria-label="Remove payment ${idx + 1}">✕</button></span>
                </div>
            </div>
        `;
        }).join('');

        listEl.querySelectorAll('.rpm-hi-del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteBillPaymentEntry(item.id, btn.dataset.payid);
            });
        });
        listEl.querySelectorAll('.rpm-hi-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.startEditBillPaymentEntry(item.id, btn.dataset.payid);
            });
        });
    }

    /** Form title / button text for adding (entry = null) or editing one payment. */
    setRecordPaymentFormMode(entry, idx = 0) {
        const title = document.getElementById('rpmFormTitle');
        if (title) title.textContent = entry ? `Edit payment ${idx + 1}` : 'Add Payment';
        const saveTxt = document.querySelector('#rpmSavePaymentBtn span');
        if (saveTxt) saveTxt.textContent = entry ? 'Save change' : 'Add Payment';
        const cancel = document.getElementById('rpmCancelEditBtn');
        if (cancel) cancel.hidden = !entry;
    }

    resetRecordPaymentModePills() {
        document.querySelectorAll('#rpmModePills .rpm-mode-pill').forEach(pill => {
            const on = pill.dataset.mode === 'Cash';
            pill.classList.toggle('active', on);
            pill.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    }

    /** Empty form for a new payment (after a save, or when editing is cancelled). */
    clearRecordPaymentForm() {
        this.rpmEditingPayId = null;
        this.rpmAutoFull = false;
        const amtInp = document.getElementById('rpmAmountInput');
        if (amtInp) amtInp.value = '';
        const discInp = document.getElementById('rpmDiscountInput');
        if (discInp) discInp.value = '';
        const discWrap = document.getElementById('rpmDiscountWrap');
        if (discWrap) discWrap.hidden = true;
        const discToggle = document.getElementById('rpmDiscountToggleBtn');
        if (discToggle) discToggle.hidden = false;
        const dateInp = document.getElementById('rpmDateInput');
        if (dateInp) dateInp.value = this.toLocalYMD(new Date());
        this.resetRecordPaymentModePills();
        this.setRecordPaymentFormMode(null);
    }

    /** Put one saved payment in the form so its amount, date, mode or discount can be fixed. */
    startEditBillPaymentEntry(billId, payId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item) return;
        const entries = this.getBillPaymentEntries(item);
        const idx = entries.findIndex(p => String(p.id) === String(payId));
        if (idx === -1) return;
        const p = entries[idx];
        const check = this.paymentEditCheckFor(p);
        if (!check.ok) { this.showToast?.(`🔒 ${check.reason}`); return; }
        this.rpmEditingPayId = p.id;
        this.rpmAutoFull = false;

        const dateInp = document.getElementById('rpmDateInput');
        if (dateInp) dateInp.value = p.date || item.billDate || this.toLocalYMD(new Date());
        const amtInp = document.getElementById('rpmAmountInput');
        const amt = Math.round(Number(p.amount) || 0);
        if (amtInp) amtInp.value = amt > 0 ? String(amt) : '';
        const disc = Math.max(0, Math.round(Number(p.discount) || 0));
        const discInp = document.getElementById('rpmDiscountInput');
        if (discInp) discInp.value = disc > 0 ? String(disc) : '';
        const discWrap = document.getElementById('rpmDiscountWrap');
        if (discWrap) discWrap.hidden = disc <= 0;
        const discToggle = document.getElementById('rpmDiscountToggleBtn');
        if (discToggle) discToggle.hidden = disc > 0;
        // Pill of this payment; an Advance or Discount entry shows no pill and keeps its mode
        // unless one is tapped.
        document.querySelectorAll('#rpmModePills .rpm-mode-pill').forEach(pill => {
            const on = pill.dataset.mode === p.mode;
            pill.classList.toggle('active', on);
            pill.setAttribute('aria-checked', on ? 'true' : 'false');
        });

        this.setRecordPaymentFormMode(p, idx);
        this.renderRecordPaymentModalContent(item);
        this.updateRecordPaymentDiscountHint();
        document.getElementById('rpmAddPaymentFormCard')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        setTimeout(() => amtInp?.focus(), 60);
    }

    cancelEditBillPaymentEntry() {
        this.clearRecordPaymentForm();
        const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
        const item = (this.history || []).find(h => h.id === billId);
        if (item) this.renderRecordPaymentModalContent(item);
        this.updateRecordPaymentDiscountHint();
    }

    /** Everything that shows this bill's payments follows a change. */
    refreshAfterBillPaymentChange(item) {
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
        // While editing, the payment's own old amount is free again.
        const editing = this.rpmEditingPayId
            ? this.getBillPaymentEntries(item).find(p => p.id === this.rpmEditingPayId) || null
            : null;
        if (this.rpmEditingPayId && !editing) {
            this.showToast('⚠️ That payment was removed. Add it again.');
            this.cancelEditBillPaymentEntry();
            return;
        }
        if (editing) {
            const check = this.paymentEditCheckFor(editing);
            if (!check.ok) {
                this.showToast(`🔒 ${check.reason}`);
                this.cancelEditBillPaymentEntry();
                return;
            }
        }
        const pending = this.getRecordPaymentRoom(item, editing ? editing.id : null);
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

        const picked = document.querySelector('#rpmModePills .rpm-mode-pill.active')?.dataset.mode;
        if (editing) {
            const before = this.describePaymentEntry(editing);
            const oldMode = editing.mode && editing.mode !== 'Discount' ? editing.mode : 'Cash';
            editing.date = dateVal;
            editing.amount = rawAmt;
            editing.mode = rawAmt > 0 ? (picked || oldMode) : 'Discount';
            if (rawDisc > 0) editing.discount = rawDisc; else delete editing.discount;
            if (editing.isAdvance && item.snapshot) item.snapshot.initialAdvanceAmount = rawAmt;
            // Who took it stays the same; the newest edit wins when two phones merge (syncPlan).
            editing.editedAt = new Date().toISOString();
            const me = currentUser();
            if (me) editing.editedBy = { id: me.id, name: me.name || '' };

            this.syncBillPaymentSnapshot(item);
            this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);
            this.clearRecordPaymentForm();
            this.refreshAfterBillPaymentChange(item);
            this.updateRecordPaymentDiscountHint();
            this.showToast(`✏️ Changed ${before} → ${this.describePaymentEntry(editing)} (${this.formatPaymentDateDisplay(dateVal)})`);
            return;
        }

        const mode = rawAmt > 0 ? (picked || 'Cash') : 'Discount';
        const entries = this.ensureBillPaymentsArray(item);
        const entry = {
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 100),
            createdAt: new Date().toISOString(),
            date: dateVal,
            amount: rawAmt,
            mode
        };
        if (rawDisc > 0) entry.discount = rawDisc;
        // Who took it: cash a manager collects counts in their cash in hand (Expenses & cash).
        const me = currentUser();
        if (me) entry.by = { id: me.id, name: me.name || '' };
        entries.push(entry);

        this.syncBillPaymentSnapshot(item);
        this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);

        if (amtInput) amtInput.value = '';
        if (discInput) discInput.value = '';
        this.rpmAutoFull = false;
        this.updateRecordPaymentDiscountHint();

        this.refreshAfterBillPaymentChange(item);

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
        this.updateAdvanceFieldLock(item);
        this.calculateAndRender();
    }

    /**
     * The bill editor's "Advance Paid" box only sets a bill's single advance. Once the bill has
     * other payments it shows what was received and is locked: payments change in Payments.
     */
    billAdvanceFieldIsLocked(item) {
        const pays = Array.isArray(item?.payments) ? item.payments : [];
        return pays.length > 1 || (pays.length === 1 && !pays[0].isAdvance);
    }

    updateAdvanceFieldLock(item = null) {
        const inp = document.getElementById('advancePaidAmount');
        if (!inp) return;
        const locked = Boolean(item && this.billAdvanceFieldIsLocked(item));
        inp.readOnly = locked;
        inp.classList.toggle('is-locked', locked);
        const hint = document.getElementById('advanceLockedHint');
        if (hint) {
            hint.hidden = !locked;
            const n = locked ? item.payments.length : 0;
            const txt = hint.querySelector('span');
            if (txt) txt.textContent = locked ? `Received in ${n} payment${n === 1 ? '' : 's'}. Change them in Payments.` : '';
            hint.dataset.billid = locked ? item.id : '';
        }
    }

    /** Under the amount: "₹5,000 still left — give it as discount" when a part payment is typed. */
    updateRecordPaymentDiscountHint() {
        const hint = document.getElementById('rpmSettleBtn');
        if (!hint) return;
        const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
        const item = (this.history || []).find(h => h.id === billId);
        const pending = item ? this.getRecordPaymentRoom(item, this.rpmEditingPayId) : 0;
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
        this.markBillPaymentRemoved(item, removed.id);
        if (this.rpmEditingPayId === removed.id) this.clearRecordPaymentForm();
        this.syncBillPaymentSnapshot(item);
        this.saveToStorage(STORAGE_KEYS.history, this.history, [item.id]);
        this.refreshAfterBillPaymentChange(item);
        this.updateRecordPaymentDiscountHint();

        this.showUndoToast(`🗑️ Removed ${this.describePaymentEntry(removed)}`, () => {
            // The bill may have been saved again (a new object) since: put it back on the current one.
            const cur = (this.history || []).find(h => h.id === billId);
            if (!cur) return;
            const list = this.ensureBillPaymentsArray(cur);
            if (list.some(p => p.id === removed.id)) return;
            list.splice(Math.min(idx, list.length), 0, removed);
            if (removed.isAdvance && cur.snapshot) cur.snapshot.initialAdvanceAmount = Math.round(Number(removed.amount) || 0);
            this.unmarkBillPaymentRemoved(cur, removed.id);
            this.syncBillPaymentSnapshot(cur);
            this.saveToStorage(STORAGE_KEYS.history, this.history, [cur.id]);
            this.refreshAfterBillPaymentChange(cur);
            this.updateRecordPaymentDiscountHint();
        });
    }

    closeRecordPaymentModal() {
        const overlay = document.getElementById('recordPaymentModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeRecordPayBillId = null;
        if (this.rpmEditingPayId) this.clearRecordPaymentForm();
    }
}
