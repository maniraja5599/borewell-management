// Core of the app, auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { DEPTH_SLABS_DEFINITION } from '../config/constants.js';
import { STORAGE_KEYS, storage } from '../data/storage.js';
import { applyMixins } from './applyMixins.js';
import { StorageMixin } from './StorageMixin.js';
import { IosViewportMixin } from '../platform/IosViewportMixin.js';
import { BillFlowMixin } from '../features/bill/BillFlowMixin.js';
import { CalcMixin } from '../features/bill/CalcMixin.js';
import { FormatMixin } from '../ui/FormatMixin.js';
import { ReceiptMixin } from '../features/bill/ReceiptMixin.js';
import { NotesExtrasMixin } from '../features/bill/NotesExtrasMixin.js';
import { PhoneMixin } from '../features/customers/PhoneMixin.js';
import { SitesMixin } from '../features/customers/SitesMixin.js';
import { CustomerRecordMixin } from '../features/customers/CustomerRecordMixin.js';
import { PaymentsMixin } from '../features/payments/PaymentsMixin.js';
import { BillDetailMixin } from '../features/history/BillDetailMixin.js';
import { CustomerLedgerMixin } from '../features/customers/CustomerLedgerMixin.js';
import { HeaderMixin } from '../ui/HeaderMixin.js';
import { BrandMixin } from '../features/settings/BrandMixin.js';
import { RatesMixin } from '../features/rates/RatesMixin.js';
import { ShareExportMixin } from '../features/share/ShareExportMixin.js';
import { HistoryMixin } from '../features/history/HistoryMixin.js';
import { ShellMixin } from '../ui/ShellMixin.js';
import { BackupMixin } from '../features/settings/BackupMixin.js';
import { ShellListeners } from '../ui/ShellListeners.js';
import { BillInputListeners } from '../features/bill/BillInputListeners.js';
import { CustomerListeners } from '../features/customers/CustomerListeners.js';
import { HistoryFilterListeners } from '../features/history/HistoryFilterListeners.js';
import { BillFieldBehaviorListeners } from '../features/bill/BillFieldBehaviorListeners.js';
import { CustomerFilterListeners } from '../features/customers/CustomerFilterListeners.js';
import { RateListeners } from '../features/rates/RateListeners.js';
import { SettingsListeners } from '../features/settings/SettingsListeners.js';
import { ShareListeners } from '../features/share/ShareListeners.js';
import { HistoryBackupListeners } from '../features/history/HistoryBackupListeners.js';

export class BoreBillSaaSApp {
    constructor() {
        this.lang = 'en';
        storage.setRaw(STORAGE_KEYS.lang, 'en');
        this.defaultCountryCode = this.initDefaultCountryCode();
        this.crmFilter = 'all'; // 'all' | 'due' | 'settled'
        this.historyDocFilter = 'INVOICE'; // 'INVOICE' | 'QUOTATION' (Always default to Bills!)
        this.historyPayFilter = 'all'; // 'all' | 'unpaid' | 'paid'
        this.historyDatePreset = 'all'; // 'all' | 'today' | 'yesterday' | '7d' | 'month' | 'custom'
        this.historyDateFrom = '';
        this.historyDateTo = '';

        this.defaultBrand = {
            companyName: 'Your Borewell Company',
            tagline: 'Borewell Drilling Services',
            phones: '',
            phoneCountryCode: '+91',
            address: '',
            website: '',
            gstNumber: '',
            upiId: '',
            upiName: '',
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

        this.defaultWaFormat = {
            companyHeader: true,
            address: true,
            gst: true,
            slabBreakup: true,
            pipes: true,
            extras: true,
            paymentDue: true,
            note: true,
            footerTerms: true,
            contact: true
        };
        this.waFormat = this.loadFromStorage(STORAGE_KEYS.waFormat, this.defaultWaFormat);

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

        this.brand = this.loadFromStorage(STORAGE_KEYS.brand, this.defaultBrand);
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
        const v52FooterMigrated = storage.getRaw(STORAGE_KEYS.v52FooterMigrated) === '1';
        if (
            /பாறை கடினம்|rock strata|எங்கள் நிறுவனத்தைத்|நன்றி/i.test(this.brand.finalBillTermsNote || '') ||
            (!v52FooterMigrated && (this.brand.finalBillTermsNote || '').trim() === 'Thank you ! Makers Of Green India !')
        ) {
            this.brand.finalBillTermsNote = 'Thank you !';
            this.saveToStorage(STORAGE_KEYS.brand, this.brand);
        }
        if (!v52FooterMigrated) {
            storage.setRaw(STORAGE_KEYS.v52FooterMigrated, '1');
        }
        this.rates = this.loadFromStorage(STORAGE_KEYS.rates, this.defaultRates);
        this.history = this.loadFromStorage(STORAGE_KEYS.history, []);
        this.customers = this.loadFromStorage(STORAGE_KEYS.customers, []);
        this.savedExtras = this.loadFromStorage(STORAGE_KEYS.savedExtras, []);
        this.savedNotes = this.loadFromStorage(STORAGE_KEYS.savedNotes, []);
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

        this.rateProfiles = this.loadFromStorage(STORAGE_KEYS.rateProfiles, initialProfiles);
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

        this.state = this.loadFromStorage(STORAGE_KEYS.lastSession, this.defaultSession);
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
        // Live rates remember which card they came from. That travels with them through
        // cloud sync, so every phone shows the right "Applied" card, and the Standard card
        // is never mistaken for untouched default settings (which sync refuses to upload).
        this.rates.profileId = activeProf.id;
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

        // Always default to New Bill tab on app launch
        this.state.activeTab = 'tab-bill';
        this.switchTab('tab-bill', false, false);
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
        this.calculateAndRender();
        this.renderCustomerSiteSuggestions();
        this.renderSavedExtrasUI();
        this.renderSavedNotesUI();
        this.refreshIcons();

        // Smooth 2.5s App Launch Splash Screen with animated drop dot
        const splashEl = document.getElementById('appSplashScreen');
        if (splashEl) {
            setTimeout(() => {
                splashEl.classList.add('fade-out');
                setTimeout(() => {
                    try { splashEl.remove(); } catch (_) {}
                }, 400);
            }, 2500);
        }

        // Restore exact scroll position where user left off
        const savedScrollY = parseInt(sessionStorage.getItem(STORAGE_KEYS.scrollY) || '0', 10);
        if (savedScrollY > 0) {
            setTimeout(() => {
                window.scrollTo({ top: savedScrollY, behavior: 'instant' });
                this.syncIosTopSafeBarColor();
                this.syncTopHeaderWrapLock();
            }, 40);
        }
        window.addEventListener('scroll', () => {
            sessionStorage.setItem(STORAGE_KEYS.scrollY, String(Math.round(window.scrollY || 0)));
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

    setupEventListeners() {
        this.setupShellListeners();
        this.setupBillInputListeners();
        this.setupCustomerListeners();
        this.setupHistoryFilterListeners();
        this.setupBillFieldBehaviorListeners();
        this.setupCustomerFilterListeners();
        this.setupBillDrawerAndRateListeners();
        this.setupSettingsListeners();
        this.setupShareListeners();
        this.setupHistoryAndBackupListeners();
    }
}

applyMixins(BoreBillSaaSApp, [
    StorageMixin,
    IosViewportMixin,
    BillFlowMixin,
    CalcMixin,
    FormatMixin,
    ReceiptMixin,
    NotesExtrasMixin,
    PhoneMixin,
    SitesMixin,
    CustomerRecordMixin,
    PaymentsMixin,
    BillDetailMixin,
    CustomerLedgerMixin,
    HeaderMixin,
    BrandMixin,
    RatesMixin,
    ShareExportMixin,
    HistoryMixin,
    ShellMixin,
    BackupMixin,
    ShellListeners,
    BillInputListeners,
    CustomerListeners,
    HistoryFilterListeners,
    BillFieldBehaviorListeners,
    CustomerFilterListeners,
    RateListeners,
    SettingsListeners,
    ShareListeners,
    HistoryBackupListeners
]);
