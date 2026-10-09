/**
 * BoreBill Pro — Unified Enterprise SaaS Borewell Billing, Khata CRM & Slab Engine
 * Powered by Anjaneya Progressive Slab Logic + Lucide Vector Icons
 */

const DEPTH_SLABS_DEFINITION = [
    { start: 1,    end: 300,  span: 300, inc: 0,    defaultRate: 90,   rangeStr: '001-300 ft' },
    { start: 301,  end: 400,  span: 100, inc: 10,   defaultRate: 100,  rangeStr: '301-400 ft' },
    { start: 401,  end: 500,  span: 100, inc: 30,   defaultRate: 120,  rangeStr: '401-500 ft' },
    { start: 501,  end: 600,  span: 100, inc: 60,   defaultRate: 150,  rangeStr: '501-600 ft' },
    { start: 601,  end: 700,  span: 100, inc: 100,  defaultRate: 190,  rangeStr: '601-700 ft' },
    { start: 701,  end: 800,  span: 100, inc: 150,  defaultRate: 240,  rangeStr: '701-800 ft' },
    { start: 801,  end: 900,  span: 100, inc: 210,  defaultRate: 300,  rangeStr: '801-900 ft' },
    { start: 901,  end: 1000, span: 100, inc: 280,  defaultRate: 370,  rangeStr: '901-1000 ft' },
    { start: 1001, end: 1100, span: 100, inc: 380,  defaultRate: 470,  rangeStr: '1001-1100 ft' },
    { start: 1101, end: 1200, span: 100, inc: 480,  defaultRate: 570,  rangeStr: '1101-1200 ft' },
    { start: 1201, end: 1300, span: 100, inc: 580,  defaultRate: 670,  rangeStr: '1201-1300 ft' },
    { start: 1301, end: 1400, span: 100, inc: 680,  defaultRate: 770,  rangeStr: '1301-1400 ft' },
    { start: 1401, end: 1500, span: 100, inc: 780,  defaultRate: 870,  rangeStr: '1401-1500 ft' },
    { start: 1501, end: 1600, span: 100, inc: 880,  defaultRate: 970,  rangeStr: '1501-1600 ft' },
    { start: 1601, end: 1700, span: 100, inc: 980,  defaultRate: 1070, rangeStr: '1601-1700 ft' },
    { start: 1701, end: 1800, span: 100, inc: 1080, defaultRate: 1170, rangeStr: '1701-1800 ft' },
    { start: 1801, end: 1900, span: 100, inc: 1180, defaultRate: 1270, rangeStr: '1801-1900 ft' },
    { start: 1901, end: 2000, span: 100, inc: 1280, defaultRate: 1370, rangeStr: '1901-2000 ft' },
    { start: 2001, end: 2200, span: 200, inc: 1480, defaultRate: 1570, rangeStr: '2001-2200 ft' }
];

const COUNTRY_DIAL_CODES = [
    { code: '+91',  dial: '91',  iso: 'IN', flag: '🇮🇳', name: 'India',        minLen: 10, maxLen: 10, indiaRule: true },
    { code: '+65',  dial: '65',  iso: 'SG', flag: '🇸🇬', name: 'Singapore',    minLen: 8,  maxLen: 8  },
    { code: '+971', dial: '971', iso: 'AE', flag: '🇦🇪', name: 'UAE',          minLen: 9,  maxLen: 9  },
    { code: '+60',  dial: '60',  iso: 'MY', flag: '🇲🇾', name: 'Malaysia',     minLen: 9,  maxLen: 10 },
    { code: '+94',  dial: '94',  iso: 'LK', flag: '🇱🇰', name: 'Sri Lanka',    minLen: 9,  maxLen: 9  },
    { code: '+966', dial: '966', iso: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', minLen: 9,  maxLen: 9  },
    { code: '+974', dial: '974', iso: 'QA', flag: '🇶🇦', name: 'Qatar',        minLen: 8,  maxLen: 8  },
    { code: '+965', dial: '965', iso: 'KW', flag: '🇰🇼', name: 'Kuwait',       minLen: 8,  maxLen: 8  },
    { code: '+968', dial: '968', iso: 'OM', flag: '🇴🇲', name: 'Oman',         minLen: 8,  maxLen: 8  },
    { code: '+973', dial: '973', iso: 'BH', flag: '🇧🇭', name: 'Bahrain',      minLen: 8,  maxLen: 8  },
    { code: '+1',   dial: '1',   iso: 'US', flag: '🇺🇸', name: 'USA / Canada', minLen: 10, maxLen: 10 },
    { code: '+44',  dial: '44',  iso: 'GB', flag: '🇬🇧', name: 'UK',           minLen: 10, maxLen: 10 },
    { code: '+61',  dial: '61',  iso: 'AU', flag: '🇦🇺', name: 'Australia',    minLen: 9,  maxLen: 9  },
    { code: '+27',  dial: '27',  iso: 'ZA', flag: '🇿🇦', name: 'South Africa', minLen: 9,  maxLen: 9  },
    { code: '+977', dial: '977', iso: 'NP', flag: '🇳🇵', name: 'Nepal',        minLen: 10, maxLen: 10 }
];

const I18N_DICTIONARY = {
    en: {
        netPayableLabel: "NET TOTAL",
        pillQuotation: "Quotation",
        pillFinalBill: "Final Bill",
        newBore: "New Bore",
        reBore: "Re-Bore",
        boreSize: "Bore Dia:",
        customerDetails: "Customer",
        optionalTapToAdd: "Pick saved customer or Add new",
        pickCustomerBtn: "Pick",
        customerSectionHeading: "Customer",
        siteAndBillHeading: "Site & Bill Meta",
        clearCust: "Clear",
        saveToCustomerBook: "Save Party",
        customerName: "Customer Name *",
        phoneNumber: "Mobile / WhatsApp No *",
        customerPlaceLabel: "Customer Place *",
        villageLocation: "Service Site Location",
        billNo: "Bill / Quote # (Auto)",
        billDate: "Bill Date",
        drillingAndPipeInputs: "Drilling & Casing",
        resetValues: "Reset",
        drillingSectionLabel: "1. Borewell Drilling",
        casingSectionLabel: "2. Casing Pipes",
        oldBoreDepth: "Old Bore Flushing",
        totalDepth: "Total Drilling Depth",
        tapOrTypeDepth: "Slab rate auto-calculated",
        baseDrillingRate: "Base Rate (001–300 ft)",
        autoShiftsSlabs: "Shifts all 19 depth slabs",
        priceSettingsBtn: "Price Settings",
        extraAndAdvanceBtn: "Extras / Advance",
        quickRateSettings: "Quick Rate Settings",
        editAllSlabs: "Edit 19 Slabs",
        saveRates: "Apply Rates",
        extraChargesAndPayment: "Extras, Discount & Advance",
        collarCapWelding: "Collar / Cap / Welding (₹)",
        transportWaterSurvey: "Transport / Survey (₹)",
        customExtraItemName: "Other Charge Name",
        customExtraAmount: "Other Charge (₹)",
        discountLess: "Discount (− ₹)",
        advanceReceived: "Advance Paid (− ₹)",
        customer: "Customer:",
        mobile: "Mobile:",
        site: "Site:",
        workType: "Work Type",
        totalDepthShort: "Total Depth",
        baseRateShort: "Base Rate",
        casingPipes: "Casing (7\"/10\")",
        depthSlabCol: "Depth Slab (ft)",
        feetCol: "Feet",
        rateCol: "Rate/ft",
        amountCol: "Amount",
        totalDrillingCharges: "Total Drilling Cost",
        boreBataCharge: "Bore Bata (Per Bore)",
        boreBataSubHint: "Default ₹2,000 per bore • Instant edit",
        subtotal: "Subtotal",
        grandTotal: "TOTAL AMOUNT",
        advancePaid: "Advance Paid",
        balancePayable: "BALANCE PAYABLE",
        forCompany: "For",
        sendTextBreakup: "Send itemized bill",
        saveBillImage: "Save Bill Image",
        hdPngReceipt: "HD PNG Receipt",
        downloadPdf: "Download A4 PDF",
        officialQuotationPdf: "Official Letterhead",
        saveToHistory: "Save Bill",
        keepInBillBook: "Store in Bill Book",
        totalCustomersStat: "Customers",
        totalBilledStat: "Total Billed",
        pendingBalanceStat: "Pending Due",
        customerDirectoryTitle: "Customer Ledger",
        customerDirectorySub: "Manage parties, track borewell dues & create instant bills",
        addCustomerBtnLabel: "Add Customer",
        addCustomerTitle: "New Customer Details",
        saveCustomerBtn: "Save Customer",
        filterAll: "All",
        filterPendingDue: "Pending Due",
        filterSettled: "No Due",
        savedBillsHistory: "Bills",
        savedBillsSub: "Track final bills, unpaid dues, dates & quotations",
        billsTabLabel: "Bills",
        quotationsTabLabel: "Quotations",
        clearAll: "Clear All",
        masterPriceSettings: "Master Price Settings",
        masterPriceSub: "Default drilling, casing pipe & bata rates",
        resetDefaults: "Defaults",
        oldBoreFlushingRate: "Old Bore Flushing Rate ₹/ft",
        boreBataFixed: "Bore Bata (Per Bore ₹)",
        slabBufferGrace: "Slab Grace Buffer (ft)",
        depthSlabRatesTitle: "19 Depth Slab Rates (1–2200 ft)",
        depthSlabRatesSub: "Anjaneya progressive 100-ft depth slab pricing",
        bulkAdjustAllSlabs: "Quick Shift:",
        saveAllPriceSettings: "Save & Apply Price Settings",
        companyBrandingTitle: "Company Profile & Branding",
        companyBrandingSub: "White-label your Borewell Company Name, Logo, Address & Theme",
        uploadCompanyLogo: "Upload Logo",
        removeLogo: "Remove",
        logoHint: "Square PNG/JPG logo appears on Header, Image & A4 PDF Bills",
        billThemeColor: "Brand Theme Color:",
        companyNameLabel: "Company Name *",
        companySloganLabel: "Tagline / Slogan",
        contactNumbersLabel: "Contact Phone Numbers *",
        billPrefixLabel: "Bill Number Prefix",
        officeAddressLabel: "Office Address",
        gstinNumberLabel: "GSTIN (Optional)",
        upiGpayLabel: "UPI ID / GPay Number",
        footerTermsLabel: "📋 Quotation Footer Note (Quotation Only)",
        finalBillFooterTermsLabel: "🧾 Final Bill Footer Note (Final Bill Only)",
        saveCompanyBranding: "Save Company Profile",
        backupRestoreTitle: "Data Backup & Restore",
        backupRestoreSub: "Export or restore all customers, bills, rates & company branding",
        navCalculator: "New Bill",
        navCustomers: "Customers",
        navHistory: "Bills",
        navRates: "Rates",
        navSettings: "Settings",
        navCompany: "Company"
    }
};

class BoreBillSaaSApp {
    constructor() {
        this.lang = 'en';
        localStorage.setItem('borebill_lang', 'en');
        this.defaultCountryCode = this.initDefaultCountryCode();
        this.crmFilter = 'all'; // 'all' | 'due' | 'settled'
        this.historyDocFilter = 'INVOICE'; // 'INVOICE' | 'QUOTATION' (Always default to Bills!)
        this.historyPayFilter = 'all'; // 'all' | 'unpaid' | 'paid'
        this.historyDatePreset = 'all'; // 'all' | 'today' | 'yesterday' | '7d' | 'month' | 'custom'
        this.historyDateFrom = '';
        this.historyDateTo = '';

        this.defaultBrand = {
            companyName: 'SRI ANJANEYA BOREWELLS',
            tagline: 'ஆழமான நம்பிக்கை! • High Power Compressor Drilling',
            phones: '+91 96596 57777, +91 94433 73573',
            phoneCountryCode: '+91',
            address: '6/906-1, Trichy Main Road, Namakkal, Tamil Nadu - 637001',
            website: '',
            gstNumber: '',
            upiId: '',
            billPrefix: 'AB',
            nextBillSeq: 101,
            nextQuoteSeq: 101,
            termsNote: '⚠️ மண் & பாறை கடினம் மற்றும் டீசல் விலைக்கு ஏற்ப இறுதி கட்டணம் மாறுபடலாம். • Prices subject to rock strata & depth.',
            finalBillTermsNote: 'Thank you !',
            casing1Name: '7" Casing Pipe',
            casing2Name: '10" Casing Pipe',
            theme: 'emerald',
            logoDataUrl: ''
        };

        this.defaultRates = {
            baseDrillingRate: 90,
            oldBoreRate: 40,
            pvc7Rate: 400,
            pvc10Rate: 700,
            boreBataRate: 2000,
            slabBufferFt: 5,
            gstPercentage: 18,
            slabRates: DEPTH_SLABS_DEFINITION.map(s => ({
                start: s.start,
                end: s.end,
                span: s.span,
                rangeStr: s.rangeStr,
                rate: s.defaultRate
            }))
        };

        this.brand = this.loadFromStorage('borebill_brand', this.defaultBrand);
        if (this.brand.finalBillTermsNote === undefined) {
            this.brand.finalBillTermsNote = this.defaultBrand.finalBillTermsNote;
        }
        if (this.brand.casing1Name === undefined) {
            this.brand.casing1Name = this.defaultBrand.casing1Name;
        }
        if (this.brand.casing2Name === undefined) {
            this.brand.casing2Name = this.defaultBrand.casing2Name;
        }
        if (this.brand.website === undefined) {
            this.brand.website = '';
        }
        // Migrate old default "Thank you ! Makers Of Green India !" or Tamil wording to clean "Thank you !"
        const v52FooterMigrated = localStorage.getItem('borebill_v52_footer_migrated') === '1';
        if (
            /பாறை கடினம்|rock strata|எங்கள் நிறுவனத்தைத்|நன்றி/i.test(this.brand.finalBillTermsNote || '') ||
            (!v52FooterMigrated && (this.brand.finalBillTermsNote || '').trim() === 'Thank you ! Makers Of Green India !')
        ) {
            this.brand.finalBillTermsNote = 'Thank you !';
            this.saveToStorage('borebill_brand', this.brand);
        }
        if (!v52FooterMigrated) {
            localStorage.setItem('borebill_v52_footer_migrated', '1');
        }
        this.rates = this.loadFromStorage('borebill_rates', this.defaultRates);
        this.history = this.loadFromStorage('borebill_history', []);
        this.customers = this.loadFromStorage('borebill_customers', []);
        this.savedExtras = this.loadFromStorage('borebill_saved_extras', []);
        this.savedNotes = this.loadFromStorage('borebill_saved_notes', []);
        this.showAllInlineSlabs = false;

        const initialProfiles = [
            {
                id: 'rp_standard',
                name: 'Standard 6.5" Rate',
                isDefault: true,
                rates: JSON.parse(JSON.stringify(this.rates))
            },
            {
                id: 'rp_hardrock',
                name: 'Hard Rock Rate (₹100)',
                isDefault: false,
                rates: {
                    baseDrillingRate: 100,
                    oldBoreRate: 50,
                    pvc7Rate: 420,
                    pvc10Rate: 750,
                    boreBataRate: 2000,
                    slabBufferFt: 5,
                    gstPercentage: 18,
                    slabRates: DEPTH_SLABS_DEFINITION.map(s => ({
                        start: s.start,
                        end: s.end,
                        span: s.span,
                        rangeStr: s.rangeStr,
                        rate: 100 + s.inc
                    }))
                }
            }
        ];

        this.rateProfiles = this.loadFromStorage('borebill_rate_profiles', initialProfiles);
        if (!Array.isArray(this.rateProfiles) || this.rateProfiles.length === 0) {
            this.rateProfiles = initialProfiles;
        }
        if (!this.rateProfiles.some(p => p.isDefault)) {
            this.rateProfiles[0].isDefault = true;
        }

        const defaultProfile = this.getDefaultRateProfile();

        this.defaultSession = {
            drillingType: 'new',
            docType: 'INVOICE',
            boreDia: '6.5"',
            oldBoreDepth: 0,
            totalDepth: 0,
            baseDrillingRate: defaultProfile.rates.baseDrillingRate || 90,
            pvc7Length: 0,
            pvc10Length: 0,
            gstEnabled: false,
            collarCapCost: 0,
            transportSurveyCost: 0,
            customExtraLabel: '',
            customExtraAmount: 0,
            customNote: '',
            discountAmount: 0,
            advancePaidAmount: 0,
            custName: '',
            custPhone: '',
            custLocation: '',
            custGst: '',
            activeRateProfileId: defaultProfile.id,
            activeTab: 'tab-bill',
            currentWizardStep: 1
        };

        this.state = this.loadFromStorage('borebill_last_session', this.defaultSession);
        this.migrateStoredPhonesWithCountryCode();
        // Always default to Final Bill ('INVOICE') view and GST OFF unless viewing a specific saved bill
        if (!this.state.loadedHistoryBillId) {
            this.state.docType = 'INVOICE';
            this.state.gstEnabled = false;
        } else if (this.state.docType !== 'QUOTATION') {
            this.state.docType = 'INVOICE';
        }
        this.activeRateProfileId = this.state.activeRateProfileId || defaultProfile.id;
        const activeProf = this.rateProfiles.find(p => p.id === this.activeRateProfileId) || defaultProfile;
        this.activeRateProfileId = activeProf.id;
        this.rates = JSON.parse(JSON.stringify(activeProf.rates));
        if (this.rates.boreBataRate === undefined || this.rates.boreBataRate === null) {
            this.rates.boreBataRate = 2000;
        }

        this.loadedHistoryBillId = this.state.loadedHistoryBillId || null;
        this.isSavedBillReadOnly = Boolean(this.state.isSavedBillReadOnly);
        this.isBillPreviewOpen = Boolean(this.loadedHistoryBillId && this.isSavedBillReadOnly);
        this.isBillSavedAndReadyToShare = Boolean(this.loadedHistoryBillId && this.isSavedBillReadOnly);
        this.currentWizardStep = Math.max(1, Math.min(2, parseInt(this.state.currentWizardStep, 10) || 1));
        this.wizCustFilter = 'ALL';
        this.lastResult = null;
        this.lockedKeyboardDockBottom = null;
        this.init();
    }

    refreshIcons() {
        if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
        if (this._iconRefreshScheduled) return;
        this._iconRefreshScheduled = true;
        requestAnimationFrame(() => {
            this._iconRefreshScheduled = false;
            try {
                window.lucide.createIcons();
            } catch (_) {}
        });
    }

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
        this.updateQuickTabJumpLabel();
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
            this.updateQuickTabJumpLabel(nextEl);
            this.updateQuickTabJumpPosition();
        }
    }

    updateQuickTabJumpLabel(activeEl = document.activeElement) {
        const floatBtn = document.getElementById('billQuickTabJumpBtn');
        if (floatBtn) floatBtn.style.display = 'none';
    }

    updateQuickTabJumpPosition() {
        // Quick next button removed
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

    loadFromStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return JSON.parse(JSON.stringify(fallback));
            const parsed = JSON.parse(raw);
            if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : [];
            return { ...JSON.parse(JSON.stringify(fallback)), ...parsed };
        } catch (e) {
            return JSON.parse(JSON.stringify(fallback));
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            this.showToast('⚠️ Storage full! Please use smaller logo image.');
        }
    }

    setupIosPwaViewportFix() {
        try {
            const ua = navigator.userAgent || '';
            const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isCriOS = isIOS && /CriOS/i.test(ua);
            const isAndroid = /Android/i.test(ua);
            const isStandalone = (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
            const root = document.documentElement;
            if (isIOS) {
                root.classList.add('ios-device');
                if (isCriOS) {
                    root.classList.add('ios-crios');
                }
            }
            if (isAndroid) {
                root.classList.add('android-device');
            }
            if (isStandalone) {
                root.classList.add('pwa-standalone');
                if (isIOS) {
                    root.classList.add('ios-standalone');
                }
                if (isAndroid) {
                    root.classList.add('android-standalone');
                }
            }
        } catch (e) {
            // Ignore environment detection errors
        }
    }

    syncIosTopSafeBarColor() {
        const liveBar = document.getElementById('stickyLiveBar');
        const isLiveBarVisible = Boolean(liveBar && liveBar.style.display !== 'none');
        if (document.body) {
            document.body.classList.toggle('live-bar-hidden', !isLiveBarVisible);
        }
    }

    syncTopHeaderWrapLock() {
        if (this._headerLockRafId) return;
        this._headerLockRafId = requestAnimationFrame(() => {
            this._headerLockRafId = null;
            const headerWrap = document.querySelector('.app-top-header-wrap');
            if (!headerWrap) return;

            const vv = window.visualViewport;
            // Keep fixed top bar completely pinned in New Bill (tab-bill)
            const isBillTab = (!this.state || !this.state.activeTab || this.state.activeTab === 'tab-bill');
            const offsetTop = (vv && isBillTab) ? Math.max(0, Math.round(vv.offsetTop || 0)) : 0;

            if (offsetTop > 0) {
                headerWrap.style.transform = `translate3d(0, ${offsetTop}px, 0)`;
            } else if (headerWrap.style.transform) {
                headerWrap.style.transform = '';
            }
        });
    }

    startIosViewportSyncLoop() {
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
    }

    init() {
        this.setupIosPwaViewportFix();
        this.restoreRememberedSessionUI();
        this.applyBrandToUI();
        this.populateRateInputsUI(this.getActiveRateProfile());
        this.renderMasterSlabsGrid();
        this.renderRateProfilesUI();
        this.renderHistoryList();
        this.renderCustomerDirectory();
        this.setupEventListeners();
        this.applyLanguage(this.lang);

        // Restore exact Wizard Step or Saved Bill state where user left off
        if (this.loadedHistoryBillId && this.history.some(h => h.id === this.loadedHistoryBillId)) {
            this.loadBillFromHistory(this.loadedHistoryBillId, this.isSavedBillReadOnly, false);
        } else {
            this.loadedHistoryBillId = null;
            this.isSavedBillReadOnly = false;
            this.isBillPreviewOpen = false;
            this.isBillSavedAndReadyToShare = false;
            const restoredStep = Math.max(1, Math.min(2, parseInt(this.state.currentWizardStep, 10) || 1));
            this.goToWizardStep(restoredStep, false);
        }

        if (this.state.activeTab && this.state.activeTab !== 'tab-bill') {
            this.switchTab(this.state.activeTab, false, false);
        }
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
        this.calculateAndRender();
        this.renderCustomerSiteSuggestions();
        this.renderSavedExtrasUI();
        this.renderSavedNotesUI();
        this.refreshIcons();

        // Restore exact scroll position where user left off
        const savedScrollY = parseInt(sessionStorage.getItem('borebill_scroll_y') || '0', 10);
        if (savedScrollY > 0) {
            setTimeout(() => {
                window.scrollTo({ top: savedScrollY, behavior: 'instant' });
                this.syncIosTopSafeBarColor();
                this.syncTopHeaderWrapLock();
            }, 40);
        }
        window.addEventListener('scroll', () => {
            sessionStorage.setItem('borebill_scroll_y', String(Math.round(window.scrollY || 0)));
            this.syncIosTopSafeBarColor();
            this.syncTopHeaderWrapLock();
        }, { passive: true });
        window.addEventListener('touchmove', () => {
            this.syncTopHeaderWrapLock();
        }, { passive: true });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('scroll', () => {
                this.syncIosTopSafeBarColor();
                this.syncTopHeaderWrapLock();
            }, { passive: true });
            window.visualViewport.addEventListener('resize', () => {
                this.syncIosTopSafeBarColor();
                this.syncTopHeaderWrapLock();
            }, { passive: true });
        }
        document.addEventListener('focusin', () => {
            this.syncIosTopSafeBarColor();
            this.syncTopHeaderWrapLock();
            setTimeout(() => this.syncTopHeaderWrapLock(), 50);
            setTimeout(() => this.syncTopHeaderWrapLock(), 150);
            setTimeout(() => this.syncTopHeaderWrapLock(), 300);
        }, { passive: true });
        document.addEventListener('focusout', () => {
            setTimeout(() => {
                this.syncIosTopSafeBarColor();
                this.syncTopHeaderWrapLock();
            }, 60);
            setTimeout(() => {
                this.syncTopHeaderWrapLock();
            }, 200);
        }, { passive: true });
    }

    /* ==========================================================================
       AUTO-INCREMENT BILL / QUOTATION NUMBERING & SESSION STATE
       ========================================================================== */

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
        this.saveToStorage('borebill_last_session', this.state);
    }

    /* ==========================================================================
       EXACT ANJANEYA BOREWELLS SLAB CALCULATION ENGINE
       ========================================================================== */

    normalizeSlabArray(rawSlabs, fallbackBaseRate = 90) {
        const source = (Array.isArray(rawSlabs) && rawSlabs.length > 0)
            ? rawSlabs
            : DEPTH_SLABS_DEFINITION.map(s => ({ ...s, rate: s.defaultRate }));

        let currentStart = 1;
        return source.map((s, idx) => {
            const defaultSpan = idx === 0 ? 300 : 100;
            let span = parseInt(s.span, 10);
            if (!span || span < 10) {
                const parsedEnd = parseInt(s.end, 10);
                span = (parsedEnd && parsedEnd >= currentStart) ? (parsedEnd - currentStart + 1) : defaultSpan;
            }
            const start = currentStart;
            const end = start + span - 1;
            currentStart = end + 1;
            const rate = Math.max(1, parseFloat(s.rate ?? s.defaultRate ?? fallbackBaseRate) || fallbackBaseRate);
            const rangeStr = `${String(start).padStart(3, '0')}-${end} ft`;
            return {
                start,
                end,
                span,
                rangeStr,
                rate
            };
        });
    }

    getEffectiveSlabs(overrideBaseRate, targetDepth = 0) {
        const activeBase = overrideBaseRate > 0 ? overrideBaseRate : (this.rates.baseDrillingRate || 90);
        const storedSlabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);

        const firstSlabRate = storedSlabs[0]?.rate || 90;
        const delta = activeBase - firstSlabRate;

        const result = storedSlabs.map((s) => ({
            start: s.start,
            end: s.end,
            span: s.span,
            rangeStr: s.rangeStr,
            rate: Math.max(1, s.rate + delta)
        }));

        // If a borewell depth exceeds the last explicitly defined slab row, auto-extend in 100 ft steps using the last step
        const maxNeeded = Math.min(3500, Math.max(0, parseInt(targetDepth, 10) || 0));
        if (result.length > 0 && maxNeeded > result[result.length - 1].end) {
            const lastStep = result.length >= 2
                ? Math.max(0, result[result.length - 1].rate - result[result.length - 2].rate)
                : 10;
            while (result[result.length - 1].end < maxNeeded) {
                const prev = result[result.length - 1];
                const start = prev.end + 1;
                const span = 100;
                const end = start + span - 1;
                const rate = Math.max(1, prev.rate + lastStep);
                result.push({
                    start,
                    end,
                    span,
                    rangeStr: `${String(start).padStart(3, '0')}-${end} ft`,
                    rate
                });
            }
        }

        return result;
    }

    calculateNewBoreSlabs(totalDepth, baseRate) {
        const slabs = this.getEffectiveSlabs(baseRate, totalDepth);
        const bufferFt = typeof this.rates.slabBufferFt === 'number' ? this.rates.slabBufferFt : 5;
        const slabDetails = [];
        let totalCost = 0;
        let remaining = totalDepth;
        let currentDepth = 1;

        for (let i = 0; i < slabs.length; i++) {
            if (remaining <= 0) break;
            const slab = slabs[i];
            const isLastSlab = (i === slabs.length - 1);

            let applicable;
            if (!isLastSlab && remaining > slab.span && (remaining - slab.span) <= bufferFt) {
                applicable = remaining;
            } else if (isLastSlab) {
                applicable = remaining;
            } else {
                applicable = Math.min(slab.span, remaining);
            }

            if (applicable > 0) {
                const cost = applicable * slab.rate;
                totalCost += cost;
                const endDepth = currentDepth + applicable - 1;
                slabDetails.push({
                    slabIndex: i,
                    range: `${String(currentDepth).padStart(3, '0')}–${endDepth} ft`,
                    depth: applicable,
                    rate: slab.rate,
                    cost
                });
                currentDepth += applicable;
                remaining -= applicable;
            }
        }

        return { totalCost, slabDetails };
    }

    calculateRepairBoreSlabs(oldBoreDepth, totalDepth, baseRate) {
        const slabs = this.getEffectiveSlabs(baseRate, totalDepth);
        const bufferFt = typeof this.rates.slabBufferFt === 'number' ? this.rates.slabBufferFt : 5;
        const slabDetails = [];
        let totalCost = 0;

        const validOldDepth = Math.min(oldBoreDepth, totalDepth);
        if (validOldDepth > 0) {
            const flushCost = validOldDepth * this.rates.oldBoreRate;
            totalCost += flushCost;
            slabDetails.push({
                slabIndex: -1,
                range: `001–${validOldDepth} ft (Flush)`,
                depth: validOldDepth,
                rate: this.rates.oldBoreRate,
                cost: flushCost
            });
        }

        let remaining = Math.max(0, totalDepth - validOldDepth);
        let currentDepth = validOldDepth + 1;

        for (let i = 0; i < slabs.length; i++) {
            if (remaining <= 0) break;
            const slab = slabs[i];
            const adjStart = Math.max(slab.start, currentDepth);

            if (adjStart <= slab.end || i === slabs.length - 1) {
                const standardSpan = (i === slabs.length - 1) ? remaining : (slab.end - adjStart + 1);
                const isLastSlab = (i === slabs.length - 1);

                let applicable;
                if (!isLastSlab && remaining > standardSpan && (remaining - standardSpan) <= bufferFt) {
                    applicable = remaining;
                } else {
                    applicable = Math.min(standardSpan, remaining);
                }

                if (applicable > 0) {
                    const adjEnd = adjStart + applicable - 1;
                    const cost = applicable * slab.rate;
                    totalCost += cost;
                    slabDetails.push({
                        slabIndex: i,
                        range: `${String(adjStart).padStart(3, '0')}–${adjEnd} ft`,
                        depth: applicable,
                        rate: slab.rate,
                        cost
                    });
                    remaining -= applicable;
                    currentDepth = adjEnd + 1;
                }
            }
        }

        return { totalCost, slabDetails };
    }

    calculateAndRender(options = {}) {
        this.persistCurrentSession();

        const s = this.state;
        const totalDepth = s.totalDepth;
        const oldBoreDepth = s.oldBoreDepth;
        const baseDrillingRate = s.baseDrillingRate;
        const pvc7Length = s.pvc7Length;
        const pvc10Length = s.pvc10Length;
        const gstEnabled = s.gstEnabled;
        const custGst = (s.custGst || '').trim().toUpperCase();

        const collarCapCost = s.collarCapCost;
        const transportSurveyCost = s.transportSurveyCost;
        const customExtraLabel = s.customExtraLabel || 'Extra Charges';
        const customExtraAmount = s.customExtraAmount;
        const customNote = (s.customNote || '').trim();
        const discountAmount = s.discountAmount;
        const advancePaidAmount = s.advancePaidAmount;

        let slabCalc;
        if (s.drillingType === 'repair') {
            slabCalc = this.calculateRepairBoreSlabs(oldBoreDepth, totalDepth, baseDrillingRate);
        } else {
            slabCalc = this.calculateNewBoreSlabs(totalDepth, baseDrillingRate);
        }

        const drillingCost = slabCalc.totalCost;
        const pvc7Cost = pvc7Length * this.rates.pvc7Rate;
        const pvc10Cost = pvc10Length * this.rates.pvc10Rate;
        // Show ₹0 initially before any depth, pipe, or extra charge is entered; auto-apply Bore Bata as soon as billing starts
        const hasAnyBillActivity = (
            totalDepth > 0 ||
            oldBoreDepth > 0 ||
            pvc7Length > 0 ||
            pvc10Length > 0 ||
            collarCapCost > 0 ||
            transportSurveyCost > 0 ||
            customExtraAmount > 0
        );
        const boreBataCost = hasAnyBillActivity ? (this.rates.boreBataRate ?? 2000) : 0;

        const grossSubtotal = drillingCost + pvc7Cost + pvc10Cost + boreBataCost + collarCapCost + transportSurveyCost + customExtraAmount;
        const taxableAmount = Math.max(0, grossSubtotal - discountAmount);
        const gstAmount = gstEnabled ? Math.round((taxableAmount * this.rates.gstPercentage) / 100) : 0;
        const grandTotal = taxableAmount + gstAmount;
        const balancePayable = Math.max(0, grandTotal - advancePaidAmount);
        const avgPerFoot = totalDepth > 0 ? (drillingCost / totalDepth) : 0;

        const validOldBoreDepth = s.drillingType === 'repair'
            ? (totalDepth > 0 ? Math.min(oldBoreDepth, totalDepth) : oldBoreDepth)
            : 0;
        const oldBoreRate = this.rates.oldBoreRate || 40;
        const oldBoreCost = validOldBoreDepth * oldBoreRate;

        this.lastResult = {
            drillingType: s.drillingType,
            docType: s.docType || 'QUOTATION',
            boreDia: s.boreDia,
            totalDepth,
            oldBoreDepth,
            oldBoreRate,
            oldBoreCost,
            baseDrillingRate,
            pvc7Length,
            pvc7Rate: this.rates.pvc7Rate,
            pvc7Cost,
            pvc10Length,
            pvc10Rate: this.rates.pvc10Rate,
            pvc10Cost,
            boreBataCost,
            collarCapCost,
            transportSurveyCost,
            customExtraLabel,
            customExtraAmount,
            customNote,
            grossSubtotal,
            discountAmount,
            gstEnabled,
            custGst: gstEnabled ? custGst : '',
            gstPercentage: this.rates.gstPercentage,
            gstAmount,
            grandTotal,
            advancePaidAmount,
            balancePayable,
            avgPerFoot,
            slabDetails: slabCalc.slabDetails,
            slabBufferFt: typeof this.rates.slabBufferFt === 'number' ? this.rates.slabBufferFt : 5,
            drillingCost
        };

        this.renderReceiptUI(this.lastResult, options);
    }

    formatINR(amount) {
        return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
    }

    formatFullCurrency(amount) {
        return this.formatINR(amount);
    }

    escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getDocTypeTitle(docType) {
        if (docType === 'INVOICE') {
            return 'FINAL BILL / INVOICE';
        }
        return 'QUOTATION';
    }

    triggerOneShotPulse(el, className = 'sticky-val-pop') {
        if (!el) return;
        el.classList.remove(className);
        // Force reflow so rapid single steps re-trigger cleanly once and stop
        void el.offsetWidth;
        el.classList.add(className);
        if (el._pulseCleanupTimer) clearTimeout(el._pulseCleanupTimer);
        el._pulseCleanupTimer = setTimeout(() => {
            el.classList.remove(className);
        }, 380);
    }

    renderReceiptUI(res, options = {}) {
        const prevSnap = this._prevStickySnap;
        const totalPipeCost = (res.pvc7Cost || 0) + (res.pvc10Cost || 0);

        const totalBannerEl = document.getElementById('liveTotalBannerAmount');
        if (totalBannerEl) {
            totalBannerEl.textContent = this.formatINR(res.grandTotal);
        }
        document.getElementById('liveSummaryDepthBadge').textContent = `Depth: ${res.totalDepth || 0} ft (${res.boreDia})`;
        document.getElementById('liveSummaryPerFt').textContent = `₹${Math.round(res.avgPerFoot)}/ft avg`;

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
                if (lbl) lbl.textContent = '🔴 Balance Due:';
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
                this.saveToStorage('borebill_rates', this.rates);
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

    getAllSavedNotes() {
        const isQuote = (this.state?.docType || 'INVOICE') === 'QUOTATION';
        const defaultPresets = isQuote
            ? [
                'Prices subject to rock strata & depth',
                'Transport & labour charges extra',
                'Water yield & depth not guaranteed',
                'Motor, submersible & plumbing extra'
            ]
            : [
                'Borewell work completed satisfactorily',
                'Cash / UPI payment received',
                'Transport & labour charges extra',
                'Motor, submersible & plumbing extra'
            ];
        const seen = new Set();
        const result = [];

        const pushNote = (txt, isCustom = false) => {
            const clean = (txt || '').trim();
            if (!clean) return;
            // Never suggest rock strata price change disclaimer on a Final Bill
            if (!isQuote && /பாறை கடினம்|rock strata/i.test(clean)) return;
            const key = clean.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            result.push({ text: clean, isCustom });
        };

        (this.savedNotes || []).forEach(n => pushNote(n, true));
        (this.history || []).forEach(h => {
            if (h.snapshot?.customNote) pushNote(h.snapshot.customNote, true);
        });
        defaultPresets.forEach(p => pushNote(p, false));

        return result.slice(0, 8);
    }

    recordCurrentBillNoteForNextTime() {
        const clean = (document.getElementById('billCustomNoteInput')?.value || '').trim();
        if (!clean) return;
        if (!Array.isArray(this.savedNotes)) this.savedNotes = [];
        this.savedNotes = this.savedNotes.filter(n => (n || '').trim().toLowerCase() !== clean.toLowerCase());
        this.savedNotes.unshift(clean);
        if (this.savedNotes.length > 10) this.savedNotes = this.savedNotes.slice(0, 10);
        this.saveToStorage('borebill_saved_notes', this.savedNotes);
    }

    renderSavedNotesUI() {
        const chipsEl = document.getElementById('savedNotesChipsList');
        const noteInput = document.getElementById('billCustomNoteInput');
        if (!chipsEl || !noteInput) return;

        const currentNote = (noteInput.value || '').trim().toLowerCase();
        const notes = this.getAllSavedNotes();

        chipsEl.innerHTML = notes.map((item, idx) => {
            const isAct = currentNote && currentNote === item.text.toLowerCase();
            return `
                <button type="button" class="saved-note-chip ${isAct ? 'active' : ''}" data-note-idx="${idx}">
                    <span>${item.isCustom ? '🕒' : '📝'} ${this.escapeHtml(item.text)}</span>
                </button>
            `;
        }).join('');

        chipsEl.querySelectorAll('.saved-note-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.noteIdx, 10);
                const item = notes[idx];
                if (!item) return;
                const cur = (noteInput.value || '').trim();
                if (cur.toLowerCase() === item.text.toLowerCase()) {
                    noteInput.value = '';
                } else {
                    noteInput.value = item.text;
                }
                this.isBillSavedAndReadyToShare = false;
                this.calculateAndRender();
                this.renderSavedNotesUI();
            });
        });
    }

    toggleCustField(wrapId, valId, text) {
        const wrap = document.getElementById(wrapId);
        const val = document.getElementById(valId);
        if (text) {
            wrap.style.display = 'block';
            val.textContent = text;
        } else {
            wrap.style.display = 'none';
        }
    }

    toggleChargeRow(rowId, valId, amount) {
        const row = document.getElementById(rowId);
        const val = document.getElementById(valId);
        if (amount > 0) {
            row.style.display = 'flex';
            val.textContent = this.formatINR(amount);
        } else {
            row.style.display = 'none';
        }
    }

    /* ==========================================================================
       CUSTOMER KHATA LEDGER & CRM MODULE (VYAPAR / KHATABOOK STYLE)
       ========================================================================== */

    getInitials(name) {
        const clean = (name || 'C').trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    }

    initDefaultCountryCode() {
        try {
            const saved = (localStorage.getItem('borebill_default_country_code') || '').trim();
            if (saved && COUNTRY_DIAL_CODES.some(c => c.code === saved)) {
                return saved;
            }
        } catch (e) { /* ignore */ }
        // First-time default: always Indian country code (+91)
        try {
            localStorage.setItem('borebill_default_country_code', '+91');
        } catch (e) { /* ignore */ }
        return '+91';
    }

    getCountryCodeMeta(code) {
        const clean = String(code || '').trim();
        return COUNTRY_DIAL_CODES.find(c => c.code === clean) || COUNTRY_DIAL_CODES[0];
    }

    setDefaultCountryCode(code, { syncAllSelects = true } = {}) {
        const meta = this.getCountryCodeMeta(code || this.defaultCountryCode || '+91');
        this.defaultCountryCode = meta.code;
        try {
            localStorage.setItem('borebill_default_country_code', meta.code);
        } catch (e) { /* ignore */ }

        if (syncAllSelects) {
            ['crmCustCountryCode', 'waPreviewCountryCode', 'brandPhoneCountryCode'].forEach(selId => {
                const sel = document.getElementById(selId);
                if (sel && sel.value !== meta.code) {
                    sel.value = meta.code;
                }
            });
            this.syncPhoneInputMetaForCountry('crmCustPhone', meta.code);
            this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', meta.code);
        }
        return meta;
    }

    syncPhoneInputMetaForCountry(inputId, countryCode) {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        const meta = this.getCountryCodeMeta(countryCode || this.defaultCountryCode);
        inp.maxLength = meta.maxLen;
        if (inputId === 'waPreviewPhoneInput') {
            inp.placeholder = `${meta.maxLen}-digit WhatsApp No`;
        } else {
            inp.placeholder = `${meta.maxLen}-digit Mobile No (${meta.code})`;
        }
    }

    parsePhoneWithCountryCode(raw, fallbackCode = null) {
        const fallbackMeta = this.getCountryCodeMeta(fallbackCode || this.defaultCountryCode || '+91');
        let str = String(raw || '').trim();
        if (!str) {
            return {
                countryCode: fallbackMeta.code,
                localDigits: '',
                meta: fallbackMeta,
                hasExplicitCode: false
            };
        }

        if (str.startsWith('00')) {
            str = '+' + str.slice(2).trim();
        }

        // Sort by longest dial code first so +971 / +966 match before +91 / +1
        const sortedCodes = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);

        if (str.startsWith('+')) {
            const afterPlus = str.slice(1).trim();
            for (const c of sortedCodes) {
                if (afterPlus.startsWith(c.dial)) {
                    const restDigits = afterPlus.slice(c.dial.length).replace(/\D/g, '');
                    return {
                        countryCode: c.code,
                        localDigits: restDigits.slice(0, c.maxLen),
                        meta: c,
                        hasExplicitCode: true
                    };
                }
            }
        }

        let digits = str.replace(/\D/g, '');
        if (!digits) {
            return {
                countryCode: fallbackMeta.code,
                localDigits: '',
                meta: fallbackMeta,
                hasExplicitCode: false
            };
        }

        // Auto-detect if user pasted full international digits without '+' (e.g. 919876543210, 971501234567)
        for (const c of sortedCodes) {
            if (
                digits.length === (c.dial.length + c.maxLen) &&
                digits.startsWith(c.dial) &&
                (c.code === fallbackMeta.code || digits.length > fallbackMeta.maxLen)
            ) {
                return {
                    countryCode: c.code,
                    localDigits: digits.slice(c.dial.length, c.dial.length + c.maxLen),
                    meta: c,
                    hasExplicitCode: true
                };
            }
        }

        if (digits.length === (fallbackMeta.maxLen + 1) && digits.startsWith('0')) {
            digits = digits.slice(1);
        }

        return {
            countryCode: fallbackMeta.code,
            localDigits: digits.slice(0, fallbackMeta.maxLen),
            meta: fallbackMeta,
            hasExplicitCode: false
        };
    }

    normalizeMobileNumber(raw, countryCode = null) {
        const parsed = this.parsePhoneWithCountryCode(raw, countryCode || this.defaultCountryCode);
        return parsed.localDigits;
    }

    formatPhoneWithCountryCode(raw, countryCode = null) {
        const parsed = this.parsePhoneWithCountryCode(raw, countryCode || this.defaultCountryCode);
        if (!parsed.localDigits) return '';
        return `${parsed.countryCode} ${parsed.localDigits}`;
    }

    formatCompanyPhonesWithCountryCode(rawPhones, countryCode = null) {
        const str = String(rawPhones || '').trim();
        if (!str) return '';
        const meta = this.getCountryCodeMeta(countryCode || this.brand?.phoneCountryCode || this.defaultCountryCode);
        const parts = str.split(/\s*[,;/]\s*/).filter(Boolean);
        return parts.map(part => {
            const p = part.trim();
            if (!p) return '';
            if (p.startsWith('+')) {
                const parsed = this.parsePhoneWithCountryCode(p, meta.code);
                if (parsed.hasExplicitCode && parsed.localDigits) {
                    return p;
                }
                return p;
            }
            const digitsOnly = p.replace(/\D/g, '');
            if (digitsOnly.length >= 6) {
                if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
                    return `+91 ${digitsOnly.slice(2)}`;
                }
                return `${meta.code} ${p}`;
            }
            return p;
        }).filter(Boolean).join(', ');
    }

    migrateStoredPhonesWithCountryCode() {
        const defCode = this.defaultCountryCode || '+91';
        let custChanged = false;
        if (Array.isArray(this.customers)) {
            this.customers.forEach(c => {
                if (c && c.phone) {
                    const parsed = this.parsePhoneWithCountryCode(c.phone, c.countryCode || defCode);
                    if (parsed.localDigits) {
                        const formatted = `${parsed.countryCode} ${parsed.localDigits}`;
                        if (c.phone !== formatted || c.countryCode !== parsed.countryCode) {
                            c.phone = formatted;
                            c.countryCode = parsed.countryCode;
                            custChanged = true;
                        }
                    }
                }
            });
            if (custChanged) {
                this.saveToStorage('borebill_customers', this.customers);
            }
        }

        let histChanged = false;
        if (Array.isArray(this.history)) {
            this.history.forEach(h => {
                if (h && h.custPhone) {
                    const formatted = this.formatPhoneWithCountryCode(h.custPhone, h.custCountryCode || defCode);
                    if (formatted && h.custPhone !== formatted) {
                        h.custPhone = formatted;
                        histChanged = true;
                    }
                }
            });
            if (histChanged) {
                this.saveToStorage('borebill_history', this.history);
            }
        }

        if (this.state && this.state.custPhone) {
            this.state.custPhone = this.formatPhoneWithCountryCode(this.state.custPhone, defCode);
        }

        if (this.brand) {
            if (!this.brand.phoneCountryCode) {
                const parsedBrand = this.parsePhoneWithCountryCode(this.brand.phones || '', defCode);
                this.brand.phoneCountryCode = parsedBrand.countryCode || defCode;
            }
            if (this.brand.phones) {
                const formattedPhones = this.formatCompanyPhonesWithCountryCode(this.brand.phones, this.brand.phoneCountryCode);
                if (formattedPhones && formattedPhones !== this.brand.phones) {
                    this.brand.phones = formattedPhones;
                    this.saveToStorage('borebill_brand', this.brand);
                }
            }
        }
    }

    validateMobileNumber(raw, countryCode = null) {
        const parsed = this.parsePhoneWithCountryCode(raw, countryCode || this.defaultCountryCode);
        const { localDigits: digits, meta } = parsed;
        if (!digits) {
            return {
                valid: false,
                isEmpty: true,
                digits: '',
                countryCode: meta.code,
                fullPhone: '',
                reason: 'empty',
                message: `Enter ${meta.maxLen}-digit mobile number (${meta.code})`
            };
        }
        if (meta.indiaRule && !/^[6-9]/.test(digits)) {
            return {
                valid: false,
                isEmpty: false,
                digits,
                countryCode: meta.code,
                fullPhone: '',
                reason: 'invalid_start',
                message: 'Indian mobile number must start with 6, 7, 8 or 9'
            };
        }
        if (digits.length < meta.minLen) {
            return {
                valid: false,
                isEmpty: false,
                digits,
                countryCode: meta.code,
                fullPhone: '',
                reason: 'incomplete',
                message: `Enter ${meta.minLen} digits for ${meta.code} (${digits.length}/${meta.minLen})`
            };
        }
        const fullPhone = `${meta.code} ${digits}`;
        return {
            valid: true,
            isEmpty: false,
            digits,
            countryCode: meta.code,
            fullPhone,
            reason: 'ok',
            message: `✓ Valid mobile (${fullPhone})`
        };
    }

    findExistingCustomerByPhone(phone, excludeCustomerId = null) {
        const parsed = this.parsePhoneWithCountryCode(phone, this.defaultCountryCode);
        const cleanPhone = parsed.localDigits;
        if (cleanPhone.length < parsed.meta.minLen) return null;

        const custMatch = (this.customers || []).find(c =>
            c.id !== excludeCustomerId && this.normalizeMobileNumber(c.phone, c.countryCode) === cleanPhone
        );
        if (custMatch) {
            return {
                source: 'customer',
                id: custMatch.id,
                name: custMatch.name || 'Saved Customer',
                phone: this.formatPhoneWithCountryCode(custMatch.phone, custMatch.countryCode),
                village: custMatch.village || ''
            };
        }

        const histMatch = (this.history || []).find(h =>
            h.id !== this.loadedHistoryBillId && this.normalizeMobileNumber(h.custPhone) === cleanPhone
        );
        if (histMatch) {
            const hName = (histMatch.custName && histMatch.custName !== 'Walk-in Customer')
                ? histMatch.custName
                : `Bill #${histMatch.billNo}`;
            return {
                source: 'history',
                id: null,
                name: hName,
                phone: this.formatPhoneWithCountryCode(histMatch.custPhone),
                village: histMatch.custLocation || '',
                billNo: histMatch.billNo
            };
        }

        return null;
    }

    updateBillPhoneValidationUI(triggerDuplicateToast = false) {
        const phoneInput = document.getElementById('custPhone');
        const hintEl = document.getElementById('billPhoneValHint');
        const dupBanner = document.getElementById('billPhoneDupAlert');
        if (!phoneInput || !hintEl || !dupBanner) return;

        const parsed = this.parsePhoneWithCountryCode(phoneInput.value, this.defaultCountryCode);
        const formatted = parsed.localDigits ? `${parsed.countryCode} ${parsed.localDigits}` : '';
        if (phoneInput.value !== formatted) {
            phoneInput.value = formatted;
        }

        phoneInput.classList.remove('input-invalid', 'input-warn', 'input-valid');

        const val = this.validateMobileNumber(formatted, parsed.countryCode);
        if (val.isEmpty) {
            hintEl.style.display = 'none';
            dupBanner.style.display = 'none';
            return;
        }

        if (!val.valid) {
            phoneInput.classList.add('input-invalid');
            hintEl.className = 'phone-val-hint invalid';
            hintEl.textContent = `⚠️ ${val.message}`;
            hintEl.style.display = 'block';
            dupBanner.style.display = 'none';
            return;
        }

        const dup = this.findExistingCustomerByPhone(val.fullPhone);
        if (dup) {
            phoneInput.classList.add('input-warn');
            hintEl.className = 'phone-val-hint warn';
            hintEl.textContent = `⚠️ Already exists (${dup.name})`;
            hintEl.style.display = 'block';

            const currentName = (document.getElementById('custName')?.value || '').trim();
            const isSameSelected = currentName && currentName.toLowerCase() === dup.name.toLowerCase();

            dupBanner.innerHTML = `
                <span>⚠️ Mobile <strong>${val.fullPhone}</strong> already registered to <strong>${dup.name}</strong>${dup.village ? ` (${dup.village})` : ''}!</span>
                <div class="phone-dup-actions">
                    ${!isSameSelected ? `<button type="button" class="phone-dup-btn primary" id="applyDupCustToBillBtn">Use ${dup.name}</button>` : ''}
                    ${(dup.source === 'customer' && currentName && !isSameSelected) ? `<button type="button" class="phone-dup-btn" id="overwriteDupCustFromBillBtn">Update Party</button>` : ''}
                </div>
            `;
            dupBanner.style.display = 'flex';

            document.getElementById('applyDupCustToBillBtn')?.addEventListener('click', () => {
                document.getElementById('custName').value = dup.name;
                if (dup.village && !document.getElementById('custLocation').value) {
                    document.getElementById('custLocation').value = dup.village;
                }
                this.calculateAndRender();
                this.updateBillPhoneValidationUI(false);
                this.renderCustomerSiteSuggestions();
                this.showToast(`👤 Filled details for ${dup.name}`);
            });

            document.getElementById('overwriteDupCustFromBillBtn')?.addEventListener('click', () => {
                const newName = (document.getElementById('custName')?.value || '').trim();
                const newLoc = (document.getElementById('custLocation')?.value || '').trim();
                this.upsertCustomerRecord({ name: newName, phone: val.fullPhone, countryCode: val.countryCode, village: newLoc, site: newLoc, allowOverwrite: true });
                this.updateBillPhoneValidationUI(false);
                this.renderCustomerSiteSuggestions();
                this.showToast(`✅ Updated ${val.fullPhone} to "${newName}"`);
            });

            if (triggerDuplicateToast) {
                this.showToast(`⚠️ Mobile ${val.fullPhone} already exists for "${dup.name}"!`);
            }
        } else {
            phoneInput.classList.add('input-valid');
            hintEl.className = 'phone-val-hint valid';
            hintEl.textContent = val.message;
            hintEl.style.display = 'block';
            dupBanner.style.display = 'none';
        }
    }

    updateCrmPhoneValidationUI(triggerDuplicateToast = false) {
        const phoneInput = document.getElementById('crmCustPhone');
        const codeSelect = document.getElementById('crmCustCountryCode');
        const hintEl = document.getElementById('crmPhoneValHint');
        const dupBanner = document.getElementById('crmPhoneDupAlert');
        const editId = document.getElementById('crmEditCustomerId')?.value || null;
        if (!phoneInput || !hintEl || !dupBanner) return;

        let activeCode = codeSelect?.value || this.defaultCountryCode || '+91';
        const parsed = this.parsePhoneWithCountryCode(phoneInput.value, activeCode);
        if (parsed.hasExplicitCode && parsed.countryCode !== activeCode) {
            activeCode = parsed.countryCode;
            if (codeSelect) codeSelect.value = activeCode;
            this.setDefaultCountryCode(activeCode);
        }
        this.syncPhoneInputMetaForCountry('crmCustPhone', activeCode);

        const cleaned = parsed.localDigits;
        if (phoneInput.value !== cleaned) {
            phoneInput.value = cleaned;
        }

        phoneInput.classList.remove('input-invalid', 'input-warn', 'input-valid');

        const val = this.validateMobileNumber(cleaned, activeCode);
        if (val.isEmpty) {
            hintEl.style.display = 'none';
            dupBanner.style.display = 'none';
            return;
        }

        if (!val.valid) {
            phoneInput.classList.add('input-invalid');
            hintEl.className = 'phone-val-hint invalid';
            hintEl.textContent = `⚠️ ${val.message}`;
            hintEl.style.display = 'block';
            dupBanner.style.display = 'none';
            return;
        }

        // Check for duplicate in Customer Book (excluding editId)
        const dupCust = (this.customers || []).find(c =>
            c.id !== editId && this.normalizeMobileNumber(c.phone, c.countryCode) === val.digits
        );

        if (dupCust) {
            phoneInput.classList.add('input-warn');
            hintEl.className = 'phone-val-hint warn';
            hintEl.textContent = `⚠️ Duplicate! Belongs to ${dupCust.name}`;
            hintEl.style.display = 'block';

            dupBanner.innerHTML = `
                <span>⚠️ Warning: Mobile <strong>${val.fullPhone}</strong> already exists for <strong>${dupCust.name}</strong>${dupCust.village ? ` (${dupCust.village})` : ''}!</span>
                <div class="phone-dup-actions">
                    <button type="button" class="phone-dup-btn primary" id="switchCrmToExistingCustBtn">Edit ${dupCust.name}</button>
                </div>
            `;
            dupBanner.style.display = 'flex';

            document.getElementById('switchCrmToExistingCustBtn')?.addEventListener('click', () => {
                const dupParsed = this.parsePhoneWithCountryCode(dupCust.phone, dupCust.countryCode || activeCode);
                document.getElementById('crmEditCustomerId').value = dupCust.id;
                document.getElementById('crmCustName').value = dupCust.name || '';
                if (codeSelect) codeSelect.value = dupParsed.countryCode;
                this.syncPhoneInputMetaForCountry('crmCustPhone', dupParsed.countryCode);
                document.getElementById('crmCustPhone').value = dupParsed.localDigits;
                document.getElementById('crmCustVillage').value = dupCust.village || '';
                this.updateCrmPhoneValidationUI(false);
                this.showToast(`✏️ Switched to editing ${dupCust.name}`);
            });

            if (triggerDuplicateToast) {
                this.showToast(`⚠️ Mobile ${val.fullPhone} already registered for "${dupCust.name}"!`);
            }
        } else {
            phoneInput.classList.add('input-valid');
            hintEl.className = 'phone-val-hint valid';
            hintEl.textContent = val.message;
            hintEl.style.display = 'block';
            dupBanner.style.display = 'none';
        }
    }

    openCustomerPopupModal({ editCust = null, fromBill = false, prefill = null } = {}) {
        const modal = document.getElementById('crmCustomerFormDrawer');
        if (!modal) return;

        const editIdEl = document.getElementById('crmEditCustomerId');
        const fromBillEl = document.getElementById('crmPopupFromBill');
        const titleEl = document.getElementById('crmFormTitle');
        const subEl = document.getElementById('crmPopupSubText');
        const saveBtnTxt = document.getElementById('saveCrmCustomerBtnText');
        const nameEl = document.getElementById('crmCustName');
        const codeEl = document.getElementById('crmCustCountryCode');
        const phoneEl = document.getElementById('crmCustPhone');
        const villageEl = document.getElementById('crmCustVillage');

        if (editCust) {
            const parsed = this.parsePhoneWithCountryCode(editCust.phone || '', editCust.countryCode || this.defaultCountryCode);
            if (editIdEl) editIdEl.value = editCust.id;
            if (fromBillEl) fromBillEl.value = fromBill ? 'true' : 'false';
            if (titleEl) titleEl.textContent = 'Edit Customer';
            if (subEl) subEl.textContent = `Update details for ${editCust.name}`;
            if (saveBtnTxt) saveBtnTxt.textContent = fromBill ? 'Update & Select' : 'Update Customer';
            if (nameEl) nameEl.value = editCust.name || '';
            if (codeEl) codeEl.value = parsed.countryCode;
            this.syncPhoneInputMetaForCountry('crmCustPhone', parsed.countryCode);
            if (phoneEl) phoneEl.value = parsed.localDigits;
            if (villageEl) villageEl.value = editCust.village || '';
        } else {
            const prefillParsed = this.parsePhoneWithCountryCode(prefill?.phone || '', this.defaultCountryCode);
            const activeCode = prefillParsed.hasExplicitCode ? prefillParsed.countryCode : (this.defaultCountryCode || '+91');
            if (prefillParsed.hasExplicitCode) {
                this.setDefaultCountryCode(activeCode);
            }
            if (editIdEl) editIdEl.value = '';
            if (fromBillEl) fromBillEl.value = fromBill ? 'true' : 'false';
            if (titleEl) titleEl.textContent = 'Add Customer';
            if (subEl) subEl.textContent = fromBill ? 'Save to Customer Book & use in Bill' : 'Save Name, Mobile with Country Code & Place';
            if (saveBtnTxt) saveBtnTxt.textContent = fromBill ? 'Save & Select' : 'Save Customer';
            if (nameEl) nameEl.value = prefill?.name || '';
            if (codeEl) codeEl.value = activeCode;
            this.syncPhoneInputMetaForCountry('crmCustPhone', activeCode);
            if (phoneEl) phoneEl.value = prefillParsed.localDigits;
            if (villageEl) villageEl.value = prefill?.village || '';
        }

        modal.style.display = 'flex';
        this.updateCrmPhoneValidationUI(false);
        setTimeout(() => {
            if (nameEl && !nameEl.value) {
                nameEl.focus();
            } else if (phoneEl && !phoneEl.value) {
                phoneEl.focus();
            } else {
                villageEl?.focus();
            }
        }, 60);
    }

    closeCustomerPopupModal() {
        const modal = document.getElementById('crmCustomerFormDrawer');
        if (modal) modal.style.display = 'none';
    }

    getCustomerSiteSuggestions(cust) {
        if (!cust) return { nativePlace: '', pastSites: [], allSites: [] };
        const nativePlace = (cust.village || '').trim();
        const cleanPhone = this.normalizeMobileNumber(cust.phone || '');
        const cleanName = (cust.name || '').trim().toLowerCase();

        const seen = new Set();
        const pastSites = [];

        const addSite = (s) => {
            const val = (s || '').trim();
            if (!val) return;
            const key = val.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            pastSites.push(val);
        };

        if (nativePlace) {
            seen.add(nativePlace.toLowerCase());
        }

        // 1. Sites explicitly stored on customer record
        if (Array.isArray(cust.sites)) {
            cust.sites.forEach(addSite);
        }

        // 2. Sites from past saved bills in this.history for this customer
        (this.history || []).forEach(b => {
            const bPhone = this.normalizeMobileNumber(b.custPhone || '');
            const bName = (b.custName || '').trim().toLowerCase();
            const phoneMatches = cleanPhone.length === 10 && bPhone === cleanPhone;
            const nameMatches = cleanName && bName && cleanName === bName;
            if (phoneMatches || nameMatches) {
                addSite(b.custLocation);
            }
        });

        const allSites = nativePlace ? [nativePlace, ...pastSites] : [...pastSites];
        return { nativePlace, pastSites, allSites };
    }

    recordSiteForCustomer({ name, phone, site }) {
        const cleanSite = (site || '').trim();
        if (!cleanSite) return;
        const cleanPhone = this.normalizeMobileNumber(phone || '');
        const cleanName = (name || '').trim().toLowerCase();

        const existing = (this.customers || []).find(c => {
            if (cleanPhone.length === 10 && this.normalizeMobileNumber(c.phone) === cleanPhone) return true;
            if (cleanName && (c.name || '').trim().toLowerCase() === cleanName) return true;
            return false;
        });

        if (!existing) return;

        if (!Array.isArray(existing.sites)) {
            existing.sites = [];
        }
        if (!existing.village) {
            existing.village = cleanSite;
        }
        const alreadyInSites = existing.sites.some(s => s.toLowerCase() === cleanSite.toLowerCase());
        const isSameAsPlace = (existing.village || '').trim().toLowerCase() === cleanSite.toLowerCase();
        if (!alreadyInSites && !isSameAsPlace) {
            existing.sites.unshift(cleanSite);
        }
        this.saveToStorage('borebill_customers', this.customers);
    }

    findActiveBillCustomer() {
        const cleanPhone = this.normalizeMobileNumber(document.getElementById('custPhone')?.value || '');
        const cleanName = (document.getElementById('custName')?.value || '').trim().toLowerCase();

        if (cleanPhone.length === 10) {
            const byPhone = (this.customers || []).find(c => this.normalizeMobileNumber(c.phone) === cleanPhone);
            if (byPhone) return byPhone;
        }

        if (cleanName) {
            const byName = (this.customers || []).find(c => (c.name || '').trim().toLowerCase() === cleanName);
            if (byName) return byName;
        }

        // Also check saved bill history if not in Customer Book yet
        if (cleanPhone.length === 10 || cleanName) {
            const histMatches = (this.history || []).filter(b => {
                const bPhone = this.normalizeMobileNumber(b.custPhone || '');
                const bName = (b.custName || '').trim().toLowerCase();
                if (cleanPhone.length === 10 && bPhone === cleanPhone) return true;
                if (cleanName && bName === cleanName) return true;
                return false;
            });
            if (histMatches.length > 0) {
                const first = histMatches[0];
                return {
                    id: null,
                    name: first.custName || 'Customer',
                    phone: cleanPhone || first.custPhone || '',
                    village: first.custLocation || '',
                    sites: histMatches.map(h => h.custLocation).filter(Boolean)
                };
            }
        }

        return null;
    }

    getAllSmartPlaces(activeCust = null) {
        const cust = activeCust || this.findActiveBillCustomer();
        const { nativePlace, pastSites } = this.getCustomerSiteSuggestions(cust);

        const seen = new Set();
        const places = [];

        const pushPlace = (name, type, icon, badgeLabel, badgeClass) => {
            const val = (name || '').trim();
            if (!val) return;
            const key = val.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            places.push({ name: val, type, icon, badgeLabel, badgeClass });
        };

        // 1. Selected Customer's Native Place
        if (nativePlace) {
            pushPlace(nativePlace, 'cust-place', '🏠', 'Customer Place', 'cust-place');
        }

        // 2. Selected Customer's Past Borewell Sites
        pastSites.forEach(site => {
            pushPlace(site, 'past-site', '📍', 'Past Site', 'past-site');
        });

        // 3. All Other Old Places from Saved Bills (Most Recent First) & Customer Book
        (this.history || []).forEach(b => {
            pushPlace(b.custLocation, 'old-place', '🕒', 'Old Place', '');
        });

        (this.customers || []).forEach(c => {
            pushPlace(c.village, 'old-place', '🕒', 'Old Place', '');
            if (Array.isArray(c.sites)) {
                c.sites.forEach(s => pushPlace(s, 'old-place', '🕒', 'Old Place', ''));
            }
        });

        return { nativePlace, pastSites, places };
    }

    scrollElementAboveKeyboard(targetEl) {
        if (!targetEl) return;
        document.body.classList.add('keyboard-open');
        // Do NOT scroll page up when keyboard opens — keep screen rock-solid stable
    }

    scrollServiceSiteAboveKeyboard() {
        document.body.classList.add('keyboard-open');
        // Do NOT scroll page up when keyboard opens
    }

    applySelectedServiceSite(siteValue, { closeDropdown = true, toast = true } = {}) {
        const locInput = document.getElementById('custLocation');
        const ddEl = document.getElementById('smartSiteDropdownList');
        if (!locInput) return;

        const cleanSite = (siteValue || '').trim();
        locInput.value = cleanSite;
        this.isEditingServiceSite = false;

        if (closeDropdown && ddEl) {
            ddEl.style.display = 'none';
        }
        document.body.classList.remove('keyboard-open');
        locInput.blur();

        this.calculateAndRender();
        this.renderCustomerSiteSuggestions({ showDropdown: false });

        if (toast && cleanSite) {
            this.showToast(`📍 Site: ${cleanSite}`);
        }

        // Smoothly focus Drilling Depth (#oldBoreDepth if Re-Bore & empty, otherwise #totalDepth) right after Site is selected
        const isRepair = this.state.drillingType === 'repair';
        const oldBoreInput = document.getElementById('oldBoreDepth');
        const depthInput = document.getElementById('totalDepth');
        const nextTarget = (isRepair && oldBoreInput && !oldBoreInput.value) ? oldBoreInput : depthInput;
        if (cleanSite && nextTarget && !nextTarget.value) {
            setTimeout(() => {
                nextTarget.focus();
            }, 80);
        }
    }

    renderCustomerSiteSuggestions({ showDropdown = null } = {}) {
        const chipsEl = document.getElementById('custSiteSugChips');
        const locInput = document.getElementById('custLocation');
        const clearSiteBtn = document.getElementById('clearSiteLocationBtn');
        const statusPill = document.getElementById('serviceSiteStatusPill');
        const ddEl = document.getElementById('smartSiteDropdownList');
        if (!chipsEl || !locInput) return;

        const currentSite = (locInput.value || '').trim();
        if (clearSiteBtn) {
            clearSiteBtn.style.display = currentSite ? 'inline-flex' : 'none';
        }
        if (statusPill) {
            if (currentSite) {
                statusPill.textContent = `✓ ${currentSite}`;
                statusPill.classList.add('is-ready');
            } else {
                statusPill.textContent = 'Select or Type Site';
                statusPill.classList.remove('is-ready');
            }
        }

        const activeCust = this.findActiveBillCustomer();
        if (!activeCust) {
            chipsEl.innerHTML = '';
            if (ddEl) ddEl.style.display = 'none';
            return;
        }

        const { nativePlace, pastSites, places } = this.getAllSmartPlaces(activeCust);

        // Quick 1-Tap Chips: Customer's Native Place + Past Sites + up to 3 recent Old Places
        const quickChipItems = [];
        if (nativePlace) {
            quickChipItems.push({ name: nativePlace, icon: '🏠' });
        }
        pastSites.forEach(s => {
            if (quickChipItems.length < 5) quickChipItems.push({ name: s, icon: '📍' });
        });
        places.filter(p => p.type === 'old-place').forEach(p => {
            if (quickChipItems.length < 5) quickChipItems.push({ name: p.name, icon: '🕒' });
        });

        chipsEl.innerHTML = quickChipItems.map(item => {
            const isAct = currentSite && currentSite.toLowerCase() === item.name.toLowerCase();
            return `
                <button type="button" class="site-sug-chip ${isAct ? 'active' : ''}" data-site="${item.name}">
                    ${item.icon} ${item.name}
                </button>
            `;
        }).join('');

        chipsEl.querySelectorAll('.site-sug-chip[data-site]').forEach(chip => {
            chip.addEventListener('click', () => {
                this.applySelectedServiceSite(chip.dataset.site, { closeDropdown: true, toast: true });
            });
        });

        // Smart Search & Select Old Places Dropdown
        if (!ddEl) return;
        const shouldOpen = showDropdown !== null ? showDropdown : (document.activeElement === locInput);
        if (!shouldOpen) {
            ddEl.style.display = 'none';
            return;
        }

        const q = currentSite.toLowerCase();
        const filtered = q
            ? places.filter(p => p.name.toLowerCase().includes(q))
            : places;

        const exactMatchExists = q && places.some(p => p.name.toLowerCase() === q);

        if (filtered.length === 0 && !currentSite) {
            ddEl.style.display = 'none';
            return;
        }

        let optionsHtml = '';
        if (currentSite && !exactMatchExists) {
            optionsHtml += `
                <button type="button" class="smart-site-option" data-pick-site="${currentSite}">
                    <div class="sso-left">
                        <span class="sso-icon">✨</span>
                        <span class="sso-name">Use "${currentSite}"</span>
                    </div>
                    <span class="sso-badge new-site">+ New Site</span>
                </button>
            `;
        }

        filtered.slice(0, 12).forEach(p => {
            const isCurrent = currentSite && p.name.toLowerCase() === q;
            optionsHtml += `
                <button type="button" class="smart-site-option ${isCurrent ? 'is-active' : ''}" data-pick-site="${p.name}">
                    <div class="sso-left">
                        <span class="sso-icon">${p.icon}</span>
                        <span class="sso-name">${p.name}</span>
                    </div>
                    <span class="sso-badge ${p.badgeClass}">${isCurrent ? '✓ Selected' : p.badgeLabel}</span>
                </button>
            `;
        });

        ddEl.innerHTML = `
            <div class="smart-site-dd-head">
                <span>${q ? `Matching Places (${filtered.length})` : `Saved & Old Places (${places.length})`}</span>
                <button type="button" class="smart-site-dd-close" id="closeSmartSiteDdBtn">✕</button>
            </div>
            <div class="smart-site-dd-list">
                ${optionsHtml}
            </div>
        `;
        ddEl.style.display = 'block';

        ddEl.querySelectorAll('.smart-site-option[data-pick-site]').forEach(opt => {
            opt.addEventListener('mousedown', (e) => {
                // Prevent input blur before click registers
                e.preventDefault();
            });
            opt.addEventListener('click', () => {
                this.applySelectedServiceSite(opt.dataset.pickSite, { closeDropdown: true, toast: true });
            });
        });

        document.getElementById('closeSmartSiteDdBtn')?.addEventListener('click', () => {
            ddEl.style.display = 'none';
        });
    }

    getAllSavedExtras() {
        const seen = new Set();
        const items = [];

        const pushExtra = (type, label, amount, id = null, fromSaved = false) => {
            const cleanLbl = (label || '').trim();
            const cleanAmt = Math.round(parseFloat(amount) || 0);
            if (!cleanLbl || cleanAmt <= 0) return;
            const key = `${type}:${cleanLbl.toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push({
                id: id || `ext_${type}_${cleanLbl.toLowerCase()}`,
                type,
                label: cleanLbl,
                amount: cleanAmt,
                fromSaved
            });
        };

        // 1. Explicitly saved / auto-saved extras in localStorage
        (this.savedExtras || []).forEach(ex => {
            pushExtra(ex.type || 'custom', ex.label, ex.amount, ex.id, true);
        });

        // 2. Past extras from Saved Bills history
        (this.history || []).forEach(b => {
            const snap = b.snapshot;
            if (!snap) return;
            if (snap.customExtraAmount > 0) {
                pushExtra('custom', snap.customExtraLabel || 'Extra Charges', snap.customExtraAmount);
            }
            if (snap.collarCapCost > 0) {
                pushExtra('collar', 'Collar / Cap / Welding', snap.collarCapCost);
            }
            if (snap.transportSurveyCost > 0) {
                pushExtra('transport', 'Transport / Survey', snap.transportSurveyCost);
            }
        });

        return items;
    }

    upsertSavedExtraItem({ type = 'custom', label, amount, toast = false }) {
        const cleanLbl = (label || '').trim() || (type === 'collar' ? 'Collar / Cap / Welding' : type === 'transport' ? 'Transport / Survey' : 'Extra Charges');
        const cleanAmt = Math.round(parseFloat(amount) || 0);
        if (!cleanLbl || cleanAmt <= 0) return false;

        if (!Array.isArray(this.savedExtras)) {
            this.savedExtras = [];
        }

        const existingIdx = this.savedExtras.findIndex(
            x => (x.type || 'custom') === type && (x.label || '').trim().toLowerCase() === cleanLbl.toLowerCase()
        );

        if (existingIdx !== -1) {
            this.savedExtras[existingIdx].label = cleanLbl;
            this.savedExtras[existingIdx].amount = cleanAmt;
            this.savedExtras[existingIdx].updatedAt = new Date().toISOString();
            const updated = this.savedExtras.splice(existingIdx, 1)[0];
            this.savedExtras.unshift(updated);
        } else {
            this.savedExtras.unshift({
                id: 'ext_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type,
                label: cleanLbl,
                amount: cleanAmt,
                updatedAt: new Date().toISOString()
            });
        }

        this.saveToStorage('borebill_saved_extras', this.savedExtras);
        this.renderSavedExtrasUI({ showDropdown: false });

        if (toast) {
            this.showToast(`💾 Saved "${cleanLbl} (${this.formatINR(cleanAmt)})" for next time!`);
        }
        return true;
    }

    recordCurrentBillExtrasForNextTime() {
        const customLbl = (document.getElementById('customExtraLabel')?.value || '').trim();
        const customAmt = parseFloat(document.getElementById('customExtraAmount')?.value) || 0;
        const collarAmt = parseFloat(document.getElementById('collarCapCost')?.value) || 0;
        const transAmt = parseFloat(document.getElementById('transportSurveyCost')?.value) || 0;

        if (customAmt > 0) {
            this.upsertSavedExtraItem({ type: 'custom', label: customLbl || 'Extra Charges', amount: customAmt, toast: false });
        }
        if (collarAmt > 0) {
            this.upsertSavedExtraItem({ type: 'collar', label: 'Collar / Cap / Welding', amount: collarAmt, toast: false });
        }
        if (transAmt > 0) {
            this.upsertSavedExtraItem({ type: 'transport', label: 'Transport / Survey', amount: transAmt, toast: false });
        }
    }

    renderSavedExtrasUI({ showDropdown = null } = {}) {
        const sectionEl = document.getElementById('savedExtrasSection');
        const listEl = document.getElementById('savedExtrasChipsList');
        const ddEl = document.getElementById('customExtraSmartDropdown');
        const customLblEl = document.getElementById('customExtraLabel');
        const customAmtEl = document.getElementById('customExtraAmount');
        const collarEl = document.getElementById('collarCapCost');
        const transEl = document.getElementById('transportSurveyCost');

        const allExtras = this.getAllSavedExtras();
        const curCustomLbl = (customLblEl?.value || '').trim().toLowerCase();
        const curCustomAmt = Math.round(parseFloat(customAmtEl?.value) || 0);
        const curCollarAmt = Math.round(parseFloat(collarEl?.value) || 0);
        const curTransAmt = Math.round(parseFloat(transEl?.value) || 0);

        if (sectionEl && listEl) {
            if (allExtras.length === 0) {
                sectionEl.style.display = 'none';
                listEl.innerHTML = '';
            } else {
                sectionEl.style.display = 'block';
                listEl.innerHTML = allExtras.slice(0, 12).map((item, idx) => {
                    let isActive = false;
                    if (item.type === 'custom') {
                        isActive = curCustomAmt === item.amount && (curCustomLbl === item.label.toLowerCase() || (!curCustomLbl && item.label === 'Extra Charges'));
                    } else if (item.type === 'collar') {
                        isActive = curCollarAmt === item.amount;
                    } else if (item.type === 'transport') {
                        isActive = curTransAmt === item.amount;
                    }

                    const icon = item.type === 'collar' ? '🔧' : item.type === 'transport' ? '🚚' : '➕';
                    return `
                        <button type="button" class="saved-extra-chip ${isActive ? 'is-active' : ''}" data-extra-idx="${idx}">
                            <span>${isActive ? '✓ ' : icon + ' '}${item.label} • ${this.formatINR(item.amount)}</span>
                            ${item.fromSaved ? `<span class="sec-del-x" data-del-extra="${item.id}" title="Remove saved extra">✕</span>` : ''}
                        </button>
                    `;
                }).join('');

                listEl.querySelectorAll('.saved-extra-chip').forEach(chip => {
                    chip.addEventListener('click', (e) => {
                        const delBtn = e.target.closest('[data-del-extra]');
                        if (delBtn) {
                            e.stopPropagation();
                            const delId = delBtn.dataset.delExtra;
                            this.savedExtras = (this.savedExtras || []).filter(x => x.id !== delId);
                            this.saveToStorage('borebill_saved_extras', this.savedExtras);
                            this.renderSavedExtrasUI({ showDropdown: false });
                            this.showToast('🗑️ Removed from Saved Extras');
                            return;
                        }

                        const idx = parseInt(chip.dataset.extraIdx, 10);
                        const picked = allExtras[idx];
                        if (!picked) return;

                        if (picked.type === 'collar' && collarEl) {
                            const isSame = Math.round(parseFloat(collarEl.value) || 0) === picked.amount;
                            collarEl.value = isSame ? '' : picked.amount;
                            this.showToast(isSame ? 'Cleared Collar/Cap' : `🔧 Collar/Cap: ${this.formatINR(picked.amount)}`);
                        } else if (picked.type === 'transport' && transEl) {
                            const isSame = Math.round(parseFloat(transEl.value) || 0) === picked.amount;
                            transEl.value = isSame ? '' : picked.amount;
                            this.showToast(isSame ? 'Cleared Transport' : `🚚 Transport: ${this.formatINR(picked.amount)}`);
                        } else if (customLblEl && customAmtEl) {
                            const isSame = Math.round(parseFloat(customAmtEl.value) || 0) === picked.amount &&
                                (customLblEl.value || '').trim().toLowerCase() === picked.label.toLowerCase();
                            if (isSame) {
                                customLblEl.value = '';
                                customAmtEl.value = '';
                                this.showToast(`Cleared ${picked.label}`);
                            } else {
                                customLblEl.value = picked.label;
                                customAmtEl.value = picked.amount;
                                this.showToast(`➕ Applied ${picked.label}: ${this.formatINR(picked.amount)}`);
                            }
                        }

                        this.calculateAndRender();
                        this.renderSavedExtrasUI({ showDropdown: false });
                    });
                });
            }
        }

        // Smart Autocomplete Dropdown for Custom Extra Name (#customExtraLabel)
        if (!ddEl || !customLblEl) return;
        const shouldOpen = showDropdown !== null ? showDropdown : (document.activeElement === customLblEl);
        const customItems = allExtras.filter(x => x.type === 'custom');
        if (!shouldOpen || customItems.length === 0) {
            ddEl.style.display = 'none';
            return;
        }

        const q = curCustomLbl;
        const filtered = q
            ? customItems.filter(x => x.label.toLowerCase().includes(q))
            : customItems;

        if (filtered.length === 0) {
            ddEl.style.display = 'none';
            return;
        }

        ddEl.innerHTML = `
            <div class="smart-site-dd-list">
                ${filtered.slice(0, 8).map((item, i) => `
                    <button type="button" class="smart-site-option" data-pick-custom-idx="${i}">
                        <div class="sso-left">
                            <span class="sso-icon">➕</span>
                            <span class="sso-name">${item.label}</span>
                        </div>
                        <span class="sso-badge cust-place">${this.formatINR(item.amount)}</span>
                    </button>
                `).join('')}
            </div>
        `;
        ddEl.style.display = 'block';

        ddEl.querySelectorAll('.smart-site-option[data-pick-custom-idx]').forEach(opt => {
            opt.addEventListener('mousedown', (e) => e.preventDefault());
            opt.addEventListener('click', () => {
                const i = parseInt(opt.dataset.pickCustomIdx, 10);
                const item = filtered[i];
                if (item && customLblEl && customAmtEl) {
                    customLblEl.value = item.label;
                    customAmtEl.value = item.amount;
                    ddEl.style.display = 'none';
                    customLblEl.blur();
                    this.calculateAndRender();
                    this.renderSavedExtrasUI({ showDropdown: false });
                    this.showToast(`➕ ${item.label}: ${this.formatINR(item.amount)}`);
                }
            });
        });
    }

    upsertCustomerRecord({ name, phone, countryCode = null, village, site = '', allowOverwrite = false }) {
        const cleanName = (name || '').trim();
        const parsed = this.parsePhoneWithCountryCode(phone, countryCode || this.defaultCountryCode);
        const cleanPhone = parsed.localDigits;
        const formattedPhone = cleanPhone ? `${parsed.countryCode} ${cleanPhone}` : '';
        const cleanVillage = (village || '').trim();
        const cleanSite = (site || '').trim();
        if (!cleanName && !cleanPhone) return null;

        let existing = null;
        if (cleanPhone.length >= parsed.meta.minLen) {
            existing = this.customers.find(c => this.normalizeMobileNumber(c.phone) === cleanPhone);
        }
        if (!existing && cleanName && !cleanPhone) {
            existing = this.customers.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
        }

        if (existing) {
            if (allowOverwrite || !existing.name || existing.name.toLowerCase() === cleanName.toLowerCase()) {
                existing.name = cleanName || existing.name;
                if (formattedPhone) {
                    existing.phone = formattedPhone;
                    existing.countryCode = parsed.countryCode;
                }
                existing.village = cleanVillage || existing.village;
                if (!Array.isArray(existing.sites)) existing.sites = [];
                if (cleanSite && cleanSite.toLowerCase() !== (existing.village || '').toLowerCase()) {
                    if (!existing.sites.some(s => s.toLowerCase() === cleanSite.toLowerCase())) {
                        existing.sites.unshift(cleanSite);
                    }
                }
                delete existing.rig;
                existing.updatedAt = new Date().toISOString();
            }
        } else {
            const initialSites = [];
            if (cleanSite && cleanSite.toLowerCase() !== cleanVillage.toLowerCase()) {
                initialSites.push(cleanSite);
            }
            existing = {
                id: 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: cleanName || 'Customer',
                phone: formattedPhone,
                countryCode: parsed.countryCode,
                village: cleanVillage,
                sites: initialSites,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.customers.unshift(existing);
        }

        this.saveToStorage('borebill_customers', this.customers);
        this.renderCustomerDirectory();
        return existing;
    }

    ensureBillPaymentsArray(item) {
        if (!item || !item.snapshot) return [];
        const snap = item.snapshot;
        if (!Array.isArray(item.payments)) {
            item.payments = [];
            const initAdv = Math.round(snap.initialAdvanceAmount ?? snap.advancePaidAmount ?? 0);
            if (snap.initialAdvanceAmount === undefined) {
                snap.initialAdvanceAmount = initAdv;
            }
            if (initAdv > 0) {
                item.payments.push({
                    id: 'adv_' + (item.id || Date.now()),
                    date: item.billDate || new Date().toISOString().split('T')[0],
                    amount: initAdv,
                    mode: 'Advance',
                    note: 'Initial Advance on Bill',
                    isAdvance: true
                });
            }
        }
        return item.payments;
    }

    getBillPaymentEntries(item) {
        if (!item || !item.snapshot) return [];
        return this.ensureBillPaymentsArray(item);
    }

    getBillPaidAmount(item) {
        if (!item || !item.snapshot) return 0;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') {
            return Math.round(snap.advancePaidAmount || 0);
        }
        const entries = this.getBillPaymentEntries(item);
        const totalPaid = entries.reduce((sum, p) => sum + (Math.round(Number(p.amount) || 0)), 0);
        return Math.max(0, totalPaid);
    }

    getBillPendingAmount(item) {
        if (!item || !item.snapshot) return 0;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return 0;
        const grand = Math.round(snap.grandTotal || 0);
        const paid = this.getBillPaidAmount(item);
        return Math.max(0, grand - paid);
    }

    isBillItemUnpaid(item) {
        return this.getBillPendingAmount(item) > 0;
    }

    syncBillPaymentSnapshot(item) {
        if (!item || !item.snapshot) return;
        const snap = item.snapshot;
        if ((snap.docType || 'QUOTATION') !== 'INVOICE') return;
        const paid = this.getBillPaidAmount(item);
        const pending = this.getBillPendingAmount(item);
        snap.advancePaidAmount = paid;
        snap.balancePayable = pending;
        item.paymentStatus = (pending <= 0 && (snap.grandTotal || 0) > 0) ? 'paid' : 'unpaid';
    }

    formatPaymentDateDisplay(ymdStr) {
        if (!ymdStr) return 'Date N/A';
        try {
            const parts = String(ymdStr).split('-');
            if (parts.length === 3) {
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                }
            }
            return ymdStr;
        } catch (e) {
            return ymdStr;
        }
    }

    openRecordPaymentModal(billId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item || !item.snapshot) return;
        const overlay = document.getElementById('recordPaymentModalOverlay');
        if (!overlay) return;

        this.activeRecordPayBillId = item.id;
        this.ensureBillPaymentsArray(item);
        this.syncBillPaymentSnapshot(item);

        const idInp = document.getElementById('rpmBillIdInput');
        if (idInp) idInp.value = item.id;

        const dateInp = document.getElementById('rpmDateInput');
        if (dateInp) {
            dateInp.value = new Date().toISOString().split('T')[0];
        }

        const amtInp = document.getElementById('rpmAmountInput');
        if (amtInp) amtInp.value = '';

        this.renderRecordPaymentModalContent(item);
        overlay.style.display = 'flex';
        this.refreshIcons();
        setTimeout(() => amtInp?.focus(), 80);
    }

    renderRecordPaymentModalContent(item) {
        if (!item || !item.snapshot) return;
        const snap = item.snapshot;
        const displayCust = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Direct Bill';
        const siteStr = item.custLocation || 'Site N/A';

        const subEl = document.getElementById('rpmSub');
        if (subEl) subEl.textContent = `#${item.billNo} • ${displayCust} (${siteStr})`;

        const grand = Math.round(snap.grandTotal || 0);
        const paid = this.getBillPaidAmount(item);
        const pending = this.getBillPendingAmount(item);
        const hasDue = pending > 0;

        const totEl = document.getElementById('rpmTotalBillVal');
        const paidEl = document.getElementById('rpmTotalPaidVal');
        const dueEl = document.getElementById('rpmBalanceDueVal');
        const dueBox = document.getElementById('rpmDueBox');
        if (totEl) totEl.textContent = this.formatINR(grand);
        if (paidEl) paidEl.textContent = this.formatINR(paid);
        if (dueEl) {
            dueEl.textContent = hasDue ? this.formatINR(pending) : '₹0 (Paid)';
            dueEl.className = `cdm-pt-val ${hasDue ? 'text-danger' : 'text-green'}`;
        }
        if (dueBox) dueBox.classList.toggle('has-due', hasDue);

        const fullBtn = document.getElementById('rpmFillFullBalanceBtn');
        if (fullBtn) {
            if (hasDue) {
                fullBtn.style.display = 'inline-flex';
                fullBtn.textContent = `Full Due: ${this.formatINR(pending)}`;
            } else {
                fullBtn.style.display = 'none';
            }
        }

        const entries = this.getBillPaymentEntries(item);
        const countBadge = document.getElementById('rpmHistoryCountBadge');
        if (countBadge) {
            countBadge.textContent = String(entries.length);
        }

        const listEl = document.getElementById('rpmHistoryList');
        if (!listEl) return;

        if (entries.length === 0) {
            listEl.innerHTML = `
                <div class="rpm-empty-msg">
                    No payments recorded yet. Select date &amp; enter amount above.
                </div>
            `;
            return;
        }

        listEl.innerHTML = entries.map((p, idx) => `
            <div class="rpm-hist-item">
                <div class="rpm-hi-date">
                    <span class="rpm-hi-idx">${idx + 1}.</span>
                    <span>📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                </div>
                <div class="rpm-hi-right">
                    <span class="rpm-hi-amt">${this.formatINR(p.amount)}</span>
                    <button type="button" class="rpm-hi-del-btn" data-payid="${p.id}" title="Remove">✕</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.rpm-hi-del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteBillPaymentEntry(item.id, btn.dataset.payid);
            });
        });
    }

    saveNewBillPaymentRecord() {
        const billId = document.getElementById('rpmBillIdInput')?.value || this.activeRecordPayBillId;
        const item = (this.history || []).find(h => h.id === billId);
        if (!item) return;

        const dateVal = (document.getElementById('rpmDateInput')?.value || '').trim() || new Date().toISOString().split('T')[0];
        const amtInput = document.getElementById('rpmAmountInput');
        const rawAmt = Math.round(parseFloat(amtInput?.value) || 0);
        if (rawAmt <= 0) {
            this.showToast('⚠️ Enter payment amount (₹)');
            amtInput?.focus();
            return;
        }

        const entries = this.ensureBillPaymentsArray(item);
        entries.push({
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 100),
            date: dateVal,
            amount: rawAmt
        });

        this.syncBillPaymentSnapshot(item);
        this.saveToStorage('borebill_history', this.history);

        if (amtInput) amtInput.value = '';

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }
        if (this.loadedHistoryBillId === item.id) {
            const advEl = document.getElementById('advancePaidAmount');
            if (advEl) advEl.value = item.snapshot.advancePaidAmount > 0 ? item.snapshot.advancePaidAmount : '';
            this.calculateAndRender();
        }

        this.showToast(`✅ Added ${this.formatINR(rawAmt)} (${this.formatPaymentDateDisplay(dateVal)})`);
    }

    deleteBillPaymentEntry(billId, payId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item) return;
        const entries = this.ensureBillPaymentsArray(item);
        const idx = entries.findIndex(p => p.id === payId);
        if (idx === -1) return;

        const removed = entries[idx];
        entries.splice(idx, 1);
        if (removed.isAdvance && item.snapshot) {
            item.snapshot.initialAdvanceAmount = 0;
        }
        this.syncBillPaymentSnapshot(item);
        this.saveToStorage('borebill_history', this.history);

        this.renderRecordPaymentModalContent(item);
        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');

        if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
            this.openBillDetailModal(item.id);
        }
        if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
            this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
        }

        this.showUndoToast(`🗑️ Removed payment ${this.formatINR(removed.amount)}`, () => {
            entries.splice(idx, 0, removed);
            this.syncBillPaymentSnapshot(item);
            this.saveToStorage('borebill_history', this.history);
            this.renderRecordPaymentModalContent(item);
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            if (this.activeDetailBillId === item.id && document.getElementById('billDetailModalOverlay')?.style.display !== 'none') {
                this.openBillDetailModal(item.id);
            }
            if (this.activeDetailCustomerId && document.getElementById('custDetailModalOverlay')?.style.display !== 'none') {
                this.openCustomerDetailModal(this.activeDetailCustomerId, null, this.cdmActiveView || 'overview');
            }
        });
    }

    closeRecordPaymentModal() {
        const overlay = document.getElementById('recordPaymentModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeRecordPayBillId = null;
    }

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
        const dateStr = this.getHistoryItemDateStr(item) || 'N/A';
        const siteName = item.custLocation || 'Site N/A';
        const phoneStr = this.formatPhoneWithCountryCode(item.custPhone || '');

        const avatarEl = document.getElementById('bdmAvatar');
        const titleEl = document.getElementById('bdmTitle');
        const subEl = document.getElementById('bdmSub');
        if (avatarEl) avatarEl.textContent = this.getInitials(displayCust);
        if (titleEl) titleEl.textContent = `${isInvoice ? 'Bill' : 'Quotation'} #${item.billNo} — ${displayCust}`;
        if (subEl) subEl.textContent = `📍 ${siteName}${phoneStr ? ` • 📞 ${phoneStr}` : ''} • 📅 ${dateStr}`;

        const isRepair = snap.drillingType === 'repair';
        const workTypeLabel = isRepair ? `Re-Bore (${snap.boreDia || '6.5"'})` : `New Bore (${snap.boreDia || '6.5"'})`;
        const depthFt = Number(snap.totalDepth || 0);
        const oldBoreFt = Number(snap.oldBoreDepth || 0);
        const drillCost = Math.round(snap.drillingCost || 0);

        const pvc7Ft = Number(snap.pvc7Length || 0);
        const pvc10Ft = Number(snap.pvc10Length || 0);
        const totalPipeFt = pvc7Ft + pvc10Ft;
        const pvc7Rate = snap.pvc7Rate || this.rates.pvc7Rate || 400;
        const pvc10Rate = snap.pvc10Rate || this.rates.pvc10Rate || 700;
        const pvc7Cost = Math.round(snap.pvc7Cost || (pvc7Ft * pvc7Rate));
        const pvc10Cost = Math.round(snap.pvc10Cost || (pvc10Ft * pvc10Rate));
        const totalPipeCost = pvc7Cost + pvc10Cost;

        const bataCost = Math.round(snap.boreBataCost || 0);
        const collarCost = Math.round(snap.collarCapCost || 0);
        const transportCost = Math.round(snap.transportSurveyCost || 0);
        const customExtraCost = Math.round(snap.customExtraAmount || 0);
        const customExtraLbl = (snap.customExtraLabel || 'Other Extra').trim();
        const extrasTotal = bataCost + collarCost + transportCost + customExtraCost;

        const extrasParts = [];
        if (bataCost > 0) extrasParts.push(`Bata: ${this.formatINR(bataCost)}`);
        if (collarCost > 0) extrasParts.push(`Collar: ${this.formatINR(collarCost)}`);
        if (transportCost > 0) extrasParts.push(`Transport: ${this.formatINR(transportCost)}`);
        if (customExtraCost > 0) extrasParts.push(`${this.escapeHtml(customExtraLbl)}: ${this.formatINR(customExtraCost)}`);

        const discountAmt = Math.round(snap.discountAmount || 0);
        const gstAmt = Math.round(snap.gstAmount || 0);
        const grandTotal = Math.round(snap.grandTotal || 0);
        const paidAmt = this.getBillPaidAmount(item);
        const pendingAmt = this.getBillPendingAmount(item);
        const hasDue = pendingAmt > 0;
        const payEntries = this.getBillPaymentEntries(item);
        const slabRows = Array.isArray(snap.slabDetails) ? snap.slabDetails : [];

        bodyEl.innerHTML = `
            <div class="cdm-bore-card ${isInvoice ? (hasDue ? 'is-unpaid-bore' : 'is-paid-bore') : 'is-quote-bore'}" style="margin-bottom:0;">
                <div class="cbc-head">
                    <div class="cbc-head-left">
                        <span class="cbc-bore-num-badge ${isInvoice ? '' : 'quote-badge'}">
                            ${isInvoice ? '🧾 FINAL BILL' : '📋 QUOTATION'}
                        </span>
                        <span class="cbc-bill-no">#${this.escapeHtml(item.billNo || '')}</span>
                        <span class="cbc-date">📅 ${dateStr}</span>
                    </div>
                    <div class="cbc-head-right">
                        ${isInvoice
                            ? (hasDue
                                ? `<span class="status-pill due static-badge">🔴 Due: ${this.formatINR(pendingAmt)}</span>`
                                : `<span class="status-pill paid static-badge">✅ Paid</span>`)
                            : `<span class="status-pill quote static-badge">📋 Quotation</span>`
                        }
                    </div>
                </div>

                <div class="cbc-clean-rows">
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">👤 Customer</span>
                        <span class="cbc-r-val">${this.escapeHtml(displayCust)}${phoneStr ? ` <small>(${this.escapeHtml(phoneStr)})</small>` : ''}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">📍 Site Location</span>
                        <span class="cbc-r-val">${this.escapeHtml(siteName)}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">⚙️ Bore Type &amp; Base Rate</span>
                        <span class="cbc-r-val">${workTypeLabel} <small>(Base ₹${snap.baseDrillingRate || 90}/ft)</small></span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">⛏️ Depth Drilled</span>
                        <span class="cbc-r-val">
                            ${depthFt.toLocaleString('en-IN')} ft
                            ${isRepair && oldBoreFt > 0 ? `<small>(Flush ${oldBoreFt} ft)</small>` : ''}
                            • <strong class="text-brand">${this.formatINR(drillCost)}</strong>
                        </span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🟦 7" Casing Pipe</span>
                        <span class="cbc-r-val">${pvc7Ft} ft <small>(@ ₹${pvc7Rate}/ft)</small> • <strong>${this.formatINR(pvc7Cost)}</strong></span>
                    </div>
                    ${pvc10Ft > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🟦 10" Casing Pipe</span>
                        <span class="cbc-r-val">${pvc10Ft} ft <small>(@ ₹${pvc10Rate}/ft)</small> • <strong>${this.formatINR(pvc10Cost)}</strong></span>
                    </div>
                    ` : ''}
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">📏 Total Casing Installed</span>
                        <span class="cbc-r-val">${totalPipeFt.toLocaleString('en-IN')} ft • <strong class="text-brand">${this.formatINR(totalPipeCost)}</strong></span>
                    </div>
                    ${extrasTotal > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🛠️ Bata &amp; Extras</span>
                        <span class="cbc-r-val"><small>${extrasParts.join(', ')}</small> • <strong>${this.formatINR(extrasTotal)}</strong></span>
                    </div>
                    ` : ''}
                    ${discountAmt > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🏷️ Discount</span>
                        <span class="cbc-r-val text-green">−${this.formatINR(discountAmt)}</span>
                    </div>
                    ` : ''}
                    ${gstAmt > 0 ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🧾 GST</span>
                        <span class="cbc-r-val">+${this.formatINR(gstAmt)}</span>
                    </div>
                    ` : ''}
                    <div class="cbc-row highlight-row">
                        <span class="cbc-r-lbl">💰 ${isInvoice ? 'Total Bill Amount' : 'Estimated Total'}</span>
                        <span class="cbc-r-val" style="font-size: 0.92rem;">${this.formatINR(grandTotal)}</span>
                    </div>
                    ${isInvoice ? `
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">✅ Paid Amount</span>
                        <span class="cbc-r-val text-green">${this.formatINR(paidAmt)}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">⏳ Balance Due</span>
                        <span class="cbc-r-val ${hasDue ? 'text-danger' : 'text-green'}">${hasDue ? this.formatINR(pendingAmt) : '₹0 (Settled)'}</span>
                    </div>
                    ` : ''}
                </div>

                ${isInvoice ? `
                <div class="cbc-pay-history-box">
                    <div class="cphb-head">
                        <span>💳 Payments (${payEntries.length})</span>
                        <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''}" id="bdmInlineRecordPayBtn">
                            ${hasDue ? '＋ Add Payment' : 'Edit Payments'}
                        </button>
                    </div>
                    <div class="cphb-rows">
                        ${payEntries.length > 0
                            ? payEntries.map((p, idx) => `
                                <div class="cphb-row">
                                    <span class="cphb-r-left">${idx + 1}. 📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                                    <span class="cphb-r-amt">${this.formatINR(p.amount)}</span>
                                </div>
                            `).join('')
                            : `<div style="padding:8px 0; color:#64748b; font-size:0.74rem; font-weight:600;">No payment recorded yet.</div>`
                        }
                    </div>
                </div>
                ` : ''}

                ${slabRows.length > 0 ? `
                    <details class="cbc-slab-details">
                        <summary>
                            <span>📐 View Depth Slab Breakup (${slabRows.length} ${slabRows.length === 1 ? 'Slab' : 'Slabs'})</span>
                            <span>▾</span>
                        </summary>
                        <table class="cbc-slab-table">
                            <thead>
                                <tr>
                                    <th>Depth Slab</th>
                                    <th>Feet</th>
                                    <th>Rate/ft</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slabRows.map(sr => `
                                    <tr>
                                        <td>${this.escapeHtml(sr.range)}</td>
                                        <td>${sr.depth} ft</td>
                                        <td>₹${sr.rate}</td>
                                        <td>${this.formatINR(sr.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </details>
                ` : ''}
            </div>
        `;

        footEl.innerHTML = `
            <div class="bdm-foot-left">
                ${isInvoice ? `
                    <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''}" id="bdmFootRecordPayBtn">
                        ${hasDue ? '＋ Payment' : 'Payments'}
                    </button>
                ` : ''}
                <button type="button" class="btn-wa-xs" id="bdmFootWaBtn">💬 WhatsApp</button>
            </div>
            <div class="bdm-foot-right">
                <button type="button" class="btn-secondary-sm" id="bdmFootEditBtn">✏️ Edit</button>
                <button type="button" class="btn-brand-sm" id="bdmFootReceiptBtn">🧾 Receipt / PDF</button>
            </div>
        `;

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
    }

    closeBillDetailModal() {
        const overlay = document.getElementById('billDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailBillId = null;
    }

    buildCustomerBillsIndex() {
        const phoneMap = new Map();
        const nameMap = new Map();
        (this.history || []).forEach(b => {
            const p = this.normalizeMobileNumber(b.custPhone || '');
            if (p) {
                if (!phoneMap.has(p)) phoneMap.set(p, []);
                phoneMap.get(p).push(b);
            }
            const n = (b.custName || '').trim().toLowerCase();
            if (n) {
                if (!nameMap.has(n)) nameMap.set(n, []);
                nameMap.get(n).push(b);
            }
        });
        return { phoneMap, nameMap };
    }

    getCustomerMatchingBills(cust, index = null) {
        if (!cust) return [];
        const custDigits = this.normalizeMobileNumber(cust.phone || '');
        const custNameLower = (cust.name || '').trim().toLowerCase();

        if (index && index.phoneMap && index.nameMap) {
            const seen = new Set();
            const result = [];
            if (custDigits && index.phoneMap.has(custDigits)) {
                index.phoneMap.get(custDigits).forEach(b => {
                    const idKey = b.id || b;
                    if (!seen.has(idKey)) {
                        seen.add(idKey);
                        result.push(b);
                    }
                });
            }
            if (custNameLower && index.nameMap.has(custNameLower)) {
                index.nameMap.get(custNameLower).forEach(b => {
                    const idKey = b.id || b;
                    if (!seen.has(idKey)) {
                        seen.add(idKey);
                        result.push(b);
                    }
                });
            }
            return result;
        }

        return (this.history || []).filter(b => {
            const billDigits = this.normalizeMobileNumber(b.custPhone || '');
            if (custDigits && billDigits && custDigits === billDigits) return true;
            if (custNameLower && (b.custName || '').trim().toLowerCase() === custNameLower) return true;
            return false;
        });
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

        this.renderQuickCustomerPicker();

        const listEl = document.getElementById('crmCustomerList');
        if (!listEl) return;

        const billsIndex = this.buildCustomerBillsIndex();
        this._aggCache = new Map();

        const q = query.toLowerCase().trim();
        const filtered = this.customers.filter(c => {
            const agg = this.getCustomerAggregates(c, billsIndex);
            if (this.crmFilter === 'due' && agg.totalPending <= 0) return false;
            if (this.crmFilter === 'settled' && agg.totalPending > 0) return false;

            if (!q) return true;
            const { allSites } = this.getCustomerSiteSuggestions(c);
            return (
                (c.name || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.village || '').toLowerCase().includes(q) ||
                allSites.some(s => s.toLowerCase().includes(q))
            );
        });

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
            const { allSites } = this.getCustomerSiteSuggestions(c);
            const placeText = c.village || (allSites.length > 0 ? allSites[0] : '');
            const dispPhone = this.formatPhoneWithCountryCode(c.phone || '', c.countryCode || this.defaultCountryCode);

            let badgeHtml = '';
            if (hasDue) {
                badgeHtml = `<span class="cmr-badge due">Due ${this.formatINR(agg.totalPending)}</span>`;
            } else if (agg.boresCount > 0) {
                badgeHtml = `<span class="cmr-badge settled">${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'} • Paid</span>`;
            } else if (agg.quotesCount > 0) {
                badgeHtml = `<span class="cmr-badge neutral">${agg.quotesCount} ${agg.quotesCount === 1 ? 'Quote' : 'Quotes'}</span>`;
            } else {
                badgeHtml = `<span class="cmr-badge neutral">View</span>`;
            }

            return `
                <div class="crm-minimal-row" data-cust-id="${c.id}" title="Tap to open customer summary & bore details">
                    <div class="cmr-left">
                        <div class="cmr-avatar">${initials}</div>
                        <div class="cmr-info">
                            <div class="cmr-name">${this.escapeHtml(c.name)}</div>
                            <div class="cmr-sub">
                                ${placeText ? `<span class="cmr-place">📍 ${this.escapeHtml(placeText)}</span>` : ''}
                                ${placeText && dispPhone ? `<span class="cmr-dot">•</span>` : ''}
                                ${dispPhone ? `<span class="cmr-phone">📞 ${this.escapeHtml(dispPhone)}</span>` : (!placeText ? '<span class="cmr-phone">Tap to view details</span>' : '')}
                            </div>
                        </div>
                    </div>
                    <div class="cmr-right">
                        ${badgeHtml}
                        <span class="cmr-chevron">›</span>
                    </div>
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

        this.confirmDeleteModal({
            title: 'Delete Customer?',
            itemLabel: `👤 ${labelTxt}`,
            message: 'Are you sure you want to remove this customer from Customer Book?',
            onConfirm: () => {
                this.customers = this.customers.filter(x => x.id !== targetId);
                if (this.activeDetailCustomerId === targetId) {
                    this.closeCustomerDetailModal();
                }
                this.saveToStorage('borebill_customers', this.customers);
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
                        this.saveToStorage('borebill_customers', this.customers);
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
            if (cust.village) parts.push(`📍 ${cust.village}`);
            if (dispPhone) parts.push(`📞 ${dispPhone}`);
            if (allSites.length > 1) parts.push(`${allSites.length} Sites`);
            metaEl.textContent = parts.join(' • ') || 'Customer Profile';
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
            waTxt.textContent = agg.totalPending > 0 ? 'Remind Due' : 'WhatsApp';
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

        const dueBoxEl = document.getElementById('cdmDueStatBox');
        const totDueEl = document.getElementById('cdmTotalDue');
        const hasDue = agg.totalPending > 0;
        if (dueBoxEl) dueBoxEl.classList.toggle('has-due', hasDue);
        if (totDueEl) {
            totDueEl.textContent = this.formatINR(agg.totalPending);
            totDueEl.className = `cpt-val ${hasDue ? 'text-danger' : 'text-green'}`;
        }

        // 3. Borewell & Pipe Summary (Clean Key-Value List)
        const sitesPill = document.getElementById('cdmSitesCountPill');
        if (sitesPill) sitesPill.textContent = `📍 ${allSites.length} ${allSites.length === 1 ? 'Site' : 'Sites'}`;

        const boresCountEl = document.getElementById('cdmTotalBoresCount');
        const boresTypeSubEl = document.getElementById('cdmBoresTypeSub');
        if (boresCountEl) boresCountEl.textContent = `${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'}`;
        if (boresTypeSubEl) boresTypeSubEl.textContent = `New Bore: ${agg.newBoresCount} • Re-Bore: ${agg.reBoresCount}`;

        const drilledFtEl = document.getElementById('cdmTotalDrilledFt');
        const drillCostSubEl = document.getElementById('cdmTotalDrillCostSub');
        if (drilledFtEl) drilledFtEl.textContent = `${agg.totalDrilledFt.toLocaleString('en-IN')} ft`;
        if (drillCostSubEl) {
            drillCostSubEl.textContent = `Drilling Amount: ${this.formatINR(agg.totalDrillingCost)}${agg.totalOldBoreFt > 0 ? ` • Flush: ${agg.totalOldBoreFt} ft` : ''}`;
        }

        const pipeFtEl = document.getElementById('cdmTotalPipeFt');
        const pipeSubEl = document.getElementById('cdmPipeBreakdownSub');
        if (pipeFtEl) pipeFtEl.textContent = `${agg.totalPipeFt.toLocaleString('en-IN')} ft`;
        if (pipeSubEl) {
            pipeSubEl.textContent = `7" Pipe: ${agg.totalPvc7Ft} ft • 10" Pipe: ${agg.totalPvc10Ft} ft (${this.formatINR(agg.totalPipeCost)})`;
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
            this.switchCustomerDetailView('overview');
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

        const filterMode = this.cdmActiveBoreFilter || 'all';
        const items = agg.matchingBills.filter(b => {
            const docType = b.snapshot?.docType || 'QUOTATION';
            if (filterMode === 'INVOICE') return docType === 'INVOICE';
            if (filterMode === 'QUOTATION') return docType === 'QUOTATION';
            return true;
        });

        if (items.length === 0) {
            if (selectorBarEl) selectorBarEl.style.display = 'none';
            listEl.innerHTML = `
                <div style="text-align:center; padding: 28px 12px; color: #64748b;">
                    <p style="font-size: 0.84rem; font-weight: 700; margin-bottom: 10px;">No bore records found in this filter.</p>
                    <button type="button" class="btn-brand-sm" id="cdmEmptyCreateBillBtn">+ Create New Bore Bill</button>
                </div>
            `;
            document.getElementById('cdmEmptyCreateBillBtn')?.addEventListener('click', () => {
                this.closeCustomerDetailModal();
                this.exitSavedBillMode(false);
                this.selectCustomerIntoBill(cust);
                this.switchTab('tab-bill');
            });
            return;
        }

        const totalInList = items.length;

        // Default to showing the newest single bore when there are multiple bores so each bore is viewed cleanly and separately
        if (!this.cdmSelectedBoreId || (this.cdmSelectedBoreId !== 'all' && !items.some(x => x.id === this.cdmSelectedBoreId))) {
            this.cdmSelectedBoreId = items[0].id;
        }

        // Render Bore Selector Bar if there is more than 1 bore/record
        if (selectorBarEl) {
            if (totalInList > 1) {
                selectorBarEl.style.display = 'flex';
                const pillsHtml = items.map((item, idx) => {
                    const isInvoice = (item.snapshot?.docType || 'QUOTATION') === 'INVOICE';
                    const seqNum = totalInList - idx;
                    const depthFt = Number(item.snapshot?.totalDepth || 0);
                    const isSelected = this.cdmSelectedBoreId === item.id;
                    return `
                        <button type="button" class="cdm-bore-sel-btn ${isSelected ? 'active' : ''}" data-boreid="${item.id}">
                            ${isInvoice ? `🚜 Bore #${seqNum}` : `📋 Quote #${seqNum}`} (${depthFt} ft)
                        </button>
                    `;
                }).join('');

                selectorBarEl.innerHTML = `
                    ${pillsHtml}
                    <button type="button" class="cdm-bore-sel-btn ${this.cdmSelectedBoreId === 'all' ? 'active' : ''}" data-boreid="all">
                        All (${totalInList})
                    </button>
                `;

                selectorBarEl.querySelectorAll('.cdm-bore-sel-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.cdmSelectedBoreId = btn.dataset.boreid;
                        this.renderCustomerDetailModalBores(cust, agg);
                    });
                });
            } else {
                selectorBarEl.style.display = 'none';
            }
        }

        const visibleItems = (totalInList > 1 && this.cdmSelectedBoreId !== 'all')
            ? items.filter(x => x.id === this.cdmSelectedBoreId)
            : items;

        listEl.innerHTML = visibleItems.map((item) => {
            const origIdx = items.findIndex(x => x.id === item.id);
            const boreSeqNum = totalInList - origIdx;
            const snap = item.snapshot || {};
            const isInvoice = (snap.docType || 'QUOTATION') === 'INVOICE';
            const dateStr = this.getHistoryItemDateStr(item) || 'N/A';
            const siteName = item.custLocation || cust.village || 'Site N/A';
            const isRepair = snap.drillingType === 'repair';
            const workTypeLabel = isRepair ? `Re-Bore (${snap.boreDia || '6.5"'})` : `New Bore (${snap.boreDia || '6.5"'})`;

            const depthFt = Number(snap.totalDepth || 0);
            const oldBoreFt = Number(snap.oldBoreDepth || 0);
            const drillCost = Math.round(snap.drillingCost || 0);

            const pvc7Ft = Number(snap.pvc7Length || 0);
            const pvc10Ft = Number(snap.pvc10Length || 0);
            const totalPipeFt = pvc7Ft + pvc10Ft;
            const pvc7Rate = snap.pvc7Rate || this.rates.pvc7Rate || 400;
            const pvc10Rate = snap.pvc10Rate || this.rates.pvc10Rate || 700;
            const pvc7Cost = Math.round(snap.pvc7Cost || (pvc7Ft * pvc7Rate));
            const pvc10Cost = Math.round(snap.pvc10Cost || (pvc10Ft * pvc10Rate));
            const totalPipeCost = pvc7Cost + pvc10Cost;

            const bataCost = Math.round(snap.boreBataCost || 0);
            const collarCost = Math.round(snap.collarCapCost || 0);
            const transportCost = Math.round(snap.transportSurveyCost || 0);
            const customExtraCost = Math.round(snap.customExtraAmount || 0);
            const customExtraLbl = (snap.customExtraLabel || 'Other Extra').trim();
            const extrasTotal = bataCost + collarCost + transportCost + customExtraCost;

            const discountAmt = Math.round(snap.discountAmount || 0);
            const gstAmt = Math.round(snap.gstAmount || 0);

            const grandTotal = Math.round(snap.grandTotal || 0);
            const paidAmt = this.getBillPaidAmount(item);
            const pendingAmt = this.getBillPendingAmount(item);
            const hasDue = pendingAmt > 0;

            const extrasParts = [];
            if (bataCost > 0) extrasParts.push(`Bata: ${this.formatINR(bataCost)}`);
            if (collarCost > 0) extrasParts.push(`Collar: ${this.formatINR(collarCost)}`);
            if (transportCost > 0) extrasParts.push(`Transport: ${this.formatINR(transportCost)}`);
            if (customExtraCost > 0) extrasParts.push(`${this.escapeHtml(customExtraLbl)}: ${this.formatINR(customExtraCost)}`);

            const slabRows = Array.isArray(snap.slabDetails) ? snap.slabDetails : [];
            const payEntries = this.getBillPaymentEntries(item);

            return `
                <div class="cdm-bore-card ${isInvoice ? (hasDue ? 'is-unpaid-bore' : 'is-paid-bore') : 'is-quote-bore'}">
                    <!-- Bore Header -->
                    <div class="cbc-head">
                        <div class="cbc-head-left">
                            <span class="cbc-bore-num-badge ${isInvoice ? '' : 'quote-badge'}">
                                ${isInvoice ? `BORE #${boreSeqNum}` : `QUOTE #${boreSeqNum}`}
                            </span>
                            <span class="cbc-bill-no">#${this.escapeHtml(item.billNo || '')}</span>
                            <span class="cbc-date">📅 ${dateStr}</span>
                        </div>
                        <div class="cbc-head-right">
                            ${isInvoice
                                ? (hasDue
                                    ? `<span class="status-pill due static-badge">🔴 Due: ${this.formatINR(pendingAmt)}</span>`
                                    : `<span class="status-pill paid static-badge">✅ Paid</span>`)
                                : `<span class="status-pill quote static-badge">📋 Quotation</span>`
                            }
                        </div>
                    </div>

                    <!-- Clean Uncluttered Row-by-Row Breakdown -->
                    <div class="cbc-clean-rows">
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">📍 Site Location</span>
                            <span class="cbc-r-val">${this.escapeHtml(siteName)}</span>
                        </div>
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">⚙️ Bore Type &amp; Base Rate</span>
                            <span class="cbc-r-val">${workTypeLabel} <small>(Base ₹${snap.baseDrillingRate || 90}/ft)</small></span>
                        </div>
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">⛏️ Depth Drilled</span>
                            <span class="cbc-r-val">
                                ${depthFt.toLocaleString('en-IN')} ft
                                ${isRepair && oldBoreFt > 0 ? `<small>(Flush ${oldBoreFt} ft)</small>` : ''}
                                • <strong class="text-brand">${this.formatINR(drillCost)}</strong>
                            </span>
                        </div>
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">🟦 7" Casing Pipe</span>
                            <span class="cbc-r-val">${pvc7Ft} ft <small>(@ ₹${pvc7Rate}/ft)</small> • <strong>${this.formatINR(pvc7Cost)}</strong></span>
                        </div>
                        ${pvc10Ft > 0 ? `
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">🟦 10" Casing Pipe</span>
                            <span class="cbc-r-val">${pvc10Ft} ft <small>(@ ₹${pvc10Rate}/ft)</small> • <strong>${this.formatINR(pvc10Cost)}</strong></span>
                        </div>
                        ` : ''}
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">📏 Total Pipe Installed</span>
                            <span class="cbc-r-val">${totalPipeFt.toLocaleString('en-IN')} ft • <strong class="text-brand">${this.formatINR(totalPipeCost)}</strong></span>
                        </div>
                        ${extrasTotal > 0 ? `
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">🛠️ Bata &amp; Extras</span>
                            <span class="cbc-r-val"><small>${extrasParts.join(', ')}</small> • <strong>${this.formatINR(extrasTotal)}</strong></span>
                        </div>
                        ` : ''}
                        ${discountAmt > 0 ? `
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">🏷️ Discount</span>
                            <span class="cbc-r-val text-green">−${this.formatINR(discountAmt)}</span>
                        </div>
                        ` : ''}
                        ${gstAmt > 0 ? `
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">🧾 GST</span>
                            <span class="cbc-r-val">+${this.formatINR(gstAmt)}</span>
                        </div>
                        ` : ''}
                        <div class="cbc-row highlight-row">
                            <span class="cbc-r-lbl">💰 ${isInvoice ? 'Total Bore Bill' : 'Estimated Total'}</span>
                            <span class="cbc-r-val" style="font-size: 0.9rem;">${this.formatINR(grandTotal)}</span>
                        </div>
                        ${isInvoice ? `
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">✅ Paid Amount</span>
                            <span class="cbc-r-val text-green">${this.formatINR(paidAmt)}</span>
                        </div>
                        <div class="cbc-row">
                            <span class="cbc-r-lbl">⏳ Pending Balance</span>
                            <span class="cbc-r-val ${hasDue ? 'text-danger' : 'text-green'}">${hasDue ? this.formatINR(pendingAmt) : '₹0 (Settled)'}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${isInvoice ? `
                    <div class="cbc-pay-history-box">
                        <div class="cphb-head">
                            <span>💳 Payments (${payEntries.length})</span>
                            <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''} cdm-bore-pay-btn" data-id="${item.id}">
                                ${hasDue ? '＋ Add Payment' : 'Edit Payments'}
                            </button>
                        </div>
                        <div class="cphb-rows">
                            ${payEntries.length > 0
                                ? payEntries.map((p, pIdx) => `
                                    <div class="cphb-row">
                                        <span class="cphb-r-left">${pIdx + 1}. 📅 ${this.escapeHtml(this.formatPaymentDateDisplay(p.date))}</span>
                                        <span class="cphb-r-amt">${this.formatINR(p.amount)}</span>
                                    </div>
                                `).join('')
                                : `<div style="padding:8px 0; color:#64748b; font-size:0.74rem; font-weight:600;">No payment recorded yet.</div>`
                            }
                        </div>
                    </div>
                    ` : ''}

                    <!-- Expandable Depth Slab Breakup Table -->
                    ${slabRows.length > 0 ? `
                        <details class="cbc-slab-details">
                            <summary>
                                <span>📐 View Depth Slab Breakup (${slabRows.length} ${slabRows.length === 1 ? 'Slab' : 'Slabs'})</span>
                                <span>▾</span>
                            </summary>
                            <table class="cbc-slab-table">
                                <thead>
                                    <tr>
                                        <th>Depth Slab</th>
                                        <th>Feet</th>
                                        <th>Rate/ft</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${slabRows.map(sr => `
                                        <tr>
                                            <td>${this.escapeHtml(sr.range)}</td>
                                            <td>${sr.depth} ft</td>
                                            <td>₹${sr.rate}</td>
                                            <td>${this.formatINR(sr.cost)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </details>
                    ` : ''}

                    <!-- Bore Card Footer Actions -->
                    <div class="cbc-foot">
                        <div class="cbc-foot-btns">
                            ${isInvoice ? `
                                <button type="button" class="btn-record-pay-xs ${hasDue ? 'has-due-btn' : ''} cdm-bore-pay-btn" data-id="${item.id}">
                                    ${hasDue ? '＋ Payment' : 'Payments'}
                                </button>
                            ` : ''}
                            <button type="button" class="btn-wa-xs cdm-bore-wa-btn" data-id="${item.id}">💬 WA Bill</button>
                            <button type="button" class="btn-secondary-sm cdm-bore-edit-btn" data-id="${item.id}">✏️ Edit</button>
                            <button type="button" class="btn-brand-sm cdm-bore-view-btn" data-id="${item.id}">🧾 Receipt / PDF</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Wire Bore Card action buttons inside the modal
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
                <button type="button" class="wiz-flt-pill ${this.wizCustFilter === 'RECENT' ? 'active' : ''}" data-wflt="RECENT">🕒 Recent</button>
            `;
            uniqueVillages.forEach(v => {
                const isAct = this.wizCustFilter.toLowerCase() === v.toLowerCase();
                pillsHtml += `
                    <button type="button" class="wiz-flt-pill ${isAct ? 'active' : ''}" data-wflt="${v}">🏠 ${v}</button>
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
                            <strong>No customer found for "${rawQ}"</strong>
                            <small>1-click-la puthu customer-a save panni bill-ku select pannalam</small>
                        </div>
                        <button type="button" class="btn-chip-primary" id="wizInstantCreateCustBtn">
                            ＋ Create "${rawQ.slice(0, 16)}"
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
                            <small>Tap "＋ Add Customer" to add Name, Mobile & Place</small>
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
        const displaySlice = filtered.slice(0, 35);

        let pickerCardsHtml = displaySlice.map(c => {
            const cPhone = this.normalizeMobileNumber(c.phone || '');
            const dispPhone = this.formatPhoneWithCountryCode(c.phone || '', c.countryCode || this.defaultCountryCode);
            const isSelected = (currentSelectedPhone && cPhone && currentSelectedPhone === cPhone) ||
                (!currentSelectedPhone && currentSelectedName && (c.name || '').trim().toLowerCase() === currentSelectedName);
            const agg = this.getCustomerAggregates(c, billsIndex);
            const { pastSites } = this.getCustomerSiteSuggestions(c);
            const sitesSub = pastSites.length > 0 ? ` • 📍 +${pastSites.length} site` : '';
            const dueChipHtml = agg.totalPending > 0 ? `<span class="wiz-cust-due-chip">🔴 Due: ${this.formatINR(agg.totalPending)}</span>` : '';

            return `
            <button type="button" class="wiz-cust-card ${isSelected ? 'is-selected' : ''}" data-id="${c.id}">
                <div class="wiz-cc-left">
                    <div class="wiz-cc-avatar">${this.getInitials(c.name)}</div>
                    <div class="wiz-cc-info">
                        <div class="wiz-cc-name-row">
                            <span class="wiz-cc-name">${this.escapeHtml(c.name)}</span>
                            ${c.village ? `<span class="wiz-cc-place-tag">🏠 ${this.escapeHtml(c.village)}</span>` : ''}
                            ${dueChipHtml}
                        </div>
                        <div class="wiz-cc-meta">
                            📞 ${dispPhone || 'N/A'} • ${agg.billsCount} ${agg.billsCount === 1 ? 'Bill' : 'Bills'}${sitesSub}
                        </div>
                    </div>
                </div>
                <span class="wiz-cc-pick-badge">${isSelected ? '✓ Picked' : 'Pick'}</span>
            </button>
        `;
        }).join('');

        if (filtered.length > displaySlice.length) {
            pickerCardsHtml += `
                <div style="text-align:center; padding: 12px 6px; font-size: 0.74rem; color: var(--text-muted); grid-column: 1 / -1; width: 100%;">
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

    getDocFooterTermsNote(docType = 'INVOICE') {
        const b = this.brand || this.defaultBrand;
        if (docType === 'QUOTATION') {
            return (b.termsNote ?? '').trim();
        }
        let billNote = (b.finalBillTermsNote ?? '').trim();
        // Guarantee the Quotation rock-strata disclaimer or old Tamil thank-you never appears on a Final Bill
        if (/பாறை கடினம்|rock strata|எங்கள் நிறுவனத்தைத்|நன்றி/i.test(billNote)) {
            billNote = 'Thank you !';
        }
        return billNote;
    }

    getCasing1Name() {
        return (this.brand?.casing1Name || '7" Casing Pipe').trim();
    }

    getCasing2Name() {
        return (this.brand?.casing2Name || '10" Casing Pipe').trim();
    }

    getCasing1ShortName() {
        const name = this.getCasing1Name();
        const m = name.match(/\d+(?:\.\d+)?["″]/);
        return m ? m[0] : (name.length > 10 ? name.slice(0, 8) : name);
    }

    getCasing2ShortName() {
        const name = this.getCasing2Name();
        const m = name.match(/\d+(?:\.\d+)?["″]/);
        return m ? m[0] : (name.length > 10 ? name.slice(0, 8) : name);
    }

    syncCasingNamesUI() {
        const c1 = this.getCasing1Name();
        const c2 = this.getCasing2Name();
        const c1Short = this.getCasing1ShortName();
        const c2Short = this.getCasing2ShortName();

        // New bill stage 3 labels
        const lbl1 = document.getElementById('labelPvc7Name');
        if (lbl1) lbl1.textContent = c1;
        const lbl2 = document.getElementById('labelPvc10Name');
        if (lbl2) lbl2.textContent = c2;

        // Company Card spec
        const specEl = document.getElementById('brandCardCasingSpecText');
        if (specEl) specEl.textContent = `${c1Short} & ${c2Short}`;

        // Casing drawer inputs
        const in1 = document.getElementById('inlineCasing1NameInput');
        if (in1 && document.activeElement !== in1) in1.value = c1;
        const in2 = document.getElementById('inlineCasing2NameInput');
        if (in2 && document.activeElement !== in2) in2.value = c2;
        const inR1 = document.getElementById('inlineCasing1RateInput');
        if (inR1 && document.activeElement !== inR1) inR1.value = this.rates.pvc7Rate || 400;
        const inR2 = document.getElementById('inlineCasing2RateInput');
        if (inR2 && document.activeElement !== inR2) inR2.value = this.rates.pvc10Rate || 700;

        // Company edit studio inputs
        const b1 = document.getElementById('brandCasing1Name');
        if (b1 && document.activeElement !== b1) b1.value = c1;
        const b2 = document.getElementById('brandCasing2Name');
        if (b2 && document.activeElement !== b2) b2.value = c2;
        const bR1 = document.getElementById('brandCasing1Rate');
        if (bR1 && document.activeElement !== bR1) bR1.value = this.rates.pvc7Rate || 400;
        const bR2 = document.getElementById('brandCasing2Rate');
        if (bR2 && document.activeElement !== bR2) bR2.value = this.rates.pvc10Rate || 700;

        // Settings View 2 inputs
        const s1 = document.getElementById('setCasing1Name');
        if (s1 && document.activeElement !== s1) s1.value = c1;
        const s2 = document.getElementById('setCasing2Name');
        if (s2 && document.activeElement !== s2) s2.value = c2;
        const sR1 = document.getElementById('setCasing1Rate');
        if (sR1 && document.activeElement !== sR1) sR1.value = this.rates.pvc7Rate || 400;
        const sR2 = document.getElementById('setCasing2Rate');
        if (sR2 && document.activeElement !== sR2) sR2.value = this.rates.pvc10Rate || 700;
    }

    applyCasingSettings(p1Name, p1Rate, p2Name, p2Rate) {
        if (p1Name) this.brand.casing1Name = p1Name.trim();
        if (p2Name) this.brand.casing2Name = p2Name.trim();
        if (p1Rate !== undefined && !isNaN(p1Rate) && p1Rate > 0) {
            this.rates.pvc7Rate = p1Rate;
            const r1Inp = document.getElementById('pvc7RateInput');
            if (r1Inp) r1Inp.value = p1Rate;
        }
        if (p2Rate !== undefined && !isNaN(p2Rate) && p2Rate > 0) {
            this.rates.pvc10Rate = p2Rate;
            const r2Inp = document.getElementById('pvc10RateInput');
            if (r2Inp) r2Inp.value = p2Rate;
        }
        this.saveToStorage('borebill_brand', this.brand);
        this.saveToStorage('borebill_rates', this.rates);
        this.syncCasingNamesUI();
        this.calculateAndRender();
    }

    syncBrandFromInputs(saveStorage = true) {
        const nameEl = document.getElementById('brandCompanyName');
        if (!nameEl) return;
        const brandPhoneCodeEl = document.getElementById('brandPhoneCountryCode');
        const brandCode = brandPhoneCodeEl?.value || this.brand.phoneCountryCode || this.defaultCountryCode || '+91';
        this.brand.phoneCountryCode = brandCode;
        this.brand.companyName = (nameEl.value || '').trim() || 'MY BOREWELLS';
        this.brand.tagline = (document.getElementById('brandCompanyTagline')?.value || '').trim();
        const rawCompPhones = (document.getElementById('brandCompanyPhones')?.value || '').trim();
        this.brand.phones = rawCompPhones ? this.formatCompanyPhonesWithCountryCode(rawCompPhones, brandCode) : '';
        this.brand.billPrefix = (document.getElementById('brandBillPrefix')?.value || 'AB').trim().toUpperCase();
        this.brand.nextQuoteSeq = Math.max(1, parseInt(document.getElementById('brandNextQuoteSeq')?.value, 10) || 101);
        this.brand.nextBillSeq = Math.max(1, parseInt(document.getElementById('brandNextBillSeq')?.value, 10) || 101);
        this.brand.address = (document.getElementById('brandCompanyAddress')?.value || '').trim();
        this.brand.website = (document.getElementById('brandWebsite')?.value || '').trim();
        this.brand.gstNumber = (document.getElementById('brandGstNumber')?.value || '').trim().toUpperCase();
        this.brand.upiId = (document.getElementById('brandUpiId')?.value || '').trim();
        this.brand.termsNote = (document.getElementById('brandTermsNote')?.value || '').trim();
        const billTermsEl = document.getElementById('brandFinalBillTermsNote');
        if (billTermsEl) {
            let cleanBillTerms = (billTermsEl.value || '').trim();
            if (/பாறை கடினம்|rock strata|எங்கள் நிறுவனத்தைத்|நன்றி/i.test(cleanBillTerms)) {
                cleanBillTerms = 'Thank you !';
                billTermsEl.value = cleanBillTerms;
            }
            this.brand.finalBillTermsNote = cleanBillTerms;
        }

        const casing1El = document.getElementById('setCasing1Name') || document.getElementById('brandCasing1Name');
        if (casing1El && casing1El.value.trim()) {
            this.brand.casing1Name = casing1El.value.trim();
        }
        const casing2El = document.getElementById('setCasing2Name') || document.getElementById('brandCasing2Name');
        if (casing2El && casing2El.value.trim()) {
            this.brand.casing2Name = casing2El.value.trim();
        }
        const casing1RateEl = document.getElementById('setCasing1Rate') || document.getElementById('brandCasing1Rate');
        if (casing1RateEl && parseFloat(casing1RateEl.value) > 0) {
            this.rates.pvc7Rate = parseFloat(casing1RateEl.value);
            const r1Inp = document.getElementById('pvc7RateInput');
            if (r1Inp) r1Inp.value = this.rates.pvc7Rate;
        }
        const casing2RateEl = document.getElementById('setCasing2Rate') || document.getElementById('brandCasing2Rate');
        if (casing2RateEl && parseFloat(casing2RateEl.value) > 0) {
            this.rates.pvc10Rate = parseFloat(casing2RateEl.value);
            const r2Inp = document.getElementById('pvc10RateInput');
            if (r2Inp) r2Inp.value = this.rates.pvc10Rate;
        }

        if (saveStorage) {
            this.saveToStorage('borebill_brand', this.brand);
            this.saveToStorage('borebill_rates', this.rates);
        }
    }

    applyBrandToUI() {
        const b = this.brand;
        const themeName = b.theme || 'emerald';
        document.documentElement.setAttribute('data-theme', themeName);

        const themeColorMap = {
            emerald: '#15803d',
            royal: '#1d4ed8',
            crimson: '#b91c1c',
            amber: '#b45309',
            violet: '#4c1d95',
            slate: '#0f172a'
        };
        const metaTheme = document.getElementById('metaThemeColor');
        if (metaTheme) {
            metaTheme.setAttribute('content', themeColorMap[themeName] || '#15803d');
        }

        const compName = (b.companyName || '').trim() || 'MY BOREWELL COMPANY';
        const tagline = (b.tagline || '').trim();
        const address = (b.address || '').trim();
        const brandPhoneCode = b.phoneCountryCode || this.defaultCountryCode || '+91';
        const phones = this.formatCompanyPhonesWithCountryCode((b.phones || '').trim(), brandPhoneCode);
        const website = (b.website || '').trim();
        const quoteTermsNote = this.getDocFooterTermsNote('QUOTATION');
        const finalBillTermsNote = this.getDocFooterTermsNote('INVOICE');

        document.getElementById('headerCompanyName').textContent = compName;
        document.getElementById('headerCompanyTagline').textContent = tagline;

        document.getElementById('receiptCompanyName').textContent = compName;
        const rcptTaglineEl = document.getElementById('receiptCompanyTagline');
        if (rcptTaglineEl) {
            rcptTaglineEl.textContent = tagline;
            rcptTaglineEl.style.display = tagline ? 'block' : 'none';
        }
        const rcptAddrEl = document.getElementById('receiptCompanyAddress');
        if (rcptAddrEl) {
            rcptAddrEl.textContent = address;
            rcptAddrEl.style.display = address ? 'block' : 'none';
        }
        const rcptPhoneEl = document.getElementById('receiptCompanyPhone');
        if (rcptPhoneEl) {
            rcptPhoneEl.textContent = phones;
        }
        document.getElementById('rcptSignCompany').textContent = compName;

        const rcptTermsEl = document.getElementById('receiptTermsText');
        if (rcptTermsEl) {
            const activeDoc = (this.lastResult?.docType || this.state?.docType || 'INVOICE') === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
            const activeFooterNote = this.getDocFooterTermsNote(activeDoc);
            rcptTermsEl.textContent = activeFooterNote;
            rcptTermsEl.style.display = activeFooterNote ? 'block' : 'none';
            rcptTermsEl.classList.toggle('is-quotation', activeDoc === 'QUOTATION');
            rcptTermsEl.classList.toggle('is-final-bill', activeDoc !== 'QUOTATION');
        }
        const rcptWebBox = document.getElementById('rcptWebsiteBox');
        const rcptWebTxt = document.getElementById('rcptWebsiteText');
        if (rcptWebBox && rcptWebTxt) {
            rcptWebTxt.textContent = website;
            rcptWebBox.style.display = website ? 'block' : 'none';
        }

        // Populate Official Company Digital Business Card & Top KPI Strip (Tab 5)
        const setCardTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        const prefix = (b.billPrefix || 'AB').toUpperCase();
        const nextQ = this.getNextAutoDocNumber ? this.getNextAutoDocNumber('QUOTATION') : `${prefix}-Q${b.nextQuoteSeq || 101}`;
        const nextB = this.getNextAutoDocNumber ? this.getNextAutoDocNumber('INVOICE') : `${prefix}-${b.nextBillSeq || 101}`;
        const totalRevenue = (this.history || []).reduce((sum, item) => sum + (Number(item.grandTotal ?? item.snapshot?.grandTotal) || 0), 0);

        setCardTxt('companyKpiNextQuote', nextQ);
        setCardTxt('companyKpiNextBill', nextB);
        setCardTxt('companyKpiTotalBilled', this.formatINR(totalRevenue));

        setCardTxt('brandCardNameText', compName);
        setCardTxt('brandCardTaglineText', tagline);
        setCardTxt('brandCardAddressText', address || 'Address not set');
        setCardTxt('brandCardPhoneText', phones || 'Phone not set');
        setCardTxt('brandCardPrefixText', `#${prefix}`);
        setCardTxt('brandCardNextSeqText', `${nextQ.replace(prefix + '-', '')} / ${nextB.replace(prefix + '-', '')}`);
        setCardTxt('brandCardGstText', (b.gstNumber && b.gstNumber.trim()) ? b.gstNumber.trim() : 'Optional');
        setCardTxt('brandCardUpiText', (b.upiId && b.upiId.trim()) ? b.upiId.trim() : 'Not Set');
        setCardTxt('brandCardTermsText', quoteTermsNote || '— None (Hidden on Quotation) —');
        setCardTxt('brandCardFinalBillTermsText', finalBillTermsNote || '— None (Hidden on Final Bill) —');
        const brandCardWebEl = document.getElementById('brandCardWebsiteText');
        if (brandCardWebEl) {
            brandCardWebEl.textContent = website ? `🌐 ${website}` : '';
            brandCardWebEl.style.display = website ? 'block' : 'none';
        }

        // Highlight active preset chip in Company Settings for Final Bill Footer Note
        document.querySelectorAll('#finalBillTermsPresetChips .fsb-preset-chip').forEach(chip => {
            const chipVal = (chip.dataset.billNote || '').trim();
            chip.classList.toggle('active', chipVal === finalBillTermsNote);
        });

        // Populate Data Vault Stats (Tab 5)
        setCardTxt('vaultStatCustomers', (this.customers || []).length);
        setCardTxt('vaultStatBills', (this.history || []).length);
        setCardTxt('vaultStatRates', (this.rateProfiles || []).length);

        const gstBadge = document.getElementById('receiptCompanyGstBadge');
        if (b.gstNumber && b.gstNumber.trim()) {
            gstBadge.style.display = 'inline-block';
            document.getElementById('receiptCompanyGstNo').textContent = b.gstNumber.trim();
        } else {
            gstBadge.style.display = 'none';
        }

        const upiBox = document.getElementById('rcptUpiBox');
        if (b.upiId && b.upiId.trim()) {
            upiBox.style.display = 'block';
            document.getElementById('rcptUpiId').textContent = b.upiId.trim();
        } else {
            upiBox.style.display = 'none';
        }

        const hasLogo = Boolean(b.logoDataUrl);
        ['headerLogo', 'receiptLogo', 'brandTabLogo'].forEach(p => {
            const img = document.getElementById(`${p}Img`);
            const fb = document.getElementById(`${p}Fallback`);
            if (img && fb) {
                if (hasLogo) {
                    img.src = b.logoDataUrl;
                    img.style.display = 'block';
                    fb.style.display = 'none';
                } else {
                    img.src = '';
                    img.style.display = 'none';
                    fb.style.display = 'inline-flex';
                }
            }
        });

        const setInputIfNotFocused = (id, val) => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) {
                el.value = val;
            }
        };
        const brandCodeSelect = document.getElementById('brandPhoneCountryCode');
        if (brandCodeSelect && document.activeElement !== brandCodeSelect) {
            brandCodeSelect.value = brandPhoneCode;
        }
        setInputIfNotFocused('brandCompanyName', b.companyName || '');
        setInputIfNotFocused('brandCompanyTagline', b.tagline || '');
        setInputIfNotFocused('brandCompanyPhones', phones || '');
        setInputIfNotFocused('brandBillPrefix', b.billPrefix || 'AB');
        setInputIfNotFocused('brandNextQuoteSeq', b.nextQuoteSeq || 101);
        setInputIfNotFocused('brandNextBillSeq', b.nextBillSeq || 101);
        setInputIfNotFocused('brandCompanyAddress', b.address || '');
        setInputIfNotFocused('brandWebsite', b.website || '');
        setInputIfNotFocused('brandGstNumber', b.gstNumber || '');
        setInputIfNotFocused('brandUpiId', b.upiId || '');
        setInputIfNotFocused('brandTermsNote', quoteTermsNote);
        setInputIfNotFocused('brandFinalBillTermsNote', finalBillTermsNote);

        document.querySelectorAll('.theme-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.theme === themeName);
        });

        this.syncCasingNamesUI();
    }

    handleLogoUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 240;
                let w = img.width;
                let h = img.height;
                if (w > h && w > maxDim) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else if (h > maxDim) {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/png', 0.9);
                this.brand.logoDataUrl = dataUrl;
                this.saveToStorage('borebill_brand', this.brand);
                this.applyBrandToUI();
                this.showToast('✅ Company Logo updated!');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /* ==========================================================================
       MULTI-RATE PROFILES, MASTER SLAB RATES & PRICE SETTINGS MANAGEMENT
       ========================================================================== */

    getDefaultRateProfile() {
        return this.rateProfiles.find(p => p.isDefault) || this.rateProfiles[0];
    }

    getActiveRateProfile() {
        return this.rateProfiles.find(p => p.id === this.activeRateProfileId) || this.getDefaultRateProfile();
    }

    toggleRateStudio(forceOpen = null) {
        const studioCard = document.getElementById('rateEditorCard');
        if (!studioCard) return;
        const willOpen = forceOpen !== null ? forceOpen : (studioCard.style.display === 'none');
        studioCard.style.display = willOpen ? 'block' : 'none';
        if (willOpen) {
            setTimeout(() => studioCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        }
    }

    renderRateProfilesUI() {
        const activeProf = this.getActiveRateProfile();
        const defaultProf = this.getDefaultRateProfile();
        const studioVisible = document.getElementById('rateEditorCard')?.style.display !== 'none';
        const editingId = studioVisible ? (document.getElementById('editingRateProfileId')?.value || '') : '';

        const badgeEl = document.getElementById('activeRateProfileBadge');
        if (badgeEl && activeProf) {
            const activeIdx = this.rateProfiles.findIndex(p => p.id === activeProf.id);
            const numPrefix = activeIdx !== -1 ? `#${activeIdx + 1} ` : '';
            badgeEl.textContent = `${numPrefix}${activeProf.name}`;
        }

        // Top KPI Strip on Tab 4 (Rates)
        const kpiActive = document.getElementById('rateKpiActiveName');
        const kpiDefault = document.getElementById('rateKpiDefaultName');
        const kpiCount = document.getElementById('rateKpiTotalCount');
        if (kpiActive && activeProf) {
            const aIdx = this.rateProfiles.findIndex(p => p.id === activeProf.id);
            kpiActive.textContent = `${aIdx !== -1 ? `${aIdx + 1}. ` : ''}${activeProf.name} (₹${activeProf.rates.baseDrillingRate})`;
        }
        if (kpiDefault && defaultProf) {
            const dIdx = this.rateProfiles.findIndex(p => p.id === defaultProf.id);
            kpiDefault.textContent = `${dIdx !== -1 ? `${dIdx + 1}. ` : ''}${defaultProf.name}`;
        }
        if (kpiCount) {
            kpiCount.textContent = `${this.rateProfiles.length} ${this.rateProfiles.length === 1 ? 'Rate' : 'Rates'}`;
        }

        // 1. Render Quick 1-Tap Rate Profile Chips on New Bill Tab (Numbered 1, 2, 3...)
        const billPillsEl = document.getElementById('billRateProfilePills');
        if (billPillsEl) {
            billPillsEl.innerHTML = this.rateProfiles.map((p, idx) => {
                const isActive = p.id === this.activeRateProfileId;
                return `
                    <button type="button" class="rp-chip ${isActive ? 'active' : ''}" data-rpid="${p.id}">
                        <span>${idx + 1}. ${this.escapeHtml(p.name)}</span>
                        <small>₹${p.rates.baseDrillingRate}/ft</small>
                    </button>
                `;
            }).join('') + `
                <button type="button" class="rp-chip manage-rp-btn" id="jumpToRateProfilesBtn">
                    + Rates
                </button>
            `;

            billPillsEl.querySelectorAll('.rp-chip[data-rpid]').forEach(chip => {
                chip.addEventListener('click', () => {
                    this.applyRateProfileToBill(chip.dataset.rpid, true);
                });
            });

            document.getElementById('jumpToRateProfilesBtn')?.addEventListener('click', () => {
                this.switchTab('tab-rates');
            });
        }

        // 2. Render Clean Numbered (1, 2, 3...) Minimal Rate List on Tab 4 with well-spaced Default & Apply buttons
        const listEl = document.getElementById('savedRateProfilesList');
        if (!listEl) return;

        listEl.innerHTML = this.rateProfiles.map((p, idx) => {
            const num = idx + 1;
            const r = p.rates || this.defaultRates;
            const isActive = p.id === this.activeRateProfileId;
            const isEditing = studioVisible && p.id === editingId;
            const slabs = this.normalizeSlabArray(r.slabRates, r.baseDrillingRate || 90);

            return `
                <div class="rate-clean-row ${isActive ? 'is-active-rate' : ''} ${isEditing ? 'is-editing-card' : ''}" data-rateid="${p.id}">
                    <div class="rcr-left">
                        <div class="rcr-num-badge">${num}</div>
                        <div class="rcr-info">
                            <div class="rcr-title-line">
                                <span class="rcr-name">${this.escapeHtml(p.name)}</span>
                            </div>
                            <div class="rcr-sub">
                                Base: <strong>₹${r.baseDrillingRate}/ft</strong> • 7" Pipe: <strong>₹${r.pvc7Rate}/ft</strong> • ${slabs.length} Slabs
                            </div>
                        </div>
                    </div>
                    <div class="rcr-right">
                        <button type="button" class="rcr-action-btn rcr-default-btn ${p.isDefault ? 'is-def' : ''}" data-defbtn="${p.id}" title="${p.isDefault ? 'Default Rate' : 'Set as Default Rate'}">
                            ${p.isDefault ? '★ Default' : 'Set Default'}
                        </button>
                        <button type="button" class="rcr-action-btn rcr-apply-btn ${isActive ? 'is-applied' : ''}" data-applybtn="${p.id}" title="${isActive ? 'Applied in Bill' : 'Apply Rate to Bill'}">
                            ${isActive ? '✓ Applied' : 'Apply'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.rcr-default-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.dataset.defbtn;
                const prof = this.rateProfiles.find(x => x.id === targetId);
                if (prof && !prof.isDefault) {
                    this.setDefaultRateProfile(targetId);
                }
            });
        });

        listEl.querySelectorAll('.rcr-apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.dataset.applybtn;
                this.applyRateProfileToBill(targetId, true);
            });
        });

        listEl.querySelectorAll('.rate-clean-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openRateDetailModal(row.dataset.rateid);
            });
        });

        if (this.activeDetailRateId && document.getElementById('rateDetailModalOverlay')?.style.display !== 'none') {
            if (this.rateProfiles.some(p => p.id === this.activeDetailRateId)) {
                this.openRateDetailModal(this.activeDetailRateId);
            } else {
                this.closeRateDetailModal();
            }
        }
    }

    openRateDetailModal(profileId) {
        const idx = this.rateProfiles.findIndex(p => p.id === profileId);
        if (idx === -1) return;
        const p = this.rateProfiles[idx];
        const num = idx + 1;
        const r = p.rates || this.defaultRates;
        const slabs = this.normalizeSlabArray(r.slabRates, r.baseDrillingRate || 90);
        const isActive = p.id === this.activeRateProfileId;
        const baseRangeText = slabs[0]?.rangeStr || '001-300 ft';
        const maxEndDepth = slabs[slabs.length - 1]?.end || 2200;

        const overlay = document.getElementById('rateDetailModalOverlay');
        const bodyEl = document.getElementById('rdmBodyContent');
        const footEl = document.getElementById('rdmFooterActions');
        if (!overlay || !bodyEl || !footEl) return;

        this.activeDetailRateId = p.id;

        const numEl = document.getElementById('rdmNumBadge');
        const titleEl = document.getElementById('rdmTitle');
        const subEl = document.getElementById('rdmSub');
        if (numEl) numEl.textContent = String(num);
        if (titleEl) titleEl.textContent = `${num}. ${p.name}`;
        if (subEl) subEl.textContent = `Base ₹${r.baseDrillingRate}/ft (${baseRangeText}) • ${slabs.length} Slabs (1–${maxEndDepth} ft)`;

        bodyEl.innerHTML = `
            <!-- Clean Status & Quick Actions Bar inside Modal -->
            <div class="rdm-status-bar">
                <button type="button" class="rcr-action-btn rcr-default-btn ${p.isDefault ? 'is-def' : ''}" id="rdmMakeDefaultBtn">
                    ${p.isDefault ? '★ Default Rate' : 'Set Default'}
                </button>
                <button type="button" class="rcr-action-btn rcr-apply-btn ${isActive ? 'is-applied' : ''}" id="rdmInlineApplyBtn">
                    ${isActive ? '✓ Applied in Bill' : 'Apply to Bill'}
                </button>
            </div>

            <!-- Core Drilling & Casing Pipe Rates -->
            <div class="cdm-clean-card" style="margin-bottom: 10px;">
                <div class="cdm-cc-head">
                    <span>⚙️ Drilling, Casing Pipe &amp; Labour Rates</span>
                    <span class="cdm-sec-pill">Rate #${num}</span>
                </div>
                <div class="cbc-clean-rows">
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">⛏️ Base Drilling Rate (${baseRangeText})</span>
                        <span class="cbc-r-val text-brand" style="font-size:0.9rem;">₹${r.baseDrillingRate}/ft</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🟦 7" Casing Pipe Rate</span>
                        <span class="cbc-r-val">₹${r.pvc7Rate}/ft</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🟦 10" Casing Pipe Rate</span>
                        <span class="cbc-r-val">₹${r.pvc10Rate}/ft</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">🛠️ Bore Bata (Labour)</span>
                        <span class="cbc-r-val">₹${r.boreBataRate ?? 2000}</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">💧 Old Bore Flushing Rate</span>
                        <span class="cbc-r-val">₹${r.oldBoreRate}/ft</span>
                    </div>
                    <div class="cbc-row">
                        <span class="cbc-r-lbl">📏 Slab Grace Buffer &amp; GST</span>
                        <span class="cbc-r-val">${r.slabBufferFt ?? 5} ft Grace • ${r.gstPercentage ?? 18}% GST</span>
                    </div>
                </div>
            </div>

            <!-- Complete Depth Slab Schedule Table -->
            <div class="cdm-clean-card" style="margin-bottom: 0;">
                <div class="cdm-cc-head">
                    <span>📐 Depth Slab Schedule (${slabs.length} Slabs)</span>
                    <span class="cdm-sec-pill">1 – ${maxEndDepth} ft</span>
                </div>
                <div style="max-height: 260px; overflow-y: auto;">
                    <table class="cbc-slab-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Depth Slab (ft)</th>
                                <th>+ Step</th>
                                <th>Rate / ft</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${slabs.map((s, sIdx) => {
                                const stepDiff = sIdx === 0 ? 'Base' : `+₹${s.rate - slabs[sIdx - 1].rate}`;
                                return `
                                    <tr>
                                        <td>${sIdx + 1}</td>
                                        <td><strong>${this.escapeHtml(s.rangeStr)}</strong></td>
                                        <td>${stepDiff}</td>
                                        <td><strong class="text-brand">₹${s.rate}/ft</strong></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        footEl.innerHTML = `
            <div class="bdm-foot-left">
                ${this.rateProfiles.length > 1
                    ? `<button type="button" class="btn-danger-xs" id="rdmFootDeleteBtn" title="Delete Rate">🗑️ Delete</button>`
                    : ''
                }
                <button type="button" class="btn-secondary-sm" id="rdmFootEditBtn">✏️ Edit Rate</button>
            </div>
            <div class="bdm-foot-right">
                <button type="button" class="btn-brand-sm" id="rdmFootApplyBtn">
                    ${isActive ? '✓ Applied' : 'Apply to Bill'}
                </button>
            </div>
        `;

        document.getElementById('rdmMakeDefaultBtn')?.addEventListener('click', () => {
            if (!p.isDefault) {
                this.setDefaultRateProfile(p.id);
                this.openRateDetailModal(p.id);
            }
        });

        document.getElementById('rdmInlineApplyBtn')?.addEventListener('click', () => {
            this.applyRateProfileToBill(p.id, true);
            this.openRateDetailModal(p.id);
        });

        document.getElementById('rdmFootEditBtn')?.addEventListener('click', () => {
            this.closeRateDetailModal();
            this.toggleRateStudio(true);
            this.loadRateProfileIntoEditor(p);
            this.showToast(`✏️ Editing "${p.name}"`);
        });

        document.getElementById('rdmFootApplyBtn')?.addEventListener('click', () => {
            this.closeRateDetailModal();
            this.applyRateProfileToBill(p.id, true);
            this.switchTab('tab-bill');
        });

        document.getElementById('rdmFootDeleteBtn')?.addEventListener('click', () => {
            if (this.rateProfiles.length <= 1) return;
            const targetId = p.id;
            const origIdx = this.rateProfiles.findIndex(x => x.id === targetId);
            if (origIdx === -1) return;
            const deletedProf = JSON.parse(JSON.stringify(this.rateProfiles[origIdx]));
            const wasActive = (this.activeRateProfileId === targetId);

            this.closeRateDetailModal();
            this.confirmDeleteModal({
                title: 'Delete Rate Card?',
                itemLabel: `#${origIdx + 1} ${deletedProf.name} (Base ₹${deletedProf.rates?.baseDrillingRate || 90}/ft)`,
                message: 'Are you sure you want to delete this saved Rate?',
                onConfirm: () => {
                    this.rateProfiles = this.rateProfiles.filter(x => x.id !== targetId);
                    if (deletedProf.isDefault && this.rateProfiles.length > 0) {
                        this.rateProfiles[0].isDefault = true;
                    }
                    if (wasActive) {
                        const fallback = this.getDefaultRateProfile();
                        if (fallback) this.applyRateProfileToBill(fallback.id, false);
                    }
                    this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
                    this.renderRateProfilesUI();
                    this.applyBrandToUI();

                    this.showUndoToast(`🗑️ Deleted Rate "${deletedProf.name}"`, () => {
                        if (!this.rateProfiles.some(x => x.id === deletedProf.id)) {
                            if (deletedProf.isDefault) {
                                this.rateProfiles.forEach(pr => { pr.isDefault = false; });
                            }
                            const insertAt = Math.min(origIdx, this.rateProfiles.length);
                            this.rateProfiles.splice(insertAt, 0, deletedProf);
                            this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
                            if (wasActive) {
                                this.applyRateProfileToBill(deletedProf.id, false);
                            } else {
                                this.renderRateProfilesUI();
                            }
                            this.applyBrandToUI();
                        }
                    });
                }
            });
        });

        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeRateDetailModal() {
        const overlay = document.getElementById('rateDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailRateId = null;
    }

    switchStudioSubTab(viewMode = 'core') {
        document.querySelectorAll('#rateStudioSubTabs .studio-seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        const corePanel = document.getElementById('studioCorePanel');
        const slabsPanel = document.getElementById('studioSlabsPanel');
        if (corePanel) {
            corePanel.style.display = (viewMode === 'core' || viewMode === 'all') ? 'block' : 'none';
        }
        if (slabsPanel) {
            slabsPanel.style.display = (viewMode === 'slabs' || viewMode === 'all') ? 'block' : 'none';
            if (viewMode === 'all') {
                slabsPanel.style.marginTop = '12px';
            } else {
                slabsPanel.style.marginTop = '0';
            }
        }
    }

    applyRateProfileToBill(profileId, showNotification = true) {
        const prof = this.rateProfiles.find(p => p.id === profileId) || this.getDefaultRateProfile();
        if (!prof) return;

        this.activeRateProfileId = prof.id;
        this.state.activeRateProfileId = prof.id;
        this.rates = JSON.parse(JSON.stringify(prof.rates));
        if (this.rates.boreBataRate === undefined || this.rates.boreBataRate === null) {
            this.rates.boreBataRate = 2000;
        }
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.saveToStorage('borebill_rates', this.rates);

        const baseInput = document.getElementById('baseDrillingRate');
        if (baseInput) baseInput.value = this.rates.baseDrillingRate;

        this.populateRateInputsUI(prof);
        this.renderMasterSlabsGrid();
        this.renderRateProfilesUI();
        this.calculateAndRender();

        if (showNotification) {
            this.showToast(`✅ Applied "${prof.name}" (Base ₹${this.rates.baseDrillingRate}/ft)`);
        }
    }

    setDefaultRateProfile(profileId) {
        const target = this.rateProfiles.find(p => p.id === profileId);
        if (!target) return;

        this.rateProfiles.forEach(p => {
            p.isDefault = (p.id === profileId);
        });
        this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
        this.applyRateProfileToBill(profileId, false);
        this.showToast(`★ "${target.name}" set as Default Rate!`);
    }

    loadRateProfileIntoEditor(prof) {
        if (!prof) return;
        this.rates = JSON.parse(JSON.stringify(prof.rates));
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.populateRateInputsUI(prof);
        this.renderMasterSlabsGrid();
        this.renderRateProfilesUI();
    }

    populateRateInputsUI(profile = null) {
        const prof = profile || this.getActiveRateProfile();
        const r = this.rates;
        const bataVal = r.boreBataRate !== undefined ? r.boreBataRate : 2000;

        // Instant New Bill Rate & Bata inputs
        const oldBoreInstant = document.getElementById('oldBoreRateInput');
        const pvc7Instant = document.getElementById('pvc7RateInput');
        const pvc10Instant = document.getElementById('pvc10RateInput');
        const bataInstant = document.getElementById('billBoreBataInput');
        const bufferInstant = document.getElementById('drillingSlabBufferInput');
        if (oldBoreInstant) oldBoreInstant.value = r.oldBoreRate || 40;
        if (pvc7Instant) pvc7Instant.value = r.pvc7Rate;
        if (pvc10Instant) pvc10Instant.value = r.pvc10Rate;
        if (bataInstant) bataInstant.value = bataVal;
        if (bufferInstant) bufferInstant.value = r.slabBufferFt ?? 5;

        // Quick Rate Drawer inputs
        document.getElementById('quickPvc7Rate').value = r.pvc7Rate;
        document.getElementById('quickPvc10Rate').value = r.pvc10Rate;
        document.getElementById('quickBoreBata').value = bataVal;
        document.getElementById('quickOldBoreRate').value = r.oldBoreRate;
        document.getElementById('quickSlabBuffer').value = r.slabBufferFt;
        document.getElementById('quickGstPercent').value = r.gstPercentage;

        if (prof) {
            const idEl = document.getElementById('editingRateProfileId');
            const nameEl = document.getElementById('masterProfileName');
            const defCheck = document.getElementById('masterIsDefaultCheckbox');
            const modeBadge = document.getElementById('studioEditingModeBadge');
            if (idEl) idEl.value = prof.id || '';
            if (nameEl) nameEl.value = prof.name || 'Standard Rate';
            if (defCheck) defCheck.checked = Boolean(prof.isDefault);
            if (modeBadge) {
                modeBadge.textContent = `✏️ Editing: ${prof.name}`;
                modeBadge.classList.remove('new-mode');
            }
        }

        document.getElementById('masterBaseRate').value = r.baseDrillingRate;
        document.getElementById('masterOldBoreRate').value = r.oldBoreRate;
        document.getElementById('masterPvc7Rate').value = r.pvc7Rate;
        document.getElementById('masterPvc10Rate').value = r.pvc10Rate;
        document.getElementById('masterBoreBata').value = bataVal;
        document.getElementById('masterSlabBuffer').value = r.slabBufferFt;
        document.getElementById('masterGstPercent').value = r.gstPercentage;
        const stepInp = document.getElementById('customSlabStepInput');
        if (stepInp) stepInp.value = 1;
    }

    saveOrUpdateRateProfile(asNew = false) {
        const editId = document.getElementById('editingRateProfileId')?.value;
        const rawName = (document.getElementById('masterProfileName')?.value || '').trim();
        const isDefChecked = Boolean(document.getElementById('masterIsDefaultCheckbox')?.checked);
        const rawBata = document.getElementById('masterBoreBata')?.value;

        this.rates.baseDrillingRate = Math.max(1, parseFloat(document.getElementById('masterBaseRate').value) || 90);
        this.rates.oldBoreRate = Math.max(0, parseFloat(document.getElementById('masterOldBoreRate').value) || 40);
        this.rates.pvc7Rate = Math.max(0, parseFloat(document.getElementById('masterPvc7Rate').value) || 400);
        this.rates.pvc10Rate = Math.max(0, parseFloat(document.getElementById('masterPvc10Rate').value) || 700);
        this.rates.boreBataRate = rawBata !== '' ? Math.max(0, parseFloat(rawBata) || 0) : 2000;
        this.rates.slabBufferFt = Math.max(0, parseInt(document.getElementById('masterSlabBuffer').value, 10) || 0);
        this.rates.gstPercentage = Math.max(0, parseFloat(document.getElementById('masterGstPercent').value) || 18);
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate);

        const profileName = rawName || `Rate Card (₹${this.rates.baseDrillingRate}/ft)`;
        let targetProfile = (!asNew && editId) ? this.rateProfiles.find(p => p.id === editId) : null;

        if (targetProfile) {
            targetProfile.name = profileName;
            targetProfile.rates = JSON.parse(JSON.stringify(this.rates));
            if (isDefChecked) {
                this.rateProfiles.forEach(p => { p.isDefault = (p.id === targetProfile.id); });
            }
        } else {
            const newId = 'rp_' + Date.now();
            if (isDefChecked) {
                this.rateProfiles.forEach(p => { p.isDefault = false; });
            }
            targetProfile = {
                id: newId,
                name: asNew && rawName === (this.getActiveRateProfile()?.name || '')
                    ? `${profileName} (₹${this.rates.baseDrillingRate})`
                    : profileName,
                isDefault: isDefChecked || this.rateProfiles.length === 0,
                rates: JSON.parse(JSON.stringify(this.rates))
            };
            this.rateProfiles.push(targetProfile);
        }

        if (!this.rateProfiles.some(p => p.isDefault)) {
            this.rateProfiles[0].isDefault = true;
        }

        this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
        this.toggleRateStudio(false);
        this.applyRateProfileToBill(targetProfile.id, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast(`💾 Saved "${targetProfile.name}" & applied!`);
    }

    getSuggestedNextSlabStep() {
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        if (slabs.length <= 1) return 10;
        return Math.max(0, slabs[slabs.length - 1].rate - slabs[slabs.length - 2].rate);
    }

    updateAddNextSlabButtonUI() {
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.rates.slabRates = slabs;
        const last = slabs[slabs.length - 1];
        const nextStart = (last?.end || 300) + 1;
        const nextEnd = nextStart + 100 - 1;
        const nextStep = this.getSuggestedNextSlabStep();
        const nextRate = Math.max(1, (last?.rate || 90) + nextStep);

        const rangeTxtEl = document.getElementById('addNextSlabBtnRangeText');
        const previewPillEl = document.getElementById('addNextSlabBtnPreviewPill');
        if (rangeTxtEl) {
            rangeTxtEl.textContent = `Add Next 100 ft (${nextStart}–${nextEnd} ft)`;
        }
        if (previewPillEl) {
            previewPillEl.textContent = `+₹${nextStep} → ₹${nextRate}/ft`;
        }

        const baseSpan = slabs[0]?.end || 300;
        document.querySelectorAll('#baseSlabSpanPills .sbtc-pill').forEach(pill => {
            pill.classList.toggle('active', parseInt(pill.dataset.baseSpan, 10) === baseSpan);
        });

        const masterBaseLbl = document.getElementById('masterBaseRateLabel');
        if (masterBaseLbl) {
            masterBaseLbl.textContent = `Base Rate (1–${baseSpan} ft)`;
        }
        const tabSlabsLbl = document.getElementById('studioSlabsTabLabel');
        if (tabSlabsLbl) {
            tabSlabsLbl.textContent = `Depth Slabs (${slabs.length})`;
        }
    }

    setBaseSlabSpan(newSpanFt, { skipReRender = false } = {}) {
        const cleanSpan = Math.max(50, Math.min(1000, parseInt(newSpanFt, 10) || 300));
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.rates.slabRates[0].span = cleanSpan;
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);

        if (skipReRender) {
            const grid = document.getElementById('masterSlabsGrid');
            if (grid) {
                this.rates.slabRates.forEach((s, idx) => {
                    if (idx > 0) {
                        const rangeEl = grid.querySelector(`.slab-edit-range[data-range-index="${idx}"]`);
                        if (rangeEl) rangeEl.textContent = s.rangeStr;
                    }
                });
            }
            this.updateAddNextSlabButtonUI();
        } else {
            this.renderMasterSlabsGrid();
        }
        this.calculateAndRender();
    }

    focusAndScrollSlabInput(inputEl, anchorEl = null) {
        if (!inputEl) return;
        // Focus & select MUST run synchronously inside the click gesture so mobile virtual keyboard opens reliably!
        inputEl.focus({ preventScroll: true });
        try {
            inputEl.select();
        } catch (_) {}

        const scrollRowAboveKeyboard = () => {
            const targetNode = anchorEl || inputEl.closest('.slab-edit-card') || inputEl;
            const rect = targetNode.getBoundingClientRect();
            const vHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            // Position the active slab row in the upper-middle of the visible viewport so both the row and "+ Add Next 100 ft" button stay visible above keyboard
            const desiredTop = Math.max(95, Math.min(210, vHeight * 0.36));
            const deltaY = rect.top - desiredTop;
            if (Math.abs(deltaY) > 16) {
                window.scrollBy({ top: deltaY, behavior: 'smooth' });
            }
        };

        scrollRowAboveKeyboard();
        setTimeout(scrollRowAboveKeyboard, 220);
    }

    addNextSlabRow() {
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        const last = slabs[slabs.length - 1];
        const nextStart = (last?.end || 300) + 1;
        const nextSpan = 100;
        const nextEnd = nextStart + nextSpan - 1;
        const step = this.getSuggestedNextSlabStep();
        const nextRate = Math.max(1, (last?.rate || 90) + step);

        slabs.push({
            start: nextStart,
            end: nextEnd,
            span: nextSpan,
            rangeStr: `${String(nextStart).padStart(3, '0')}-${nextEnd} ft`,
            rate: nextRate
        });
        this.rates.slabRates = slabs;
        this.renderMasterSlabsGrid();
        this.calculateAndRender();

        // Synchronously focus & select the newly added row's +Step input so mobile keyboard opens immediately & page scrolls up!
        const newIdx = slabs.length - 1;
        const stepInp = document.querySelector(`.slab-step-input[data-step-index="${newIdx}"]`);
        if (stepInp) {
            this.focusAndScrollSlabInput(stepInp);
        }
    }

    autoFillSlabsUpTo(targetMaxDepth = 2200) {
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        while (slabs[slabs.length - 1].end < targetMaxDepth) {
            const last = slabs[slabs.length - 1];
            const nextStart = last.end + 1;
            const nextSpan = (nextStart >= 2001 && targetMaxDepth >= 2200) ? 200 : 100;
            const nextEnd = nextStart + nextSpan - 1;

            // If user only has 1 base slab (of 300 ft) and clicks Fill to 2200 ft, use standard progressive increments; otherwise carry last step
            let step = this.getSuggestedNextSlabStep();
            const stdMatch = DEPTH_SLABS_DEFINITION.find(d => d.start === nextStart && d.end === nextEnd);
            if (slabs.length === 1 && slabs[0].span === 300) {
                step = 10;
            } else if (stdMatch && slabs[0].span === 300 && slabs.length <= 2 && step === 10) {
                const prevStd = DEPTH_SLABS_DEFINITION.find(d => d.end === last.end);
                if (prevStd) step = stdMatch.defaultRate - prevStd.defaultRate;
            }

            slabs.push({
                start: nextStart,
                end: nextEnd,
                span: nextSpan,
                rangeStr: `${String(nextStart).padStart(3, '0')}-${nextEnd} ft`,
                rate: Math.max(1, last.rate + step)
            });
        }
        this.rates.slabRates = slabs;
        this.renderMasterSlabsGrid();
        this.calculateAndRender();
        this.showToast(`⚡ Auto-filled slabs up to ${slabs[slabs.length - 1].end} ft!`);
    }

    startSlabsFromRow1(customBaseSpan = null) {
        const currentSlabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        const baseSpan = customBaseSpan || currentSlabs[0]?.span || 200;
        const baseRate = this.rates.baseDrillingRate || currentSlabs[0]?.rate || 90;
        this.rates.slabRates = [{
            start: 1,
            end: baseSpan,
            span: baseSpan,
            rangeStr: `001-${baseSpan} ft`,
            rate: baseRate
        }];
        this.renderMasterSlabsGrid();
        this.calculateAndRender();
        this.showToast(`🌱 Started at Row 1 (001–${baseSpan} ft). Tap "＋ Add Next 100 ft" to build!`);
    }

    renderMasterSlabsGrid() {
        const grid = document.getElementById('masterSlabsGrid');
        if (!grid) return;

        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.rates.slabRates = slabs;

        grid.innerHTML = slabs.map((s, idx) => {
            const currentRate = s.rate;
            const prevRate = idx > 0 ? slabs[idx - 1].rate : currentRate;
            const stepDiff = idx === 0 ? 0 : (currentRate - prevRate);

            if (idx === 0) {
                return `
                    <div class="slab-edit-card is-base-slab-row">
                        <div class="slab-meta-left">
                            <span class="slab-row-idx-badge">1</span>
                            <span class="slab-base-range-edit" title="Edit Base Slab End Depth (e.g. 100, 200, 300 ft)">
                                001–<input type="number" class="slab-base-end-input" id="baseSlabEndDepthInput" value="${s.end}" min="50" max="1000" step="50" inputmode="numeric"> ft
                            </span>
                        </div>
                        <div class="slab-step-col">
                            <span class="slab-base-tag-pill">Base Rate</span>
                        </div>
                        <div class="slab-edit-input-wrap">
                            <span>₹</span>
                            <input type="number" class="slab-edit-input" data-index="0" value="${currentRate}" min="1" step="1" inputmode="numeric">
                            <small>/ft</small>
                        </div>
                        <div class="slab-del-col">
                            <span class="slab-base-lock" title="Base Slab Row">★</span>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="slab-edit-card">
                    <div class="slab-meta-left">
                        <span class="slab-row-idx-badge">${idx + 1}</span>
                        <span class="slab-edit-range" data-range-index="${idx}">${s.rangeStr}</span>
                    </div>
                    <div class="slab-step-col">
                        <div class="slab-step-input-wrap" title="Step increase from previous slab">
                            <span class="slab-step-prefix">+₹</span>
                            <input type="number" class="slab-step-input" data-step-index="${idx}" value="${stepDiff}" step="1" inputmode="numeric">
                        </div>
                    </div>
                    <div class="slab-edit-input-wrap">
                        <span>₹</span>
                        <input type="number" class="slab-edit-input" data-index="${idx}" value="${currentRate}" min="1" step="1" inputmode="numeric">
                        <small>/ft</small>
                    </div>
                    <div class="slab-del-col">
                        <button type="button" class="slab-row-del-btn" data-del-slab-idx="${idx}" title="Remove this slab row">✕</button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateAddNextSlabButtonUI();

        // 1. Base Slab End Depth Input (001 - [ 200 ] ft)
        const baseEndInp = document.getElementById('baseSlabEndDepthInput');
        if (baseEndInp) {
            baseEndInp.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (val && val >= 50 && val <= 1000) {
                    this.setBaseSlabSpan(val, { skipReRender: true });
                }
            });
            baseEndInp.addEventListener('blur', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!val || val < 50) {
                    e.target.value = this.rates.slabRates[0]?.end || 300;
                }
                this.setBaseSlabSpan(parseInt(e.target.value, 10) || 300, { skipReRender: false });
            });
        }

        // 2. Per-Row "+ Step (₹)" Input — Live Ripple Calculation without losing focus
        grid.querySelectorAll('.slab-step-input').forEach(stepInp => {
            stepInp.addEventListener('input', (e) => {
                const raw = (e.target.value || '').trim();
                if (raw === '' || raw === '-') return;
                const idx = parseInt(e.target.dataset.stepIndex, 10);
                if (!idx || idx < 1) return;

                // Collect current steps for all rows >= idx
                const stepsMap = {};
                for (let j = idx; j < this.rates.slabRates.length; j++) {
                    const domStepInp = grid.querySelector(`.slab-step-input[data-step-index="${j}"]`);
                    stepsMap[j] = domStepInp ? (parseFloat(domStepInp.value) || 0) : (this.rates.slabRates[j].rate - this.rates.slabRates[j - 1].rate);
                }

                // Ripple recalculate rates from idx downwards
                for (let j = idx; j < this.rates.slabRates.length; j++) {
                    const prevR = this.rates.slabRates[j - 1].rate;
                    const nextR = Math.max(1, prevR + stepsMap[j]);
                    this.rates.slabRates[j].rate = nextR;
                    const rateInp = grid.querySelector(`.slab-edit-input[data-index="${j}"]`);
                    if (rateInp && document.activeElement !== rateInp) {
                        rateInp.value = nextR;
                    }
                }

                this.updateAddNextSlabButtonUI();
                this.calculateAndRender();
            });

            stepInp.addEventListener('blur', (e) => {
                const idx = parseInt(e.target.dataset.stepIndex, 10);
                if ((e.target.value || '').trim() === '' && idx > 0 && this.rates.slabRates[idx]) {
                    e.target.value = this.rates.slabRates[idx].rate - this.rates.slabRates[idx - 1].rate;
                }
            });
        });

        // 3. Per-Row "Rate (₹/ft)" Input — Updates its own +Step and ripples subsequent rows
        grid.querySelectorAll('.slab-edit-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const raw = (e.target.value || '').trim();
                if (raw === '') return;
                const idx = parseInt(e.target.dataset.index, 10);
                const val = Math.max(1, parseFloat(raw) || 0);

                // Preserve steps of rows after idx so changing a row's rate ripples cleanly
                const stepsAfter = {};
                for (let j = idx + 1; j < this.rates.slabRates.length; j++) {
                    stepsAfter[j] = this.rates.slabRates[j].rate - this.rates.slabRates[j - 1].rate;
                }

                this.rates.slabRates[idx].rate = val;
                if (idx === 0) {
                    this.rates.baseDrillingRate = val;
                    const mBase = document.getElementById('masterBaseRate');
                    if (mBase && document.activeElement !== mBase) mBase.value = val;
                    const bBase = document.getElementById('baseDrillingRate');
                    if (bBase && document.activeElement !== bBase) bBase.value = val;
                } else {
                    const newDiff = val - this.rates.slabRates[idx - 1].rate;
                    const stepInp = grid.querySelector(`.slab-step-input[data-step-index="${idx}"]`);
                    if (stepInp && document.activeElement !== stepInp) {
                        stepInp.value = newDiff;
                    }
                }

                // Ripple subsequent rows using their preserved steps
                for (let j = idx + 1; j < this.rates.slabRates.length; j++) {
                    const nextR = Math.max(1, this.rates.slabRates[j - 1].rate + stepsAfter[j]);
                    this.rates.slabRates[j].rate = nextR;
                    const rInp = grid.querySelector(`.slab-edit-input[data-index="${j}"]`);
                    if (rInp && document.activeElement !== rInp) {
                        rInp.value = nextR;
                    }
                }

                this.updateAddNextSlabButtonUI();
                this.calculateAndRender();
            });
        });

        // 4. Delete Slab Row Button (✕) with Undo support
        grid.querySelectorAll('.slab-row-del-btn').forEach(delBtn => {
            delBtn.addEventListener('click', () => {
                const delIdx = parseInt(delBtn.dataset.delSlabIdx, 10);
                if (delIdx > 0 && delIdx < this.rates.slabRates.length) {
                    const backupSlabs = JSON.parse(JSON.stringify(this.rates.slabRates));
                    const removedSlab = this.rates.slabRates[delIdx];
                    this.rates.slabRates.splice(delIdx, 1);
                    this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
                    this.renderMasterSlabsGrid();
                    this.calculateAndRender();
                    this.showUndoToast(`🗑️ Removed Slab ${removedSlab.label || ''}`, () => {
                        this.rates.slabRates = backupSlabs;
                        this.renderMasterSlabsGrid();
                        this.calculateAndRender();
                    });
                }
            });
        });
    }

    bulkShiftMasterSlabs(delta) {
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.rates.slabRates.forEach((s, idx) => {
            const next = Math.max(1, s.rate + delta);
            s.rate = next;
            if (idx === 0) {
                this.rates.baseDrillingRate = next;
                const mBase = document.getElementById('masterBaseRate');
                if (mBase) mBase.value = next;
                const bBase = document.getElementById('baseDrillingRate');
                if (bBase) bBase.value = next;
            }
        });
        this.renderMasterSlabsGrid();
        this.calculateAndRender();
    }

    /* ==========================================================================
       SHARE WHATSAPP, DOWNLOAD PNG IMAGE, DOWNLOAD A4 PDF & SAVE HISTORY
       ========================================================================== */

    formatWhatsAppBubbleHtml(rawText) {
        const safe = String(rawText || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return safe
            .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
            .replace(/_([^_\n]+)_/g, '<em>$1</em>');
    }

    buildCleanBillWhatsAppMessage({ billNo, billDate, custName, custPhone, custLocation, custGst, res, paymentStatus = null }) {
        if (!res) return '';
        const b = this.brand || this.defaultBrand;
        const compName = (b.companyName || 'MY BOREWELL COMPANY').trim();
        const tagline = (b.tagline || '').trim();
        const address = (b.address || '').trim();
        const compGst = (b.gstNumber || '').trim();
        const isInvoice = (res.docType || 'INVOICE') === 'INVOICE';
        const docLabel = isInvoice ? '🧾 FINAL BILL' : '📋 QUOTATION';
        const cleanCust = (custName && custName !== 'Walk-in Customer') ? custName.trim() : '';
        const cleanPhone = this.formatPhoneWithCountryCode(custPhone || '');
        const cleanLoc = (custLocation || '').trim();
        const cleanClientGst = res.gstEnabled ? ((custGst || res.custGst || '').trim().toUpperCase()) : '';
        const compPhones = this.formatCompanyPhonesWithCountryCode((b.phones || '').trim(), b.phoneCountryCode || this.defaultCountryCode);

        const lines = [];
        lines.push(`*🚜 ${compName}*`);
        if (tagline) lines.push(`_${tagline}_`);
        if (address) lines.push(`📍 ${address}`);
        if (compGst) lines.push(`🏛️ *GSTIN:* ${compGst}`);
        lines.push(`──────────────────────`);
        lines.push(`*${docLabel} : #${billNo || 'AB-101'}*`);
        if (billDate) lines.push(`📅 *Date:* ${billDate}`);
        if (cleanCust) lines.push(`👤 *Customer:* ${cleanCust}`);
        if (cleanPhone) lines.push(`📞 *Mobile:* ${cleanPhone}`);
        if (cleanLoc) lines.push(`📍 *Site:* ${cleanLoc}`);
        if (cleanClientGst) lines.push(`🧾 *Client GSTIN:* ${cleanClientGst}`);
        lines.push(`🕳️ *Work:* ${res.drillingType === 'repair' ? 'Re-Bore / Flushing' : 'New Borewell'} (${res.boreDia || '6.5"'})`);
        lines.push(`📏 *Total Depth:* *${res.totalDepth || 0} ft*`);
        lines.push(`──────────────────────`);

        if (Array.isArray(res.slabDetails) && res.slabDetails.length > 0) {
            lines.push(`*📊 1. DRILLING CHARGES (SLAB-WISE):*`);
            res.slabDetails.forEach(s => {
                lines.push(`• ${s.range} : ${s.depth} ft × ₹${s.rate} = *${this.formatINR(s.cost)}*`);
            });
            lines.push(`▸ *Drilling Total : ${this.formatINR(res.drillingCost)}*`);
            lines.push(`──────────────────────`);
        }

        const otherLines = [];
        const c1Name = this.getCasing1Name();
        const c2Name = this.getCasing2Name();
        if (res.pvc7Length > 0) {
            otherLines.push(`• ${c1Name} (${res.pvc7Length} ft × ₹${res.pvc7Rate}/ft) : *${this.formatINR(res.pvc7Cost)}*`);
        }
        if (res.pvc10Length > 0) {
            otherLines.push(`• ${c2Name} (${res.pvc10Length} ft × ₹${res.pvc10Rate}/ft) : *${this.formatINR(res.pvc10Cost)}*`);
        }
        if (res.boreBataCost > 0) {
            otherLines.push(`• Bore Bata : *${this.formatINR(res.boreBataCost)}*`);
        }
        if (res.collarCapCost > 0) {
            otherLines.push(`• Collar / Cap / Welding : *${this.formatINR(res.collarCapCost)}*`);
        }
        if (res.transportSurveyCost > 0) {
            otherLines.push(`• Transport / Survey : *${this.formatINR(res.transportSurveyCost)}*`);
        }
        if (res.customExtraAmount > 0) {
            otherLines.push(`• ${res.customExtraLabel || 'Extra Charges'} : *${this.formatINR(res.customExtraAmount)}*`);
        }
        if (res.discountAmount > 0) {
            otherLines.push(`• Discount : *− ${this.formatINR(res.discountAmount)}*`);
        }
        if (res.gstEnabled) {
            otherLines.push(`• GST (${res.gstPercentage}%) : *${this.formatINR(res.gstAmount)}*`);
        }

        if (otherLines.length > 0) {
            lines.push(`*🛠️ 2. PIPE & OTHER CHARGES:*`);
            otherLines.forEach(l => lines.push(l));
            lines.push(`──────────────────────`);
        }

        lines.push(`*💰 GRAND TOTAL : ${this.formatINR(res.grandTotal)}*`);

        if (isInvoice) {
            if (paymentStatus === 'paid') {
                lines.push(`✅ *Payment Status : PAID*`);
            } else if ((res.advancePaidAmount || 0) > 0) {
                lines.push(`✅ Advance Paid : − ${this.formatINR(res.advancePaidAmount)}`);
                lines.push(`*🔴 BALANCE DUE : ${this.formatINR(res.balancePayable)}*`);
            } else if (paymentStatus === 'unpaid') {
                lines.push(`*🔴 BALANCE DUE : ${this.formatINR(res.grandTotal)}*`);
            }
        }

        let customRemark = (res.customNote || '').trim();
        if (isInvoice && /பாறை கடினம்|rock strata/i.test(customRemark)) {
            customRemark = '';
        }
        if (customRemark) {
            lines.push(`📝 *Note:* ${customRemark}`);
        }

        const docFooterNote = this.getDocFooterTermsNote(isInvoice ? 'INVOICE' : 'QUOTATION');
        lines.push(`──────────────────────`);
        if (docFooterNote) {
            lines.push(docFooterNote);
        }
        if (b.website && b.website.trim()) lines.push(`🌐 *Website:* ${b.website.trim()}`);
        if (b.upiId && b.upiId.trim()) lines.push(`💳 *UPI / GPay:* ${b.upiId.trim()}`);
        if (compPhones) lines.push(`📞 *Contact:* ${compPhones}`);

        return lines.join('\n');
    }

    generateWhatsAppMessage() {
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const res = this.lastResult;
        const billNo = document.getElementById('billNoInput')?.value || 'AB-101';
        const dateStr = document.getElementById('receiptDateText')?.textContent || '';
        const loadedItem = this.loadedHistoryBillId
            ? (this.history || []).find(h => h.id === this.loadedHistoryBillId)
            : null;

        return this.buildCleanBillWhatsAppMessage({
            billNo,
            billDate: dateStr,
            custName: this.state.custName,
            custPhone: this.state.custPhone,
            custLocation: this.state.custLocation,
            custGst: this.state.custGst,
            res,
            paymentStatus: loadedItem?.paymentStatus || null
        });
    }

    openWhatsAppPreviewModal({
        recipientName = 'Customer',
        phone = '',
        message = '',
        title = 'WhatsApp Message Preview',
        subtitle = 'Review bill details & mobile number before sending'
    }) {
        const overlay = document.getElementById('whatsappPreviewModalOverlay');
        const titleEl = document.getElementById('waPreviewModalTitle');
        const subEl = document.getElementById('waPreviewModalSub');
        const recNameEl = document.getElementById('waPreviewRecipientName');
        const countrySelect = document.getElementById('waPreviewCountryCode');
        const phoneInput = document.getElementById('waPreviewPhoneInput');
        const bubbleEl = document.getElementById('waPreviewFormattedBubble');
        const rawArea = document.getElementById('waPreviewMessageInput');
        const chatWrap = document.getElementById('waChatPreviewContainer');
        const editBtn = document.getElementById('toggleWaRawEditBtn');

        if (!overlay) return;

        const parsedPhone = this.parsePhoneWithCountryCode(phone || '', this.defaultCountryCode);
        if (countrySelect) {
            countrySelect.value = parsedPhone.countryCode;
        }
        this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', parsedPhone.countryCode);

        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (recNameEl) recNameEl.textContent = (recipientName || 'Customer').trim() || 'Customer';
        if (phoneInput) phoneInput.value = parsedPhone.localDigits;
        if (rawArea) {
            rawArea.value = message || '';
            rawArea.style.display = 'none';
        }
        if (chatWrap) chatWrap.style.display = 'block';
        if (editBtn) {
            editBtn.classList.remove('active');
            editBtn.textContent = '✏️ Edit Text';
        }
        if (bubbleEl) {
            bubbleEl.innerHTML = this.formatWhatsAppBubbleHtml(message || '');
        }

        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeWhatsAppPreviewModal() {
        const overlay = document.getElementById('whatsappPreviewModalOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    confirmAndSendWhatsAppFromModal() {
        const rawArea = document.getElementById('waPreviewMessageInput');
        const countrySelect = document.getElementById('waPreviewCountryCode');
        const phoneInput = document.getElementById('waPreviewPhoneInput');
        const msg = (rawArea?.value || '').trim();
        if (!msg) {
            this.showToast('⚠️ Message is empty');
            return;
        }
        const selectedCode = countrySelect?.value || this.defaultCountryCode || '+91';
        const parsed = this.parsePhoneWithCountryCode(phoneInput?.value || '', selectedCode);
        this.setDefaultCountryCode(parsed.countryCode);

        let waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        if (parsed.localDigits.length >= parsed.meta.minLen) {
            const fullDial = `${parsed.meta.dial}${parsed.localDigits}`;
            waUrl = `https://wa.me/${fullDial}?text=${encodeURIComponent(msg)}`;
        }
        this.closeWhatsAppPreviewModal();
        window.open(waUrl, '_blank');
    }

    shareOnWhatsApp() {
        const msg = this.generateWhatsAppMessage();
        const billNo = document.getElementById('billNoInput')?.value || 'AB-101';
        const isInvoice = (this.lastResult?.docType || 'INVOICE') === 'INVOICE';
        const cName = (this.state.custName || '').trim() || 'Customer';
        this.openWhatsAppPreviewModal({
            recipientName: cName,
            phone: this.state.custPhone || '',
            message: msg,
            title: `WhatsApp ${isInvoice ? 'Bill' : 'Quotation'} Preview (#${billNo})`,
            subtitle: 'Check bill breakup & mobile number before sending'
        });
    }

    shareSavedHistoryBillOnWhatsApp(billId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item || !item.snapshot) return;
        this.syncBrandFromInputs(true);
        const snap = item.snapshot;
        const isInvoice = (snap.docType || 'QUOTATION') === 'INVOICE';
        const cName = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Customer';
        const msg = this.buildCleanBillWhatsAppMessage({
            billNo: item.billNo,
            billDate: item.billDate || this.getHistoryItemDateStr(item),
            custName: cName,
            custPhone: item.custPhone || '',
            custLocation: item.custLocation || '',
            custGst: item.custGst || snap.custGst || '',
            res: snap,
            paymentStatus: item.paymentStatus || null
        });
        this.openWhatsAppPreviewModal({
            recipientName: cName,
            phone: item.custPhone || '',
            message: msg,
            title: `WhatsApp ${isInvoice ? 'Bill' : 'Quotation'} Preview (#${item.billNo})`,
            subtitle: 'Check bill breakup & mobile number before sending'
        });
    }

    shareCustomerSummaryOnWhatsApp(cust) {
        if (!cust) return;
        this.syncBrandFromInputs(true);
        const b = this.brand || this.defaultBrand;
        const compName = (b.companyName || 'MY BOREWELL COMPANY').trim();
        const custNormPhone = this.normalizeMobileNumber(cust.phone || '');
        const matchingBills = (this.history || []).filter(item => {
            const itemNormPhone = this.normalizeMobileNumber(item.custPhone || '');
            if (custNormPhone && itemNormPhone && custNormPhone === itemNormPhone) return true;
            if (cust.name && item.custName && cust.name.toLowerCase() === item.custName.toLowerCase()) return true;
            return false;
        });

        // If customer has exactly 1 bill, show that full neat bill preview directly!
        if (matchingBills.length === 1) {
            this.shareSavedHistoryBillOnWhatsApp(matchingBills[0].id);
            return;
        }

        const agg = this.getCustomerAggregates(cust);
        const unpaidBills = matchingBills.filter(item => this.isBillItemUnpaid(item));
        const dispCustPhone = this.formatPhoneWithCountryCode(cust.phone || '', cust.countryCode || this.defaultCountryCode);
        const compPhones = this.formatCompanyPhonesWithCountryCode((b.phones || '').trim(), b.phoneCountryCode || this.defaultCountryCode);

        const lines = [];
        lines.push(`*🚜 ${compName}*`);
        if (b.tagline) lines.push(`_${b.tagline.trim()}_`);
        lines.push(`──────────────────────`);
        lines.push(`👤 *Customer:* ${cust.name}`);
        if (cust.village) lines.push(`🏠 *Place:* ${cust.village}`);
        if (dispCustPhone) lines.push(`📞 *Mobile:* ${dispCustPhone}`);
        lines.push(`──────────────────────`);

        if (matchingBills.length > 0) {
            lines.push(`*⛏️ BOREWELL & PIPE SUMMARY:*`);
            lines.push(`• Total Bores : *${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'}*`);
            lines.push(`• Total Drilled : *${agg.totalDrilledFt.toLocaleString('en-IN')} ft*`);
            lines.push(`• Total Casing Pipe : *${agg.totalPipeFt.toLocaleString('en-IN')} ft* (7": ${agg.totalPvc7Ft}ft, 10": ${agg.totalPvc10Ft}ft)`);
            lines.push(`──────────────────────`);
        }

        if (unpaidBills.length > 0) {
            lines.push(`*🔴 PENDING BILL DETAILS:*`);
            unpaidBills.forEach(ub => {
                const pendingAmt = this.getBillPendingAmount(ub);
                const dStr = this.getHistoryItemDateStr(ub);
                lines.push(`• *#${ub.billNo}* (${ub.custLocation || 'Site'} • ${dStr}) : *Due ${this.formatINR(pendingAmt)}*`);
            });
            lines.push(`──────────────────────`);
            lines.push(`📊 Total Billed : ${this.formatINR(agg.totalBilled)}`);
            lines.push(`✅ Paid So Far : ${this.formatINR(agg.totalPaid)}`);
            lines.push(`*🔴 PENDING BALANCE DUE : ${this.formatINR(agg.totalPending)}*`);
        } else if (matchingBills.length > 0) {
            lines.push(`*📋 BORE BILLS SUMMARY:*`);
            matchingBills.slice(0, 6).forEach(mb => {
                const dStr = this.getHistoryItemDateStr(mb);
                const snap = mb.snapshot || {};
                lines.push(`• *#${mb.billNo}* (${mb.custLocation || 'Site'} • ${snap.totalDepth || 0}ft • ${dStr}) : *${this.formatINR(snap.grandTotal || 0)}*`);
            });
            lines.push(`──────────────────────`);
            lines.push(`*💰 Total Billed : ${this.formatINR(agg.totalBilled)}*`);
            lines.push(`*✅ Paid Amount : ${this.formatINR(agg.totalPaid)} (Settled)*`);
        } else {
            lines.push(`🙏 Hello *${cust.name}*,`);
            lines.push(`Thank you for contacting us for your borewell service!`);
        }

        lines.push(`──────────────────────`);
        if (b.upiId && b.upiId.trim()) lines.push(`💳 *UPI / GPay:* ${b.upiId.trim()}`);
        if (compPhones) lines.push(`📞 *Contact:* ${compPhones}`);

        this.openWhatsAppPreviewModal({
            recipientName: cust.name,
            phone: dispCustPhone || '',
            message: lines.join('\n'),
            title: `WhatsApp Preview — ${cust.name}`,
            subtitle: agg.totalPending > 0 ? `Pending Due: ${this.formatINR(agg.totalPending)}` : 'Review customer message before sending'
        });
    }

    async exportBillAsImage() {
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const card = document.getElementById('printableBillCard');
        if (!card || typeof html2canvas === 'undefined') {
            this.showToast('⏳ Loading image generator, please try again.');
            return;
        }
        this.showToast('📸 Generating HD Bill Image...');
        let cloneHost = null;
        try {
            cloneHost = document.createElement('div');
            cloneHost.className = 'pdf-a4-export-sheet';
            cloneHost.style.position = 'fixed';
            cloneHost.style.left = '-9999px';
            cloneHost.style.top = '0';
            cloneHost.style.zIndex = '-1';
            const clonedCard = card.cloneNode(true);
            cloneHost.appendChild(clonedCard);
            document.body.appendChild(cloneHost);

            const canvas = await html2canvas(cloneHost, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 800
            });
            const link = document.createElement('a');
            const billNo = (document.getElementById('billNoInput')?.value || 'Bill').replace(/[^a-zA-Z0-9_-]/g, '_');
            const compSafe = (this.brand.companyName || 'BoreBill').trim().replace(/\s+/g, '_');
            link.download = `${compSafe}_${billNo}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showToast('✅ Bill Image Saved!');
        } catch (err) {
            this.showToast('❌ Could not save image.');
        } finally {
            if (cloneHost && cloneHost.parentNode) {
                cloneHost.parentNode.removeChild(cloneHost);
            }
        }
    }

    async exportBillAsPDF() {
        // 1. Force 100% live sync of all Company Settings & Receipt UI before generating PDF
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const card = document.getElementById('printableBillCard');
        if (!card || typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            this.showToast('⏳ Loading PDF engine, please try again.');
            return;
        }
        this.showToast('📄 Generating Official A4 PDF...');
        let cloneHost = null;
        try {
            // 2. Render an A4-proportioned (720px desktop width) clone so mobile screens never stretch or squish the PDF
            cloneHost = document.createElement('div');
            cloneHost.className = 'pdf-a4-export-sheet';
            cloneHost.style.position = 'fixed';
            cloneHost.style.left = '-9999px';
            cloneHost.style.top = '0';
            cloneHost.style.zIndex = '-1';
            const clonedCard = card.cloneNode(true);
            cloneHost.appendChild(clonedCard);
            document.body.appendChild(cloneHost);

            const canvas = await html2canvas(cloneHost, {
                scale: 2.6,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 800
            });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const billNo = (document.getElementById('billNoInput')?.value || 'Bill').trim();
            const compName = (this.brand.companyName || 'Borewell Company').trim();
            const custName = (this.state.custName || '').trim();
            pdf.setProperties({
                title: `${compName} - #${billNo}`,
                subject: `${this.lastResult?.docType === 'INVOICE' ? 'Final Bill' : 'Quotation'} #${billNo}${custName ? ' - ' + custName : ''}`,
                author: compName,
                creator: 'BoreBill Pro'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
            const margin = 8;
            const maxW = pageWidth - margin * 2;
            const maxH = pageHeight - margin * 2;

            let drawW = maxW;
            let drawH = (canvas.height * drawW) / canvas.width;

            // Preserve exact aspect ratio if tall receipt exceeds 1 page height (never squish vertically!)
            if (drawH > maxH) {
                const ratio = maxH / drawH;
                drawH = maxH;
                drawW = drawW * ratio;
            }
            const xOffset = (pageWidth - drawW) / 2;
            const yOffset = margin;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, drawW, drawH, undefined, 'FAST');

            const safeComp = compName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            const safeBillNo = billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeCust = custName ? `_${custName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
            pdf.save(`${safeComp || 'BoreBill'}_${safeBillNo}${safeCust}.pdf`);
            this.showToast('✅ Official A4 PDF Downloaded!');
        } catch (err) {
            this.showToast('❌ PDF generation failed.');
        } finally {
            if (cloneHost && cloneHost.parentNode) {
                cloneHost.parentNode.removeChild(cloneHost);
            }
        }
    }

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
                        this.saveToStorage('borebill_customers', this.customers);
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
                    this.saveToStorage('borebill_customers', this.customers);
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
                    this.saveToStorage('borebill_customers', this.customers);
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
                this.saveToStorage('borebill_history', this.history);
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
        this.saveToStorage('borebill_history', this.history);

        // Compute next auto sequence in brand storage while keeping current saved bill active on screen
        this.getNextAutoDocNumber(this.state.docType);
        this.saveToStorage('borebill_brand', this.brand);

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
                ? 'Search quotations by name, phone, site, quote #...'
                : 'Search bills by customer, phone, site, bill #...';
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

        if (filtered.length === 0) {
            const isQuoteTab = docFilter === 'QUOTATION';
            const hasActiveFilters = (docFilter === 'INVOICE' && payFilter !== 'all') || (this.historyDatePreset && this.historyDatePreset !== 'all') || Boolean(q);
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
                        <div class="party-avatar">${initials}</div>
                        <div class="party-info">
                            <div class="party-name">#${this.escapeHtml(item.billNo)} — ${this.escapeHtml(displayCust)}</div>
                            <div class="party-meta">
                                📍 ${this.escapeHtml(item.custLocation || 'Site N/A')} • ${snap.totalDepth || 0} ft (${snap.boreDia || '6.5"'}) • 📅 ${dateStr || 'N/A'}
                            </div>
                        </div>
                    </div>
                    <div class="khata-amounts">
                        <span class="khata-main-amt">${this.formatINR(snap.grandTotal)}</span>
                        ${isInvoice
                            ? (hasDue
                                ? `<span class="status-pill due static-badge">🔴 Due: ${this.formatINR(pendingAmt)}</span>`
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
                        <button type="button" class="btn-wa-xs hist-wa-btn" data-id="${item.id}" title="Preview & Send on WhatsApp">💬 WA</button>
                        <button type="button" class="btn-brand-sm hist-detail-btn" data-id="${item.id}">Details</button>
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
                        this.saveToStorage('borebill_history', this.history);
                        this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
                        this.renderCustomerDirectory();
                        this.applyBrandToUI();

                        this.showUndoToast(`🗑️ Deleted #${deletedBill.billNo}`, () => {
                            if (!this.history.some(h => h.id === deletedBill.id)) {
                                const insertAt = Math.min(origIdx, this.history.length);
                                this.history.splice(insertAt, 0, deletedBill);
                                this.saveToStorage('borebill_history', this.history);
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

    applyLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('borebill_lang', lang);
        const dict = I18N_DICTIONARY[lang] || I18N_DICTIONARY.en;

        document.querySelectorAll('.lang-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.lang === lang);
        });

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.textContent = dict[key];
            }
        });

        this.updateSavedBillViewModeUI();
        this.calculateAndRender();
    }

    switchTab(tabId, persist = true, scroll = true) {
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
        document.querySelectorAll('.b-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        const liveBar = document.getElementById('stickyLiveBar');
        if (liveBar) {
            const hideLiveBar = (tabId !== 'tab-bill') || (this.loadedHistoryBillId && this.isSavedBillReadOnly);
            liveBar.style.display = hideLiveBar ? 'none' : 'block';
        }
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
        if (persist) {
            this.state.activeTab = tabId;
            this.persistCurrentSession();
        }
        if (scroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (tabId === 'tab-brand') {
            const activeSeg = document.querySelector('.settings-nav-segmented .set-seg-btn.active');
            const viewId = activeSeg?.dataset.view || 'set-view-company';
            if (typeof this.switchSettingsView === 'function') {
                this.switchSettingsView(viewId);
            }
            this.syncCasingNamesUI();
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                try { window.lucide.createIcons(); } catch (_) {}
            }
        }
        this.updateQuickTabJumpLabel();
    }

    showToast(msg) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast-msg';
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.remove();
        }, 2500);
    }

    confirmDeleteModal({
        title = 'Confirm Delete?',
        itemLabel = '',
        message = 'Are you sure you want to delete this item?',
        requireTypeText = null,
        confirmBtnLabel = 'Yes, Delete',
        onConfirm = null
    }) {
        const overlay = document.getElementById('deleteConfirmModalOverlay');
        const titleEl = document.getElementById('delConfirmTitle');
        const itemBox = document.getElementById('delConfirmItemBox');
        const msgEl = document.getElementById('delConfirmMessage');
        const typeVerifyBox = document.getElementById('delConfirmTypeVerifyBox');
        const typeInput = document.getElementById('delConfirmTypeInput');
        const reqWordBadge = document.getElementById('delConfirmRequiredWordBadge');
        const confirmBtn = document.getElementById('confirmDelActionBtn');

        if (!overlay) {
            if (typeof onConfirm === 'function') onConfirm();
            return;
        }
        if (titleEl) titleEl.textContent = title;
        if (itemBox) {
            itemBox.textContent = itemLabel;
            itemBox.style.display = itemLabel ? 'block' : 'none';
        }
        if (msgEl) msgEl.textContent = message;

        this.pendingDeleteRequiredWords = null;
        if (requireTypeText && typeVerifyBox && typeInput) {
            const allowedWords = Array.isArray(requireTypeText)
                ? requireTypeText.map(w => String(w).trim().toUpperCase())
                : [String(requireTypeText).trim().toUpperCase(), 'I CONFIRM'];
            this.pendingDeleteRequiredWords = allowedWords;
            if (reqWordBadge) {
                reqWordBadge.textContent = allowedWords.join(' or ');
            }
            typeVerifyBox.style.display = 'block';
            typeInput.value = '';
            typeInput.classList.remove('is-verified');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${confirmBtnLabel}</span>`;
            }
            setTimeout(() => typeInput.focus(), 80);
        } else {
            if (typeVerifyBox) typeVerifyBox.style.display = 'none';
            if (typeInput) {
                typeInput.value = '';
                typeInput.classList.remove('is-verified');
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${confirmBtnLabel}</span>`;
            }
        }

        this.pendingDeleteConfirmFn = onConfirm;
        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeDeleteConfirmModal() {
        const overlay = document.getElementById('deleteConfirmModalOverlay');
        if (overlay) overlay.style.display = 'none';
        const typeVerifyBox = document.getElementById('delConfirmTypeVerifyBox');
        const typeInput = document.getElementById('delConfirmTypeInput');
        const confirmBtn = document.getElementById('confirmDelActionBtn');
        if (typeVerifyBox) typeVerifyBox.style.display = 'none';
        if (typeInput) {
            typeInput.value = '';
            typeInput.classList.remove('is-verified');
        }
        if (confirmBtn) confirmBtn.disabled = false;
        this.pendingDeleteRequiredWords = null;
        this.pendingDeleteConfirmFn = null;
    }

    updateGlobalUndoButtons(visible, label = 'Undo') {
        document.querySelectorAll('.global-undo-trigger-btn').forEach(btn => {
            btn.style.display = visible ? 'inline-flex' : 'none';
            btn.title = label;
        });
    }

    triggerGlobalUndo() {
        if (!this.lastUndoState || typeof this.lastUndoState.onUndo !== 'function') return;
        const { onUndo, timerId, toastEl } = this.lastUndoState;
        if (timerId) clearTimeout(timerId);
        if (toastEl) toastEl.remove();
        this.lastUndoState = null;
        this.updateGlobalUndoButtons(false);
        onUndo();
        this.showToast('↩️ Restored! (Undo successful)');
    }

    showUndoToast(msg, onUndo) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        container.querySelectorAll('.toast-undo-bar').forEach(old => old.remove());
        if (this.lastUndoState?.timerId) {
            clearTimeout(this.lastUndoState.timerId);
        }

        const el = document.createElement('div');
        el.className = 'toast-msg toast-undo-bar';

        const txt = document.createElement('span');
        txt.className = 'toast-undo-text';
        txt.textContent = msg;

        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'toast-undo-btn';
        undoBtn.innerHTML = '↩ Undo';

        const timerId = setTimeout(() => {
            el.remove();
        }, 10000);

        this.lastUndoState = {
            msg,
            onUndo,
            timerId,
            toastEl: el
        };
        this.updateGlobalUndoButtons(true, `Undo: ${msg}`);

        undoBtn.addEventListener('click', () => {
            this.triggerGlobalUndo();
        });

        el.appendChild(txt);
        el.appendChild(undoBtn);
        container.appendChild(el);
    }

    setupEventListeners() {
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

        document.getElementById('langSwitchBtn')?.addEventListener('click', () => {
            const nextLang = this.lang === 'en' ? 'ta' : 'en';
            this.applyLanguage(nextLang);
        });

        // 2-Pill Doc Type (Quotation vs Final Bill) -> Auto-syncs incremented Quote # or Bill #
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
                    existing.name = name;
                    existing.phone = phoneVal.fullPhone;
                    existing.countryCode = phoneVal.countryCode;
                    existing.village = village;
                    if (!Array.isArray(existing.sites)) existing.sites = [];
                    delete existing.rig;
                    existing.updatedAt = new Date().toISOString();
                    savedRecord = existing;
                }
                this.saveToStorage('borebill_customers', this.customers);
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
        document.querySelectorAll('#historyDocTabSwitcher .bq-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.historyDocFilter = btn.dataset.doctab === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
                this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            });
        });

        // Inline Filter Icon Button Inside Search Box (#historyFilterToggleBtn) & Filter Popover
        const toggleHistoryFilterPanel = (forceOpen = null) => {
            const panel = document.getElementById('historyFilterDropdownPanel');
            const toggleBtn = document.getElementById('historyFilterToggleBtn');
            if (!panel) return;
            const willOpen = forceOpen !== null ? forceOpen : (panel.style.display === 'none');
            panel.style.display = willOpen ? 'block' : 'none';
            toggleBtn?.classList.toggle('is-open', willOpen);
            if (willOpen) {
                this.refreshIcons();
            }
        };

        document.getElementById('historyFilterToggleBtn')?.addEventListener('click', () => {
            toggleHistoryFilterPanel();
        });

        document.getElementById('closeHistoryFilterPanelBtn')?.addEventListener('click', () => {
            toggleHistoryFilterPanel(false);
        });

        document.getElementById('resetHistoryFiltersBtn')?.addEventListener('click', () => {
            this.resetHistoryFilters(true);
            this.showToast('↺ Cleared payment & date filters');
        });

        document.getElementById('clearHistoryDateChipBtn')?.addEventListener('click', () => {
            this.historyDatePreset = 'all';
            this.historyDateFrom = '';
            this.historyDateTo = '';
            const fromEl = document.getElementById('historyDateFrom');
            const toEl = document.getElementById('historyDateTo');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        });

        // Payment Status Filter Pills (Quick Bar + Filter Popover)
        const applyHistoryPayFilter = (payVal) => {
            this.historyPayFilter = payVal || 'all';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        };

        document.querySelectorAll('#historyPaymentQuickPills .f-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                applyHistoryPayFilter(chip.dataset.payfilter);
            });
        });

        document.querySelectorAll('#historyPopupPayPills .bfp-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                applyHistoryPayFilter(pill.dataset.payfilter);
            });
        });

        // Date Filter Preset Pills & Custom From/To Date Inputs
        document.querySelectorAll('#historyDatePresetPills .bfp-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const preset = pill.dataset.datepreset || 'all';
                this.historyDatePreset = preset;
                if (preset !== 'custom') {
                    this.historyDateFrom = '';
                    this.historyDateTo = '';
                    const fromEl = document.getElementById('historyDateFrom');
                    const toEl = document.getElementById('historyDateTo');
                    if (fromEl) fromEl.value = '';
                    if (toEl) toEl.value = '';
                }
                this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            });
        });

        const handleCustomHistoryDateChange = () => {
            const fromVal = (document.getElementById('historyDateFrom')?.value || '').trim();
            const toVal = (document.getElementById('historyDateTo')?.value || '').trim();
            this.historyDateFrom = fromVal;
            this.historyDateTo = toVal;
            this.historyDatePreset = (fromVal || toVal) ? 'custom' : 'all';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        };

        document.getElementById('historyDateFrom')?.addEventListener('change', handleCustomHistoryDateChange);
        document.getElementById('historyDateTo')?.addEventListener('change', handleCustomHistoryDateChange);

        // Steppers (Never leave "0" in depth or pipe length inputs; clear to "" when <= 0)
        const emptyOnZeroIds = new Set(['totalDepth', 'oldBoreDepth', 'pvc7Length', 'pvc10Length']);
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const step = parseFloat(btn.dataset.step) || 0;
                const input = document.getElementById(targetId);
                if (!input) return;
                const cur = parseFloat(input.value) || 0;
                const nextVal = cur + step;
                if (emptyOnZeroIds.has(targetId)) {
                    input.value = nextVal > 0 ? nextVal : '';
                } else {
                    const min = parseFloat(input.min) || 0;
                    input.value = Math.max(min, nextVal);
                }
                this.calculateAndRender();
            });
        });

        // Universal Select-All on Focus/Tap & Instant Overwrite on First Keypress for PVC Pipe Rates & All Number Inputs
        const isAutoSelectNumInput = (el) => {
            if (!el || el.tagName !== 'INPUT') return false;
            return el.type === 'number' || el.id === 'oldBoreRateInput' || el.id === 'pvc7RateInput' || el.id === 'pvc10RateInput' || el.id === 'baseDrillingRate' || el.id === 'billBoreBataInput';
        };

        const triggerSelectAllOnInput = (inp) => {
            if (!isAutoSelectNumInput(inp)) return;
            const curVal = String(inp.value ?? '');
            inp.dataset.freshFocus = curVal !== '' ? '1' : '0';
            inp.dataset.focusInitialVal = curVal;
            inp.dataset.justFocused = '1';
            inp.classList.toggle('is-select-all-ready', curVal !== '');
            try { inp.select(); } catch (err) { /* ignore */ }
            requestAnimationFrame(() => {
                if (document.activeElement === inp && inp.dataset.freshFocus === '1') {
                    try { inp.select(); } catch (err) { /* ignore */ }
                }
            });
            setTimeout(() => {
                if (document.activeElement === inp && inp.dataset.freshFocus === '1') {
                    try { inp.select(); } catch (err) { /* ignore */ }
                }
            }, 30);
        };

        // Clicking anywhere on a Rate Pill / Wrapper Box (.spvc-rate-row, .spvc-rate-input-box, .srbb-input-box, .ssdp-sr-input-box) focuses & selects all
        document.addEventListener('click', (e) => {
            const rateBox = e.target.closest('.spvc-rate-row, .spvc-rate-input-box, .srbb-input-box, .ssdp-sr-input-box, .slab-edit-input-wrap, .rmt-input-row');
            if (rateBox && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                const innerInput = rateBox.querySelector('input');
                if (innerInput) {
                    innerInput.focus();
                    triggerSelectAllOnInput(innerInput);
                }
            }
        });

        document.addEventListener('focusin', (e) => {
            if (isAutoSelectNumInput(e.target)) {
                triggerSelectAllOnInput(e.target);
            }
        });

        document.addEventListener('mouseup', (e) => {
            const inp = e.target;
            if (isAutoSelectNumInput(inp) && inp.dataset.justFocused === '1') {
                e.preventDefault();
                inp.dataset.justFocused = '0';
                try { inp.select(); } catch (err) { /* ignore */ }
            }
        });

        document.addEventListener('click', (e) => {
            const inp = e.target;
            if (isAutoSelectNumInput(inp) && inp.dataset.justFocused === '1') {
                inp.dataset.justFocused = '0';
                try { inp.select(); } catch (err) { /* ignore */ }
            }
        });

        document.addEventListener('keydown', (e) => {
            const inp = e.target;
            if (!isAutoSelectNumInput(inp) || inp.dataset.freshFocus !== '1') return;

            if (/^[0-9.]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
                inp.value = '';
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
                inp.value = '';
                e.preventDefault();
                inp.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
            }
        }, true);

        document.addEventListener('beforeinput', (e) => {
            const inp = e.target;
            if (!isAutoSelectNumInput(inp) || inp.dataset.freshFocus !== '1') return;

            if (e.inputType === 'insertText' && e.data && /^[\d.]+$/.test(e.data)) {
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
                inp.value = '';
            } else if (e.inputType && e.inputType.startsWith('deleteContent')) {
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
                inp.value = '';
                e.preventDefault();
                inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, true);

        // Fallback in capture phase of 'input' for any mobile IME that skips keydown/beforeinput
        document.addEventListener('input', (e) => {
            const inp = e.target;
            if (!isAutoSelectNumInput(inp)) return;
            if (inp.dataset.freshFocus === '1') {
                const initVal = inp.dataset.focusInitialVal || '';
                const curVal = String(inp.value ?? '');
                inp.dataset.freshFocus = '0';
                inp.classList.remove('is-select-all-ready');
                if (initVal && curVal.length > initVal.length && curVal.startsWith(initVal)) {
                    inp.value = curVal.slice(initVal.length);
                } else if (initVal && curVal.length > initVal.length && curVal.endsWith(initVal)) {
                    inp.value = curVal.slice(0, curVal.length - initVal.length);
                }
            }
        }, true);

        document.addEventListener('focusout', (e) => {
            const inp = e.target;
            if (!isAutoSelectNumInput(inp)) return;
            inp.dataset.freshFocus = '0';
            inp.dataset.justFocused = '0';
            inp.classList.remove('is-select-all-ready');

            // Restore current rate if a core Rate input was cleared and left empty on blur
            const rawVal = (inp.value || '').trim();
            if (!rawVal) {
                if (inp.id === 'oldBoreRateInput') {
                    inp.value = this.rates.oldBoreRate || 40;
                    this.calculateAndRender();
                } else if (inp.id === 'pvc7RateInput') {
                    inp.value = this.rates.pvc7Rate || 400;
                    this.calculateAndRender();
                } else if (inp.id === 'pvc10RateInput') {
                    inp.value = this.rates.pvc10Rate || 700;
                    this.calculateAndRender();
                } else if (inp.id === 'baseDrillingRate') {
                    inp.value = this.rates.baseDrillingRate || 90;
                    this.calculateAndRender();
                } else if (inp.id === 'billBoreBataInput') {
                    inp.value = this.rates.boreBataRate ?? 2000;
                    this.calculateAndRender();
                } else if (inp.id === 'customSlabStepInput') {
                    inp.value = 1;
                } else if (inp.id === 'drillingSlabBufferInput') {
                    inp.value = this.rates.slabBufferFt ?? 5;
                    this.calculateAndRender();
                }
            }
        });

        // Live Inputs (including Instant Pipe Rates, Old Bore Rate, Bore Bata, Client GSTIN & Optional Note in New Bill)
        const liveInputIds = [
            'oldBoreDepth', 'oldBoreRateInput', 'totalDepth', 'baseDrillingRate', 'billBoreBataInput',
            'pvc7Length', 'pvc10Length', 'pvc7RateInput', 'pvc10RateInput',
            'custName', 'custPhone', 'custLocation', 'custGstInput', 'billNoInput', 'billDateInput',
            'collarCapCost', 'transportSurveyCost', 'customExtraLabel', 'customExtraAmount',
            'discountAmount', 'advancePaidAmount', 'billCustomNoteInput', 'drillingSlabBufferInput'
        ];
        liveInputIds.forEach(id => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                this.isBillSavedAndReadyToShare = false;
                if (id === 'custPhone') {
                    const formatted = this.formatPhoneWithCountryCode(e.target.value);
                    const cleaned = this.normalizeMobileNumber(e.target.value);
                    if (e.target.value !== formatted) e.target.value = formatted;
                    this.updateBillPhoneValidationUI(cleaned.length >= 7);
                    this.renderCustomerSiteSuggestions();
                } else if (id === 'custLocation') {
                    this.updateBillPhoneValidationUI(false);
                    this.renderCustomerSiteSuggestions({ showDropdown: true });
                } else if (id === 'custName') {
                    this.updateBillPhoneValidationUI(false);
                    this.renderCustomerSiteSuggestions();
                } else if (id === 'custGstInput') {
                    const up = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                    if (e.target.value !== up) e.target.value = up;
                } else if (id === 'customExtraLabel') {
                    this.renderSavedExtrasUI({ showDropdown: true });
                } else if (id === 'customExtraAmount' || id === 'collarCapCost' || id === 'transportSurveyCost') {
                    this.renderSavedExtrasUI({ showDropdown: false });
                } else if (id === 'billCustomNoteInput') {
                    this.renderSavedNotesUI();
                } else if (id === 'drillingSlabBufferInput') {
                    const rawVal = (e.target.value || '').trim();
                    const val = rawVal === '' ? 0 : Math.max(0, parseInt(rawVal, 10) || 0);
                    this.rates.slabBufferFt = val;
                    const qBuf = document.getElementById('quickSlabBuffer');
                    if (qBuf) qBuf.value = val;
                    const mBuf = document.getElementById('masterSlabBuffer');
                    if (mBuf) mBuf.value = val;
                    const activeProf = this.getActiveRateProfile();
                    if (activeProf && activeProf.rates) {
                        activeProf.rates.slabBufferFt = val;
                        this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
                    }
                    this.saveToStorage('borebill_rates', this.rates);
                }
                this.calculateAndRender();
            });
        });

        // Drilling Slab Buffer Input — No keyboard shortcuts work on this (strictly skips tab sequence)
        document.getElementById('drillingSlabBufferInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                e.target.blur();
                this.calculateAndRender();
            }
        });

        document.getElementById('drillingBufferPill')?.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const inp = document.getElementById('drillingSlabBufferInput');
                if (inp) {
                    inp.focus();
                    try { inp.select(); } catch (_) {}
                }
            }
        });

        // Smart Extra Charges — Auto-save on blur/change & Smart Dropdown on Custom Extra Label
        const customExtraLabelEl = document.getElementById('customExtraLabel');
        const customExtraAmtEl = document.getElementById('customExtraAmount');
        customExtraLabelEl?.addEventListener('focus', () => {
            this.renderSavedExtrasUI({ showDropdown: true });
        });
        customExtraLabelEl?.addEventListener('click', () => {
            this.renderSavedExtrasUI({ showDropdown: true });
        });
        customExtraLabelEl?.addEventListener('blur', () => {
            setTimeout(() => {
                const dd = document.getElementById('customExtraSmartDropdown');
                if (dd) dd.style.display = 'none';
                const lbl = (customExtraLabelEl.value || '').trim();
                const amt = parseFloat(customExtraAmtEl?.value);
                if (lbl && amt > 0) {
                    this.upsertSavedExtraItem({ label: lbl, amount: amt, field: 'custom' });
                    this.renderSavedExtrasUI({ showDropdown: false });
                }
            }, 220);
        });
        customExtraLabelEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const dd = document.getElementById('customExtraSmartDropdown');
                if (dd) dd.style.display = 'none';
                if (customExtraAmtEl) {
                    customExtraAmtEl.focus();
                    customExtraAmtEl.select?.();
                }
            }
        });

        ['customExtraAmount', 'collarCapCost', 'transportSurveyCost'].forEach(extraId => {
            const el = document.getElementById(extraId);
            el?.addEventListener('blur', () => {
                this.recordCurrentBillExtrasForNextTime();
                this.renderSavedExtrasUI({ showDropdown: false });
            });
            el?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.recordCurrentBillExtrasForNextTime();
                    this.renderSavedExtrasUI({ showDropdown: false });
                    el.blur();
                }
            });
        });

        document.getElementById('saveCustomExtraPresetBtn')?.addEventListener('click', () => {
            const lbl = (document.getElementById('customExtraLabel')?.value || '').trim() || 'Other Extra Charges';
            const amt = parseFloat(document.getElementById('customExtraAmount')?.value);
            if (!(amt > 0)) {
                this.showToast('⚠️ Enter Extra Charge Amount (₹) first');
                document.getElementById('customExtraAmount')?.focus();
                return;
            }
            const lblInput = document.getElementById('customExtraLabel');
            if (lblInput && !lblInput.value.trim()) {
                lblInput.value = lbl;
            }
            this.upsertSavedExtraItem({ label: lbl, amount: amt, field: 'custom' });
            this.renderSavedExtrasUI({ showDropdown: false });
            this.calculateAndRender();
            this.showToast(`✅ Saved "${lbl} (${this.formatFullCurrency(amt)})" for next time!`);
        });

        document.getElementById('gstEnabledToggle')?.addEventListener('change', (e) => {
            this.isBillSavedAndReadyToShare = false;
            const isChecked = Boolean(e.target.checked);
            const custGstEl = document.getElementById('custGstInput');
            if (isChecked && custGstEl && !custGstEl.value.trim()) {
                const activeCust = this.findActiveBillCustomer();
                if (activeCust?.gstNumber) {
                    custGstEl.value = activeCust.gstNumber.trim().toUpperCase();
                }
            }
            this.calculateAndRender();
        });

        document.getElementById('clearCustGstBtn')?.addEventListener('click', () => {
            const custGstEl = document.getElementById('custGstInput');
            if (custGstEl) {
                custGstEl.value = '';
                this.isBillSavedAndReadyToShare = false;
                this.calculateAndRender();
                custGstEl.focus();
            }
        });

        document.getElementById('resetCalcInputsBtn')?.addEventListener('click', () => {
            const defProf = this.getDefaultRateProfile();
            if (defProf) {
                this.applyRateProfileToBill(defProf.id, false);
            }
            document.getElementById('totalDepth').value = '';
            document.getElementById('oldBoreDepth').value = '';
            if (document.getElementById('oldBoreRateInput')) {
                document.getElementById('oldBoreRateInput').value = this.rates.oldBoreRate || 40;
            }
            document.getElementById('baseDrillingRate').value = this.rates.baseDrillingRate;
            if (document.getElementById('billBoreBataInput')) {
                document.getElementById('billBoreBataInput').value = this.rates.boreBataRate ?? 2000;
            }
            if (document.getElementById('pvc7RateInput')) {
                document.getElementById('pvc7RateInput').value = this.rates.pvc7Rate || 400;
            }
            if (document.getElementById('pvc10RateInput')) {
                document.getElementById('pvc10RateInput').value = this.rates.pvc10Rate || 700;
            }
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
            const custGstEl = document.getElementById('custGstInput');
            if (custGstEl) custGstEl.value = '';
            const gstToggle = document.getElementById('gstEnabledToggle');
            if (gstToggle) gstToggle.checked = false;
            const custGstRow = document.getElementById('custGstInlineRow');
            if (custGstRow) custGstRow.style.display = 'none';
            this.state.gstEnabled = false;
            const noteEl = document.getElementById('billCustomNoteInput');
            if (noteEl) noteEl.value = '';
            const notesDrawer = document.getElementById('billNotesDrawer');
            if (notesDrawer) notesDrawer.style.display = 'none';
            this.isBillPreviewOpen = false;
            this.isBillSavedAndReadyToShare = false;
            this.renderSavedExtrasUI({ showDropdown: false });
            this.renderSavedNotesUI();
            this.calculateAndRender();
            this.showToast(`↺ Cleared depths & restored Default Rate (${defProf?.name || 'Standard'})`);
        });

        // Compact Smart Slab Rate Dropdown right below Drilling Depth (#totalDepth)
        document.getElementById('smartSlabDropdownBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('smartSlabDropdownPanel');
            if (!panel) return;
            const willOpen = panel.style.display === 'none';
            panel.style.display = willOpen ? 'block' : 'none';
            this.renderInlineSmartSlabDropdown();
        });

        document.getElementById('toggleAllSlabsInDropdownBtn')?.addEventListener('click', () => {
            this.showAllInlineSlabs = !this.showAllInlineSlabs;
            this.renderInlineSmartSlabDropdown();
        });

        document.getElementById('resetInlineSlabsBtn')?.addEventListener('click', () => {
            const activeProf = this.getActiveRateProfile();
            if (activeProf && activeProf.rates) {
                this.rates.baseDrillingRate = activeProf.rates.baseDrillingRate || 90;
                this.rates.slabRates = JSON.parse(JSON.stringify(activeProf.rates.slabRates || DEPTH_SLABS_DEFINITION.map(s => ({ ...s, rate: s.defaultRate }))));
            } else {
                this.rates.baseDrillingRate = 90;
                this.rates.slabRates = DEPTH_SLABS_DEFINITION.map(s => ({ ...s, rate: s.defaultRate }));
            }
            const baseInput = document.getElementById('baseDrillingRate');
            if (baseInput) baseInput.value = this.rates.baseDrillingRate;
            this.isBillSavedAndReadyToShare = false;
            this.saveToStorage('borebill_rates', this.rates);
            this.renderMasterSlabsGrid();
            this.calculateAndRender();
            this.showToast('↺ Slab rates reset to default!');
        });

        // Optional Note / Remark Drawer (Hidden by default; shown only when user taps "+ Note / Remark")
        document.getElementById('billNotesToggleBtn')?.addEventListener('click', () => {
            const dr = document.getElementById('billNotesDrawer');
            if (!dr) return;
            const isOpening = dr.style.display === 'none';
            dr.style.display = isOpening ? 'block' : 'none';
            this.renderSavedNotesUI();
            if (isOpening) {
                setTimeout(() => {
                    const noteInp = document.getElementById('billCustomNoteInput');
                    if (noteInp) {
                        noteInp.focus();
                    }
                }, 60);
            }
        });

        document.getElementById('closeBillNotesDrawer')?.addEventListener('click', () => {
            const dr = document.getElementById('billNotesDrawer');
            if (dr) dr.style.display = 'none';
        });

        document.getElementById('clearBillNoteBtn')?.addEventListener('click', () => {
            const noteInp = document.getElementById('billCustomNoteInput');
            if (noteInp) {
                noteInp.value = '';
                this.isBillSavedAndReadyToShare = false;
                this.renderSavedNotesUI();
                this.calculateAndRender();
                noteInp.focus();
            }
        });

        document.getElementById('billCustomNoteInput')?.addEventListener('blur', () => {
            this.recordCurrentBillNoteForNextTime();
            this.renderSavedNotesUI();
        });

        // Two-Stage Preview -> Save -> Share Workflow
        document.getElementById('openBillPreviewBtn')?.addEventListener('click', () => {
            if (!this.ensureCustomerSelectedForBill()) return;
            this.isBillPreviewOpen = true;
            this.calculateAndRender();
            setTimeout(() => {
                const wrap = document.getElementById('billReceiptPreviewWrapper');
                wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
        });

        const returnToBillEditorFromPreview = () => {
            this.isBillPreviewOpen = false;
            if (this.loadedHistoryBillId && this.isSavedBillReadOnly) {
                this.isSavedBillReadOnly = false;
                this.updateSavedBillViewModeUI();
            }
            this.calculateAndRender();
            setTimeout(() => {
                const drillSec = document.getElementById('progDrillingSection') || document.getElementById('billEditorFormsContainer');
                drillSec?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
        };

        document.getElementById('backToEditFromPreviewBtn')?.addEventListener('click', returnToBillEditorFromPreview);
        document.getElementById('backToEditFromPreviewTopBtn')?.addEventListener('click', returnToBillEditorFromPreview);
        document.getElementById('postSaveEditBillBtn')?.addEventListener('click', () => {
            this.isBillSavedAndReadyToShare = false;
            returnToBillEditorFromPreview();
            this.showToast('✏️ Edit mode open — make changes, then Preview & Save again');
        });

        document.getElementById('postSaveNewBillBtn')?.addEventListener('click', () => {
            this.exitSavedBillMode(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.showToast(`➕ Ready for New Bill (#${document.getElementById('billNoInput')?.value})`);
        });

        // Track active focus and keyboard state on bill page
        document.addEventListener('focusin', (e) => {
            const isInput = e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
            if (isInput) {
                document.body.classList.add('keyboard-open');
            }
            if (e.target && e.target.closest('#tab-bill')) {
                this.syncTopHeaderWrapLock();
                setTimeout(() => this.syncTopHeaderWrapLock(), 100);
                setTimeout(() => this.syncTopHeaderWrapLock(), 280);
            }
        });
        document.addEventListener('focusout', () => {
            setTimeout(() => {
                const active = document.activeElement;
                const isStillInput = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
                if (!isStillInput) {
                    document.body.classList.remove('keyboard-open');
                    this.lockedKeyboardDockBottom = null;
                }
                this.syncTopHeaderWrapLock();
            }, 100);
        });

        // Click top date badge to focus date
        document.getElementById('controlLiveDateWrap')?.addEventListener('click', () => {
            const dateInput = document.getElementById('billDateInput');
            if (dateInput) {
                dateInput.focus();
                try { dateInput.showPicker(); } catch (_) {}
            }
        });

        // Inline Sheets
        document.getElementById('inlinePriceSettingsToggleBtn')?.addEventListener('click', () => {
            const dr = document.getElementById('inlinePriceDrawer');
            dr.style.display = dr.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('closeInlinePriceDrawer')?.addEventListener('click', () => {
            document.getElementById('inlinePriceDrawer').style.display = 'none';
        });

        document.getElementById('extraChargesToggleBtn')?.addEventListener('click', () => {
            const dr = document.getElementById('extraChargesDrawer');
            const isOpening = dr.style.display === 'none';
            dr.style.display = isOpening ? 'block' : 'none';
            if (isOpening) {
                this.renderSavedExtrasUI({ showDropdown: false });
            }
        });
        document.getElementById('closeExtraChargesDrawer')?.addEventListener('click', () => {
            document.getElementById('extraChargesDrawer').style.display = 'none';
        });

        document.getElementById('saveQuickRatesBtn')?.addEventListener('click', () => {
            this.rates.pvc7Rate = Math.max(0, parseFloat(document.getElementById('quickPvc7Rate').value) || 400);
            this.rates.pvc10Rate = Math.max(0, parseFloat(document.getElementById('quickPvc10Rate').value) || 700);
            this.rates.boreBataRate = Math.max(0, parseFloat(document.getElementById('quickBoreBata').value) || 0);
            this.rates.oldBoreRate = Math.max(0, parseFloat(document.getElementById('quickOldBoreRate').value) || 40);
            this.rates.slabBufferFt = Math.max(0, parseInt(document.getElementById('quickSlabBuffer').value, 10) || 0);
            this.rates.gstPercentage = Math.max(0, parseFloat(document.getElementById('quickGstPercent').value) || 18);

            const activeProf = this.getActiveRateProfile();
            if (activeProf) {
                activeProf.rates = JSON.parse(JSON.stringify(this.rates));
                this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
            }
            this.saveToStorage('borebill_rates', this.rates);
            this.populateRateInputsUI(activeProf);
            this.renderRateProfilesUI();
            this.calculateAndRender();
            document.getElementById('inlinePriceDrawer').style.display = 'none';
            this.showToast('✅ Rates saved & applied!');
        });

        document.getElementById('openFullSlabEditorBtn')?.addEventListener('click', () => {
            this.switchTab('tab-rates');
            this.toggleRateStudio(true);
            this.switchStudioSubTab('slabs');
        });

        document.getElementById('closeRateEditorBtn')?.addEventListener('click', () => {
            this.toggleRateStudio(false);
            this.renderRateProfilesUI();
        });

        // Segmented Rate Studio Sub-Tabs (Core & Pipe | 19 Depth Slabs | All)
        document.querySelectorAll('#rateStudioSubTabs .studio-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchStudioSubTab(btn.dataset.view);
            });
        });

        // Multi-Rate Profile Creation & Base Rate Auto-Slab Shift
        document.getElementById('createNewRateProfileBtn')?.addEventListener('click', () => {
            this.toggleRateStudio(true);
            const idEl = document.getElementById('editingRateProfileId');
            const nameEl = document.getElementById('masterProfileName');
            const defCheck = document.getElementById('masterIsDefaultCheckbox');
            const modeBadge = document.getElementById('studioEditingModeBadge');
            const stepInp = document.getElementById('customSlabStepInput');
            if (idEl) idEl.value = '';
            if (nameEl) {
                nameEl.value = '';
                nameEl.placeholder = 'Enter New Rate Name (e.g. 4.75" Rate / VIP Rate)';
            }
            if (defCheck) defCheck.checked = false;
            if (stepInp) stepInp.value = 1;
            if (modeBadge) {
                modeBadge.textContent = '✨ Creating New Rate Card';
                modeBadge.classList.add('new-mode');
            }

            // Start New Rate Card with Row 1 (Base Slab) ready for step-by-step "+ Add Next 100 ft" building
            const curSpan = this.rates.slabRates?.[0]?.span || 300;
            const curBaseRate = this.rates.baseDrillingRate || 90;
            this.rates.slabRates = [{
                start: 1,
                end: curSpan,
                span: curSpan,
                rangeStr: `001-${curSpan} ft`,
                rate: curBaseRate
            }];

            this.renderMasterSlabsGrid();
            this.switchStudioSubTab('all');
            this.renderRateProfilesUI();
            setTimeout(() => nameEl?.focus(), 220);
            this.showToast('➕ Set Base Slab (1–100 / 200 / 300 ft) & tap "＋ Add Next 100 ft"!');
        });

        document.getElementById('masterBaseRate')?.addEventListener('input', (e) => {
            const raw = (e.target.value || '').trim();
            if (raw === '') return;
            const newBase = Math.max(1, parseFloat(raw) || 90);
            this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
            const steps = this.rates.slabRates.map((s, idx) => idx === 0 ? 0 : (s.rate - this.rates.slabRates[idx - 1].rate));
            this.rates.baseDrillingRate = newBase;
            this.rates.slabRates[0].rate = newBase;
            for (let j = 1; j < this.rates.slabRates.length; j++) {
                this.rates.slabRates[j].rate = Math.max(1, this.rates.slabRates[j - 1].rate + steps[j]);
            }
            this.renderMasterSlabsGrid();
        });

        // 1st Base Slab Quick Range Pills (1–100 ft | 1–200 ft | 1–300 ft)
        document.querySelectorAll('#baseSlabSpanPills .sbtc-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const span = parseInt(pill.dataset.baseSpan, 10) || 300;
                this.setBaseSlabSpan(span);
                const baseRateInp = document.querySelector('.slab-edit-input[data-index="0"]');
                if (baseRateInp) {
                    this.focusAndScrollSlabInput(baseRateInp);
                }
            });
        });

        // Start from Row 1 (Step-by-Step Builder Mode)
        document.getElementById('slabStartFromRow1Btn')?.addEventListener('click', () => {
            this.startSlabsFromRow1();
        });

        // "+ Add Next 100 ft" Step-by-Step Button
        document.getElementById('addNextSlabRowBtn')?.addEventListener('click', () => {
            this.addNextSlabRow();
        });

        // Quick Auto-Fill Buttons (1000 ft / 1500 ft / 2200 ft)
        document.getElementById('slabFill1000Btn')?.addEventListener('click', () => {
            this.autoFillSlabsUpTo(1000);
        });
        document.getElementById('slabFill1500Btn')?.addEventListener('click', () => {
            this.autoFillSlabsUpTo(1500);
        });
        document.getElementById('slabFill2200Btn')?.addEventListener('click', () => {
            this.autoFillSlabsUpTo(2200);
        });

        // Master Slabs Bulk Controls (Quick Shift −₹10/−₹5/+₹5/+₹10 stays as-is; − Step / + Step defaults to 1)
        document.getElementById('slabBulkMinus10')?.addEventListener('click', () => this.bulkShiftMasterSlabs(-10));
        document.getElementById('slabBulkMinus5')?.addEventListener('click', () => this.bulkShiftMasterSlabs(-5));
        document.getElementById('slabBulkPlus5')?.addEventListener('click', () => this.bulkShiftMasterSlabs(5));
        document.getElementById('slabBulkPlus10')?.addEventListener('click', () => this.bulkShiftMasterSlabs(10));

        document.getElementById('slabCustomDeductBtn')?.addEventListener('click', () => {
            const step = Math.max(1, parseFloat(document.getElementById('customSlabStepInput')?.value) || 1);
            this.bulkShiftMasterSlabs(-step);
        });
        document.getElementById('slabCustomAddBtn')?.addEventListener('click', () => {
            const step = Math.max(1, parseFloat(document.getElementById('customSlabStepInput')?.value) || 1);
            this.bulkShiftMasterSlabs(step);
        });
        document.getElementById('slabResetStandardBtn')?.addEventListener('click', () => {
            this.rates.slabRates = DEPTH_SLABS_DEFINITION.map(s => ({ ...s, rate: s.defaultRate }));
            this.rates.baseDrillingRate = 90;
            document.getElementById('masterBaseRate').value = 90;
            document.getElementById('baseDrillingRate').value = 90;
            this.renderMasterSlabsGrid();
            this.calculateAndRender();
            this.showToast('🔄 Standard Anjaneya Slabs restored!');
        });

        document.getElementById('resetDefaultRatesBtn')?.addEventListener('click', () => {
            this.rates = JSON.parse(JSON.stringify(this.defaultRates));
            this.populateRateInputsUI(this.getActiveRateProfile());
            this.renderMasterSlabsGrid();
            this.showToast('↺ Standard ₹90 values loaded into editor');
        });

        document.getElementById('saveMasterRatesBtn')?.addEventListener('click', () => {
            this.saveOrUpdateRateProfile(false);
        });

        document.getElementById('saveAsNewProfileBtn')?.addEventListener('click', () => {
            this.saveOrUpdateRateProfile(true);
        });

        // Brand Tab Listeners (View-First Business Card + Toggleable Edit Studio)
        const toggleCompanyStudio = (forceState = null) => {
            const studio = document.getElementById('companyEditStudioCard');
            const editBtn = document.getElementById('toggleCompanyEditBtn');
            const editBtnTxt = document.getElementById('toggleCompanyEditBtnText');
            if (!studio) return;
            const willOpen = forceState !== null ? forceState : (studio.style.display === 'none');
            studio.style.display = willOpen ? 'block' : 'none';
            editBtn?.classList.toggle('active', willOpen);
            if (editBtnTxt) editBtnTxt.textContent = willOpen ? 'Close Edit' : 'Edit Details';
            if (willOpen) {
                setTimeout(() => studio.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
            }
        };

        document.getElementById('toggleCompanyEditBtn')?.addEventListener('click', () => {
            toggleCompanyStudio();
        });

        document.getElementById('closeCompanyEditStudioBtn')?.addEventListener('click', () => {
            toggleCompanyStudio(false);
        });

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
                    this.saveToStorage('borebill_brand', this.brand);
                    this.applyBrandToUI();
                    this.showUndoToast('🗑️ Company Logo removed', () => {
                        this.brand.logoDataUrl = prevLogo;
                        this.saveToStorage('borebill_brand', this.brand);
                        this.applyBrandToUI();
                    });
                }
            });
        });

        document.querySelectorAll('.theme-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                this.brand.theme = sw.dataset.theme;
                this.saveToStorage('borebill_brand', this.brand);
                this.applyBrandToUI();
                this.showToast(`🎨 Theme changed to ${sw.textContent.trim()}`);
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
            'brandCompanyAddress', 'brandWebsite', 'brandGstNumber', 'brandUpiId',
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
            this.saveToStorage('borebill_brand', this.brand);
            this.applyBrandToUI();
            this.calculateAndRender();
        });

        document.getElementById('quickPreviewWebsiteInput')?.addEventListener('input', (e) => {
            const val = (e.target.value || '').trim();
            this.brand.website = val;
            const bWeb = document.getElementById('brandWebsite');
            if (bWeb) bWeb.value = val;
            this.saveToStorage('borebill_brand', this.brand);
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
                this.saveToStorage('borebill_brand', this.brand);
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
            toggleCompanyStudio(false);
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
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
            if (viewId === 'set-view-casing') {
                this.syncCasingNamesUI();
            }
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                try { window.lucide.createIcons(); } catch (_) {}
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        const switchSettingsView = this.switchSettingsView;

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
        document.getElementById('shareWhatsappBtn')?.addEventListener('click', () => this.shareOnWhatsApp());
        document.getElementById('downloadImageBtn')?.addEventListener('click', () => this.exportBillAsImage());
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.exportBillAsPDF());
        document.getElementById('saveBillHistoryBtn')?.addEventListener('click', () => this.saveCurrentBillToHistory());

        document.getElementById('closeWaPreviewModalBtn')?.addEventListener('click', () => this.closeWhatsAppPreviewModal());
        document.getElementById('cancelWaPreviewBtn')?.addEventListener('click', () => this.closeWhatsAppPreviewModal());
        document.getElementById('whatsappPreviewModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'whatsappPreviewModalOverlay') {
                this.closeWhatsAppPreviewModal();
            }
        });

        document.getElementById('waPreviewCountryCode')?.addEventListener('change', (e) => {
            const selectedCode = e.target.value || '+91';
            this.setDefaultCountryCode(selectedCode);
            this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', selectedCode);
            const phoneInp = document.getElementById('waPreviewPhoneInput');
            if (phoneInp) {
                const cleaned = this.normalizeMobileNumber(phoneInp.value, selectedCode);
                if (phoneInp.value !== cleaned) phoneInp.value = cleaned;
            }
        });

        document.getElementById('waPreviewPhoneInput')?.addEventListener('input', (e) => {
            const rawVal = e.target.value || '';
            const codeSelect = document.getElementById('waPreviewCountryCode');
            let activeCode = codeSelect?.value || this.defaultCountryCode || '+91';
            if (rawVal.trim().startsWith('+') || rawVal.trim().startsWith('00') || rawVal.replace(/\D/g, '').length > 10) {
                const parsed = this.parsePhoneWithCountryCode(rawVal, activeCode);
                if (parsed.countryCode !== activeCode && codeSelect) {
                    codeSelect.value = parsed.countryCode;
                    activeCode = parsed.countryCode;
                    this.setDefaultCountryCode(activeCode);
                    this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', activeCode);
                }
                e.target.value = parsed.localDigits;
            } else {
                const cleaned = this.normalizeMobileNumber(rawVal, activeCode);
                if (e.target.value !== cleaned) e.target.value = cleaned;
            }
        });

        document.getElementById('toggleWaRawEditBtn')?.addEventListener('click', () => {
            const rawArea = document.getElementById('waPreviewMessageInput');
            const chatWrap = document.getElementById('waChatPreviewContainer');
            const editBtn = document.getElementById('toggleWaRawEditBtn');
            if (!rawArea || !chatWrap) return;
            const isEditing = rawArea.style.display !== 'none';
            if (isEditing) {
                rawArea.style.display = 'none';
                chatWrap.style.display = 'block';
                editBtn?.classList.remove('active');
                if (editBtn) editBtn.textContent = '✏️ Edit Text';
            } else {
                rawArea.style.display = 'block';
                chatWrap.style.display = 'none';
                editBtn?.classList.add('active');
                if (editBtn) editBtn.textContent = '👁️ View Preview';
                rawArea.focus();
            }
        });

        document.getElementById('waPreviewMessageInput')?.addEventListener('input', (e) => {
            const bubbleEl = document.getElementById('waPreviewFormattedBubble');
            if (bubbleEl) {
                bubbleEl.innerHTML = this.formatWhatsAppBubbleHtml(e.target.value || '');
            }
        });

        document.getElementById('copyWaPreviewTextBtn')?.addEventListener('click', async () => {
            const txt = (document.getElementById('waPreviewMessageInput')?.value || '').trim();
            if (!txt) return;
            try {
                await navigator.clipboard.writeText(txt);
                this.showToast('📋 WhatsApp message copied!');
            } catch (err) {
                const rawArea = document.getElementById('waPreviewMessageInput');
                if (rawArea) {
                    rawArea.style.display = 'block';
                    rawArea.select();
                    document.execCommand('copy');
                    this.showToast('📋 WhatsApp message copied!');
                }
            }
        });

        document.getElementById('confirmSendWhatsappBtn')?.addEventListener('click', () => {
            this.confirmAndSendWhatsAppFromModal();
        });

        let histSearchDebounceTimer;
        document.getElementById('historySearchInput')?.addEventListener('input', (e) => {
            clearTimeout(histSearchDebounceTimer);
            histSearchDebounceTimer = setTimeout(() => {
                this.historyPage = 1;
                this.renderHistoryList(e.target.value);
            }, 75);
        });
        document.getElementById('clearAllHistoryBtn')?.addEventListener('click', () => {
            if (!this.history || this.history.length === 0) {
                this.showToast('ℹ️ No saved bills to clear');
                return;
            }
            const backupBills = JSON.parse(JSON.stringify(this.history));
            this.confirmDeleteModal({
                title: '⚠️ Clear All Saved Bills?',
                itemLabel: `📚 All ${backupBills.length} Saved ${backupBills.length === 1 ? 'Bill / Quotation' : 'Bills & Quotations'}`,
                message: 'WARNING: All saved bills and quotations will be permanently deleted from the Bill Book! Type "CLEAR ALL" or "I CONFIRM" below to proceed.',
                requireTypeText: ['CLEAR ALL', 'I CONFIRM'],
                confirmBtnLabel: 'Clear All Bills',
                onConfirm: () => {
                    this.history = [];
                    if (this.loadedHistoryBillId) {
                        this.exitSavedBillMode(true);
                    }
                    this.saveToStorage('borebill_history', this.history);
                    this.renderHistoryList();
                    this.renderCustomerDirectory();
                    this.applyBrandToUI();

                    this.showUndoToast(`🗑️ Cleared all ${backupBills.length} bills`, () => {
                        this.history = backupBills;
                        this.saveToStorage('borebill_history', this.history);
                        this.renderHistoryList();
                        this.renderCustomerDirectory();
                        this.applyBrandToUI();
                    });
                }
            });
        });

        // JSON Backup & Restore
        document.getElementById('exportDataJsonBtn')?.addEventListener('click', () => {
            const payload = {
                version: '2.3',
                exportedAt: new Date().toISOString(),
                brand: this.brand,
                rates: this.rates,
                rateProfiles: this.rateProfiles,
                customers: this.customers,
                history: this.history,
                savedExtras: this.savedExtras,
                savedNotes: this.savedNotes
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BoreBill_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('⬇️ Full Backup JSON Downloaded!');
        });

        document.getElementById('importDataJsonInput')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed.brand) {
                        this.brand = { ...this.defaultBrand, ...parsed.brand };
                        this.saveToStorage('borebill_brand', this.brand);
                    }
                    if (parsed.rates) {
                        this.rates = { ...this.defaultRates, ...parsed.rates };
                        this.saveToStorage('borebill_rates', this.rates);
                    }
                    if (Array.isArray(parsed.rateProfiles) && parsed.rateProfiles.length > 0) {
                        this.rateProfiles = parsed.rateProfiles;
                        this.saveToStorage('borebill_rate_profiles', this.rateProfiles);
                    }
                    if (Array.isArray(parsed.customers)) {
                        this.customers = parsed.customers;
                        this.saveToStorage('borebill_customers', this.customers);
                    }
                    if (Array.isArray(parsed.history)) {
                        this.history = parsed.history;
                        this.saveToStorage('borebill_history', this.history);
                    }
                    if (Array.isArray(parsed.savedExtras)) {
                        this.savedExtras = parsed.savedExtras;
                        this.saveToStorage('borebill_saved_extras', this.savedExtras);
                    }
                    if (Array.isArray(parsed.savedNotes)) {
                        this.savedNotes = parsed.savedNotes;
                        this.saveToStorage('borebill_saved_notes', this.savedNotes);
                    }
                    this.migrateStoredPhonesWithCountryCode();
                    this.applyBrandToUI();
                    this.populateRateInputsUI(this.getActiveRateProfile());
                    this.renderMasterSlabsGrid();
                    this.renderRateProfilesUI();
                    this.renderHistoryList();
                    this.renderCustomerDirectory();
                    this.renderSavedExtrasUI({ showDropdown: false });
                    this.renderSavedNotesUI();
                    this.calculateAndRender();
                    this.showToast('✅ Backup Restored Successfully!');
                } catch (err) {
                    this.showToast('❌ Invalid backup JSON file');
                }
            };
            reader.readAsText(file);
        });
    }
}

function initPWAAndZoomLock() {
    // 1. Prevent Multi-Touch Pinch-to-Zoom on Mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 2. Prevent iOS / WebKit Pinch & Rotation Gestures
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((evtName) => {
        document.addEventListener(evtName, (e) => {
            e.preventDefault();
        }, { passive: false });
    });

    // 3. Prevent Rapid Double-Tap Zoom while allowing fast Stepper clicks
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 280) {
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && !e.target.closest('.step-btn')) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });

    // 4. Prevent Desktop / Tablet Ctrl + Wheel & Ctrl + (+/-) Zoom
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // 5. Register Offline-Capable Service Worker (sw.js)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // 6. Native PWA Install Prompt Handler
    let deferredInstallPrompt = null;
    const installBtn = document.getElementById('installPwaBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            if (window.lucide) window.lucide.createIcons();
        }
    });

    installBtn?.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredInstallPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        if (installBtn) installBtn.style.display = 'none';
        deferredInstallPrompt = null;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initPWAAndZoomLock();
    window.boreBillApp = new BoreBillSaaSApp();
});

