// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class BillInputListeners {
    setupBillInputListeners() {
        document.querySelectorAll('#docTypePills .doc-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('#docTypePills .doc-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.state.docType = pill.dataset.doc;
                // If switching to Final Bill, clear rock-strata disclaimer if it was selected in optional remark
                const noteEl = document.getElementById('billCustomNoteInput');
                if (this.state.docType === 'INVOICE' && noteEl && /பாறை கடினம்|rock strata/i.test(noteEl.value || '')) {
                    noteEl.value = '';
                }
                this.syncAutoBillNumber(true);
                this.renderSavedNotesUI();
                this.calculateAndRender();
            });
        });

        // Drilling Mode Toggle
        document.querySelectorAll('#drillingTypeToggle .mini-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#drillingTypeToggle .mini-seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.drillingType = btn.dataset.type;
                document.getElementById('oldBoreRow').style.display = this.state.drillingType === 'repair' ? 'block' : 'none';
                this.calculateAndRender();
            });
        });

        // Bore Diameter Pills
        document.querySelectorAll('#boreDiaPills .dia-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('#boreDiaPills .dia-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.state.boreDia = pill.dataset.dia;
                this.calculateAndRender();
            });
        });

        // Quick Depth Chips (Tapping an already active chip clears depth back to empty "")
        document.querySelectorAll('.depth-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const depthInput = document.getElementById('totalDepth');
                if (!depthInput) return;
                if (chip.classList.contains('active')) {
                    depthInput.value = '';
                } else {
                    depthInput.value = chip.dataset.depth;
                }
                this.calculateAndRender();
            });
        });

        // Quick Pipe Casing Chips (Tapping an already active chip clears pipe length back to empty "")
        document.querySelectorAll('.pipe-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const val = chip.dataset.val;
                const input = document.getElementById(targetId);
                if (input) {
                    if (chip.classList.contains('active')) {
                        input.value = '';
                    } else {
                        input.value = val;
                    }
                    this.calculateAndRender();
                }
            });
        });

        // Instant Pipe Rate Mini-Steppers (−10 / +10 inside 7" & 10" PVC Casing boxes)
        document.querySelectorAll('.cb-mini-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.rateTarget;
                const step = parseFloat(btn.dataset.step) || 0;
                const input = document.getElementById(targetId);
                if (!input) return;
                const cur = parseFloat(input.value) || 0;
                input.value = Math.max(1, cur + step);
                this.calculateAndRender();
            });
        });

        // Customer Smart Card & Picker
        document.getElementById('customerHeaderInfoArea')?.addEventListener('click', () => {
            const hasCustomer = Boolean(
                (document.getElementById('custName')?.value || '').trim() ||
                (document.getElementById('custPhone')?.value || '').trim()
            );
            if (!hasCustomer) {
                const panel = document.getElementById('quickCustPickerPanel');
                if (panel) {
                    panel.style.display = 'block';
                    this.renderQuickCustomerPicker();
                    document.getElementById('quickCustSearchInput')?.focus();
                }
            } else {
                document.getElementById('custLocation')?.focus();
            }
        });

        document.getElementById('openCustomerPickerBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('quickCustPickerPanel');
            if (!panel) return;
            const isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) {
                this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
                document.getElementById('quickCustSearchInput')?.focus();
            }
            this.calculateAndRender();
        });

        document.getElementById('closeQuickCustPickerBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('quickCustPickerPanel');
            if (panel) panel.style.display = 'none';
            this.calculateAndRender();
        });

        let quickSearchDebounceTimer;
        document.getElementById('quickCustSearchInput')?.addEventListener('input', (e) => {
            clearTimeout(quickSearchDebounceTimer);
            quickSearchDebounceTimer = setTimeout(() => {
                this.renderQuickCustomerPicker(e.target.value);
            }, 75);
        });

        document.getElementById('quickCustSearchInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                const firstCard = document.querySelector('#quickCustList .wiz-cust-card');
                if (firstCard) {
                    firstCard.click();
                    setTimeout(() => {
                        const depthEl = document.getElementById('totalDepth');
                        if (depthEl) {
                            depthEl.focus();
                            try { depthEl.select(); } catch (_) {}
                        }
                    }, 60);
                }
            }
        });

        document.getElementById('editSelectedCustomerBtn')?.addEventListener('click', () => {
            const activeCust = this.findActiveBillCustomer();
            if (activeCust && activeCust.id) {
                this.openCustomerPopupModal({ editCust: activeCust, fromBill: true });
            }
        });

        document.getElementById('selectedSiteCompactBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isEditingServiceSite = true;
            this.calculateAndRender();
            const locInput = document.getElementById('custLocation');
            if (locInput) {
                setTimeout(() => {
                    locInput.focus();
                    locInput.select();
                }, 40);
            }
        });

        document.getElementById('clearSiteLocationBtn')?.addEventListener('click', () => {
            const locInput = document.getElementById('custLocation');
            if (locInput) {
                locInput.value = '';
                this.isEditingServiceSite = true;
                this.calculateAndRender();
                this.renderCustomerSiteSuggestions({ showDropdown: true });
                locInput.focus();
            }
        });

        const locInputEl = document.getElementById('custLocation');
        if (locInputEl) {
            locInputEl.addEventListener('focus', () => {
                this.isEditingServiceSite = true;
                document.body.classList.add('keyboard-open');
                this.renderCustomerSiteSuggestions({ showDropdown: true });
            });

            locInputEl.addEventListener('click', () => {
                this.isEditingServiceSite = true;
                this.renderCustomerSiteSuggestions({ showDropdown: true });
            });

            locInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    const val = (locInputEl.value || '').trim();
                    if (val) {
                        this.applySelectedServiceSite(val, { closeDropdown: true, toast: true });
                    }
                    const depthEl = document.getElementById('totalDepth');
                    if (depthEl) {
                        depthEl.focus();
                        try { depthEl.select(); } catch (_) {}
                    }
                }
            });

            locInputEl.addEventListener('blur', () => {
                setTimeout(() => {
                    if (document.activeElement !== locInputEl) {
                        document.body.classList.remove('keyboard-open');
                        this.syncIosTopSafeBarColor();
                        const ddEl = document.getElementById('smartSiteDropdownList');
                        if (ddEl) ddEl.style.display = 'none';
                        if ((locInputEl.value || '').trim()) {
                            this.isEditingServiceSite = false;
                            this.calculateAndRender();
                        }
                    }
                }, 180);
            });
        }

        // Keyboard "Next" / "Enter" Sequential Flow:
        // Customer / Site -> Drilling Depth (#totalDepth) -> Bill Date (#billDateInput) -> 7" PVC (#pvc7Length) -> 10" PVC (#pvc10Length) -> Advance / Preview
        const oldBoreDepthEl = document.getElementById('oldBoreDepth');
        const oldBoreRateEl = document.getElementById('oldBoreRateInput');
        const totalDepthEl = document.getElementById('totalDepth');
        const baseRateEl = document.getElementById('baseDrillingRate');
        const dateInputEl = document.getElementById('billDateInput');
        const pvc7LenEl = document.getElementById('pvc7Length');
        const pvc10LenEl = document.getElementById('pvc10Length');
        const seqFlowInputIds = ['custLocation', 'oldBoreDepth', 'oldBoreRateInput', 'totalDepth', 'baseDrillingRate', 'billDateInput', 'pvc7Length', 'pvc10Length', 'advancePaidAmount'];

        [oldBoreDepthEl, oldBoreRateEl, totalDepthEl, baseRateEl, dateInputEl, pvc7LenEl, pvc10LenEl].forEach(inp => {
            if (!inp) return;
            inp.addEventListener('focus', () => {
                document.body.classList.add('keyboard-open');
                this.updateQuickTabJumpPosition();
                this.syncTopHeaderWrapLock();
                setTimeout(() => this.syncTopHeaderWrapLock(), 80);
                setTimeout(() => this.syncTopHeaderWrapLock(), 250);
            });
            inp.addEventListener('blur', () => {
                setTimeout(() => {
                    const activeId = document.activeElement?.id || '';
                    if (!seqFlowInputIds.includes(activeId)) {
                        document.body.classList.remove('keyboard-open');
                    }
                    this.syncIosTopSafeBarColor();
                    this.syncTopHeaderWrapLock();
                    this.updateQuickTabJumpPosition();
                }, 180);
            });
        });

        oldBoreDepthEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.calculateAndRender();
                if (oldBoreRateEl) {
                    oldBoreRateEl.focus();
                    try { oldBoreRateEl.select(); } catch (err) { /* ignore */ }
                } else if (totalDepthEl) {
                    totalDepthEl.focus();
                }
            }
        });

        oldBoreRateEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.calculateAndRender();
                if (totalDepthEl) {
                    totalDepthEl.focus();
                }
            }
        });

        totalDepthEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                const rateBataWrap = document.getElementById('drillingRateBataWrap');
                if (rateBataWrap) rateBataWrap.style.display = 'flex';
                if (baseRateEl) {
                    baseRateEl.focus();
                    try { baseRateEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        baseRateEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                const casingSec = document.getElementById('progCasingSection');
                if (casingSec && casingSec.style.display === 'none') {
                    casingSec.style.display = 'block';
                }
                if (pvc7LenEl) {
                    pvc7LenEl.focus();
                    try { pvc7LenEl.select(); } catch (err) { /* ignore */ }
                }
            } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                if (totalDepthEl) {
                    totalDepthEl.focus();
                    try { totalDepthEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        dateInputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                const casingSec = document.getElementById('progCasingSection');
                if (casingSec && casingSec.style.display === 'none') {
                    casingSec.style.display = 'block';
                }
                if (pvc7LenEl) {
                    pvc7LenEl.focus();
                    try { pvc7LenEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        pvc7LenEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                if (pvc10LenEl) {
                    pvc10LenEl.focus();
                    try { pvc10LenEl.select(); } catch (err) { /* ignore */ }
                }
            } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                if (baseRateEl) {
                    baseRateEl.focus();
                    try { baseRateEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        document.getElementById('pvc7RateInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                if (pvc10LenEl) {
                    pvc10LenEl.focus();
                    try { pvc10LenEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        pvc10LenEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                const prevBtn = document.getElementById('openBillPreviewBtn');
                if (prevBtn) {
                    prevBtn.click();
                }
            } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                if (pvc7LenEl) {
                    pvc7LenEl.focus();
                    try { pvc7LenEl.select(); } catch (err) { /* ignore */ }
                }
            }
        });

        document.getElementById('pvc10RateInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                this.calculateAndRender();
                const prevBtn = document.getElementById('openBillPreviewBtn');
                if (prevBtn) {
                    prevBtn.click();
                }
            }
        });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const vv = window.visualViewport;
                const kbHeight = Math.max(0, window.innerHeight - (vv ? vv.height : window.innerHeight));
                if (kbHeight <= 40) {
                    this.lockedKeyboardDockBottom = null;
                }
                this.updateQuickTabJumpPosition();
            });
            // DO NOT update button position on scroll — button remains 100% fixed on swipe-up!
        }

        const clearCustomerInputs = () => {
            document.getElementById('custName').value = '';
            document.getElementById('custPhone').value = '';
            document.getElementById('custLocation').value = '';
            const custGstEl = document.getElementById('custGstInput');
            if (custGstEl) custGstEl.value = '';
            this.isEditingServiceSite = false;
            const siteSection = document.getElementById('serviceSiteSection');
            if (siteSection) siteSection.style.display = 'none';
            const pickerPanel = document.getElementById('quickCustPickerPanel');
            if (pickerPanel) pickerPanel.style.display = 'block';
            this.updateBillPhoneValidationUI(false);
            this.renderCustomerSiteSuggestions();
            this.renderQuickCustomerPicker(document.getElementById('quickCustSearchInput')?.value || '');
            this.calculateAndRender();
            this.showToast('🧹 Customer cleared');
        };

        document.getElementById('clearCustFormBtn')?.addEventListener('click', clearCustomerInputs);
        document.getElementById('quickClearCustomerChip')?.addEventListener('click', clearCustomerInputs);

        // Unified Compact Popup Triggers across New Bill & Customers Tab
        const openBillAddCustomerPopup = () => {
            const searchVal = (document.getElementById('quickCustSearchInput')?.value || '').trim();
            const isDigits = /^[\d+\s-]+$/.test(searchVal) && /\d{3,}/.test(searchVal);
            this.openCustomerPopupModal({
                fromBill: true,
                prefill: {
                    name: isDigits ? '' : searchVal,
                    phone: isDigits ? searchVal : '',
                    village: ''
                }
            });
        };

        document.getElementById('headerAddCustPopupBtn')?.addEventListener('click', openBillAddCustomerPopup);
        document.getElementById('pickerAddCustPopupBtn')?.addEventListener('click', openBillAddCustomerPopup);

        // CRM Tab "Add Customer" Button -> Opens the same Unified Compact Popup
    }
}
