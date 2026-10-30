// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class CustomerListeners {
    setupCustomerListeners() {
        document.getElementById('toggleAddCustomerDrawerBtn')?.addEventListener('click', () => {
            this.openCustomerPopupModal({ fromBill: false });
        });

        document.getElementById('closeCrmFormDrawerBtn')?.addEventListener('click', () => {
            this.closeCustomerPopupModal();
        });

        document.getElementById('cancelCrmPopupBtn')?.addEventListener('click', () => {
            this.closeCustomerPopupModal();
        });

        document.getElementById('crmCustomerFormDrawer')?.addEventListener('click', (e) => {
            if (e.target.id === 'crmCustomerFormDrawer') {
                this.closeCustomerPopupModal();
            }
        });

        // Customer Full Borewell & Payment Detail Modal Listeners
        document.getElementById('closeCustDetailModalBtn')?.addEventListener('click', () => {
            this.closeCustomerDetailModal();
        });
        document.getElementById('custDetailModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'custDetailModalOverlay') {
                this.closeCustomerDetailModal();
            }
        });
        document.getElementById('cdmNewBillBtn')?.addEventListener('click', () => {
            const cust = this.customers.find(x => x.id === this.activeDetailCustomerId);
            this.closeCustomerDetailModal();
            if (cust) {
                this.exitSavedBillMode(false);
                this.selectCustomerIntoBill(cust);
                this.switchTab('tab-bill');
                this.showToast(`👤 ${cust.name} selected — choose Service Site`);
            }
        });
        document.getElementById('cdmWhatsAppRemindBtn')?.addEventListener('click', () => {
            const cust = this.customers.find(x => x.id === this.activeDetailCustomerId);
            if (cust) {
                this.shareCustomerSummaryOnWhatsApp(cust);
            }
        });
        document.getElementById('cdmEditCustomerBtn')?.addEventListener('click', () => {
            const cust = this.customers.find(x => x.id === this.activeDetailCustomerId);
            if (cust) {
                this.closeCustomerDetailModal();
                this.openCustomerPopupModal({ editCust: cust, fromBill: false });
            }
        });
        document.getElementById('cdmDeleteCustomerBtn')?.addEventListener('click', () => {
            if (this.activeDetailCustomerId) {
                this.deleteCustomerWithUndo(this.activeDetailCustomerId);
            }
        });
        document.querySelectorAll('#cdmViewTabs .cdm-vtab, #cdmViewTabs .cdm-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchCustomerDetailView(tab.dataset.cdmview || 'overview');
            });
        });
        document.getElementById('cdmGotoBoresViewBtn')?.addEventListener('click', () => {
            this.switchCustomerDetailView('bores');
        });
        document.getElementById('cdmOverallReceiptBtn')?.addEventListener('click', () => {
            const cust = this.customers.find(x => x.id === this.activeDetailCustomerId);
            if (!cust) return;
            const agg = this.getCustomerAggregates(cust);
            if (agg.matchingBills && agg.matchingBills.length > 0) {
                // Load latest bill from this customer into receipt view
                const latestBill = agg.matchingBills[0];
                this.closeCustomerDetailModal();
                this.loadBillFromHistory(latestBill.id, true, true);
                this.showToast(`🧾 Displaying Statement / Receipt for ${cust.name}`);
            } else {
                this.showToast(`ℹ️ No bills recorded yet for ${cust.name}`);
            }
        });
        document.querySelectorAll('#cdmBoreFilterPills .cdm-bf-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                if (this.activeDetailCustomerId) {
                    this.openCustomerDetailModal(this.activeDetailCustomerId, pill.dataset.cdmfilter || 'all', 'bores');
                }
            });
        });

        // Single Bill Detail Modal Listeners
        document.getElementById('closeBillDetailModalBtn')?.addEventListener('click', () => {
            this.closeBillDetailModal();
        });
        document.getElementById('billDetailModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'billDetailModalOverlay') {
                this.closeBillDetailModal();
            }
        });

        // Record Payment Modal (Date-wise & Multiple Installments) Listeners
        document.getElementById('closeRecordPaymentModalBtn')?.addEventListener('click', () => {
            this.closeRecordPaymentModal();
        });
        document.getElementById('recordPaymentModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'recordPaymentModalOverlay') {
                this.closeRecordPaymentModal();
            }
        });
        document.getElementById('rpmFillFullBalanceBtn')?.addEventListener('click', () => {
            const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
            const item = (this.history || []).find(h => h.id === billId);
            if (!item) return;
            const pending = this.getBillPendingAmount(item);
            const amtInp = document.getElementById('rpmAmountInput');
            if (amtInp && pending > 0) {
                amtInp.value = pending;
                amtInp.focus();
            }
        });
        document.querySelectorAll('#rpmModePills .rpm-mode-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('#rpmModePills .rpm-mode-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
        document.getElementById('rpmSavePaymentBtn')?.addEventListener('click', () => {
            this.saveNewBillPaymentRecord();
        });
        document.getElementById('rpmAmountInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveNewBillPaymentRecord();
            }
        });
        document.getElementById('rpmNoteInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveNewBillPaymentRecord();
            }
        });

        // Rate Card Full Detail Modal Listeners
        document.getElementById('closeRateDetailModalBtn')?.addEventListener('click', () => {
            this.closeRateDetailModal();
        });
        document.getElementById('rateDetailModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'rateDetailModalOverlay') {
                this.closeRateDetailModal();
            }
        });

        document.querySelectorAll('#crmFilterPills .f-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#crmFilterPills .f-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.crmFilter = chip.dataset.filter || 'all';
                this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            });
        });

        document.getElementById('crmCustCountryCode')?.addEventListener('change', (e) => {
            const selectedCode = e.target.value || '+91';
            this.setDefaultCountryCode(selectedCode);
            this.syncPhoneInputMetaForCountry('crmCustPhone', selectedCode);
            const phoneEl = document.getElementById('crmCustPhone');
            if (phoneEl) {
                const cleaned = this.normalizeMobileNumber(phoneEl.value, selectedCode);
                if (phoneEl.value !== cleaned) phoneEl.value = cleaned;
            }
            this.updateCrmPhoneValidationUI(false);
        });

        document.getElementById('crmCustPhone')?.addEventListener('input', (e) => {
            const rawVal = e.target.value || '';
            const codeSelect = document.getElementById('crmCustCountryCode');
            let activeCode = codeSelect?.value || this.defaultCountryCode || '+91';

            if (rawVal.trim().startsWith('+') || rawVal.trim().startsWith('00') || rawVal.replace(/\D/g, '').length > 10) {
                const parsed = this.parsePhoneWithCountryCode(rawVal, activeCode);
                if (parsed.countryCode !== activeCode && codeSelect) {
                    codeSelect.value = parsed.countryCode;
                    activeCode = parsed.countryCode;
                    this.setDefaultCountryCode(activeCode);
                    this.syncPhoneInputMetaForCountry('crmCustPhone', activeCode);
                }
                e.target.value = parsed.localDigits;
            } else {
                const cleaned = this.normalizeMobileNumber(rawVal, activeCode);
                if (e.target.value !== cleaned) e.target.value = cleaned;
            }
            const meta = this.getCountryCodeMeta(activeCode);
            this.updateCrmPhoneValidationUI((e.target.value || '').length >= meta.minLen);
        });

        document.getElementById('crmCustName')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                document.getElementById('crmCustPhone')?.focus();
            }
        });
        document.getElementById('crmCustPhone')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                document.getElementById('crmCustVillage')?.focus();
            }
        });
        document.getElementById('crmCustVillage')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                document.getElementById('saveCrmCustomerBtn')?.click();
            }
        });

        document.getElementById('saveCrmCustomerBtn')?.addEventListener('click', () => {
            const editId = document.getElementById('crmEditCustomerId').value;
            const fromBill = document.getElementById('crmPopupFromBill')?.value === 'true';
            const name = (document.getElementById('crmCustName').value || '').trim();
            const selectedCode = document.getElementById('crmCustCountryCode')?.value || this.defaultCountryCode || '+91';
            const rawPhone = (document.getElementById('crmCustPhone').value || '').trim();
            const village = (document.getElementById('crmCustVillage').value || '').trim();

            if (!name) {
                document.getElementById('crmCustName')?.focus();
                this.showToast('⚠️ Please enter Customer Name');
                return;
            }

            const phoneVal = this.validateMobileNumber(rawPhone, selectedCode);
            if (!phoneVal.valid) {
                this.updateCrmPhoneValidationUI(false);
                document.getElementById('crmCustPhone')?.focus();
                this.showToast(`⚠️ Invalid Mobile Number: ${phoneVal.message}`);
                return;
            }

            const dupCust = (this.customers || []).find(c =>
                c.id !== editId && this.normalizeMobileNumber(c.phone) === phoneVal.digits
            );
            if (dupCust) {
                this.updateCrmPhoneValidationUI(false);
                document.getElementById('crmCustPhone')?.focus();
                this.showToast(`⚠️ Mobile ${phoneVal.fullPhone} already registered for "${dupCust.name}"!`);
                return;
            }

            if (!village) {
                document.getElementById('crmCustVillage')?.focus();
                this.showToast('⚠️ Please enter Customer Place');
                return;
            }

            // Remember chosen country code as the default for next time!
            this.setDefaultCountryCode(phoneVal.countryCode);

            let savedRecord = null;
            if (editId) {
                const existing = this.customers.find(c => c.id === editId);
                if (existing) {
                    // Pin their bills to the customer id first, so a new phone/name keeps them.
                    this.linkCustomerBills(existing);
                    existing.name = name;
                    existing.phone = phoneVal.fullPhone;
                    existing.countryCode = phoneVal.countryCode;
                    existing.village = village;
                    if (!Array.isArray(existing.sites)) existing.sites = [];
                    delete existing.rig;
                    existing.updatedAt = new Date().toISOString();
                    savedRecord = existing;
                }
                this.saveToStorage(STORAGE_KEYS.customers, this.customers);
                this.renderCustomerDirectory();
                this.showToast('✅ Customer updated!');
            } else {
                savedRecord = this.upsertCustomerRecord({
                    name,
                    phone: phoneVal.fullPhone,
                    countryCode: phoneVal.countryCode,
                    village
                });
                this.showToast(fromBill ? `✅ Saved ${name} — now choose Service Site!` : '✅ Customer added to Ledger!');
            }

            this.closeCustomerPopupModal();

            if (fromBill && savedRecord) {
                const curSite = editId ? (document.getElementById('custLocation')?.value || '') : '';
                this.selectCustomerIntoBill(savedRecord, curSite);
            } else {
                this.renderCustomerSiteSuggestions();
                this.calculateAndRender();
            }

            document.getElementById('crmEditCustomerId').value = '';
            document.getElementById('crmCustName').value = '';
            document.getElementById('crmCustPhone').value = '';
            document.getElementById('crmCustVillage').value = '';
            this.updateCrmPhoneValidationUI(false);
            this.updateBillPhoneValidationUI(false);
        });

        document.getElementById('resetCrmFormBtn')?.addEventListener('click', () => {
            document.getElementById('crmEditCustomerId').value = '';
            document.getElementById('crmCustName').value = '';
            document.getElementById('crmCustPhone').value = '';
            document.getElementById('crmCustVillage').value = '';
            const codeSelect = document.getElementById('crmCustCountryCode');
            if (codeSelect) codeSelect.value = this.defaultCountryCode || '+91';
            this.syncPhoneInputMetaForCountry('crmCustPhone', this.defaultCountryCode || '+91');
            this.updateCrmPhoneValidationUI(false);
        });

        let crmSearchDebounceTimer;
        document.getElementById('crmSearchInput')?.addEventListener('input', (e) => {
            clearTimeout(crmSearchDebounceTimer);
            crmSearchDebounceTimer = setTimeout(() => {
                this.crmPage = 1;
                this.renderCustomerDirectory(e.target.value);
            }, 75);
        });

        // Bills vs Quotations Separate Sub-Tabs (Always defaults to 'INVOICE' / Bills)
    }
}
