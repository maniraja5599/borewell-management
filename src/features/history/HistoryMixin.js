// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class HistoryMixin {
    saveCurrentBillToHistory() {
        // 1. If viewing a Saved Bill in Read-Only Final View mode, clicking Edit unlocks Edit Mode!
        if (this.loadedHistoryBillId && this.isSavedBillReadOnly) {
            this.isSavedBillReadOnly = false;
            this.isBillPreviewOpen = false;
            this.isBillSavedAndReadyToShare = false;
            this.updateSavedBillViewModeUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showToast('✏️ Edit Mode enabled! Modify inputs & tap Preview & Update Bill.');
            return;
        }

        const res = this.lastResult;
        if (!res) return;

        const cName = (document.getElementById('custName')?.value || this.state.custName || '').trim();
        const rawPhone = (document.getElementById('custPhone')?.value || this.state.custPhone || '').trim();
        const cLoc = (this.state.custLocation || '').trim();
        const cGst = (document.getElementById('custGstInput')?.value || this.state.custGst || '').trim().toUpperCase();

        // Mandatory Check: Do NOT allow saving a Bill without Customer Name! Stay at current place.
        if (!this.ensureCustomerSelectedForBill()) {
            return;
        }

        // Validate Customer Mobile Number if entered
        const phoneVal = this.validateMobileNumber(rawPhone);
        if (!phoneVal.isEmpty && !phoneVal.valid) {
            this.updateBillPhoneValidationUI(false);
            this.showToast(`⚠️ Invalid Mobile Number: ${phoneVal.message}`);
            return;
        }

        const cPhone = phoneVal.valid ? phoneVal.fullPhone : '';
        if (phoneVal.valid && phoneVal.countryCode) {
            this.setDefaultCountryCode(phoneVal.countryCode);
        }

        // Only save Customer to Customer Book if the user explicitly checked "Save to Customer Book" (Never by default!)
        const shouldSaveToCustomerBook = Boolean(document.getElementById('autoSaveCustCheckbox')?.checked);
        if (shouldSaveToCustomerBook && (cName || cPhone)) {
            if (cPhone) {
                const dupCust = (this.customers || []).find(c => this.normalizeMobileNumber(c.phone) === phoneVal.digits);
                if (dupCust && cName && dupCust.name.toLowerCase() !== cName.toLowerCase()) {
                    this.showToast(`⚠️ Mobile ${cPhone} already exists for "${dupCust.name}" in Customer Book!`);
                } else {
                    const upserted = this.upsertCustomerRecord({
                        name: cName,
                        phone: cPhone,
                        countryCode: phoneVal.countryCode,
                        village: cLoc,
                        site: cLoc
                    });
                    if (upserted && cGst) {
                        upserted.gstNumber = cGst;
                        this.saveToStorage(STORAGE_KEYS.customers, this.customers);
                    }
                }
            } else {
                const upserted = this.upsertCustomerRecord({
                    name: cName,
                    phone: cPhone,
                    countryCode: phoneVal.countryCode,
                    village: cLoc,
                    site: cLoc
                });
                if (upserted && cGst) {
                    upserted.gstNumber = cGst;
                    this.saveToStorage(STORAGE_KEYS.customers, this.customers);
                }
            }
        } else if (cName || cPhone) {
            // Even if not creating a new customer, if this customer already exists in Customer Book, remember this Borewell Site & Client GSTIN for future bills!
            if (cLoc) {
                this.recordSiteForCustomer({ name: cName, phone: cPhone, site: cLoc });
            }
            if (cGst) {
                const activeCust = this.findActiveBillCustomer();
                if (activeCust) {
                    activeCust.gstNumber = cGst;
                    this.saveToStorage(STORAGE_KEYS.customers, this.customers);
                }
            }
        }

        // Remember any extra charges & custom notes entered/used in this bill for 1-tap reuse next time
        this.recordCurrentBillExtrasForNextTime();
        this.recordCurrentBillNoteForNextTime();

        const currentBillNo = (document.getElementById('billNoInput')?.value || '').trim() || this.getNextAutoDocNumber(res.docType);
        const currentBillDate = document.getElementById('billDateInput')?.value || new Date().toISOString().split('T')[0];
        const postSaveBannerTitle = document.getElementById('postSaveBannerTitle');

        // 2. If editing an existing Saved Bill, update it in place & unlock Share Options!
        if (this.loadedHistoryBillId) {
            const idx = this.history.findIndex(h => h.id === this.loadedHistoryBillId);
            if (idx !== -1) {
                const existingItem = this.history[idx];
                const existingPayments = Array.isArray(existingItem.payments) ? [...existingItem.payments] : [];
                const snapCopy = JSON.parse(JSON.stringify(res));

                if (existingPayments.length === 0 && (snapCopy.advancePaidAmount || 0) > 0) {
                    existingPayments.push({
                        id: 'adv_' + existingItem.id,
                        date: currentBillDate,
                        amount: Math.round(snapCopy.advancePaidAmount),
                        mode: 'Advance',
                        note: 'Initial Advance on Bill',
                        isAdvance: true
                    });
                } else if (existingPayments.length === 1 && existingPayments[0].isAdvance) {
                    if ((snapCopy.advancePaidAmount || 0) > 0) {
                        existingPayments[0].amount = Math.round(snapCopy.advancePaidAmount);
                        existingPayments[0].date = currentBillDate;
                    } else {
                        existingPayments.length = 0;
                    }
                }

                this.history[idx] = {
                    ...existingItem,
                    updatedAt: new Date().toISOString(),
                    billNo: currentBillNo,
                    billDate: currentBillDate,
                    custName: cName,
                    custPhone: cPhone,
                    custLocation: cLoc,
                    custGst: res.gstEnabled ? cGst : '',
                    payments: existingPayments,
                    snapshot: snapCopy
                };
                this.syncBillPaymentSnapshot(this.history[idx]);
                this.saveToStorage(STORAGE_KEYS.history, this.history);
                this.isBillPreviewOpen = true;
                this.isBillSavedAndReadyToShare = true;
                if (postSaveBannerTitle) {
                    postSaveBannerTitle.textContent = `Bill #${currentBillNo} Updated & Saved!`;
                }
                this.updateSavedBillViewModeUI();
                this.renderHistoryList();
                this.renderCustomerDirectory();
                this.renderCustomerSiteSuggestions();
                this.renderSavedExtrasUI({ showDropdown: false });
                this.renderSavedNotesUI();
                this.calculateAndRender();
                this.applyBrandToUI();
                this.persistCurrentSession();
                this.showToast(`✅ Updated Bill #${currentBillNo} (${cName}) — Ready to Share!`);
                return;
            }
        }

        // 3. Normal New Bill / Quotation Save -> Save to Bill Book & unlock Share Options!
        const newId = Date.now().toString();
        const initialPayments = [];
        if ((res.advancePaidAmount || 0) > 0) {
            initialPayments.push({
                id: 'adv_' + newId,
                date: currentBillDate,
                amount: Math.round(res.advancePaidAmount),
                mode: 'Advance',
                note: 'Initial Advance on Bill',
                isAdvance: true
            });
        }
        const record = {
            id: newId,
            createdAt: new Date().toISOString(),
            billNo: currentBillNo,
            billDate: currentBillDate,
            custName: cName,
            custPhone: cPhone,
            custLocation: cLoc,
            custGst: res.gstEnabled ? cGst : '',
            payments: initialPayments,
            snapshot: JSON.parse(JSON.stringify(res))
        };
        this.syncBillPaymentSnapshot(record);

        this.history.unshift(record);
        this.saveToStorage(STORAGE_KEYS.history, this.history);

        // Compute next auto sequence in brand storage while keeping current saved bill active on screen
        this.getNextAutoDocNumber(this.state.docType);
        this.saveToStorage(STORAGE_KEYS.brand, this.brand);

        this.loadedHistoryBillId = record.id;
        this.isSavedBillReadOnly = false;
        this.isBillPreviewOpen = true;
        this.isBillSavedAndReadyToShare = true;
        if (postSaveBannerTitle) {
            postSaveBannerTitle.textContent = `Bill #${currentBillNo} Saved to Bill Book!`;
        }

        this.updateSavedBillViewModeUI();
        this.updateBillPhoneValidationUI(false);
        this.renderCustomerSiteSuggestions();
        this.renderSavedExtrasUI({ showDropdown: false });
        this.renderSavedNotesUI();
        this.calculateAndRender();
        this.renderHistoryList();
        this.renderCustomerDirectory();
        this.applyBrandToUI();
        this.persistCurrentSession();
        this.showToast(`💾 Saved #${currentBillNo} (${cName})! Share options unlocked below.`);
    }

    toLocalYMD(d) {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
    }

    getHistoryItemDateStr(item) {
        if (!item) return '';
        if (item.billDate && /^\d{4}-\d{2}-\d{2}/.test(item.billDate)) {
            return item.billDate.slice(0, 10);
        }
        if (item.createdAt) {
            const dt = new Date(item.createdAt);
            if (!isNaN(dt.getTime())) {
                return this.toLocalYMD(dt);
            }
        }
        return '';
    }

    matchesHistoryDateFilter(item) {
        const preset = this.historyDatePreset || 'all';
        if (preset === 'all') return true;

        const itemDate = this.getHistoryItemDateStr(item);
        if (!itemDate) return false;

        const now = new Date();
        const todayStr = this.toLocalYMD(now);

        if (preset === 'today') {
            return itemDate === todayStr;
        }
        if (preset === 'yesterday') {
            const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            return itemDate === this.toLocalYMD(yest);
        }
        if (preset === '7d') {
            const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            return itemDate >= this.toLocalYMD(sevenAgo) && itemDate <= todayStr;
        }
        if (preset === 'month') {
            return itemDate.startsWith(todayStr.slice(0, 7));
        }
        if (preset === 'custom') {
            const from = (this.historyDateFrom || '').trim();
            const to = (this.historyDateTo || '').trim();
            if (from && itemDate < from) return false;
            if (to && itemDate > to) return false;
            return true;
        }
        return true;
    }

    getActiveDateFilterLabel() {
        const preset = this.historyDatePreset || 'all';
        if (preset === 'today') return '📅 Today';
        if (preset === 'yesterday') return '📅 Yesterday';
        if (preset === '7d') return '📅 Last 7 Days';
        if (preset === 'month') return '📅 This Month';
        if (preset === 'custom') {
            const from = (this.historyDateFrom || '').trim();
            const to = (this.historyDateTo || '').trim();
            if (from && to) return `📅 ${from} → ${to}`;
            if (from) return `📅 From ${from}`;
            if (to) return `📅 Until ${to}`;
            return '📅 Custom Date';
        }
        return '';
    }

    resetHistoryFilters(render = true) {
        this.historyPayFilter = 'all';
        this.historyDatePreset = 'all';
        this.historyDateFrom = '';
        this.historyDateTo = '';
        const fromEl = document.getElementById('historyDateFrom');
        const toEl = document.getElementById('historyDateTo');
        if (fromEl) fromEl.value = '';
        if (toEl) toEl.value = '';
        if (render) {
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        }
    }

    syncHistoryFilterUI() {
        const docFilter = this.historyDocFilter === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
        this.historyDocFilter = docFilter;

        const allInvoices = (this.history || []).filter(h => (h.snapshot?.docType || 'QUOTATION') === 'INVOICE');
        const allQuotes = (this.history || []).filter(h => (h.snapshot?.docType || 'QUOTATION') === 'QUOTATION');
        const unpaidInvoices = allInvoices.filter(h => this.isBillItemUnpaid(h));

        // 1. Bottom Nav Badge & Sub-Tab Counts
        const navBadgeEl = document.getElementById('navHistoryCount');
        if (navBadgeEl) navBadgeEl.textContent = allInvoices.length;
        const billsTabCountEl = document.getElementById('histBillsTabCount');
        if (billsTabCountEl) billsTabCountEl.textContent = allInvoices.length;
        const quotesTabCountEl = document.getElementById('histQuotesTabCount');
        if (quotesTabCountEl) quotesTabCountEl.textContent = allQuotes.length;
        const unpaidQuickCountEl = document.getElementById('histUnpaidQuickCount');
        if (unpaidQuickCountEl) unpaidQuickCountEl.textContent = unpaidInvoices.length;

        // 2. Sub-Tab Switcher (Bills vs Quotations)
        document.querySelectorAll('#historyDocTabSwitcher .bq-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.doctab === docFilter);
        });

        // 3. Search Box Placeholder & Payment Filter Visibility (Payment filter applies to Bills)
        const searchInputEl = document.getElementById('historySearchInput');
        if (searchInputEl) {
            searchInputEl.placeholder = docFilter === 'QUOTATION'
                ? 'Search name, phone, quote #'
                : 'Search name, phone, bill #';
        }
        const quickPayPills = document.getElementById('historyPaymentQuickPills');
        if (quickPayPills) {
            quickPayPills.style.display = docFilter === 'INVOICE' ? 'flex' : 'none';
        }
        const popupPaySection = document.getElementById('historyPopupPayPills')?.closest('.bfp-section');
        if (popupPaySection) {
            popupPaySection.style.display = docFilter === 'INVOICE' ? 'block' : 'none';
        }

        // 4. Sync Payment Filter Pills (Both Quick Bar & Filter Popover)
        const payFilter = this.historyPayFilter || 'all';
        document.querySelectorAll('#historyPaymentQuickPills .f-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.payfilter === payFilter);
        });
        document.querySelectorAll('#historyPopupPayPills .bfp-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.payfilter === payFilter);
        });

        // 5. Sync Date Filter Presets & Active Date Chip
        const datePreset = this.historyDatePreset || 'all';
        document.querySelectorAll('#historyDatePresetPills .bfp-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.datepreset === datePreset);
        });
        const dateChipEl = document.getElementById('historyActiveDateChip');
        const dateChipTxtEl = document.getElementById('historyActiveDateText');
        const dateLbl = this.getActiveDateFilterLabel();
        if (dateChipEl && dateChipTxtEl) {
            if (dateLbl) {
                dateChipTxtEl.textContent = dateLbl;
                dateChipEl.style.display = 'inline-flex';
            } else {
                dateChipEl.style.display = 'none';
            }
        }

        // 6. Sync Inline Search Filter Icon Badge
        const filterBtn = document.getElementById('historyFilterToggleBtn');
        const filterBadge = document.getElementById('historyFilterCountBadge');
        const activeFilterCount =
            (docFilter === 'INVOICE' && payFilter !== 'all' ? 1 : 0) +
            (datePreset !== 'all' ? 1 : 0);

        if (filterBadge) {
            if (activeFilterCount > 0) {
                filterBadge.textContent = activeFilterCount;
                filterBadge.style.display = 'inline-flex';
            } else {
                filterBadge.style.display = 'none';
            }
        }
        if (filterBtn) {
            filterBtn.classList.toggle('has-active-filters', activeFilterCount > 0);
        }
    }

    renderHistoryList(query = '') {
        this.syncHistoryFilterUI();
        const listEl = document.getElementById('savedBillsList');
        if (!listEl) return;

        const docFilter = this.historyDocFilter === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
        const payFilter = this.historyPayFilter || 'all';
        const q = (query || '').toLowerCase().trim();

        const filtered = (this.history || []).filter(item => {
            const docTag = item.snapshot?.docType || 'QUOTATION';
            if (docTag !== docFilter) return false;

            if (docFilter === 'INVOICE') {
                const isUnpaid = this.isBillItemUnpaid(item);
                if (payFilter === 'unpaid' && !isUnpaid) return false;
                if (payFilter === 'paid' && isUnpaid) return false;
            }

            if (!this.matchesHistoryDateFilter(item)) return false;

            if (!q) return true;
            return (
                (item.custName || '').toLowerCase().includes(q) ||
                (item.custPhone || '').toLowerCase().includes(q) ||
                (item.custLocation || '').toLowerCase().includes(q) ||
                (item.billNo || '').toLowerCase().includes(q) ||
                (item.billDate || '').toLowerCase().includes(q)
            );
        });

        const clearAllBtn = document.getElementById('clearAllHistoryBtn');
        if (clearAllBtn) clearAllBtn.style.display = (this.history || []).length ? '' : 'none';

        if (filtered.length === 0) {
            const isQuoteTab = docFilter === 'QUOTATION';
            const hasActiveFilters = (docFilter === 'INVOICE' && payFilter !== 'all') || (this.historyDatePreset && this.historyDatePreset !== 'all') || Boolean(q);
            const hasAnyOfType = (this.history || []).some(item => (item.snapshot?.docType || 'QUOTATION') === docFilter);
            if (!hasAnyOfType && !q) {
                listEl.innerHTML = `
                    <div class="empty-state-card">
                        <div class="empty-state-icon">${isQuoteTab ? '📋' : '🧾'}</div>
                        <p class="empty-state-title">${isQuoteTab ? 'No quotations yet' : 'No bills yet'}</p>
                        <p class="empty-state-sub">${isQuoteTab ? 'Quotations you share with customers will appear here.' : 'Saved final bills, payments and pending dues will appear here.'}</p>
                        <button type="button" class="btn-chip-primary" id="emptyStateNewBillBtn">＋ Create ${isQuoteTab ? 'Quotation' : 'Bill'}</button>
                    </div>
                `;
                document.getElementById('emptyStateNewBillBtn')?.addEventListener('click', () => {
                    document.querySelector('.b-nav-item[data-tab="tab-bill"]')?.click();
                });
                return;
            }
            listEl.innerHTML = `
                <div style="text-align:center; padding: 28px 14px;">
                    <p class="page-sub" style="margin-bottom: 8px; font-weight: 700;">
                        ${isQuoteTab
                            ? 'No quotations found.'
                            : (payFilter === 'unpaid'
                                ? '🎉 No unpaid / pending bills found!'
                                : 'No bills found matching your filter.')}
                    </p>
                    ${hasActiveFilters
                        ? `<button type="button" class="btn-outline-sm" id="emptyStateClearHistFiltersBtn" style="margin: 0 auto;">↺ Show All ${isQuoteTab ? 'Quotations' : 'Bills'}</button>`
                        : ''}
                </div>
            `;
            document.getElementById('emptyStateClearHistFiltersBtn')?.addEventListener('click', () => {
                const sInp = document.getElementById('historySearchInput');
                if (sInp) sInp.value = '';
                this.resetHistoryFilters(true);
            });
            return;
        }

        const pageSize = 40;
        const pageCount = this.historyPage || 1;
        const sliced = filtered.slice(0, pageCount * pageSize);

        let html = sliced.map(item => {
            const snap = item.snapshot || {};
            const isInvoice = (snap.docType || 'QUOTATION') === 'INVOICE';
            const paidAmt = this.getBillPaidAmount(item);
            const pendingAmt = this.getBillPendingAmount(item);
            const hasDue = pendingAmt > 0;
            const displayCust = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Direct Bill';
            const initials = this.getInitials(displayCust);
            const dateStr = this.getHistoryItemDateStr(item);
            const payEntries = this.getBillPaymentEntries(item);
            const lastPayDate = payEntries.length > 0 ? this.formatPaymentDateDisplay(payEntries[payEntries.length - 1].date) : '';

            return `
            <div class="khata-card clickable-bill-card" data-billid="${item.id}">
                <div class="khata-top">
                    <div class="khata-identity">
                        <div class="party-avatar">${this.escapeHtml(initials)}</div>
                        <div class="party-info">
                            <div class="party-name">#${this.escapeHtml(item.billNo)} — ${this.escapeHtml(displayCust)}</div>
                            <div class="party-meta-row">
                                <div class="party-meta">
                                    📍 ${this.escapeHtml(item.custLocation || 'Site N/A')} • ${snap.totalDepth || 0} ft (${snap.boreDia || '6.5"'})
                                </div>
                                <span class="party-date-badge">📅 ${dateStr || 'N/A'}</span>
                                ${item.createdBy?.name ? `<span class="party-by-badge" title="Made by">👷 ${this.escapeHtml(item.createdBy.name)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="khata-amounts">
                        <span class="khata-main-amt">${this.formatINR(snap.grandTotal)}</span>
                        ${isInvoice
                            ? (hasDue
                                ? `<span class="status-pill due static-badge">Due: ${this.formatINR(pendingAmt)}</span>`
                                : `<span class="status-pill paid static-badge">✅ Paid${lastPayDate ? ` (${lastPayDate})` : ''}</span>`)
                            : `<span class="status-pill quote static-badge">📋 Quotation</span>`
                        }
                    </div>
                </div>
                <div class="khata-actions">
                    <span class="khata-Quick-stats">
                        ${isInvoice
                            ? `Paid: <strong>${this.formatINR(paidAmt)}</strong>${payEntries.length > 0 ? ` (${payEntries.length})` : ''}`
                            : `Base: ₹${snap.baseDrillingRate}/ft • Casing: ${snap.pvc7Length || 0}ft/${snap.pvc10Length || 0}ft`
                        }
                    </span>
                    <div class="khata-btn-group">
                        ${isInvoice
                            ? `<button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''} hist-record-pay-btn" data-id="${item.id}" title="Record Payment">${hasDue ? '＋ Payment' : 'Payments'}</button>`
                            : ''
                        }
                        <button type="button" class="btn-wa-xs hist-wa-btn" data-id="${item.id}" title="Preview & Send on WhatsApp" aria-label="Send on WhatsApp">
                            <svg class="wa-real-svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z"/>
                            </svg>
                        </button>
                        <button type="button" class="btn-secondary-sm hist-detail-btn" data-id="${item.id}">Details</button>
                        <button type="button" class="btn-danger-xs hist-del-btn" data-id="${item.id}">✕</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        if (filtered.length > sliced.length) {
            const remaining = filtered.length - sliced.length;
            html += `
                <div class="pagination-load-more-wrap">
                    <button type="button" class="btn-pagination-load-more" id="historyLoadMoreBtn">
                        <span>Load More (${remaining} remaining)</span>
                        <span>↓</span>
                    </button>
                    <span class="pagination-count-sub">Showing ${sliced.length} of ${filtered.length} ${docFilter === 'QUOTATION' ? 'quotations' : 'bills'}</span>
                </div>
            `;
        }

        listEl.innerHTML = html;

        listEl.querySelectorAll('.clickable-bill-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openBillDetailModal(card.dataset.billid);
            });
        });

        listEl.querySelectorAll('.hist-record-pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRecordPaymentModal(btn.dataset.id);
            });
        });

        listEl.querySelectorAll('.hist-wa-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareSavedHistoryBillOnWhatsApp(btn.dataset.id);
            });
        });

        listEl.querySelectorAll('.hist-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openBillDetailModal(btn.dataset.id);
            });
        });

        listEl.querySelectorAll('.hist-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const delId = btn.dataset.id;
                const origIdx = this.history.findIndex(h => h.id === delId);
                if (origIdx === -1) return;
                const deletedBill = JSON.parse(JSON.stringify(this.history[origIdx]));
                const custTitle = (deletedBill.custName && deletedBill.custName !== 'Walk-in Customer') ? deletedBill.custName : 'Direct Bill';
                const amtStr = this.formatINR(deletedBill.snapshot?.grandTotal || 0);
                const isQuote = (deletedBill.snapshot?.docType || 'QUOTATION') === 'QUOTATION';

                this.confirmDeleteModal({
                    title: isQuote ? 'Delete Quotation?' : 'Delete Bill?',
                    itemLabel: `${isQuote ? '📋' : '🧾'} #${deletedBill.billNo} — ${custTitle} (${amtStr})`,
                    message: `Are you sure you want to delete this ${isQuote ? 'quotation' : 'bill'}?`,
                    onConfirm: () => {
                        this.history = this.history.filter(h => h.id !== delId);
                        if (this.loadedHistoryBillId === delId) {
                            this.exitSavedBillMode(true);
                        }
                        this.saveToStorage(STORAGE_KEYS.history, this.history);
                        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
                        this.renderCustomerDirectory();
                        this.applyBrandToUI();

                        this.showUndoToast(`🗑️ Deleted #${deletedBill.billNo}`, () => {
                            if (!this.history.some(h => h.id === deletedBill.id)) {
                                const insertAt = Math.min(origIdx, this.history.length);
                                this.history.splice(insertAt, 0, deletedBill);
                                this.saveToStorage(STORAGE_KEYS.history, this.history);
                                this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
                                this.renderCustomerDirectory();
                                this.applyBrandToUI();
                            }
                        });
                    }
                });
            });
        });

        document.getElementById('historyLoadMoreBtn')?.addEventListener('click', () => {
            this.historyPage = (this.historyPage || 1) + 1;
            this.renderHistoryList(query);
        });
    }

    loadBillFromHistory(id, viewOnly = true, switchAndScroll = true) {
        const item = this.history.find(h => h.id === id);
        if (!item) return;
        const s = item.snapshot;

        this.loadedHistoryBillId = item.id;
        this.isSavedBillReadOnly = Boolean(viewOnly);

        document.getElementById('billNoInput').value = item.billNo;
        document.getElementById('billDateInput').value = item.billDate;
        document.getElementById('custName').value = (!item.custName || item.custName === 'Walk-in Customer') ? '' : item.custName;
        document.getElementById('custPhone').value = this.formatPhoneWithCountryCode(item.custPhone || '');
        document.getElementById('custLocation').value = item.custLocation || '';
        const custGstEl = document.getElementById('custGstInput');
        if (custGstEl) {
            custGstEl.value = (item.custGst || s.custGst || '').trim().toUpperCase();
        }

        this.state.drillingType = s.drillingType || 'new';
        document.querySelectorAll('#drillingTypeToggle .mini-seg-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === this.state.drillingType);
        });
        document.getElementById('oldBoreRow').style.display = this.state.drillingType === 'repair' ? 'block' : 'none';

        this.state.docType = s.docType === 'INVOICE' ? 'INVOICE' : 'QUOTATION';
        document.querySelectorAll('#docTypePills .doc-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.doc === this.state.docType);
        });

        this.state.boreDia = s.boreDia || '6.5"';
        document.querySelectorAll('#boreDiaPills .dia-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.dia === this.state.boreDia);
        });

        document.getElementById('totalDepth').value = s.totalDepth > 0 ? s.totalDepth : '';
        document.getElementById('oldBoreDepth').value = s.oldBoreDepth > 0 ? s.oldBoreDepth : '';
        const savedFlushRate = s.oldBoreRate || (Array.isArray(s.slabDetails) && s.slabDetails[0]?.slabIndex === -1 ? s.slabDetails[0].rate : null) || this.rates.oldBoreRate || 40;
        this.rates.oldBoreRate = savedFlushRate;
        if (document.getElementById('oldBoreRateInput')) {
            document.getElementById('oldBoreRateInput').value = savedFlushRate;
        }
        document.getElementById('baseDrillingRate').value = s.baseDrillingRate || this.rates.baseDrillingRate || 90;
        document.getElementById('pvc7Length').value = s.pvc7Length > 0 ? s.pvc7Length : '';
        document.getElementById('pvc10Length').value = s.pvc10Length > 0 ? s.pvc10Length : '';
        if (document.getElementById('pvc7RateInput')) {
            document.getElementById('pvc7RateInput').value = s.pvc7Rate || this.rates.pvc7Rate || 400;
        }
        if (document.getElementById('pvc10RateInput')) {
            document.getElementById('pvc10RateInput').value = s.pvc10Rate || this.rates.pvc10Rate || 700;
        }
        if (document.getElementById('billBoreBataInput')) {
            document.getElementById('billBoreBataInput').value = s.boreBataCost !== undefined ? s.boreBataCost : (this.rates.boreBataRate ?? 2000);
        }
        if (s.slabBufferFt !== undefined) {
            this.rates.slabBufferFt = s.slabBufferFt;
        }
        if (document.getElementById('drillingSlabBufferInput')) {
            document.getElementById('drillingSlabBufferInput').value = this.rates.slabBufferFt ?? 5;
        }
        document.getElementById('gstEnabledToggle').checked = Boolean(s.gstEnabled);
        const custGstRow = document.getElementById('custGstInlineRow');
        if (custGstRow) {
            custGstRow.style.display = s.gstEnabled ? 'flex' : 'none';
        }

        document.getElementById('collarCapCost').value = s.collarCapCost > 0 ? s.collarCapCost : '';
        document.getElementById('transportSurveyCost').value = s.transportSurveyCost > 0 ? s.transportSurveyCost : '';
        document.getElementById('customExtraLabel').value = s.customExtraLabel || '';
        document.getElementById('customExtraAmount').value = s.customExtraAmount > 0 ? s.customExtraAmount : '';
        document.getElementById('discountAmount').value = s.discountAmount > 0 ? s.discountAmount : '';
        document.getElementById('advancePaidAmount').value = s.advancePaidAmount > 0 ? s.advancePaidAmount : '';
        const noteEl = document.getElementById('billCustomNoteInput');
        if (noteEl) noteEl.value = s.customNote || '';
        const notesDrawer = document.getElementById('billNotesDrawer');
        if (notesDrawer) notesDrawer.style.display = s.customNote ? 'block' : 'none';

        this.isBillPreviewOpen = Boolean(viewOnly);
        this.isBillSavedAndReadyToShare = Boolean(viewOnly);

        if (switchAndScroll) {
            this.switchTab('tab-bill', true, true);
        }
        this.applyBrandToUI();
        this.updateSavedBillViewModeUI();
        this.updateBillPhoneValidationUI(false);
        this.renderCustomerSiteSuggestions();
        this.renderSavedExtrasUI({ showDropdown: false });
        this.renderSavedNotesUI();
        this.calculateAndRender();
        if (switchAndScroll) {
            this.showToast(viewOnly ? `👁️ Viewing #${item.billNo} (Tap "Edit Bill" to modify)` : `✏️ Editing #${item.billNo}`);
            if (viewOnly) {
                setTimeout(() => {
                    const rcptWrap = document.getElementById('billReceiptPreviewWrapper');
                    if (rcptWrap) {
                        rcptWrap.style.display = 'block';
                        rcptWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }
        }
    }

    updateSavedBillViewModeUI() {
        const banner = document.getElementById('savedBillModeBanner');
        const formsBox = document.getElementById('billEditorFormsContainer');
        const liveBar = document.getElementById('stickyLiveBar');
        const badgeEl = document.getElementById('savedBillModeBadge');
        const titleEl = document.getElementById('savedBillModeTitle');
        const toggleTxt = document.getElementById('toggleSavedBillEditText');
        const saveTitle = document.getElementById('saveBillBtnTitle');
        const saveSub = document.getElementById('saveBillBtnSub');

        const isBillTab = document.getElementById('tab-bill')?.classList.contains('active');

        if (!this.loadedHistoryBillId) {
            if (banner) banner.style.display = 'none';
            if (formsBox) formsBox.style.display = 'block';
            if (liveBar) liveBar.style.display = isBillTab ? 'block' : 'none';
            if (saveTitle) saveTitle.textContent = 'Confirm & Save Bill';
            if (saveSub) saveSub.textContent = 'Save to Bills to unlock Share';
            this.syncIosTopSafeBarColor();
            this.goToWizardStep(this.currentWizardStep || 1, false);
            return;
        }

        const item = this.history.find(h => h.id === this.loadedHistoryBillId);
        const bNo = document.getElementById('billNoInput')?.value || item?.billNo || 'Bill';
        const rawCust = document.getElementById('custName')?.value || item?.custName || '';
        const cName = (rawCust && rawCust !== 'Walk-in Customer') ? rawCust : 'Direct Bill';

        if (banner) banner.style.display = 'block';

        if (this.isSavedBillReadOnly) {
            banner?.classList.remove('is-editing');
            if (formsBox) formsBox.style.display = 'none';
            if (liveBar) liveBar.style.display = 'none';
            if (badgeEl) badgeEl.textContent = '👁️ Final View Only';
            if (titleEl) titleEl.textContent = `#${bNo} • ${cName}`;
            if (toggleTxt) toggleTxt.textContent = 'Edit Bill';
            if (saveTitle) saveTitle.textContent = '✏️ Edit This Bill';
            if (saveSub) saveSub.textContent = 'Tap to unlock & modify';
            this.isBillPreviewOpen = true;
            this.isBillSavedAndReadyToShare = true;
            this.syncIosTopSafeBarColor();
            this.syncProgressiveBillSections();
        } else {
            banner?.classList.add('is-editing');
            if (formsBox) formsBox.style.display = 'block';
            if (liveBar) liveBar.style.display = isBillTab ? 'block' : 'none';
            if (badgeEl) badgeEl.textContent = this.isBillSavedAndReadyToShare ? '✅ Bill Saved' : '✏️ Editing Bill';
            if (titleEl) titleEl.textContent = `${this.isBillSavedAndReadyToShare ? 'Saved' : 'Editing'} #${bNo} • ${cName}`;
            if (toggleTxt) toggleTxt.textContent = 'Final View';
            if (saveTitle) saveTitle.textContent = `💾 Update #${bNo}`;
            if (saveSub) saveSub.textContent = 'Save changes to unlock Share';
            this.syncIosTopSafeBarColor();
            this.goToWizardStep(this.currentWizardStep || 1, false);
        }
    }

    exitSavedBillMode(resetInputs = true) {
        this.loadedHistoryBillId = null;
        this.isSavedBillReadOnly = false;
        this.isBillPreviewOpen = false;
        this.isBillSavedAndReadyToShare = false;
        this.state.gstEnabled = false;
        const gstToggle = document.getElementById('gstEnabledToggle');
        if (gstToggle) gstToggle.checked = false;
        const custGstRow = document.getElementById('custGstInlineRow');
        if (custGstRow) custGstRow.style.display = 'none';
        const dateInput = document.getElementById('billDateInput');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        if (resetInputs) {
            // Always default to Final Bill ('INVOICE') when starting a fresh bill
            this.state.docType = 'INVOICE';
            document.querySelectorAll('#docTypePills .doc-pill').forEach(pill => {
                pill.classList.toggle('active', pill.dataset.doc === 'INVOICE');
            });
            document.getElementById('custName').value = '';
            document.getElementById('custPhone').value = '';
            document.getElementById('custLocation').value = '';
            const custGstEl = document.getElementById('custGstInput');
            if (custGstEl) custGstEl.value = '';
            document.getElementById('totalDepth').value = '';
            document.getElementById('oldBoreDepth').value = '';
            if (document.getElementById('drillingSlabBufferInput')) {
                document.getElementById('drillingSlabBufferInput').value = this.rates.slabBufferFt ?? 5;
            }
            document.getElementById('pvc7Length').value = '';
            document.getElementById('pvc10Length').value = '';
            document.getElementById('collarCapCost').value = '';
            document.getElementById('transportSurveyCost').value = '';
            document.getElementById('customExtraLabel').value = '';
            document.getElementById('customExtraAmount').value = '';
            document.getElementById('discountAmount').value = '';
            document.getElementById('advancePaidAmount').value = '';
            const noteEl = document.getElementById('billCustomNoteInput');
            if (noteEl) noteEl.value = '';
            const notesDrawer = document.getElementById('billNotesDrawer');
            if (notesDrawer) notesDrawer.style.display = 'none';
            const slabPanel = document.getElementById('smartSlabDropdownPanel');
            if (slabPanel) slabPanel.style.display = 'none';
            const siteSection = document.getElementById('serviceSiteSection');
            if (siteSection) siteSection.style.display = 'none';
            const pickerPanel = document.getElementById('quickCustPickerPanel');
            if (pickerPanel) pickerPanel.style.display = 'block';
            this.goToWizardStep(1, false);
        }
        this.syncAutoBillNumber(true);
        this.updateSavedBillViewModeUI();
        this.updateBillPhoneValidationUI(false);
        this.renderCustomerSiteSuggestions();
        this.renderSavedExtrasUI({ showDropdown: false });
        this.renderSavedNotesUI();
        this.calculateAndRender();
    }

    /* ==========================================================================
       LANGUAGE / I18N & EVENT LISTENERS
       ========================================================================== */
}
