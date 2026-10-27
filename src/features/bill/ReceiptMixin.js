// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';
import { I18N_DICTIONARY } from '../../i18n/dictionary.js';

export class ReceiptMixin {
    renderReceiptUI(res, options = {}) {
        const prevSnap = this._prevStickySnap;
        const totalPipeCost = (res.pvc7Cost || 0) + (res.pvc10Cost || 0);

        const totalBannerEl = document.getElementById('liveTotalBannerAmount');
        if (totalBannerEl) {
            totalBannerEl.textContent = this.formatINR(res.grandTotal);
        }
        document.getElementById('liveSummaryDepthBadge').textContent = `${res.totalDepth || 0} ft • ${res.boreDia}`;
        document.getElementById('liveSummaryPerFt').textContent = `Base: ₹${res.baseDrillingRate || 90}/ft`;

        const stickyDrillCost = document.getElementById('liveStickyDrillCost');
        if (stickyDrillCost) {
            stickyDrillCost.textContent = this.formatINR(res.drillingCost);
        }

        const stickyPipeText = document.getElementById('liveStickyPipeText');
        if (stickyPipeText) {
            const c1Short = this.getCasing1ShortName();
            const c2Short = this.getCasing2ShortName();
            stickyPipeText.textContent = `${c1Short}: ${res.pvc7Length || 0}ft • ${c2Short}: ${res.pvc10Length || 0}ft`;
        }

        const stickyPipeCost = document.getElementById('liveStickyPipeCost');
        if (stickyPipeCost) {
            stickyPipeCost.textContent = this.formatINR(totalPipeCost);
        }

        // Subtle, single-shot attention animation when Depth, Pipes, or Total changes
        if (prevSnap) {
            const depthChanged = prevSnap.totalDepth !== res.totalDepth || prevSnap.oldBoreDepth !== res.oldBoreDepth || prevSnap.drillingCost !== res.drillingCost;
            const pipeChanged = prevSnap.pvc7Length !== res.pvc7Length || prevSnap.pvc10Length !== res.pvc10Length || prevSnap.totalPipeCost !== totalPipeCost;
            const totalChanged = prevSnap.grandTotal !== res.grandTotal;

            if (depthChanged) {
                this.triggerOneShotPulse(document.getElementById('stickyDrillPill'), 'sticky-pill-flash');
                this.triggerOneShotPulse(stickyDrillCost, 'sticky-val-pop');
            }
            if (pipeChanged) {
                this.triggerOneShotPulse(document.getElementById('stickyPipePill'), 'sticky-pill-flash');
                this.triggerOneShotPulse(stickyPipeCost, 'sticky-val-pop');
            }
            if (totalChanged || depthChanged || pipeChanged) {
                this.triggerOneShotPulse(totalBannerEl, 'sticky-val-pop');
                this.triggerOneShotPulse(document.getElementById('wizNavLiveTotal'), 'sticky-val-pop');
            }
        }

        this._prevStickySnap = {
            totalDepth: res.totalDepth,
            oldBoreDepth: res.oldBoreDepth,
            drillingCost: res.drillingCost,
            pvc7Length: res.pvc7Length,
            pvc10Length: res.pvc10Length,
            totalPipeCost,
            grandTotal: res.grandTotal
        };

        const stickyDocTag = document.getElementById('stickyDocTypeTag');
        if (stickyDocTag) {
            stickyDocTag.textContent = res.docType === 'INVOICE' ? 'FINAL BILL' : 'QUOTATION';
        }

        const balBadge = document.getElementById('liveBalanceBadge');
        if (balBadge) {
            if (res.advancePaidAmount > 0 && res.balancePayable > 0) {
                balBadge.style.display = 'inline-flex';
                balBadge.className = 'live-bar-balance has-due';
                balBadge.textContent = `Due: ${this.formatINR(res.balancePayable)}`;
            } else {
                balBadge.style.display = 'none';
            }
        }

        // Live Calculated Pending / Balance Due Badge inside Extras & Advance Drawer
        const advDueBadge = document.getElementById('advanceBalanceDueBadge');
        const advDueAmt = document.getElementById('advanceLiveDueAmount');
        if (advDueBadge && advDueAmt) {
            if (res.advancePaidAmount > 0 && res.balancePayable > 0) {
                advDueBadge.style.display = 'flex';
                advDueBadge.className = 'advance-due-calc-pill';
                advDueAmt.textContent = this.formatINR(res.balancePayable);
                const lbl = advDueBadge.querySelector('.adcb-label');
                if (lbl) lbl.textContent = 'Balance Due:';
            } else {
                advDueBadge.style.display = 'none';
            }
        }

        document.getElementById('hintOldBoreRate').textContent = this.formatINR(this.rates.oldBoreRate);
        const liveOldBoreCostEl = document.getElementById('liveInlineOldBoreCost');
        if (liveOldBoreCostEl) {
            liveOldBoreCostEl.textContent = this.formatINR(res.oldBoreCost || 0);
        }
        document.getElementById('hintPvc7Rate').textContent = this.formatINR(this.rates.pvc7Rate);
        const pvc7CostEl = document.getElementById('liveInlinePvc7Cost');
        if (pvc7CostEl) {
            pvc7CostEl.textContent = this.formatINR(res.pvc7Cost || 0);
            pvc7CostEl.classList.toggle('has-cost', (res.pvc7Cost || 0) > 0);
        }

        document.getElementById('hintPvc10Rate').textContent = this.formatINR(this.rates.pvc10Rate);
        const pvc10CostEl = document.getElementById('liveInlinePvc10Cost');
        if (pvc10CostEl) {
            pvc10CostEl.textContent = this.formatINR(res.pvc10Cost || 0);
            pvc10CostEl.classList.toggle('has-cost', (res.pvc10Cost || 0) > 0);
        }
        document.getElementById('gstPillPercent').textContent = this.rates.gstPercentage;

        // Show/hide Optional Client GSTIN row right below 18% GST toggle when GST is ON/OFF
        const custGstRow = document.getElementById('custGstInlineRow');
        const clearCustGstBtn = document.getElementById('clearCustGstBtn');
        if (custGstRow) {
            custGstRow.style.display = res.gstEnabled ? 'flex' : 'none';
        }
        if (clearCustGstBtn) {
            clearCustGstBtn.style.display = (this.state.custGst || '').trim() ? 'inline-flex' : 'none';
        }

        // Sync Quick Rate Drawer fields if user edited pipe rate, old bore rate, or bata inline
        const qOldBore = document.getElementById('quickOldBoreRate');
        const qPvc7 = document.getElementById('quickPvc7Rate');
        const qPvc10 = document.getElementById('quickPvc10Rate');
        const qBata = document.getElementById('quickBoreBata');
        if (qOldBore && document.activeElement !== qOldBore) qOldBore.value = this.rates.oldBoreRate;
        if (qPvc7 && document.activeElement !== qPvc7) qPvc7.value = this.rates.pvc7Rate;
        if (qPvc10 && document.activeElement !== qPvc10) qPvc10.value = this.rates.pvc10Rate;
        if (qBata && document.activeElement !== qBata) qBata.value = this.rates.boreBataRate;

        const drillBadge = document.getElementById('liveInlineDrillingCostBadge');
        if (drillBadge) drillBadge.textContent = this.formatINR(res.drillingCost);

        const casingBadge = document.getElementById('liveInlineCasingTotalBadge');
        if (casingBadge) casingBadge.textContent = this.formatINR(res.pvc7Cost + res.pvc10Cost);

        // Live Active Slab Tag inside Total Drilling Depth box
        const activeSlabTag = document.getElementById('liveActiveSlabTag');
        if (activeSlabTag) {
            if (res.slabDetails && res.slabDetails.length > 0) {
                const topSlab = res.slabDetails[res.slabDetails.length - 1];
                activeSlabTag.textContent = `${res.slabDetails.length} ${res.slabDetails.length === 1 ? 'Slab' : 'Slabs'} • Top: ${topSlab.range} @ ₹${topSlab.rate}/ft`;
            } else {
                activeSlabTag.textContent = 'Enter drilling depth (ft)';
            }
        }

        // Render Compact Smart Slab Rate Dropdown right below Drilling Depth input
        this.renderInlineSmartSlabDropdown(res, options);

        // Extras / Advance Active Dot Indicator
        const extrasDot = document.getElementById('extrasActiveBadge');
        if (extrasDot) {
            const hasExtras = (res.collarCapCost + res.transportSurveyCost + res.customExtraAmount + res.discountAmount + res.advancePaidAmount) > 0;
            extrasDot.style.display = hasExtras ? 'inline-block' : 'none';
        }

        // Optional Note / Remark Active Dot & Clear Button
        const hasNote = Boolean((res.customNote || '').trim());
        const notesDot = document.getElementById('notesActiveBadge');
        const clearNoteBtn = document.getElementById('clearBillNoteBtn');
        const noteBtnTxt = document.getElementById('billNotesToggleBtnText');
        if (notesDot) notesDot.style.display = hasNote ? 'inline-block' : 'none';
        if (clearNoteBtn) clearNoteBtn.style.display = hasNote ? 'inline-block' : 'none';
        if (noteBtnTxt) noteBtnTxt.textContent = hasNote ? '📝 Note Added' : '+ Note / Remark';

        document.querySelectorAll('.depth-chip').forEach(c => {
            c.classList.toggle('active', res.totalDepth > 0 && parseInt(c.dataset.depth, 10) === res.totalDepth);
        });
        document.querySelectorAll('.pipe-chip').forEach(c => {
            const targetVal = c.dataset.target === 'pvc7Length' ? res.pvc7Length : res.pvc10Length;
            c.classList.toggle('active', targetVal > 0 && parseFloat(c.dataset.val) === targetVal);
        });

        document.getElementById('receiptDocBadge').textContent = this.getDocTypeTitle(res.docType);

        const billNoVal = document.getElementById('billNoInput')?.value || 'AB-101';
        document.getElementById('receiptBillNo').textContent = `No: #${billNoVal}`;
        const autoSeqBadge = document.getElementById('autoSeqHintBadge');
        if (autoSeqBadge) {
            autoSeqBadge.textContent = `${res.docType === 'INVOICE' ? 'Bill' : 'Quote'} #${billNoVal}`;
        }

        const rawDate = document.getElementById('billDateInput')?.value;
        const formattedDate = rawDate
            ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        document.getElementById('receiptDateText').textContent = formattedDate;
        const ctrlDateBadge = document.getElementById('controlLiveDateBadge');
        if (ctrlDateBadge) ctrlDateBadge.textContent = formattedDate;

        const cName = this.state.custName;
        const cPhone = this.formatPhoneWithCountryCode(this.state.custPhone || '');
        const cLoc = this.state.custLocation;
        const cGst = res.gstEnabled ? (res.custGst || '') : '';

        const hasCustomer = Boolean(cName || cPhone || cLoc || cGst);
        const activeCust = hasCustomer ? this.findActiveBillCustomer() : null;
        const custPlace = (activeCust?.village || '').trim();

        // Sync 2-Step Wizard Stepper Subtitles & Bottom Nav Total
        const stepSub1 = document.getElementById('wizStepSub1');
        const stepSub2 = document.getElementById('wizStepSub2');
        const wizNavTotal = document.getElementById('wizNavLiveTotal');
        if (stepSub1) {
            if (hasCustomer) {
                const namePart = cName || cPhone || 'Customer';
                stepSub1.textContent = cLoc ? `${namePart} • 📍 ${cLoc}` : namePart;
            } else {
                stepSub1.textContent = 'Pick & Site';
            }
        }
        if (stepSub2) {
            const totalPipeFt = (res.pvc7Length || 0) + (res.pvc10Length || 0);
            const depthTxt = res.totalDepth > 0 ? `${res.totalDepth} ft` : 'Depth';
            const pipeTxt = totalPipeFt > 0 ? ` • ${totalPipeFt}ft Pipe` : '';
            stepSub2.textContent = `${depthTxt}${pipeTxt} • ${this.formatINR(res.grandTotal)}`;
        }
        if (wizNavTotal) {
            wizNavTotal.textContent = this.formatINR(res.grandTotal);
        }

        // Sync Step 2 Live Depth Slab Breakdown Box
        const wizSlabTotal = document.getElementById('wizLiveSlabTotalTxt');
        const wizSlabPills = document.getElementById('wizLiveSlabPills');
        if (wizSlabTotal) {
            wizSlabTotal.textContent = this.formatINR(res.drillingCost);
        }
        if (wizSlabPills) {
            if (res.slabDetails && res.slabDetails.length > 0) {
                wizSlabPills.innerHTML = res.slabDetails.map(s => `
                    <span class="wiz-slab-chip">
                        <strong>${s.range}:</strong> ${s.depth}ft × ₹${s.rate} = ${this.formatINR(s.cost)}
                    </span>
                `).join('');
            } else {
                wizSlabPills.textContent = 'Enter Total Drilling Depth above to see 100ft progressive slab breakdown.';
            }
        }

        document.getElementById('receiptCustomerBox').style.display = hasCustomer ? 'block' : 'none';
        this.toggleCustField('rcptCustNameWrap', 'rcptCustName', cName);
        this.toggleCustField('rcptCustPhoneWrap', 'rcptCustPhone', cPhone);
        this.toggleCustField('rcptCustLocWrap', 'rcptCustLoc', cLoc || custPlace);
        this.toggleCustField('rcptCustGstWrap', 'rcptCustGst', cGst);

        const custCard = document.getElementById('customerCard');
        const selSummaryBar = document.getElementById('selectedCustomerSummaryBar');
        const avatarBadge = document.getElementById('custCardIconBadge');
        const custHeading = document.getElementById('custCardMainHeading');
        const custStatusTag = document.getElementById('custStatusTag');
        const billsBadge = document.getElementById('selCustBillsBadge');
        const editCustBtn = document.getElementById('editSelectedCustomerBtn');
        const openPickerBtn = document.getElementById('openCustomerPickerBtn');
        const openPickerBtnTxt = document.getElementById('openCustomerPickerBtnText');
        const quickClearBtn = document.getElementById('quickClearCustomerChip');
        const closePickerBtn = document.getElementById('closeQuickCustPickerBtn');
        const pickerPanel = document.getElementById('quickCustPickerPanel');
        const subEl = document.getElementById('customerPreviewSub');
        const siteCompactBtn = document.getElementById('selectedSiteCompactBtn');
        const siteCompactTxt = document.getElementById('selectedSiteCompactText');
        const siteSection = document.getElementById('serviceSiteSection');
        const clearSiteBtn = document.getElementById('clearSiteLocationBtn');
        const sameSiteBtn = document.getElementById('siteModeSameBtn');
        const diffSiteBtn = document.getElementById('siteModeDiffBtn');

        const isPickerOpen = Boolean(pickerPanel && pickerPanel.style.display !== 'none');
        custCard?.classList.toggle('has-customer', hasCustomer && !isPickerOpen);
        if (selSummaryBar) {
            selSummaryBar.style.display = (hasCustomer && !isPickerOpen) ? 'block' : 'none';
        }
        if (avatarBadge) {
            avatarBadge.textContent = this.getInitials(cName || 'CU');
        }
        if (custHeading) {
            custHeading.textContent = hasCustomer
                ? (cName || I18N_DICTIONARY[this.lang].customerDetails)
                : I18N_DICTIONARY[this.lang].customerDetails;
        }
        const custDueBadge = document.getElementById('selCustDueBadge');
        if (activeCust) {
            const agg = this.getCustomerAggregates(activeCust);
            if (billsBadge && agg) {
                if (agg.billsCount > 0) {
                    billsBadge.style.display = 'inline-flex';
                    billsBadge.textContent = `${agg.billsCount} ${agg.billsCount === 1 ? 'Bill' : 'Bills'}`;
                } else {
                    billsBadge.style.display = 'none';
                }
            }
            if (custDueBadge && agg) {
                if (agg.totalPending > 0) {
                    custDueBadge.style.display = 'inline-flex';
                    custDueBadge.textContent = `Due: ${this.formatINR(agg.totalPending)}`;
                    custDueBadge.title = `Customer has ${this.formatINR(agg.totalPending)} unpaid balance from earlier bills`;
                } else {
                    custDueBadge.style.display = 'none';
                }
            }
        } else {
            if (billsBadge) billsBadge.style.display = 'none';
            if (custDueBadge) custDueBadge.style.display = 'none';
        }
        if (editCustBtn) {
            editCustBtn.style.display = hasCustomer ? 'inline-flex' : 'none';
        }
        if (openPickerBtn) {
            openPickerBtn.style.display = 'none';
        }
        if (closePickerBtn) {
            closePickerBtn.style.display = hasCustomer ? 'inline-flex' : 'none';
        }
        if (!hasCustomer && pickerPanel) {
            pickerPanel.style.display = 'block';
        }
        if (quickClearBtn) {
            quickClearBtn.style.display = hasCustomer ? 'inline-flex' : 'none';
        }

        // Show big Service Site search box ONLY while site is empty or being actively edited;
        // once site is selected, collapse it and show only compact Name + Mobile + 📍 Site!
        const isSiteInputFocused = document.activeElement && document.activeElement.id === 'custLocation';
        const showSiteEditorBox = hasCustomer && (!cLoc || this.isEditingServiceSite || isSiteInputFocused);
        if (siteSection) {
            siteSection.style.display = showSiteEditorBox ? 'block' : 'none';
        }
        if (clearSiteBtn) {
            clearSiteBtn.style.display = cLoc ? 'inline-flex' : 'none';
        }
        if (subEl) {
            subEl.textContent = (hasCustomer && cPhone) ? `📞 ${cPhone}` : '';
        }
        if (siteCompactBtn && siteCompactTxt) {
            if (hasCustomer && cLoc) {
                siteCompactTxt.textContent = cLoc;
                siteCompactBtn.style.display = 'inline-flex';
            } else {
                siteCompactBtn.style.display = 'none';
            }
        }

        // Auto-reveal Drilling section after Customer + Service Site, and PVC Casing + Receipt after Drilling Depth!
        this.syncProgressiveBillSections(res);

        const typeStr = res.drillingType === 'repair'
            ? `Re-Bore (${res.boreDia})`
            : `New Bore (${res.boreDia})`;
        document.getElementById('rcptWorkType').textContent = typeStr;
        document.getElementById('rcptTotalDepth').textContent = res.totalDepth > 0 ? `${res.totalDepth} ft` : '—';
        document.getElementById('rcptBaseRate').textContent = `₹${res.baseDrillingRate}/ft`;
        document.getElementById('rcptCasingSummary').textContent = `${res.pvc7Length || 0}ft / ${res.pvc10Length || 0}ft`;

        const slabContainer = document.getElementById('receiptSlabRows');
        if (res.slabDetails && res.slabDetails.length > 0) {
            slabContainer.innerHTML = res.slabDetails.map(s => `
                <div class="slab-row">
                    <span class="s-range">${s.range}</span>
                    <span class="s-feet">${s.depth} ft</span>
                    <span class="s-rate">₹${s.rate}</span>
                    <span class="s-cost">${this.formatINR(s.cost)}</span>
                </div>
            `).join('');
        } else {
            slabContainer.innerHTML = `
                <div class="slab-row">
                    <span class="s-range" style="color:var(--text-muted);">—</span>
                    <span class="s-feet">—</span>
                    <span class="s-rate">₹${res.baseDrillingRate}</span>
                    <span class="s-cost">₹0</span>
                </div>
            `;
        }

        const c1Name = this.getCasing1Name();
        const c2Name = this.getCasing2Name();
        document.getElementById('rcptDrillingTotal').textContent = this.formatINR(res.drillingCost);
        document.getElementById('rcptPvc7Label').textContent = `${c1Name} (${res.pvc7Length || 0} ft × ₹${res.pvc7Rate}/ft)`;
        document.getElementById('rcptPvc7Amount').textContent = this.formatINR(res.pvc7Cost);

        document.getElementById('rcptPvc10Label').textContent = `${c2Name} (${res.pvc10Length || 0} ft × ₹${res.pvc10Rate}/ft)`;
        document.getElementById('rcptPvc10Amount').textContent = this.formatINR(res.pvc10Cost);

        document.getElementById('rcptBataAmount').textContent = this.formatINR(res.boreBataCost);

        this.toggleChargeRow('rcptCollarRow', 'rcptCollarAmount', res.collarCapCost);
        this.toggleChargeRow('rcptTransportRow', 'rcptTransportAmount', res.transportSurveyCost);

        const customRow = document.getElementById('rcptCustomExtraRow');
        if (res.customExtraAmount > 0) {
            customRow.style.display = 'flex';
            document.getElementById('rcptCustomExtraLabel').textContent = res.customExtraLabel;
            document.getElementById('rcptCustomExtraAmount').textContent = this.formatINR(res.customExtraAmount);
        } else {
            customRow.style.display = 'none';
        }

        document.getElementById('rcptSubtotal').textContent = this.formatINR(res.grossSubtotal);

        const discRow = document.getElementById('rcptDiscountRow');
        if (res.discountAmount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('rcptDiscountAmount').textContent = `− ${this.formatINR(res.discountAmount)}`;
        } else {
            discRow.style.display = 'none';
        }

        const gstRow = document.getElementById('rcptGstRow');
        if (res.gstEnabled) {
            gstRow.style.display = 'flex';
            document.getElementById('rcptGstLabel').textContent = `GST (${res.gstPercentage}%)`;
            document.getElementById('rcptGstAmount').textContent = this.formatINR(res.gstAmount);
        } else {
            gstRow.style.display = 'none';
        }

        document.getElementById('rcptGrandTotal').textContent = this.formatINR(res.grandTotal);
        const rcptAvgEl = document.getElementById('rcptAvgPerFootSub');
        if (rcptAvgEl) {
            rcptAvgEl.textContent = '';
            rcptAvgEl.style.display = 'none';
        }

        const advRow = document.getElementById('rcptAdvanceRow');
        const balRow = document.getElementById('rcptBalanceRow');
        if (res.advancePaidAmount > 0) {
            advRow.style.display = 'flex';
            balRow.style.display = 'flex';
            document.getElementById('rcptAdvanceAmount').textContent = `− ${this.formatINR(res.advancePaidAmount)}`;
            document.getElementById('rcptBalanceAmount').textContent = this.formatINR(res.balancePayable);
        } else {
            advRow.style.display = 'none';
            balRow.style.display = 'none';
        }

        // Custom Optional Note / Remark on Official Receipt (Shown ONLY if entered)
        const noteBox = document.getElementById('rcptCustomNoteBox');
        const noteTxt = document.getElementById('rcptCustomNoteText');
        if (noteBox && noteTxt) {
            let cleanNote = (res.customNote || '').trim();
            if (res.docType === 'INVOICE' && /பாறை கடினம்|rock strata/i.test(cleanNote)) {
                cleanNote = '';
            }
            if (cleanNote) {
                noteBox.style.display = 'block';
                noteTxt.textContent = cleanNote;
            } else {
                noteBox.style.display = 'none';
                noteTxt.textContent = '';
            }
        }

        // Document-Specific Official Footer Note (Quotation vs Final Bill) & Optional Website
        const rcptTermsEl = document.getElementById('receiptTermsText');
        const isQuoteDoc = (res.docType || 'INVOICE') === 'QUOTATION';
        const footerNote = this.getDocFooterTermsNote(isQuoteDoc ? 'QUOTATION' : 'INVOICE');
        if (rcptTermsEl) {
            rcptTermsEl.textContent = footerNote;
            rcptTermsEl.style.display = footerNote ? 'block' : 'none';
            rcptTermsEl.classList.toggle('is-quotation', isQuoteDoc);
            rcptTermsEl.classList.toggle('is-final-bill', !isQuoteDoc);
        }
        const rcptWebBox = document.getElementById('rcptWebsiteBox');
        const rcptWebTxt = document.getElementById('rcptWebsiteText');
        const cleanWeb = (this.brand?.website || '').trim();
        if (rcptWebBox && rcptWebTxt) {
            rcptWebTxt.textContent = cleanWeb;
            rcptWebBox.style.display = cleanWeb ? 'block' : 'none';
        }
        const quickFooterInp = document.getElementById('quickPreviewFooterNoteInput');
        if (quickFooterInp && document.activeElement !== quickFooterInp) {
            quickFooterInp.value = footerNote;
        }
        const quickWebInp = document.getElementById('quickPreviewWebsiteInput');
        if (quickWebInp && document.activeElement !== quickWebInp) {
            quickWebInp.value = cleanWeb;
        }
        document.querySelectorAll('#previewFooterEditDrawer [data-quick-footer]').forEach(chip => {
            chip.classList.toggle('active', (chip.dataset.quickFooter || '').trim() === footerNote);
        });

        this.updateQuickTabJumpLabel();
    }

    renderInlineSmartSlabDropdown(res = this.lastResult, { skipRowsRebuild = false } = {}) {
        const triggerBtn = document.getElementById('smartSlabDropdownBtn');
        const triggerTxt = document.getElementById('smartSlabDropdownBtnText');
        const triggerArrow = document.getElementById('smartSlabDropdownArrow');
        const panelEl = document.getElementById('smartSlabDropdownPanel');
        const rpPillsEl = document.getElementById('inlineSlabRateCardPills');
        const toggleAllBtn = document.getElementById('toggleAllSlabsInDropdownBtn');
        const rowsEl = document.getElementById('inlineSmartSlabRowsList');
        if (!triggerBtn || !panelEl || !rowsEl) return;

        const isOpen = panelEl.style.display !== 'none';
        triggerBtn.classList.toggle('is-open', isOpen);
        if (triggerArrow) triggerArrow.textContent = isOpen ? '▴' : '▾';

        const slabDetails = res?.slabDetails || [];
        const totalDepth = res?.totalDepth || 0;
        const baseRate = res?.baseDrillingRate || this.rates.baseDrillingRate || 90;

        if (triggerTxt) {
            if (totalDepth > 0 && slabDetails.length > 0) {
                const firstR = slabDetails[0].rate;
                const lastR = slabDetails[slabDetails.length - 1].rate;
                const rateSpanTxt = firstR === lastR ? `₹${firstR}` : `₹${firstR}→₹${lastR}`;
                triggerTxt.textContent = `📊 ${slabDetails.length} ${slabDetails.length === 1 ? 'Slab' : 'Slabs'} (${rateSpanTxt})`;
            } else {
                triggerTxt.textContent = `📊 Slab Rate`;
            }
        }

        const effectiveSlabs = this.getEffectiveSlabs(baseRate, totalDepth);

        if (toggleAllBtn) {
            toggleAllBtn.textContent = this.showAllInlineSlabs
                ? (totalDepth > 0 ? 'Active Slabs Only' : 'Top Slabs')
                : `All ${effectiveSlabs.length} ${effectiveSlabs.length === 1 ? 'Slab' : 'Slabs'}`;
            toggleAllBtn.classList.toggle('active', Boolean(this.showAllInlineSlabs));
        }

        // Render saved Rate Card pills at top of dropdown
        if (rpPillsEl && !skipRowsRebuild) {
            rpPillsEl.innerHTML = (this.rateProfiles || []).map(p => {
                const isAct = p.id === this.activeRateProfileId;
                return `
                    <button type="button" class="ssdp-rp-pill ${isAct ? 'active' : ''}" data-inline-rpid="${p.id}">
                        <span>${p.isDefault ? '★ ' : ''}${this.escapeHtml(p.name)}</span>
                    </button>
                `;
            }).join('');

            rpPillsEl.querySelectorAll('[data-inline-rpid]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.isBillSavedAndReadyToShare = false;
                    this.applyRateProfileToBill(btn.dataset.inlineRpid, true);
                });
            });
        }

        const usedByIndex = new Map();
        slabDetails.forEach(sd => {
            if (typeof sd.slabIndex === 'number' && sd.slabIndex >= 0) {
                usedByIndex.set(sd.slabIndex, sd);
            }
        });

        // If user is actively typing inside a slab rate input, update amounts in-place without destroying focus!
        if (skipRowsRebuild) {
            rowsEl.querySelectorAll('.ssdp-slab-row').forEach(row => {
                const idx = parseInt(row.dataset.rowSlabIdx, 10);
                const used = usedByIndex.get(idx);
                const amtEl = row.querySelector('.ssdp-sr-amt');
                const ftEl = row.querySelector('.ssdp-sr-ft');
                row.classList.toggle('is-used', Boolean(used));
                if (amtEl) {
                    amtEl.textContent = used ? this.formatINR(used.cost) : '—';
                }
                if (ftEl) {
                    ftEl.textContent = used ? `${used.depth} ft` : '';
                    ftEl.style.display = used ? 'inline-block' : 'none';
                }
            });
            return;
        }

        // Determine which slabs to show in compact mode vs "All Slabs" mode
        let indicesToShow = [];
        if (this.showAllInlineSlabs) {
            indicesToShow = effectiveSlabs.map((_, i) => i);
        } else if (totalDepth > 0) {
            effectiveSlabs.forEach((s, i) => {
                if (s.start <= totalDepth || usedByIndex.has(i)) {
                    indicesToShow.push(i);
                }
            });
            // Also show 1 next upcoming slab for quick reference
            const maxIdx = indicesToShow.length > 0 ? Math.max(...indicesToShow) : 0;
            if (maxIdx + 1 < effectiveSlabs.length && !indicesToShow.includes(maxIdx + 1)) {
                indicesToShow.push(maxIdx + 1);
            }
        } else {
            indicesToShow = [0, 1, 2, 3, 4].filter(i => i < effectiveSlabs.length);
        }

        rowsEl.innerHTML = indicesToShow.map(idx => {
            const s = effectiveSlabs[idx];
            if (!s) return '';
            const used = usedByIndex.get(idx);
            const shortRange = s.rangeStr.replace(/\s*Ft/i, ' ft');
            return `
                <div class="ssdp-slab-row ${used ? 'is-used' : ''}" data-row-slab-idx="${idx}">
                    <div class="ssdp-sr-left">
                        <span class="ssdp-sr-range">${shortRange}</span>
                        <span class="ssdp-sr-ft" style="display: ${used ? 'inline-block' : 'none'};">${used ? `${used.depth} ft` : ''}</span>
                    </div>
                    <div class="ssdp-sr-right">
                        <div class="ssdp-sr-input-box">
                            <span>₹</span>
                            <input type="number" class="ssdp-sr-input" data-inline-slab-idx="${idx}" value="${s.rate}" min="1" inputmode="numeric">
                            <small>/ft</small>
                        </div>
                        <strong class="ssdp-sr-amt">${used ? this.formatINR(used.cost) : '—'}</strong>
                    </div>
                </div>
            `;
        }).join('');

        rowsEl.querySelectorAll('.ssdp-sr-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const rawVal = (e.target.value || '').trim();
                if (rawVal === '') return;
                const idx = parseInt(e.target.dataset.inlineSlabIdx, 10);
                const newRate = Math.max(1, parseFloat(rawVal) || 0);
                const activeBase = Math.max(1, parseFloat(document.getElementById('baseDrillingRate')?.value) || this.rates.baseDrillingRate || 90);
                const currentEff = this.getEffectiveSlabs(activeBase, totalDepth);

                this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
                while (this.rates.slabRates.length <= idx && currentEff[this.rates.slabRates.length]) {
                    const ext = currentEff[this.rates.slabRates.length];
                    this.rates.slabRates.push({ ...ext });
                }

                const firstStoredRate = this.rates.slabRates[0]?.rate || 90;
                const delta = activeBase - firstStoredRate;

                if (idx === 0) {
                    currentEff.forEach((es, i) => {
                        if (this.rates.slabRates[i]) {
                            this.rates.slabRates[i].rate = i === 0 ? newRate : es.rate;
                        }
                    });
                    this.rates.baseDrillingRate = newRate;
                    const baseEl = document.getElementById('baseDrillingRate');
                    if (baseEl) baseEl.value = newRate;
                    const masterBase = document.getElementById('masterBaseRate');
                    if (masterBase) masterBase.value = newRate;
                } else if (this.rates.slabRates[idx]) {
                    this.rates.slabRates[idx].rate = Math.max(1, newRate - delta);
                }

                this.isBillSavedAndReadyToShare = false;
                this.saveToStorage(STORAGE_KEYS.rates, this.rates);
                this.renderMasterSlabsGrid();
                this.calculateAndRender({ skipRowsRebuild: true });
            });

            inp.addEventListener('blur', (e) => {
                const rawVal = (e.target.value || '').trim();
                if (!rawVal || !(parseFloat(rawVal) > 0)) {
                    const idx = parseInt(e.target.dataset.inlineSlabIdx, 10);
                    const activeBase = Math.max(1, parseFloat(document.getElementById('baseDrillingRate')?.value) || this.rates.baseDrillingRate || 90);
                    const currentEff = this.getEffectiveSlabs(activeBase, totalDepth);
                    e.target.value = currentEff[idx]?.rate || 90;
                }
            });
        });
    }
}
