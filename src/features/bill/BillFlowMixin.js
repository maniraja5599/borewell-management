// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class BillFlowMixin {
    ensureCustomerSelectedForBill() {
        const cName = (document.getElementById('custName')?.value || this.state.custName || '').trim();
        if (cName) return true;

        // Stay right where the user is ("entha place la vittamo angaye iruka num") while highlighting Customer step!
        const step1Btn = document.getElementById('wizStepBtn1');
        if (step1Btn) {
            step1Btn.classList.remove('cust-required-shake');
            void step1Btn.offsetWidth;
            step1Btn.classList.add('cust-required-shake');
            setTimeout(() => step1Btn.classList.remove('cust-required-shake'), 1200);
        }
        const custCard = document.getElementById('customerCard');
        if (custCard && this.currentWizardStep === 1) {
            const pickerPanel = document.getElementById('quickCustPickerPanel');
            if (pickerPanel) pickerPanel.style.display = 'block';
            custCard.classList.remove('cust-required-shake');
            void custCard.offsetWidth;
            custCard.classList.add('cust-required-shake');
            setTimeout(() => custCard.classList.remove('cust-required-shake'), 1200);
            document.getElementById('quickCustSearchInput')?.focus();
        }
        this.showToast('⚠️ Please select or enter Customer details before saving the bill.');
        return false;
    }

    syncProgressiveBillSections(res = this.lastResult) {
        const cName = (document.getElementById('custName')?.value || this.state.custName || '').trim();
        const cLoc = (document.getElementById('custLocation')?.value || this.state.custLocation || '').trim();
        const hasCustomer = Boolean(cName);
        const hasServiceSite = hasCustomer && Boolean(cLoc);
        const rawDepth = res ? res.totalDepth : (parseInt(document.getElementById('totalDepth')?.value, 10) || this.state.totalDepth || 0);
        const hasDrillingDepth = hasServiceSite && (Number(rawDepth) > 0);
        const isReadOnlySaved = Boolean(this.loadedHistoryBillId && this.isSavedBillReadOnly);
        const isEditingSaved = Boolean(this.loadedHistoryBillId && !this.isSavedBillReadOnly);

        const drillSection = document.getElementById('progDrillingSection');
        const rateBataWrap = document.getElementById('drillingRateBataWrap');
        const casingSection = document.getElementById('progCasingSection');
        const proceedPreviewBar = document.getElementById('proceedToPreviewBar');
        const previewBtnTxt = document.getElementById('openBillPreviewBtnText');
        const previewBtnTotal = document.getElementById('previewBtnLiveTotal');
        const receiptWrap = document.getElementById('billReceiptPreviewWrapper');
        const previewTopBar = document.getElementById('previewStageTopBar');
        const previewStatusBadge = document.getElementById('previewStageStatusBadge');
        const previewStatusSub = document.getElementById('previewStageStatusSub');
        const actionStage = document.getElementById('billPreviewActionStage');
        const preSaveBox = document.getElementById('preSavePreviewActions');
        const postSaveBox = document.getElementById('postSaveShareContainer');
        const exportGrid = document.getElementById('billExportActionsGrid');

        // 1. Drilling Depth + Compact Rate / Slab Rate Dropdown bar opens after Customer is selected
        if (drillSection) {
            drillSection.style.display = (hasCustomer || hasServiceSite || isEditingSaved) ? 'block' : 'none';
        }
        if (rateBataWrap) {
            rateBataWrap.style.display = (hasCustomer || hasServiceSite || isEditingSaved) ? 'flex' : 'none';
        }

        // 2. PVC Casing Pipes & "Preview & Save Bill" CTA open once Drilling Depth (ft) is entered
        if (casingSection) {
            casingSection.style.display = (hasDrillingDepth || isEditingSaved) ? 'block' : 'none';
        }
        if (previewBtnTxt) {
            if (this.loadedHistoryBillId && !this.isBillSavedAndReadyToShare) {
                previewBtnTxt.textContent = 'Preview & Update Bill';
            } else if (this.isBillSavedAndReadyToShare) {
                previewBtnTxt.textContent = 'View Saved Bill & Share';
            } else {
                previewBtnTxt.textContent = 'Preview & Save Bill';
            }
        }
        if (previewBtnTotal && res) {
            previewBtnTotal.textContent = this.formatINR(res.grandTotal);
        }
        const previewBtnBal = document.getElementById('previewBtnBalanceDue');
        if (previewBtnBal && res) {
            if (res.advancePaidAmount > 0 && res.balancePayable > 0) {
                previewBtnBal.style.display = 'inline-block';
                previewBtnBal.className = 'preview-btn-due-tag';
                previewBtnBal.textContent = `Due: ${this.formatINR(res.balancePayable)}`;
            } else {
                previewBtnBal.style.display = 'none';
            }
        }

        // 3. Official Bill Receipt Preview & Save/Share Stage:
        // Shown ONLY when user taps "Preview & Save Bill" (or when viewing a Saved Bill from History)
        if (!hasDrillingDepth && !isEditingSaved && !isReadOnlySaved) {
            this.isBillPreviewOpen = false;
            this.isBillSavedAndReadyToShare = false;
        }

        const showPreview = isReadOnlySaved || ((hasDrillingDepth || isEditingSaved) && this.isBillPreviewOpen);
        if (proceedPreviewBar) {
            proceedPreviewBar.style.display = ((hasDrillingDepth || isEditingSaved) && !showPreview) ? 'block' : 'none';
        }
        if (receiptWrap) {
            receiptWrap.style.display = showPreview ? 'block' : 'none';
        }
        if (actionStage) {
            actionStage.style.display = showPreview ? 'block' : 'none';
        }

        const isSavedReady = isReadOnlySaved || this.isBillSavedAndReadyToShare;
        if (previewTopBar) {
            previewTopBar.style.display = isReadOnlySaved ? 'none' : 'flex';
        }
        if (previewStatusBadge && previewStatusSub) {
            if (isSavedReady) {
                previewStatusBadge.textContent = '✅ BILL SAVED — READY TO SHARE';
                previewStatusSub.textContent = 'Use WhatsApp, Image or PDF buttons below to share';
            } else {
                previewStatusBadge.textContent = '👁️ BILL PREVIEW';
                previewStatusSub.textContent = 'Check all bill details below, then tap Save Bill';
            }
        }
        if (preSaveBox) {
            preSaveBox.style.display = isSavedReady ? 'none' : 'grid';
        }
        if (postSaveBox) {
            postSaveBox.style.display = isSavedReady ? 'flex' : 'none';
            const savedBanner = postSaveBox.querySelector('.pss-saved-banner');
            if (savedBanner) {
                savedBanner.style.display = isReadOnlySaved ? 'none' : 'flex';
            }
        }
        if (exportGrid) {
            exportGrid.style.display = isSavedReady ? 'grid' : 'none';
        }
    }

    jumpToNextBillField() {
        const hasCust = Boolean(
            (document.getElementById('custName')?.value || '').trim() ||
            (document.getElementById('custPhone')?.value || '').trim()
        );
        if (!hasCust) {
            const panel = document.getElementById('quickCustPickerPanel');
            if (panel) panel.style.display = 'block';
            document.getElementById('quickCustSearchInput')?.focus();
            return;
        }

        const activeEl = document.activeElement;
        const depthEl = document.getElementById('totalDepth');
        const baseRateEl = document.getElementById('baseDrillingRate');
        const pvc7El = document.getElementById('pvc7Length');
        const pvc10El = document.getElementById('pvc10Length');
        const previewBtn = document.getElementById('openBillPreviewBtn');

        let nextEl = null;

        // Sequence requested by user:
        // Customer selected -> Drilling Feet (#totalDepth) -> Drilling Rate (#baseDrillingRate) -> 7" PVC (#pvc7Length) -> 10" PVC (#pvc10Length) -> Preview
        if (activeEl === depthEl || activeEl?.id === 'oldBoreDepth') {
            nextEl = baseRateEl;
        } else if (activeEl === baseRateEl || activeEl?.id === 'oldBoreRateInput' || activeEl?.id === 'billBoreBataInput') {
            nextEl = pvc7El;
        } else if (activeEl === pvc7El || activeEl?.id === 'pvc7RateInput') {
            nextEl = pvc10El;
        } else if (activeEl === pvc10El || activeEl?.id === 'pvc10RateInput') {
            nextEl = previewBtn;
        } else if (activeEl === previewBtn) {
            previewBtn?.click();
            return;
        } else {
            // Focus is outside (e.g. site, or button tapped directly)
            const depthVal = (depthEl?.value || '').trim();
            const pvc7Val = (pvc7El?.value || '').trim();
            const pvc10Val = (pvc10El?.value || '').trim();
            if (!depthVal) {
                nextEl = depthEl;
            } else if (!baseRateEl?.value) {
                nextEl = baseRateEl;
            } else if (!pvc7Val) {
                nextEl = pvc7El;
            } else if (!pvc10Val) {
                nextEl = pvc10El;
            } else {
                nextEl = previewBtn;
            }
        }

        if (nextEl) {
            if (nextEl === previewBtn) {
                nextEl.click();
            } else {
                const drillSec = document.getElementById('progDrillingSection');
                const rateWrap = document.getElementById('drillingRateBataWrap');
                if (nextEl === depthEl || nextEl === baseRateEl) {
                    if (drillSec) drillSec.style.display = 'block';
                    if (rateWrap) rateWrap.style.display = 'flex';
                }
                const casingSec = document.getElementById('progCasingSection');
                if (nextEl === pvc7El || nextEl === pvc10El) {
                    if (casingSec) casingSec.style.display = 'block';
                }
                nextEl.focus();
                if (typeof nextEl.select === 'function' && nextEl.tagName === 'INPUT' && nextEl.type !== 'date') {
                    setTimeout(() => {
                        try { nextEl.select(); } catch (_) {}
                    }, 25);
                }
                const r = nextEl.getBoundingClientRect();
                const vHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                if (r.top < 120 || r.bottom > vHeight - 20) {
                    nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                const wrap = nextEl.closest('.simple-big-input-wrap') || nextEl.closest('.srbb-input-box') || nextEl.closest('.casing-box') || nextEl;
                this.triggerOneShotPulse(wrap, 'sticky-val-pop');
            }
        }
    }

    updateQuickTabJumpLabel(activeEl = document.activeElement) {
        // Quick Next button removed per user request
    }

    updateQuickTabJumpPosition() {
        // Quick Next button removed per user request
    }

    goToWizardStep(step = 1, scroll = false) {
        this.currentWizardStep = 1;
        this.state.currentWizardStep = 1;

        const panel1 = document.getElementById('wizStepPanel1');
        if (panel1) {
            panel1.style.display = 'block';
        }

        this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
        this.syncProgressiveBillSections();
        this.persistCurrentSession();

        if (scroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    getNextAutoDocNumber(docType = this.state.docType) {
        const prefix = (this.brand.billPrefix || 'AB').toUpperCase();
        const isInvoice = docType === 'INVOICE';

        if (isInvoice) {
            let maxBill = Math.max(100, (parseInt(this.brand.nextBillSeq, 10) || 101) - 1);
            this.history.forEach(h => {
                if (h.snapshot?.docType === 'INVOICE') {
                    const m = String(h.billNo || '').match(/(\d+)$/);
                    if (m) maxBill = Math.max(maxBill, parseInt(m[1], 10));
                }
            });
            const nextSeq = maxBill + 1;
            this.brand.nextBillSeq = nextSeq;
            return `${prefix}-${nextSeq}`;
        } else {
            let maxQuote = Math.max(100, (parseInt(this.brand.nextQuoteSeq, 10) || 101) - 1);
            this.history.forEach(h => {
                if ((h.snapshot?.docType || 'QUOTATION') === 'QUOTATION') {
                    const m = String(h.billNo || '').match(/(\d+)$/);
                    if (m) maxQuote = Math.max(maxQuote, parseInt(m[1], 10));
                }
            });
            const nextSeq = maxQuote + 1;
            this.brand.nextQuoteSeq = nextSeq;
            return `${prefix}-Q${nextSeq}`;
        }
    }

    syncAutoBillNumber(forceUpdate = false) {
        if (this.loadedHistoryBillId) return;
        const nextNo = this.getNextAutoDocNumber(this.state.docType);
        const billNoInput = document.getElementById('billNoInput');
        if (billNoInput && (forceUpdate || !billNoInput.value)) {
            billNoInput.value = nextNo;
        }
        const badge = document.getElementById('autoSeqHintBadge');
        if (badge) {
            badge.textContent = `Auto #${billNoInput?.value || nextNo}`;
        }
    }

    restoreRememberedSessionUI() {
        const s = this.state;

        const dateInput = document.getElementById('billDateInput');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        this.syncAutoBillNumber(true);

        document.querySelectorAll('#docTypePills .doc-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.doc === (s.docType || 'INVOICE'));
        });

        document.querySelectorAll('#drillingTypeToggle .mini-seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === (s.drillingType || 'new'));
        });
        const oldBoreRow = document.getElementById('oldBoreRow');
        if (oldBoreRow) {
            oldBoreRow.style.display = s.drillingType === 'repair' ? 'block' : 'none';
        }

        document.querySelectorAll('#boreDiaPills .dia-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.dia === (s.boreDia || '6.5"'));
        });

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) el.value = val;
        };
        const setPosVal = (id, num) => {
            const n = Number(num) || 0;
            setVal(id, n > 0 ? n : '');
        };

        // Restore in-progress depths & pipes if > 0, otherwise keep completely empty "" (Never show 0!)
        setPosVal('oldBoreDepth', s.oldBoreDepth);
        setPosVal('totalDepth', s.totalDepth);
        setPosVal('pvc7Length', s.pvc7Length);
        setPosVal('pvc10Length', s.pvc10Length);

        // Instant Rate & Bore Bata fields in New Bill
        setVal('baseDrillingRate', s.baseDrillingRate || this.rates.baseDrillingRate || 90);
        setVal('oldBoreRateInput', s.oldBoreRate || this.rates.oldBoreRate || 40);
        setVal('billBoreBataInput', this.rates.boreBataRate ?? 2000);
        setVal('pvc7RateInput', this.rates.pvc7Rate || 400);
        setVal('pvc10RateInput', this.rates.pvc10Rate || 700);

        setPosVal('collarCapCost', s.collarCapCost);
        setPosVal('transportSurveyCost', s.transportSurveyCost);
        setVal('customExtraLabel', s.customExtraLabel || '');
        setPosVal('customExtraAmount', s.customExtraAmount);
        setVal('billCustomNoteInput', s.customNote || '');
        setPosVal('discountAmount', s.discountAmount);
        setPosVal('advancePaidAmount', s.advancePaidAmount);

        // Restore in-progress Customer selection so refreshing stays right where the user left off
        setVal('custName', s.custName || '');
        setVal('custPhone', this.formatPhoneWithCountryCode(s.custPhone || ''));
        setVal('custLocation', s.custLocation || '');
        setVal('custGstInput', s.custGst || '');

        const hasCust = Boolean((s.custName || '').trim());
        const pickerPanel = document.getElementById('quickCustPickerPanel');
        if (pickerPanel) {
            pickerPanel.style.display = hasCust ? 'none' : 'block';
        }

        if (!this.loadedHistoryBillId) {
            s.gstEnabled = false;
        }
        const gstToggle = document.getElementById('gstEnabledToggle');
        if (gstToggle) gstToggle.checked = Boolean(s.gstEnabled);
        const gstRow = document.getElementById('custGstInlineRow');
        if (gstRow) gstRow.style.display = s.gstEnabled ? 'flex' : 'none';
    }

    persistCurrentSession() {
        const oldBoreRateInput = document.getElementById('oldBoreRateInput');
        const pvc7RateInput = document.getElementById('pvc7RateInput');
        const pvc10RateInput = document.getElementById('pvc10RateInput');
        const bataInput = document.getElementById('billBoreBataInput');

        if (oldBoreRateInput && oldBoreRateInput.value !== '') {
            this.rates.oldBoreRate = Math.max(1, parseFloat(oldBoreRateInput.value) || this.rates.oldBoreRate || 40);
        }
        if (pvc7RateInput && pvc7RateInput.value !== '') {
            this.rates.pvc7Rate = Math.max(1, parseFloat(pvc7RateInput.value) || this.rates.pvc7Rate || 400);
        }
        if (pvc10RateInput && pvc10RateInput.value !== '') {
            this.rates.pvc10Rate = Math.max(1, parseFloat(pvc10RateInput.value) || this.rates.pvc10Rate || 700);
        }
        if (bataInput) {
            this.rates.boreBataRate = bataInput.value !== ''
                ? Math.max(0, parseFloat(bataInput.value) || 0)
                : 0;
        }

        const rawCustGst = (document.getElementById('custGstInput')?.value || '').trim().toUpperCase();
        const rawCustPhone = (document.getElementById('custPhone')?.value || '').trim();

        this.state = {
            ...this.state,
            oldBoreDepth: Math.max(0, parseInt(document.getElementById('oldBoreDepth')?.value, 10) || 0),
            oldBoreRate: this.rates.oldBoreRate || 40,
            totalDepth: Math.max(0, parseInt(document.getElementById('totalDepth')?.value, 10) || 0),
            baseDrillingRate: Math.max(1, parseFloat(document.getElementById('baseDrillingRate')?.value) || this.rates.baseDrillingRate),
            pvc7Length: Math.max(0, parseFloat(document.getElementById('pvc7Length')?.value) || 0),
            pvc10Length: Math.max(0, parseFloat(document.getElementById('pvc10Length')?.value) || 0),
            gstEnabled: Boolean(document.getElementById('gstEnabledToggle')?.checked),
            custGst: rawCustGst,
            collarCapCost: Math.max(0, parseFloat(document.getElementById('collarCapCost')?.value) || 0),
            transportSurveyCost: Math.max(0, parseFloat(document.getElementById('transportSurveyCost')?.value) || 0),
            customExtraLabel: (document.getElementById('customExtraLabel')?.value || '').trim(),
            customExtraAmount: Math.max(0, parseFloat(document.getElementById('customExtraAmount')?.value) || 0),
            customNote: (document.getElementById('billCustomNoteInput')?.value || '').trim(),
            discountAmount: Math.max(0, parseFloat(document.getElementById('discountAmount')?.value) || 0),
            advancePaidAmount: Math.max(0, parseFloat(document.getElementById('advancePaidAmount')?.value) || 0),
            custName: (document.getElementById('custName')?.value || '').trim(),
            custPhone: rawCustPhone ? this.formatPhoneWithCountryCode(rawCustPhone) : '',
            custLocation: (document.getElementById('custLocation')?.value || '').trim(),
            currentWizardStep: this.currentWizardStep || 1,
            loadedHistoryBillId: this.loadedHistoryBillId || null,
            isSavedBillReadOnly: Boolean(this.isSavedBillReadOnly)
        };
        this.saveToStorage(STORAGE_KEYS.lastSession, this.state);
    }

    /* ==========================================================================
       EXACT ANJANEYA BOREWELLS SLAB CALCULATION ENGINE
       ========================================================================== */
}
