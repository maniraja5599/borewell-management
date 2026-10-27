// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class SettingsListeners {
    setupSettingsListeners() {
        document.getElementById('logoFileInput')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleLogoUpload(e.target.files[0]);
            }
        });

        document.getElementById('removeLogoBtn')?.addEventListener('click', () => {
            if (!this.brand.logoDataUrl) {
                this.showToast('ℹ️ No company logo uploaded yet');
                return;
            }
            const prevLogo = this.brand.logoDataUrl;
            this.confirmDeleteModal({
                title: 'Remove Company Logo?',
                itemLabel: `🏢 ${this.brand.companyName || 'Company'} Logo`,
                message: 'Are you sure you want to remove the uploaded company logo?',
                onConfirm: () => {
                    this.brand.logoDataUrl = '';
                    this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                    this.applyBrandToUI();
                    this.showUndoToast('🗑️ Company Logo removed', () => {
                        this.brand.logoDataUrl = prevLogo;
                        this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                        this.applyBrandToUI();
                    });
                }
            });
        });

        document.querySelectorAll('.theme-swatch, .theme-preset-card').forEach(sw => {
            sw.addEventListener('click', () => {
                this.brand.theme = sw.dataset.theme;
                this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                this.applyBrandToUI();
                const themeTitle = sw.querySelector('.tpc-name')?.textContent || sw.textContent.trim();
                this.showToast(`🎨 Theme changed to ${themeTitle}`);
            });
        });

        // Live Auto-Sync on all Company Settings inputs so Receipt & Download PDF always reflect changes immediately
        document.getElementById('brandPhoneCountryCode')?.addEventListener('change', (e) => {
            const selectedCode = e.target.value || '+91';
            this.brand.phoneCountryCode = selectedCode;
            this.setDefaultCountryCode(selectedCode);
            const phonesEl = document.getElementById('brandCompanyPhones');
            if (phonesEl && phonesEl.value.trim()) {
                phonesEl.value = this.formatCompanyPhonesWithCountryCode(phonesEl.value, selectedCode);
            }
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.calculateAndRender();
        });

        const brandInputIds = [
            'brandCompanyName', 'brandCompanyTagline', 'brandCompanyPhones',
            'brandBillPrefix', 'brandNextQuoteSeq', 'brandNextBillSeq',
            'brandCompanyAddress', 'brandWebsite', 'brandGstNumber', 'brandUpiId', 'brandUpiName',
            'brandTermsNote', 'brandFinalBillTermsNote'
        ];
        brandInputIds.forEach(bId => {
            document.getElementById(bId)?.addEventListener('input', (e) => {
                if (bId === 'brandGstNumber') {
                    const up = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                    if (e.target.value !== up) e.target.value = up;
                } else if (bId === 'brandBillPrefix') {
                    const up = (e.target.value || '').toUpperCase();
                    if (e.target.value !== up) e.target.value = up;
                }
                this.syncBrandFromInputs(true);
                this.applyBrandToUI();
                if (bId === 'brandBillPrefix' || bId === 'brandNextQuoteSeq' || bId === 'brandNextBillSeq') {
                    this.syncAutoBillNumber(true);
                }
                this.calculateAndRender();
            });
        });

        // Quick Inline Footer & Website Customizer right below Receipt Preview
        document.getElementById('togglePreviewFooterEditBtn')?.addEventListener('click', () => {
            const drawer = document.getElementById('previewFooterEditDrawer');
            const btn = document.getElementById('togglePreviewFooterEditBtn');
            if (!drawer) return;
            const willOpen = drawer.style.display === 'none';
            drawer.style.display = willOpen ? 'block' : 'none';
            btn?.classList.toggle('active', willOpen);
        });

        document.getElementById('quickPreviewFooterNoteInput')?.addEventListener('input', (e) => {
            const val = e.target.value || '';
            const isQuoteDoc = (this.lastResult?.docType || this.state?.docType || 'INVOICE') === 'QUOTATION';
            if (isQuoteDoc) {
                this.brand.termsNote = val;
                const bTerms = document.getElementById('brandTermsNote');
                if (bTerms) bTerms.value = val;
            } else {
                this.brand.finalBillTermsNote = val;
                const bFinal = document.getElementById('brandFinalBillTermsNote');
                if (bFinal) bFinal.value = val;
            }
            this.saveToStorage(STORAGE_KEYS.brand, this.brand);
            this.applyBrandToUI();
            this.calculateAndRender();
        });

        document.getElementById('quickPreviewWebsiteInput')?.addEventListener('input', (e) => {
            const val = (e.target.value || '').trim();
            this.brand.website = val;
            const bWeb = document.getElementById('brandWebsite');
            if (bWeb) bWeb.value = val;
            this.saveToStorage(STORAGE_KEYS.brand, this.brand);
            this.applyBrandToUI();
            this.calculateAndRender();
        });

        document.querySelectorAll('#previewFooterEditDrawer [data-quick-footer]').forEach(chip => {
            chip.addEventListener('click', () => {
                const val = chip.dataset.quickFooter || '';
                const isQuoteDoc = (this.lastResult?.docType || this.state?.docType || 'INVOICE') === 'QUOTATION';
                if (isQuoteDoc) {
                    this.brand.termsNote = val;
                    const bTerms = document.getElementById('brandTermsNote');
                    if (bTerms) bTerms.value = val;
                } else {
                    this.brand.finalBillTermsNote = val;
                    const bFinal = document.getElementById('brandFinalBillTermsNote');
                    if (bFinal) bFinal.value = val;
                }
                const qInp = document.getElementById('quickPreviewFooterNoteInput');
                if (qInp) qInp.value = val;
                this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                this.applyBrandToUI();
                this.calculateAndRender();
                this.showToast(val ? `🧾 Footer updated to "${val}"` : '🚫 Footer text hidden');
            });
        });

        // Quotation & Final Bill Footer Note Quick Actions & Presets
        document.getElementById('restoreDefaultQuoteTermsBtn')?.addEventListener('click', () => {
            const el = document.getElementById('brandTermsNote');
            if (el) el.value = this.defaultBrand.termsNote;
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.calculateAndRender();
            this.showToast('📋 Default Quotation Footer Note restored!');
        });

        document.getElementById('clearQuoteTermsBtn')?.addEventListener('click', () => {
            const el = document.getElementById('brandTermsNote');
            if (el) el.value = '';
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.calculateAndRender();
            this.showToast('🧹 Quotation Footer Note cleared');
        });

        document.getElementById('restoreDefaultBillTermsBtn')?.addEventListener('click', () => {
            const el = document.getElementById('brandFinalBillTermsNote');
            if (el) el.value = this.defaultBrand.finalBillTermsNote;
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.calculateAndRender();
            this.showToast('🧾 Default Final Bill Footer Note applied!');
        });

        document.getElementById('clearFinalBillTermsBtn')?.addEventListener('click', () => {
            const el = document.getElementById('brandFinalBillTermsNote');
            if (el) el.value = '';
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.calculateAndRender();
            this.showToast('🚫 Final Bill Footer Note hidden (Empty)');
        });

        document.querySelectorAll('#finalBillTermsPresetChips .fsb-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const val = chip.dataset.billNote || '';
                const el = document.getElementById('brandFinalBillTermsNote');
                if (el) el.value = val;
                this.syncBrandFromInputs(true);
                this.applyBrandToUI();
                this.calculateAndRender();
                this.showToast(val ? `🧾 Final Bill Note updated!` : '🚫 Final Bill Footer Note hidden');
            });
        });

        // Company Casing Spec Presets
        document.querySelectorAll('#brandCasingPresetChips .csd-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const p1 = chip.dataset.p1 || '';
                const p2 = chip.dataset.p2 || '';
                const c1Inp = document.getElementById('brandCasing1Name');
                const c2Inp = document.getElementById('brandCasing2Name');
                if (c1Inp && p1) c1Inp.value = p1;
                if (c2Inp && p2) c2Inp.value = p2;
                this.syncBrandFromInputs(true);
                this.applyBrandToUI();
                this.calculateAndRender();
                this.showToast(`🔧 Casing Spec: ${p1} & ${p2}`);
            });
        });

        // Casing Settings Drawer (in Stage 3 Casing Section)
        document.getElementById('casingSettingsTriggerBtn')?.addEventListener('click', () => {
            const drawer = document.getElementById('casingSettingsDrawer');
            if (!drawer) return;
            const willOpen = drawer.style.display === 'none';
            drawer.style.display = willOpen ? 'block' : 'none';
            if (willOpen) {
                this.syncCasingNamesUI();
            }
        });

        document.getElementById('closeCasingSettingsDrawerBtn')?.addEventListener('click', () => {
            const drawer = document.getElementById('casingSettingsDrawer');
            if (drawer) drawer.style.display = 'none';
        });

        document.querySelectorAll('#casingDrawerPresetsGrid .csd-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const p1 = chip.dataset.p1 || '';
                const r1 = parseFloat(chip.dataset.r1) || 400;
                const p2 = chip.dataset.p2 || '';
                const r2 = parseFloat(chip.dataset.r2) || 700;
                const in1 = document.getElementById('inlineCasing1NameInput');
                const inR1 = document.getElementById('inlineCasing1RateInput');
                const in2 = document.getElementById('inlineCasing2NameInput');
                const inR2 = document.getElementById('inlineCasing2RateInput');
                if (in1) in1.value = p1;
                if (inR1) inR1.value = r1;
                if (in2) in2.value = p2;
                if (inR2) inR2.value = r2;
            });
        });

        document.getElementById('saveCasingSettingsDrawerBtn')?.addEventListener('click', () => {
            const p1 = document.getElementById('inlineCasing1NameInput')?.value || '';
            const r1 = parseFloat(document.getElementById('inlineCasing1RateInput')?.value) || 400;
            const p2 = document.getElementById('inlineCasing2NameInput')?.value || '';
            const r2 = parseFloat(document.getElementById('inlineCasing2RateInput')?.value) || 700;
            this.applyCasingSettings(p1, r1, p2, r2);
            const drawer = document.getElementById('casingSettingsDrawer');
            if (drawer) drawer.style.display = 'none';
            this.showToast(`✅ Casing customized: ${this.getCasing1ShortName()} & ${this.getCasing2ShortName()}`);
        });

        document.getElementById('saveBrandProfileBtn')?.addEventListener('click', () => {
            this.syncBrandFromInputs(true);
            this.applyBrandToUI();
            this.syncAutoBillNumber(true);
            this.calculateAndRender();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showToast('🏢 Company Profile Saved & Applied!');
        });

        // Settings Hub Segmented View Switcher (Instant Tab Views without long page scrolling)
        this.switchSettingsView = (viewId) => {
            const panels = document.querySelectorAll('.settings-view-panel');
            panels.forEach(panel => {
                panel.style.display = panel.id === viewId ? 'block' : 'none';
            });
            document.querySelectorAll('.settings-nav-segmented .set-seg-btn').forEach(btn => {
                const isActive = btn.dataset.view === viewId;
                btn.classList.toggle('active', isActive);
                if (isActive) {
                    try {
                        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    } catch (_) {}
                }
            });
            if (viewId === 'set-view-casing') {
                this.syncCasingNamesUI();
            }
            if (viewId === 'set-view-whatsapp') {
                this.syncWaFormatUI();
                this.renderWaFormatLivePreview();
            }
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                try { window.lucide.createIcons(); } catch (_) {}
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        const switchSettingsView = this.switchSettingsView;

        // WhatsApp Format Designer Listeners
        const waTogglesMap = {
            waToggleCompanyHeader: 'companyHeader',
            waToggleAddress: 'address',
            waToggleGst: 'gst',
            waToggleSlabBreakup: 'slabBreakup',
            waTogglePipes: 'pipes',
            waTogglePipeSubtotal: 'pipeSubtotal',
            waToggleExtras: 'extras',
            waTogglePaymentDue: 'paymentDue',
            waToggleNote: 'note',
            waToggleFooterTerms: 'footerTerms',
            waToggleContact: 'contact'
        };

        this.syncWaFormatUI = () => {
            Object.entries(waTogglesMap).forEach(([id, key]) => {
                const el = document.getElementById(id);
                if (el) {
                    el.checked = this.waFormat[key] !== false;
                }
            });
        };

        this.renderWaFormatLivePreview = () => {
            const bubbleEl = document.getElementById('waSettingsLivePreviewBubble');
            if (!bubbleEl) return;

            // Generate representative sample bill for the live preview
            const sampleRes = {
                docType: 'INVOICE',
                drillingType: 'new',
                boreDia: '6.5"',
                totalDepth: 450,
                drillingCost: 46500,
                slabDetails: [
                    { range: '1–100 ft', depth: 100, rate: 90, cost: 9000 },
                    { range: '101–200 ft', depth: 100, rate: 95, cost: 9500 },
                    { range: '201–300 ft', depth: 100, rate: 100, cost: 10000 },
                    { range: '301–400 ft', depth: 100, rate: 105, cost: 10500 },
                    { range: '401–450 ft', depth: 50, rate: 110, cost: 5500 }
                ],
                pvc7Length: 60,
                pvc7Rate: 400,
                pvc7Cost: 24000,
                pvc10Length: 0,
                pvc10Rate: 700,
                pvc10Cost: 0,
                boreBataCost: 2000,
                collarCapCost: 1500,
                transportSurveyCost: 1000,
                customExtraAmount: 0,
                discountAmount: 0,
                gstEnabled: false,
                gstPercentage: 18,
                gstAmount: 0,
                grandTotal: 75000,
                advancePaidAmount: 25000,
                balancePayable: 50000,
                customNote: 'Pump installation scheduled tomorrow'
            };

            const sampleMsg = this.buildCleanBillWhatsAppMessage({
                billNo: `${this.brand.billPrefix || 'AB'}-101`,
                billDate: new Date().toLocaleDateString('en-GB'),
                custName: 'R. Senthil Kumar',
                custPhone: '9842100000',
                custLocation: 'Main Site',
                custGst: '',
                res: sampleRes,
                paymentStatus: 'unpaid',
                formatConfig: this.waFormat
            });

            bubbleEl.innerHTML = this.formatWhatsAppBubbleHtml(sampleMsg);
        };

        Object.entries(waTogglesMap).forEach(([id, key]) => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.waFormat[key] = e.target.checked;
                this.saveToStorage(STORAGE_KEYS.waFormat, this.waFormat);
                this.renderWaFormatLivePreview();
            });
        });

        document.getElementById('resetWaFormatBtn')?.addEventListener('click', () => {
            this.waFormat = JSON.parse(JSON.stringify(this.defaultWaFormat));
            this.saveToStorage(STORAGE_KEYS.waFormat, this.waFormat);
            this.syncWaFormatUI();
            this.renderWaFormatLivePreview();
            this.showToast('↺ WhatsApp format reset to default');
        });

        // iOS Image Save Modal close listeners
        document.getElementById('closeIosImgModalBtn')?.addEventListener('click', () => {
            this.closeIosImageSaveModal();
        });
        document.getElementById('dismissIosImgModalBtn')?.addEventListener('click', () => {
            this.closeIosImageSaveModal();
        });

        document.querySelectorAll('.settings-nav-segmented .set-seg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget || btn;
                const viewId = targetBtn.dataset.view;
                if (viewId) {
                    this.switchSettingsView(viewId);
                }
            });
        });

        // Quick Casing Presets in Settings View 2
        document.querySelectorAll('#setCasingPresetChips .csd-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const p1 = chip.dataset.p1 || '';
                const r1 = parseFloat(chip.dataset.r1) || 400;
                const p2 = chip.dataset.p2 || '';
                const r2 = parseFloat(chip.dataset.r2) || 700;
                const s1 = document.getElementById('setCasing1Name');
                const sR1 = document.getElementById('setCasing1Rate');
                const s2 = document.getElementById('setCasing2Name');
                const sR2 = document.getElementById('setCasing2Rate');
                if (s1 && p1) s1.value = p1;
                if (sR1 && r1) sR1.value = r1;
                if (s2 && p2) s2.value = p2;
                if (sR2 && r2) sR2.value = r2;
                this.applyCasingSettings(p1, r1, p2, r2);
                this.showToast(`🔧 Preset applied: ${p1} & ${p2}`);
            });
        });

        // Save Casing Specifications from Settings Casing View
        document.getElementById('saveCasingFromSettingsBtn')?.addEventListener('click', () => {
            const p1 = (document.getElementById('setCasing1Name')?.value || document.getElementById('brandCasing1Name')?.value || '').trim();
            const r1 = parseFloat(document.getElementById('setCasing1Rate')?.value ?? document.getElementById('brandCasing1Rate')?.value) || 400;
            const p2 = (document.getElementById('setCasing2Name')?.value || document.getElementById('brandCasing2Name')?.value || '').trim();
            const r2 = parseFloat(document.getElementById('setCasing2Rate')?.value ?? document.getElementById('brandCasing2Rate')?.value) || 700;
            this.applyCasingSettings(p1, r1, p2, r2);
            this.showToast(`✅ Casing specs updated: ${this.getCasing1ShortName()} & ${this.getCasing2ShortName()}`);
        });

        // Export Actions & Unified WhatsApp Preview Modal Listeners
    }
}
