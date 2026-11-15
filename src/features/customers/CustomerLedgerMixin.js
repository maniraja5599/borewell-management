// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class CustomerLedgerMixin {
    // Which customer a bill belongs to:
    //   1. the customer id saved on the bill (stays right after the customer's phone/name is edited);
    //   2. otherwise the bill's mobile number;
    //   3. a name match only for bills saved without a mobile number.
    // Before, any bill with the same name matched too, so two customers called "Kumar" shared bills,
    // and editing a customer's phone cut them off from their own bills.
    billOwnerKey(b, customerIds) {
        if (b.customerId && customerIds.has(b.customerId)) return { id: b.customerId };
        const p = this.normalizeMobileNumber(b.custPhone || '');
        if (p) return { phone: p };
        const n = (b.custName || '').trim().toLowerCase();
        return n ? { name: n } : null;
    }

    buildCustomerBillsIndex() {
        const customerIds = new Set((this.customers || []).map(c => c.id).filter(Boolean));
        const idMap = new Map();
        const phoneMap = new Map();
        const nameMap = new Map();
        const add = (map, key, bill) => {
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(bill);
        };
        (this.history || []).forEach(b => {
            const k = this.billOwnerKey(b, customerIds);
            if (!k) return;
            if (k.id) add(idMap, k.id, b);
            else if (k.phone) add(phoneMap, k.phone, b);
            else add(nameMap, k.name, b);
        });
        return { idMap, phoneMap, nameMap };
    }

    getCustomerMatchingBills(cust, index = null) {
        if (!cust) return [];
        const idx = (index && index.idMap) ? index : this.buildCustomerBillsIndex();
        const custDigits = this.normalizeMobileNumber(cust.phone || '');
        const custNameLower = (cust.name || '').trim().toLowerCase();
        return [
            ...(cust.id ? idx.idMap.get(cust.id) || [] : []),
            ...(custDigits ? idx.phoneMap.get(custDigits) || [] : []),
            ...(custNameLower ? idx.nameMap.get(custNameLower) || [] : [])
        ];
    }

    /** Pin a customer's current bills to their id (before their phone/name changes). */
    linkCustomerBills(cust) {
        if (!cust?.id) return 0;
        const ids = [];
        this.getCustomerMatchingBills(cust).forEach(b => {
            if (b.customerId !== cust.id) {
                b.customerId = cust.id;
                b.updatedAt = new Date().toISOString();
                ids.push(b.id);
            }
        });
        if (ids.length) this.saveToStorage(STORAGE_KEYS.history, this.history, ids);
        return ids.length;
    }

    /** The customer-book id for the bill being saved (matched by mobile, else by a unique name). */
    findCustomerIdForBill(name, phone) {
        const digits = this.normalizeMobileNumber(phone || '');
        const list = this.customers || [];
        if (digits) {
            return list.find(c => this.normalizeMobileNumber(c.phone || '') === digits)?.id || null;
        }
        const n = (name || '').trim().toLowerCase();
        const same = n ? list.filter(c => (c.name || '').trim().toLowerCase() === n) : [];
        return same.length === 1 ? same[0].id : null;
    }

    getCustomerAggregates(cust, index = null) {
        if (!cust) {
            return {
                matchingBills: [], invoices: [], quotes: [], totalBookings: 0,
                billsCount: 0, finalBillsCount: 0, quotesCount: 0, boresCount: 0,
                newBoresCount: 0, reBoresCount: 0, totalBilled: 0, totalPaid: 0,
                totalPending: 0, totalQuoted: 0, totalDrilledFt: 0, totalOldBoreFt: 0,
                totalPvc7Ft: 0, totalPvc10Ft: 0, totalPipeFt: 0, totalDrillingCost: 0, totalPipeCost: 0
            };
        }
        if (this._aggCache && cust.id && this._aggCache.has(cust.id)) {
            return this._aggCache.get(cust.id);
        }

        const matchingBills = this.getCustomerMatchingBills(cust, index);
        const invoices = matchingBills.filter(b => (b.snapshot?.docType || 'QUOTATION') === 'INVOICE');
        const quotes = matchingBills.filter(b => (b.snapshot?.docType || 'QUOTATION') === 'QUOTATION');

        // Use Final Bills for primary bore & financial totals; if a customer only has Quotations so far, fallback to Quotations for operational stats
        const activeBoreSource = invoices.length > 0 ? invoices : matchingBills;

        let totalBilled = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalQuoted = 0;

        invoices.forEach(b => {
            const snap = b.snapshot || {};
            totalBilled += Math.round(snap.grandTotal || 0);
            totalPaid += this.getBillPaidAmount(b);
            totalPending += this.getBillPendingAmount(b);
        });

        quotes.forEach(q => {
            const snap = q.snapshot || {};
            totalQuoted += Math.round(snap.grandTotal || 0);
        });

        if (invoices.length === 0 && quotes.length > 0) {
            totalBilled = totalQuoted;
        }

        let totalDrilledFt = 0;
        let totalOldBoreFt = 0;
        let totalPvc7Ft = 0;
        let totalPvc10Ft = 0;
        let totalDrillingCost = 0;
        let totalPipeCost = 0;
        let newBoresCount = 0;
        let reBoresCount = 0;

        activeBoreSource.forEach(b => {
            const snap = b.snapshot || {};
            totalDrilledFt += Number(snap.totalDepth || 0);
            totalOldBoreFt += Number(snap.oldBoreDepth || 0);
            totalPvc7Ft += Number(snap.pvc7Length || 0);
            totalPvc10Ft += Number(snap.pvc10Length || 0);
            totalDrillingCost += Math.round(snap.drillingCost || 0);
            totalPipeCost += Math.round((snap.pvc7Cost || 0) + (snap.pvc10Cost || 0));
            if (snap.drillingType === 'repair') {
                reBoresCount++;
            } else {
                newBoresCount++;
            }
        });

        const aggResult = {
            matchingBills,
            invoices,
            quotes,
            totalBookings: matchingBills.length,
            billsCount: matchingBills.length,
            finalBillsCount: invoices.length,
            quotesCount: quotes.length,
            boresCount: activeBoreSource.length,
            newBoresCount,
            reBoresCount,
            totalBilled,
            totalPaid,
            totalPending,
            totalQuoted,
            totalDrilledFt,
            totalOldBoreFt,
            totalPvc7Ft,
            totalPvc10Ft,
            totalPipeFt: totalPvc7Ft + totalPvc10Ft,
            totalDrillingCost,
            totalPipeCost
        };

        if (this._aggCache && cust.id) {
            this._aggCache.set(cust.id, aggResult);
        }
        return aggResult;
    }

    renderCustomerDirectory(query = '') {
        const countBadge = document.getElementById('navCustomerCount');
        if (countBadge) countBadge.textContent = this.customers.length;

        let grandBilledAll = 0;
        let grandPendingAll = 0;
        this.history.forEach(b => {
            const snap = b.snapshot || {};
            if ((snap.docType || 'QUOTATION') === 'INVOICE') {
                grandBilledAll += snap.grandTotal || 0;
                grandPendingAll += this.getBillPendingAmount(b);
            }
        });

        const statCust = document.getElementById('crmTotalCustomers');
        const statBilled = document.getElementById('crmTotalBilled');
        const statPending = document.getElementById('crmTotalPending');
        if (statCust) statCust.textContent = this.customers.length;
        if (statBilled) statBilled.textContent = this.formatINR(grandBilledAll);
        if (statPending) statPending.textContent = this.formatINR(grandPendingAll);

        this.updateHeaderDueTicker(grandPendingAll);
        this.renderQuickCustomerPicker();

        const listEl = document.getElementById('crmCustomerList');
        if (!listEl) return;

        const billsIndex = this.buildCustomerBillsIndex();
        const siteIndex = this.buildCustomerSiteIndex();
        this._aggCache = new Map();

        const q = query.toLowerCase().trim();
        let filtered = this.customers.filter(c => {
            const agg = this.getCustomerAggregates(c, billsIndex);
            if (this.crmFilter === 'due' && agg.totalPending <= 0) return false;
            if (this.crmFilter === 'settled' && agg.totalPending > 0) return false;

            // Date Period Filtering
            if (this.crmDatePreset && this.crmDatePreset !== 'all') {
                const dates = (agg.matchingBills || []).map(b => b.billDate || (b.createdAt ? b.createdAt.slice(0, 10) : '')).filter(Boolean);
                if (dates.length === 0) return false;
                const now = new Date();
                const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
                const sixMonthsAgo = this.toLocalYMD(new Date(now.getFullYear(), now.getMonth() - 6, 1));

                if (this.crmDatePreset === 'this_month') {
                    if (!dates.some(d => d.startsWith(curMonth))) return false;
                } else if (this.crmDatePreset === 'last_month') {
                    if (!dates.some(d => d.startsWith(lastMonth))) return false;
                } else if (this.crmDatePreset === '6months') {
                    if (!dates.some(d => d >= sixMonthsAgo)) return false;
                } else if (this.crmDatePreset === 'custom' && (this.crmCustomFrom || this.crmCustomTo)) {
                    if (!dates.some(d => (!this.crmCustomFrom || d >= this.crmCustomFrom) && (!this.crmCustomTo || d <= this.crmCustomTo))) return false;
                }
            }

            if (!q) return true;
            const { allSites } = this.getCustomerSiteSuggestions(c, siteIndex);
            return (
                (c.name || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.village || '').toLowerCase().includes(q) ||
                allSites.some(s => s.toLowerCase().includes(q))
            );
        });

        // Due Sort (Highest Due to Lowest Due)
        if (this.crmSortDueDesc) {
            filtered.sort((a, b) => {
                const aggA = this.getCustomerAggregates(a, billsIndex);
                const aggB = this.getCustomerAggregates(b, billsIndex);
                return (aggB.totalPending || 0) - (aggA.totalPending || 0);
            });
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `<p class="page-sub" style="text-align:center; padding: 20px 0;">No customers matching filter. Tap "Add Customer" to create one.</p>`;
            return;
        }

        const pageSize = 40;
        const pageCount = this.crmPage || 1;
        const sliced = filtered.slice(0, pageCount * pageSize);

        let html = sliced.map(c => {
            const agg = this.getCustomerAggregates(c, billsIndex);
            const initials = this.getInitials(c.name);
            const hasDue = agg.totalPending > 0;
            const { allSites } = this.getCustomerSiteSuggestions(c, siteIndex);
            const placeText = c.village || (allSites.length > 0 ? allSites[0] : '');
            const dispPhone = this.formatPhoneWithCountryCode(c.phone || '', c.countryCode || this.defaultCountryCode);

            let countBadgeHtml = '';
            let statusBadgeHtml = '';

            if (agg.boresCount > 0) {
                countBadgeHtml = `<span class="cmr-badge count">${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'}</span>`;
            } else if (agg.quotesCount > 0) {
                countBadgeHtml = `<span class="cmr-badge count">${agg.quotesCount} ${agg.quotesCount === 1 ? 'Quote' : 'Quotes'}</span>`;
            }

            if (hasDue) {
                statusBadgeHtml = `<span class="cmr-badge due">Due ${this.formatINR(agg.totalPending)}</span>`;
            } else if (agg.boresCount > 0) {
                statusBadgeHtml = `<span class="cmr-badge settled">Paid</span>`;
            } else if (!countBadgeHtml) {
                statusBadgeHtml = `<span class="cmr-badge neutral">View</span>`;
            }

            // Name gets the full width; place + bore count on line 2, phone on line 3; only the
            // money status sits on the right, so long names and numbers are never cut off.
            return `
                <div class="crm-minimal-row cl-row ${hasDue ? 'cl-has-due' : ''}" data-cust-id="${c.id}" title="Open ${this.escapeHtml(c.name)}">
                    <div class="cmr-avatar cl-avatar">${this.escapeHtml(initials)}</div>
                    <div class="cl-main">
                        <div class="cmr-name cl-name">${this.escapeHtml(c.name)}</div>
                        <div class="cl-line2">
                            <div class="cmr-sub cl-sub">
                                ${placeText ? `<span class="cmr-place">${this.escapeHtml(placeText)}</span>` : ''}
                                ${placeText && countBadgeHtml ? '<span class="cl-dot">·</span>' : ''}
                                ${countBadgeHtml}
                            </div>
                            <div class="cmr-right cl-side">${statusBadgeHtml}</div>
                        </div>
                        ${dispPhone ? `<div class="cl-phone">${this.escapeHtml(dispPhone)}</div>` : ''}
                    </div>
                    <span class="cmr-chevron" aria-hidden="true">›</span>
                </div>
            `;
        }).join('');

        if (filtered.length > sliced.length) {
            const remaining = filtered.length - sliced.length;
            html += `
                <div class="pagination-load-more-wrap">
                    <button type="button" class="btn-pagination-load-more" id="crmLoadMoreBtn">
                        <span>Load More (${remaining} remaining)</span>
                        <span>↓</span>
                    </button>
                    <span class="pagination-count-sub">Showing ${sliced.length} of ${filtered.length} customers</span>
                </div>
            `;
        }

        listEl.innerHTML = html;

        // Tapping any minimal customer row opens the clean Customer Detail Modal
        listEl.querySelectorAll('.crm-minimal-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openCustomerDetailModal(row.dataset.custId);
            });
        });

        document.getElementById('crmLoadMoreBtn')?.addEventListener('click', () => {
            this.crmPage = (this.crmPage || 1) + 1;
            this.renderCustomerDirectory(query);
        });
    }

    deleteCustomerWithUndo(targetId) {
        const origIdx = this.customers.findIndex(x => x.id === targetId);
        if (origIdx === -1) return;
        const deletedCust = JSON.parse(JSON.stringify(this.customers[origIdx]));
        const dispPhone = this.formatPhoneWithCountryCode(deletedCust.phone || '', deletedCust.countryCode || this.defaultCountryCode);
        const labelTxt = `${deletedCust.name}${dispPhone ? ` (${dispPhone})` : ''}${deletedCust.village ? ` • 📍 ${deletedCust.village}` : ''}`;

        const agg = this.getCustomerAggregates(deletedCust);
        let message = 'Are you sure you want to remove this customer from Customer Book?';
        if (agg.billsCount > 0) {
            message = `${deletedCust.name} has ${agg.billsCount} bill${agg.billsCount === 1 ? '' : 's'}`
                + (agg.totalPending > 0 ? ` with ${this.formatINR(agg.totalPending)} still due` : '')
                + '. The bills stay in Bills, but will no longer show under this customer. Delete anyway?';
        }
        this.confirmDeleteModal({
            title: 'Delete Customer?',
            itemLabel: `👤 ${labelTxt}`,
            message,
            onConfirm: () => {
                this.customers = this.customers.filter(x => x.id !== targetId);
                if (this.activeDetailCustomerId === targetId) {
                    this.closeCustomerDetailModal();
                }
                this.saveToStorage(STORAGE_KEYS.customers, this.customers, []);
                this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
                this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
                this.updateBillPhoneValidationUI(false);
                this.updateCrmPhoneValidationUI(false);
                this.renderCustomerSiteSuggestions();
                this.applyBrandToUI();

                this.showUndoToast(`🗑️ Deleted "${deletedCust.name}"`, () => {
                    if (!this.customers.some(x => x.id === deletedCust.id)) {
                        const insertAt = Math.min(origIdx, this.customers.length);
                        this.customers.splice(insertAt, 0, deletedCust);
                        this.saveToStorage(STORAGE_KEYS.customers, this.customers, []);
                        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
                        this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
                        this.updateBillPhoneValidationUI(false);
                        this.updateCrmPhoneValidationUI(false);
                        this.renderCustomerSiteSuggestions();
                        this.applyBrandToUI();
                    }
                });
            }
        });
    }

    switchCustomerDetailView(viewName = 'overview') {
        this.cdmActiveView = viewName === 'bores' ? 'bores' : 'overview';
        const overviewPane = document.getElementById('cdmOverviewPane');
        const boresPane = document.getElementById('cdmBoresPane');
        if (overviewPane) overviewPane.style.display = this.cdmActiveView === 'overview' ? 'flex' : 'none';
        if (boresPane) boresPane.style.display = this.cdmActiveView === 'bores' ? 'flex' : 'none';

        document.querySelectorAll('#cdmViewTabs .cdm-vtab, #cdmViewTabs .cdm-view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.cdmview === this.cdmActiveView);
        });
    }

    openCustomerDetailModal(custId, boreFilter = null, viewMode = null) {
        const cust = this.customers.find(c => c.id === custId);
        const overlay = document.getElementById('custDetailModalOverlay');
        if (!cust || !overlay) return;

        const isSameCustomer = this.activeDetailCustomerId === cust.id;
        this.activeDetailCustomerId = cust.id;

        if (boreFilter !== null) {
            this.cdmActiveBoreFilter = boreFilter;
            this.cdmSelectedBoreId = 'all';
        } else if (!this.cdmActiveBoreFilter || !isSameCustomer) {
            this.cdmActiveBoreFilter = 'all';
            this.cdmSelectedBoreId = null; // Will default to latest bore if >1 bores
        }

        const agg = this.getCustomerAggregates(cust);
        const { allSites } = this.getCustomerSiteSuggestions(cust);

        // 1. Header Identity
        const avatarEl = document.getElementById('cdmAvatar');
        const nameEl = document.getElementById('cdmName');
        const metaEl = document.getElementById('cdmMeta');
        const dispPhone = this.formatPhoneWithCountryCode(cust.phone || '', cust.countryCode || this.defaultCountryCode);
        if (avatarEl) avatarEl.textContent = this.getInitials(cust.name);
        if (nameEl) nameEl.textContent = cust.name;
        if (metaEl) {
            const parts = [];
            if (cust.village) parts.push(cust.village);
            if (dispPhone) parts.push(dispPhone.replace(/ /g, ' ')); // keep "+91 94430 12345" on one line
            metaEl.textContent = parts.join(' · ') || 'Customer';
        }

        const callBtn = document.getElementById('cdmCallBtn');
        if (callBtn) {
            if (dispPhone) {
                callBtn.href = `tel:${dispPhone.replace(/\s+/g, '')}`;
                callBtn.style.display = 'inline-flex';
            } else {
                callBtn.style.display = 'none';
            }
        }

        const waTxt = document.getElementById('cdmWhatsAppRemindTxt');
        if (waTxt) {
            waTxt.textContent = agg.totalPending > 0 ? 'Remind' : 'WhatsApp';
        }

        // Tab Badge Count
        const tabBoresBadge = document.getElementById('cdmTabBoresCountBadge');
        if (tabBoresBadge) tabBoresBadge.textContent = agg.totalBookings;

        // 2. Payment Summary (Clean Trio)
        const bkPill = document.getElementById('cdmBookingBreakdownPill');
        if (bkPill) bkPill.textContent = `${agg.finalBillsCount} ${agg.finalBillsCount === 1 ? 'Bill' : 'Bills'} • ${agg.quotesCount} ${agg.quotesCount === 1 ? 'Quote' : 'Quotes'}`;

        const totBilledEl = document.getElementById('cdmTotalBilled');
        if (totBilledEl) totBilledEl.textContent = this.formatINR(agg.totalBilled);

        const totPaidEl = document.getElementById('cdmTotalPaid');
        if (totPaidEl) totPaidEl.textContent = this.formatINR(agg.totalPaid);

        const totDueEl = document.getElementById('cdmTotalDue');
        const hasDue = agg.totalPending > 0;
        const balCard = document.getElementById('cdmBalanceCard');
        if (balCard) balCard.classList.toggle('has-due', hasDue);
        if (avatarEl) avatarEl.classList.toggle('has-due', hasDue);
        const balLbl = document.getElementById('cdmBalanceLbl');
        if (balLbl) balLbl.textContent = hasDue ? 'Still to receive' : (agg.totalBilled > 0 ? 'All paid' : 'No bills yet');
        if (totDueEl) {
            totDueEl.textContent = hasDue ? this.formatINR(agg.totalPending) : (agg.totalBilled > 0 ? '₹0 · Settled' : '₹0');
            totDueEl.className = `cdm2-bal-amt ${hasDue ? 'text-danger' : 'text-green'}`;
        }
        const paidBar = document.getElementById('cdmPaidBar');
        if (paidBar) paidBar.style.width = `${agg.totalBilled > 0 ? Math.min(100, Math.round((agg.totalPaid / agg.totalBilled) * 100)) : 0}%`;
        const boresMini = document.getElementById('cdmBoresMini');
        if (boresMini) boresMini.textContent = `${agg.boresCount} · ${agg.totalDrilledFt.toLocaleString('en-IN')} ft`;

        // 3. Borewell & Pipe Summary (Clean Key-Value List)
        const sitesPill = document.getElementById('cdmSitesCountPill');
        if (sitesPill) sitesPill.textContent = allSites.length ? allSites.slice(0, 3).join(', ') + (allSites.length > 3 ? ` +${allSites.length - 3}` : '') : '—';

        const boresCountEl = document.getElementById('cdmTotalBoresCount');
        const boresTypeSubEl = document.getElementById('cdmBoresTypeSub');
        if (boresCountEl) boresCountEl.textContent = `${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'}`;
        if (boresTypeSubEl) boresTypeSubEl.textContent = `New bore: ${agg.newBoresCount} · Re-bore: ${agg.reBoresCount}`;

        const drilledFtEl = document.getElementById('cdmTotalDrilledFt');
        const drillCostSubEl = document.getElementById('cdmTotalDrillCostSub');
        if (drilledFtEl) drilledFtEl.textContent = `${agg.totalDrilledFt.toLocaleString('en-IN')} ft`;
        if (drillCostSubEl) {
            drillCostSubEl.textContent = `Drilling ${this.formatINR(agg.totalDrillingCost)}${agg.totalOldBoreFt > 0 ? ` · flush ${agg.totalOldBoreFt} ft` : ''}`;
        }

        const pipeFtEl = document.getElementById('cdmTotalPipeFt');
        const pipeSubEl = document.getElementById('cdmPipeBreakdownSub');
        if (pipeFtEl) pipeFtEl.textContent = `${agg.totalPipeFt.toLocaleString('en-IN')} ft`;
        if (pipeSubEl) {
            // "7\" Casing Pipe" → "7\"" so the line stays short
            const short = (n, d) => (String(n || '').match(/^\s*[\d.]+\s*(?:"|inch)/i) || [d])[0].trim();
            pipeSubEl.textContent = `${short(this.getCasing1Name?.(), '7"')} ${agg.totalPvc7Ft} ft · ${short(this.getCasing2Name?.(), '10"')} ${agg.totalPvc10Ft} ft · ${this.formatINR(agg.totalPipeCost)}`;
        }

        // 4. Filter Pills Counts in Bore Details Tab
        const fAllBtn = document.getElementById('cdmFilterAllBtn');
        const fBillsBtn = document.getElementById('cdmFilterBillsBtn');
        const fQuotesBtn = document.getElementById('cdmFilterQuotesBtn');
        if (fAllBtn) fAllBtn.textContent = `All (${agg.totalBookings})`;
        if (fBillsBtn) fBillsBtn.textContent = `Bills (${agg.finalBillsCount})`;
        if (fQuotesBtn) fQuotesBtn.textContent = `Quotes (${agg.quotesCount})`;

        document.querySelectorAll('#cdmBoreFilterPills .cdm-bf-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.cdmfilter === this.cdmActiveBoreFilter);
        });

        if (viewMode) {
            this.switchCustomerDetailView(viewMode);
        } else if (!isSameCustomer || !this.cdmActiveView) {
            this.switchCustomerDetailView('bores');
        } else {
            this.switchCustomerDetailView(this.cdmActiveView);
        }

        this.renderCustomerDetailModalBores(cust, agg);
        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    renderCustomerDetailModalBores(cust, agg) {
        const listEl = document.getElementById('cdmBoresList');
        const selectorBarEl = document.getElementById('cdmBoreSelectorBar');
        if (!listEl) return;
        const esc = (v) => this.escapeHtml(String(v ?? ''));

        // Filter chips (only when there are quotations next to final bills)
        const filterMode = this.cdmActiveBoreFilter || 'all';
        if (selectorBarEl) {
            if (agg.quotesCount > 0 && agg.finalBillsCount > 0) {
                selectorBarEl.style.display = 'flex';
                selectorBarEl.innerHTML = [['all', `All ${agg.totalBookings}`], ['INVOICE', `Bills ${agg.finalBillsCount}`], ['QUOTATION', `Quotes ${agg.quotesCount}`]]
                    .map(([k, t]) => `<button type="button" class="cdm2-chip ${filterMode === k ? 'active' : ''}" data-cdmfilter="${k}">${t}</button>`).join('');
                selectorBarEl.querySelectorAll('.cdm2-chip').forEach((btn) => btn.addEventListener('click', () => {
                    this.cdmActiveBoreFilter = btn.dataset.cdmfilter;
                    this.renderCustomerDetailModalBores(cust, agg);
                }));
            } else {
                selectorBarEl.style.display = 'none';
                selectorBarEl.innerHTML = '';
            }
        }

        const items = agg.matchingBills.filter(b => {
            const docType = b.snapshot?.docType || 'QUOTATION';
            if (filterMode === 'INVOICE') return docType === 'INVOICE';
            if (filterMode === 'QUOTATION') return docType === 'QUOTATION';
            return true;
        });

        if (items.length === 0) {
            listEl.innerHTML = `
                <div class="cdm2-empty">
                    <p>No bills for this customer yet.</p>
                    <button type="button" class="cdm2-act is-pri" id="cdmEmptyCreateBillBtn">+ New bill</button>
                </div>`;
            document.getElementById('cdmEmptyCreateBillBtn')?.addEventListener('click', () => {
                this.closeCustomerDetailModal();
                this.exitSavedBillMode(false);
                this.selectCustomerIntoBill(cust);
                this.switchTab('tab-bill');
            });
            return;
        }

        if (!this.cdmOpenBores || this.cdmOpenBoresFor !== cust.id) {
            this.cdmOpenBores = new Set(items.length === 1 ? [items[0].id] : []);
            this.cdmOpenBoresFor = cust.id;
        }

        listEl.innerHTML = items.map((item) => {
            const snap = item.snapshot || {};
            const st = this.billSheetStatus(item);
            const open = this.cdmOpenBores.has(item.id);
            const ymd = this.getHistoryItemDateStr(item);
            const site = item.custLocation || cust.village || '';
            const l2 = [ymd ? this.formatPaymentDateDisplay(ymd) : '', Number(snap.totalDepth) > 0 ? `${Number(snap.totalDepth).toLocaleString('en-IN')} ft` : ''].filter(Boolean).join(' · ');
            return `
            <div class="cb-item is-${st.kind}${open ? ' is-open' : ''}">
                <button type="button" class="cb-row clickable-bore-head" data-toggle-bore="${esc(item.id)}" aria-expanded="${open}">
                    <span class="cb-bar" aria-hidden="true"></span>
                    <span class="cb-main">
                        <span class="cb-l1"><strong>#${esc(item.billNo || '')}</strong> · ${snap.drillingType === 'repair' ? 'Re-bore' : 'New bore'}</span>
                        <span class="cb-l2">${esc(l2)}</span>
                    </span>
                    <span class="cb-right">
                        <strong class="cb-amt">${this.formatINR(Math.round(snap.grandTotal || 0))}</strong>
                        <span class="bs-status is-${st.kind}">${esc(st.label)}</span>
                    </span>
                    <span class="cb-chev" aria-hidden="true">›</span>
                </button>
                <div class="cb-body cbc-body-collapse${open ? ' is-open' : ''}" id="cbcBody_${esc(item.id)}">
                    ${this.billSheetHtml(item, { payButtonClass: 'cdm-bore-pay-btn', siteName: site, nested: true })}
                    <div class="cb-actions">
                        <button type="button" class="bdm-act is-wa cdm-bore-wa-btn" data-id="${esc(item.id)}">WhatsApp</button>
                        <button type="button" class="bdm-act cdm-bore-edit-btn" data-id="${esc(item.id)}">Edit</button>
                        <button type="button" class="bdm-act is-pri cdm-bore-view-btn" data-id="${esc(item.id)}">Bill / PDF</button>
                    </div>
                </div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.clickable-bore-head').forEach(head => {
            head.addEventListener('click', () => {
                const id = head.dataset.toggleBore;
                const willOpen = !this.cdmOpenBores.has(id);
                if (willOpen) this.cdmOpenBores.add(id); else this.cdmOpenBores.delete(id);
                head.setAttribute('aria-expanded', String(willOpen));
                head.closest('.cb-item')?.classList.toggle('is-open', willOpen);
                document.getElementById(`cbcBody_${id}`)?.classList.toggle('is-open', willOpen);
            });
        });
        listEl.querySelectorAll('.cdm-bore-pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRecordPaymentModal(btn.dataset.id);
            });
        });
        listEl.querySelectorAll('.cdm-bore-wa-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareSavedHistoryBillOnWhatsApp(btn.dataset.id);
            });
        });
        listEl.querySelectorAll('.cdm-bore-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCustomerDetailModal();
                this.loadBillFromHistory(btn.dataset.id, false, true);
            });
        });
        listEl.querySelectorAll('.cdm-bore-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCustomerDetailModal();
                this.loadBillFromHistory(btn.dataset.id, true, true);
            });
        });
    }

    closeCustomerDetailModal() {
        const overlay = document.getElementById('custDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailCustomerId = null;
    }

    renderQuickCustomerPicker(query = '') {
        const listEl = document.getElementById('quickCustList');
        const countBadge = document.getElementById('wizCustCountBadge');
        const filterPillsEl = document.getElementById('wizCustFilterPills');
        if (countBadge) {
            countBadge.textContent = `${this.customers.length} Saved`;
        }
        if (!listEl) return;

        // Build dynamic filter pills: All, Recent, + unique villages
        if (filterPillsEl) {
            const uniqueVillages = [];
            const seenV = new Set();
            this.customers.forEach(c => {
                const v = (c.village || '').trim();
                if (v && !seenV.has(v.toLowerCase()) && uniqueVillages.length < 5) {
                    seenV.add(v.toLowerCase());
                    uniqueVillages.push(v);
                }
            });

            if (this.wizCustFilter !== 'ALL' && this.wizCustFilter !== 'RECENT') {
                const stillExists = uniqueVillages.some(v => v.toLowerCase() === this.wizCustFilter.toLowerCase());
                if (!stillExists) this.wizCustFilter = 'ALL';
            }

            let pillsHtml = `
                <button type="button" class="wiz-flt-pill ${this.wizCustFilter === 'ALL' ? 'active' : ''}" data-wflt="ALL">All (${this.customers.length})</button>
                <button type="button" class="wiz-flt-pill ${this.wizCustFilter === 'RECENT' ? 'active' : ''}" data-wflt="RECENT">Recent</button>
            `;
            uniqueVillages.forEach(v => {
                const isAct = this.wizCustFilter.toLowerCase() === v.toLowerCase();
                pillsHtml += `
                    <button type="button" class="wiz-flt-pill ${isAct ? 'active' : ''}" data-wflt="${v}">${v}</button>
                `;
            });
            filterPillsEl.innerHTML = pillsHtml;

            filterPillsEl.querySelectorAll('.wiz-flt-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    this.wizCustFilter = pill.dataset.wflt || 'ALL';
                    this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
                });
            });
        }

        const rawQ = (query || '').trim();
        const q = rawQ.toLowerCase();
        const currentSelectedPhone = this.normalizeMobileNumber(document.getElementById('custPhone')?.value || '');
        const currentSelectedName = (document.getElementById('custName')?.value || '').trim().toLowerCase();

        let baseList = [...this.customers];
        if (this.wizCustFilter === 'RECENT') {
            baseList = baseList.slice(0, 6);
        } else if (this.wizCustFilter !== 'ALL') {
            baseList = baseList.filter(c => (c.village || '').trim().toLowerCase() === this.wizCustFilter.toLowerCase());
        }

        const filtered = baseList.filter(c => {
            if (!q) return true;
            return (
                (c.name || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.village || '').toLowerCase().includes(q)
            );
        });

        if (filtered.length === 0) {
            if (rawQ) {
                listEl.innerHTML = `
                    <div class="wiz-no-match-box">
                        <div class="wiz-nm-text">
                            <strong>No customer found for "${this.escapeHtml(rawQ)}"</strong>
                            <small>1-click-la puthu customer-a save panni bill-ku select pannalam</small>
                        </div>
                        <button type="button" class="btn-chip-primary" id="wizInstantCreateCustBtn">
                            ＋ Create "${this.escapeHtml(rawQ.slice(0, 16))}"
                        </button>
                    </div>
                `;
                document.getElementById('wizInstantCreateCustBtn')?.addEventListener('click', () => {
                    const isDigits = /^[\d+\s-]+$/.test(rawQ) && /\d{3,}/.test(rawQ);
                    this.openCustomerPopupModal({
                        fromBill: true,
                        prefill: {
                            name: isDigits ? '' : rawQ,
                            phone: isDigits ? rawQ : '',
                            village: ''
                        }
                    });
                });
            } else {
                listEl.innerHTML = `
                    <div class="wiz-no-match-box">
                        <div class="wiz-nm-text">
                            <strong>No saved customers yet</strong>
                            <small>Tap "Add Customer" to add Name, Mobile & Place</small>
                        </div>
                        <button type="button" class="btn-chip-primary" id="wizEmptyAddCustBtn">
                            ＋ Add Customer
                        </button>
                    </div>
                `;
                document.getElementById('wizEmptyAddCustBtn')?.addEventListener('click', () => {
                    this.openCustomerPopupModal({ fromBill: true });
                });
            }
            return;
        }

        const billsIndex = this.buildCustomerBillsIndex();
        const siteIndex = this.buildCustomerSiteIndex();
        const displaySlice = filtered.slice(0, 35);

        let pickerCardsHtml = displaySlice.map(c => {
            const cPhone = this.normalizeMobileNumber(c.phone || '');
            const dispPhone = this.formatPhoneWithCountryCode(c.phone || '', c.countryCode || this.defaultCountryCode);
            const isSelected = (currentSelectedPhone && cPhone && currentSelectedPhone === cPhone) ||
                (!currentSelectedPhone && currentSelectedName && (c.name || '').trim().toLowerCase() === currentSelectedName);
            const agg = this.getCustomerAggregates(c, billsIndex);
            const { pastSites } = this.getCustomerSiteSuggestions(c, siteIndex);
            const sitesSub = pastSites.length > 0 ? ` · +${pastSites.length} site${pastSites.length === 1 ? '' : 's'}` : '';
            const dueChipHtml = agg.totalPending > 0 ? `<span class="wiz-cust-due-chip">Due ${this.formatINR(agg.totalPending)}</span>` : '';
            const metaParts = [c.village ? this.escapeHtml(c.village) : '', dispPhone ? this.escapeHtml(dispPhone) : '', `${agg.billsCount} ${agg.billsCount === 1 ? 'bill' : 'bills'}`].filter(Boolean);

            return `
            <button type="button" class="wiz-cust-card ${isSelected ? 'is-selected' : ''}" data-id="${c.id}">
                <div class="wiz-cc-left">
                    <div class="wiz-cc-avatar ${agg.totalPending > 0 ? 'has-due' : ''}">${this.escapeHtml(this.getInitials(c.name))}</div>
                    <div class="wiz-cc-info">
                        <div class="wiz-cc-name-row">
                            <span class="wiz-cc-name">${this.escapeHtml(c.name)}</span>
                        </div>
                        <div class="wiz-cc-meta">${metaParts.join(' · ')}${sitesSub}</div>
                    </div>
                </div>
                <span class="wiz-cc-right">
                    ${dueChipHtml}
                    <span class="wiz-cc-pick-badge">${isSelected ? '✓ Picked' : 'Pick'}</span>
                </span>
            </button>
        `;
        }).join('');

        if (filtered.length > displaySlice.length) {
            pickerCardsHtml += `
                <div style="text-align:center; padding: 12px 6px; font-size: var(--fs-sm); color: var(--text-muted); grid-column: 1 / -1; width: 100%;">
                    + ${filtered.length - displaySlice.length} more customers. Refine name or phone above to filter.
                </div>
            `;
        }

        listEl.innerHTML = pickerCardsHtml;

        listEl.querySelectorAll('.wiz-cust-card').forEach(item => {
            item.addEventListener('click', () => {
                const cust = this.customers.find(x => x.id === item.dataset.id);
                if (cust) {
                    this.selectCustomerIntoBill(cust, '');
                    const panel = document.getElementById('quickCustPickerPanel');
                    if (panel) panel.style.display = 'none';
                    this.calculateAndRender();
                    this.showToast(`👤 ${cust.name} selected — now enter Drilling Depth!`);
                }
            });
        });
    }

    selectCustomerIntoBill(cust, initialSite = '') {
        document.getElementById('custName').value = cust.name || '';
        document.getElementById('custPhone').value = this.formatPhoneWithCountryCode(cust.phone || '', cust.countryCode || this.defaultCountryCode);
        const custGstEl = document.getElementById('custGstInput');
        if (custGstEl) {
            custGstEl.value = (cust.gstNumber || '').trim().toUpperCase();
        }
        const cleanInitialSite = (initialSite || cust.village || cust.place || '').trim();
        const locInput = document.getElementById('custLocation');
        if (locInput) {
            locInput.value = cleanInitialSite;
        }
        this.isEditingServiceSite = !Boolean(cleanInitialSite);
        const siteSection = document.getElementById('serviceSiteSection');
        if (siteSection) {
            siteSection.style.display = this.isEditingServiceSite ? 'block' : 'none';
        }
        const pickerPanel = document.getElementById('quickCustPickerPanel');
        if (pickerPanel) {
            pickerPanel.style.display = 'none';
        }

        // Immediately reveal Drilling section upon customer selection
        const drillSection = document.getElementById('progDrillingSection');
        const rateBataWrap = document.getElementById('drillingRateBataWrap');
        if (drillSection) drillSection.style.display = 'block';
        if (rateBataWrap) rateBataWrap.style.display = 'flex';

        this.calculateAndRender();
        this.updateBillPhoneValidationUI(false);
        this.renderCustomerSiteSuggestions();
        this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');

        const isRepair = this.state.drillingType === 'repair';
        const oldBoreInput = document.getElementById('oldBoreDepth');
        const depthInput = document.getElementById('totalDepth');
        const nextTarget = (isRepair && oldBoreInput && !oldBoreInput.value) ? oldBoreInput : depthInput;
        if (nextTarget) {
            setTimeout(() => {
                nextTarget.focus();
                try { nextTarget.select(); } catch (_) {}
            }, 80);
        }
    }

    /* ==========================================================================
       SAAS WHITE-LABEL BRANDING & LOGO MANAGEMENT
       ========================================================================== */
}
