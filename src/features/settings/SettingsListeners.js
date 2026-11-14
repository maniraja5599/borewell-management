// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

const WA_TOGGLES_MAP = {
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

export class SettingsListeners {
    // Settings = a short menu (account + one row per section). Tapping a row opens only that
    // section with a "‹ Settings" back bar; switchSettingsView('menu') goes back to the menu.
    switchSettingsView(viewId) {
        const menuMode = !viewId || viewId === 'menu';
        const panels = document.querySelectorAll('.settings-view-panel');
        panels.forEach(panel => {
            panel.style.display = (!menuMode && panel.id === viewId) ? (panel.dataset?.display || 'block') : 'none';
        });
        let title = '';
        document.querySelectorAll('.settings-nav-segmented .set-seg-btn').forEach(btn => {
            const isActive = !menuMode && btn.dataset.view === viewId;
            btn.classList.toggle('active', isActive);
            if (isActive) title = btn.querySelector?.('.smr-tx strong')?.textContent || (btn.textContent || '').trim();
        });
        const tab = document.getElementById('tab-brand');
        tab?.classList?.toggle('settings-in-view', !menuMode);
        const hub = document.getElementById('settingsHubHead');
        if (hub) hub.hidden = !menuMode;
        const bar = document.getElementById('settingsBackBar');
        if (bar) bar.hidden = menuMode;
        const titleEl = document.getElementById('settingsBackTitle');
        if (titleEl) titleEl.textContent = title;
        this._settingsView = menuMode ? 'menu' : viewId;
        if (menuMode) this.refreshSettingsMenuSubs?.();
        if (viewId === 'set-view-casing') {
            this.syncCasingNamesUI?.();
        }
        if (viewId === 'set-view-whatsapp') {
            this.syncWaFormatUI();
            this.renderWaFormatLivePreview();
        }
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (_) {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // One-line summaries under the menu rows show what is set today.
    refreshSettingsMenuSubs() {
        const set = (id, text) => { const el = document.getElementById(id); if (el && text) el.textContent = text; };
        const b = this.brand || {};
        const companyBits = [b.companyName, b.billPrefix ? `bills ${b.billPrefix}-${b.nextBillSeq || ''}` : ''].filter(Boolean);
        set('smrCompanySub', companyBits.join(' · '));
        const c1 = this.getCasing1ShortName?.(); const c2 = this.getCasing2ShortName?.();
        if (c1 || c2) set('smrCasingSub', [c1 && `${c1} ₹${this.rates?.pvc7Rate ?? ''}/ft`, c2 && `${c2} ₹${this.rates?.pvc10Rate ?? ''}/ft`].filter(Boolean).join(' · '));
        const themeName = (document.getElementById('activeThemeBadgeLabel')?.textContent || '').replace(/^Active:\s*/, '');
        if (themeName) set('smrThemeSub', themeName.trim());
        const n = (this.history || []).length;
        const cu = (this.customers || []).length;
        set('smrVaultSub', `${n} ${n === 1 ? 'bill' : 'bills'} · ${cu} ${cu === 1 ? 'customer' : 'customers'} on this phone`);
    }

    syncWaFormatUI() {
        Object.entries(WA_TOGGLES_MAP).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) {
                el.checked = this.waFormat && this.waFormat[key] !== false;
            }
        });
    }

    renderWaFormatLivePreview() {
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
            billNo: `${this.brand?.billPrefix || 'AB'}-101`,
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
    }

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
                this.syncCasingNamesUI?.();
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

        // WhatsApp Format Designer Listeners
        Object.entries(WA_TOGGLES_MAP).forEach(([id, key]) => {
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
        document.getElementById('settingsBackBtn')?.addEventListener('click', () => this.switchSettingsView('menu'));

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
    }
}
