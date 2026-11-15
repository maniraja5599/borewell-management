// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { getAccess } from '../../cloud/access.js';
import { fetchActivity, renderActivityList } from '../../cloud/activity.js';
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
        const phoneStr = this.formatPhoneWithCountryCode(item.custPhone || '');
        const hasDue = isInvoice && this.getBillPendingAmount(item) > 0;

        const avatarEl = document.getElementById('bdmAvatar');
        const titleEl = document.getElementById('bdmTitle');
        const subEl = document.getElementById('bdmSub');
        if (avatarEl) {
            avatarEl.textContent = this.getInitials(displayCust);
            avatarEl.classList.toggle('has-due', hasDue);
        }
        if (titleEl) titleEl.textContent = displayCust;
        if (subEl) subEl.textContent = [`${isInvoice ? 'Bill' : 'Quotation'} #${item.billNo}`, phoneStr].filter(Boolean).join(' · ');

        // Same layout as each bore in the customer popup (BillSheetMixin).
        bodyEl.innerHTML = this.billSheetHtml(item, { payButtonClass: 'bdm-sheet-pay-btn' });
        bodyEl.querySelector('.bdm-sheet-pay-btn')?.setAttribute('id', 'bdmInlineRecordPayBtn');

        footEl.innerHTML = `
            ${isInvoice ? `<button type="button" class="bdm-act ${hasDue ? 'is-pri' : ''}" id="bdmFootRecordPayBtn"><span aria-hidden="true">₹</span>${hasDue ? 'Add payment' : 'Payments'}</button>` : ''}
            <button type="button" class="bdm-act is-wa" id="bdmFootWaBtn">WhatsApp</button>
            <button type="button" class="bdm-act" id="bdmFootEditBtn">Edit</button>
            <button type="button" class="bdm-act ${hasDue || !isInvoice ? '' : 'is-pri'}" id="bdmFootReceiptBtn">Bill / PDF</button>
        `;
        footEl.classList.toggle('has-four', isInvoice);

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

        // Signed-in companies: "who changed this bill" from the cloud activity log.
        if (getAccess()) {
            const box = document.createElement('div');
            box.className = 'act-box';
            const head = document.createElement('div');
            head.className = 'act-head';
            head.textContent = '🕘 History';
            const list = document.createElement('div');
            list.className = 'act-list';
            list.textContent = 'Loading…';
            box.append(head, list);
            bodyEl.appendChild(box);
            fetchActivity({ kind: 'bill', record: String(item.id), limit: 20 }).then((entries) => {
                if (this.activeDetailBillId !== item.id) return; // another bill was opened meanwhile
                if (entries === null) { box.remove(); return; }  // offline / not available
                renderActivityList(list, entries, (n) => this.formatINR(n));
            });
        }
    }

    closeBillDetailModal() {
        const overlay = document.getElementById('billDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailBillId = null;
    }
}
