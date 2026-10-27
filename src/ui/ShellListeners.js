// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class ShellListeners {
    setupShellListeners() {
        // Global PC Keyboard Shortcuts (Escape to dismiss modals/drawers/preview, Enter for preview save/share)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.keyCode === 27) {
                // 1. Delete Confirm Modal
                const delOverlay = document.getElementById('deleteConfirmModalOverlay');
                if (delOverlay && delOverlay.style.display !== 'none') {
                    e.preventDefault();
                    this.closeDeleteConfirmModal();
                    return;
                }

                // 2. Add / Edit Customer Popup Modal
                const crmDrawer = document.getElementById('crmCustomerFormDrawer');
                if (crmDrawer && crmDrawer.style.display !== 'none') {
                    e.preventDefault();
                    this.closeCustomerPopupModal();
                    return;
                }

                // 3. Customer Khata / Detail Modal
                const custModal = document.getElementById('custDetailModalOverlay');
                if (custModal && custModal.style.display !== 'none') {
                    e.preventDefault();
                    this.closeCustomerDetailModal();
                    return;
                }

                // 4. WhatsApp Preview Modal
                const waModal = document.getElementById('whatsappPreviewModalOverlay');
                if (waModal && waModal.style.display !== 'none') {
                    e.preventDefault();
                    this.closeWhatsAppPreviewModal();
                    return;
                }

                // 5. Bill Detail Modal
                const billModal = document.getElementById('billDetailModalOverlay');
                if (billModal && billModal.style.display !== 'none') {
                    e.preventDefault();
                    this.closeBillDetailModal();
                    return;
                }

                // 6. Record Payment Modal
                const payModal = document.getElementById('recordPaymentModalOverlay');
                if (payModal && payModal.style.display !== 'none') {
                    e.preventDefault();
                    this.closeRecordPaymentModal();
                    return;
                }

                // 7. Rate Detail Modal
                const rateModal = document.getElementById('rateDetailModalOverlay');
                if (rateModal && rateModal.style.display !== 'none') {
                    e.preventDefault();
                    rateModal.style.display = 'none';
                    return;
                }

                // 8. Rate Studio (if open)
                const rateStudio = document.getElementById('rateStudioDrawer');
                if (rateStudio && (rateStudio.classList.contains('active') || rateStudio.style.display === 'block')) {
                    e.preventDefault();
                    this.toggleRateStudio(false);
                    return;
                }

                // 9. Company Studio (if open)
                const compStudio = document.getElementById('companyEditStudioCard');
                if (compStudio && compStudio.style.display !== 'none') {
                    e.preventDefault();
                    compStudio.style.display = 'none';
                    const editBtn = document.getElementById('toggleCompanyEditBtn');
                    const editBtnTxt = document.getElementById('toggleCompanyEditBtnText');
                    editBtn?.classList.remove('active');
                    if (editBtnTxt) editBtnTxt.textContent = 'Edit Details';
                    return;
                }

                // 10. Open Dropdowns & Drawers
                let closedAnyDrawer = false;
                [
                    'quickCustPickerPanel',
                    'inlinePriceDrawer',
                    'extraChargesDrawer',
                    'billNotesDrawer',
                    'previewFooterEditDrawer',
                    'smartSiteDropdownList',
                    'smartSlabDropdownPanel',
                    'customExtraSmartDropdown'
                ].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.style.display !== 'none') {
                        el.style.display = 'none';
                        closedAnyDrawer = true;
                    }
                });
                if (closedAnyDrawer) {
                    e.preventDefault();
                    return;
                }

                // 11. If Bill Preview is Open -> Return to Bill Editor
                if (this.isBillPreviewOpen) {
                    e.preventDefault();
                    const backBtn = document.getElementById('backToEditFromPreviewTopBtn') || document.getElementById('backToEditFromPreviewBtn');
                    if (backBtn) {
                        backBtn.click();
                        return;
                    }
                }

                // 12. If an input is focused, blur it to exit edit mode
                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }
            } else if ((e.key === 'Enter' || e.keyCode === 13) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // If WhatsApp Preview Modal is open:
                const waModal = document.getElementById('whatsappPreviewModalOverlay');
                if (waModal && waModal.style.display !== 'none' && document.activeElement?.id !== 'waPreviewMessageInput') {
                    e.preventDefault();
                    document.getElementById('confirmSendWhatsappBtn')?.click();
                    return;
                }

                // If Bill Preview is open and user isn't in a text input/textarea:
                if (this.isBillPreviewOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                    e.preventDefault();
                    if (this.isBillSavedAndReadyToShare) {
                        document.getElementById('shareWhatsappBtn')?.click();
                    } else {
                        document.getElementById('saveBillHistoryBtn')?.click();
                    }
                }
            }
        });

        // Universal Delete Confirmation Modal Listeners
        document.getElementById('closeDelConfirmBtn')?.addEventListener('click', () => this.closeDeleteConfirmModal());
        document.getElementById('cancelDelConfirmBtn')?.addEventListener('click', () => this.closeDeleteConfirmModal());
        document.getElementById('deleteConfirmModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'deleteConfirmModalOverlay') {
                this.closeDeleteConfirmModal();
            }
        });
        document.getElementById('delConfirmTypeInput')?.addEventListener('input', (e) => {
            const val = String(e.target.value || '').trim().toUpperCase();
            const allowed = this.pendingDeleteRequiredWords || ['CLEAR ALL', 'I CONFIRM'];
            const isMatch = allowed.includes(val);
            e.target.classList.toggle('is-verified', isMatch);
            const confirmBtn = document.getElementById('confirmDelActionBtn');
            if (confirmBtn) confirmBtn.disabled = !isMatch;
        });
        document.getElementById('delConfirmTypeInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const confirmBtn = document.getElementById('confirmDelActionBtn');
                if (confirmBtn && !confirmBtn.disabled) {
                    confirmBtn.click();
                }
            }
        });
        document.getElementById('confirmDelActionBtn')?.addEventListener('click', () => {
            if (this.pendingDeleteRequiredWords) {
                const typeInput = document.getElementById('delConfirmTypeInput');
                const val = String(typeInput?.value || '').trim().toUpperCase();
                if (!this.pendingDeleteRequiredWords.includes(val)) {
                    this.showToast(`⚠️ Please type "${this.pendingDeleteRequiredWords[0]}" to confirm`);
                    typeInput?.focus();
                    return;
                }
            }
            const fn = this.pendingDeleteConfirmFn;
            this.closeDeleteConfirmModal();
            if (typeof fn === 'function') fn();
        });
        document.querySelectorAll('.global-undo-trigger-btn').forEach(btn => {
            btn.addEventListener('click', () => this.triggerGlobalUndo());
        });

        document.querySelectorAll('.b-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                // If user taps "New Bill" nav button while viewing a Saved Bill, start a fresh New Bill with clean customer fields!
                if (btn.dataset.tab === 'tab-bill') {
                    if (this.loadedHistoryBillId) {
                        this.exitSavedBillMode(true);
                        this.showToast(`➕ Ready for New Bill (#${document.getElementById('billNoInput')?.value})`);
                    } else if (this.state.docType !== 'INVOICE') {
                        this.state.docType = 'INVOICE';
                        document.querySelectorAll('#docTypePills .doc-pill').forEach(p => {
                            p.classList.toggle('active', p.dataset.doc === 'INVOICE');
                        });
                        this.syncAutoBillNumber(true);
                        this.calculateAndRender();
                    }
                } else if (btn.dataset.tab === 'tab-history') {
                    // Always open Bills tab on the "Bills" (INVOICE) view by default, never Quotations
                    this.historyDocFilter = 'INVOICE';
                    this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
                }
                this.switchTab(btn.dataset.tab);
            });
        });

        // 2-Step Wizard Top Stepper Buttons & Bottom Prev/Next Navigation
        document.querySelectorAll('#billWizardStepperBar .wiz-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = parseInt(btn.dataset.step, 10) || 1;
                if (step > 1 && !this.ensureCustomerSelectedForBill()) return;
                this.goToWizardStep(step, false);
            });
        });

        document.getElementById('wizPrevStepBtn')?.addEventListener('click', () => {
            if (this.currentWizardStep > 1) {
                this.goToWizardStep(this.currentWizardStep - 1, true);
            }
        });

        document.getElementById('wizNextStepBtn')?.addEventListener('click', () => {
            if (this.currentWizardStep < 2) {
                if (!this.ensureCustomerSelectedForBill()) return;
                this.goToWizardStep(this.currentWizardStep + 1, true);
            } else {
                this.saveCurrentBillToHistory();
            }
        });

        // Step 1B: Same as Place vs Different Site Quick Mode Pills
        document.getElementById('siteModeSameBtn')?.addEventListener('click', () => {
            const activeCust = this.findActiveBillCustomer();
            if (activeCust?.village) {
                this.applySelectedServiceSite(activeCust.village, { closeDropdown: true, toast: true });
            }
        });

        document.getElementById('siteModeDiffBtn')?.addEventListener('click', () => {
            const locInput = document.getElementById('custLocation');
            if (locInput) {
                locInput.value = '';
                this.calculateAndRender();
                this.renderCustomerSiteSuggestions();
                locInput.focus();
            }
        });

        // Saved Bill Mode Banner Controls (Back | Edit Bill / Final View | + New Bill)
        document.getElementById('backToSavedBillsBtn')?.addEventListener('click', () => {
            this.switchTab('tab-history');
        });

        document.getElementById('toggleSavedBillEditBtn')?.addEventListener('click', () => {
            if (!this.loadedHistoryBillId) return;
            this.isSavedBillReadOnly = !this.isSavedBillReadOnly;
            this.updateSavedBillViewModeUI();
            this.showToast(this.isSavedBillReadOnly ? '👁️ Switched to Final View Only' : '✏️ Edit Mode unlocked! You can now modify values.');
        });

        document.getElementById('startFreshNewBillBtn')?.addEventListener('click', () => {
            this.exitSavedBillMode(true);
            this.showToast(`➕ New Bill started (#${document.getElementById('billNoInput')?.value})`);
        });

        document.getElementById('freshBillQuickBtn')?.addEventListener('click', () => {
            this.exitSavedBillMode(true);
            this.calculateAndRender();
            this.showToast(`✨ Fresh Bill ready (#${document.getElementById('billNoInput')?.value})`);
        });

        document.getElementById('openBrandTabBtn')?.addEventListener('click', () => {
            this.switchTab('tab-brand');
        });

        document.getElementById('headerSettingsQuickBtn')?.addEventListener('click', () => {
            this.switchTab('tab-brand');
        });

        // Interactive Dynamic Top Marquee Click Dispatcher (Contextual Navigation)
        document.getElementById('topDynamicMarquee')?.addEventListener('click', () => {
            const activeSlide = document.querySelector('.header-dynamic-marquee .marquee-slide.active');
            const idx = parseInt(activeSlide?.dataset.slideIndex || (this._topMarqueeCurrentIndex ?? '0'), 10);
            if (idx === 1) {
                // Outstanding Due Slide -> Open Customer Ledger with Due filter
                this.switchTab('tab-customers');
                this.crmFilter = 'due';
                document.querySelectorAll('#crmFilterPills .f-chip').forEach(pill => {
                    pill.classList.toggle('active', pill.dataset.filter === 'due');
                });
                this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
                this.showToast('📋 Viewing Customers with Outstanding Dues');
            } else if (idx === 2) {
                // Today Work Summary -> Open Saved Bills History
                this.switchTab('tab-history');
                this.showToast('📂 Viewing Bills History');
            } else if (idx === 3) {
                // Notification -> Open WhatsApp format designer in Settings
                this.switchTab('tab-brand');
                if (typeof this.switchSettingsView === 'function') {
                    this.switchSettingsView('set-view-whatsapp');
                }
                this.showToast('💬 WhatsApp Bill Designer');
            } else if (idx === 4) {
                // Install App Slide -> Trigger PWA Install Prompt or Show Instructions
                if (window.deferredInstallPrompt) {
                    window.deferredInstallPrompt.prompt();
                    window.deferredInstallPrompt.userChoice.then(({ outcome }) => {
                        if (outcome === 'accepted') {
                            const slide = document.getElementById('marqueeSlide4');
                            if (slide) slide.style.display = 'none';
                        }
                        window.deferredInstallPrompt = null;
                    });
                } else {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
                    if (isIOS) {
                        this.showToast('📲 Tap Safari Share button ⎋ and choose "Add to Home Screen"');
                    } else {
                        this.showToast('📲 Tap browser menu ⋮ and select "Install app" or "Add to Home Screen"');
                    }
                }
            } else {
                // Company Slide -> Open Settings Profile
                this.switchTab('tab-brand');
                if (typeof this.switchSettingsView === 'function') {
                    this.switchSettingsView('set-view-company');
                }
            }
        });

        document.getElementById('langSwitchBtn')?.addEventListener('click', () => {
            const nextLang = this.lang === 'en' ? 'ta' : 'en';
            this.applyLanguage(nextLang);
        });

        // 2-Pill Doc Type (Quotation vs Final Bill) -> Auto-syncs incremented Quote # or Bill #
    }
}
