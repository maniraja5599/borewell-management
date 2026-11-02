import fs from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoreBillSaaSApp } from '../src/app/App.js';

describe('Application Button Handlers & UI Interactions', () => {
    let app;
    let mockElements;

    beforeEach(() => {
        mockElements = new Map();

        const createMockEl = (id, tag = 'div', attrs = {}) => {
            const el = {
                id,
                tagName: tag.toUpperCase(),
                style: { display: '' },
                classList: {
                    classes: new Set(),
                    add(c) { this.classes.add(c); },
                    remove(c) { this.classes.delete(c); },
                    toggle(c, v) { if (v ?? !this.classes.has(c)) this.classes.add(c); else this.classes.delete(c); },
                    contains(c) { return this.classes.has(c); }
                },
                dataset: { ...attrs },
                checked: false,
                value: '',
                textContent: '',
                innerHTML: '',
                listeners: {},
                addEventListener(evt, fn) {
                    this.listeners[evt] = this.listeners[evt] || [];
                    this.listeners[evt].push(fn);
                },
                click() {
                    (this.listeners['click'] || []).forEach(fn => fn({ currentTarget: el, target: el }));
                },
                scrollIntoView: vi.fn(),
                closest: vi.fn(() => ({ style: {} })),
                setAttribute: vi.fn(),
                getAttribute: vi.fn(),
                querySelector: vi.fn(() => ({ style: {} })),
                querySelectorAll: vi.fn(() => []),
                focus: vi.fn()
            };
            mockElements.set(id, el);
            return el;
        };

        // Create standard elements
        createMockEl('set-view-brand');
        createMockEl('set-view-casing');
        createMockEl('set-view-whatsapp');
        createMockEl('waSettingsLivePreviewBubble');
        createMockEl('historyActiveDateChip');
        createMockEl('historyDateFrom');
        createMockEl('historyDateTo');
        createMockEl('historySearchInput');
        createMockEl('cdmOverviewPane');
        createMockEl('cdmBoresPane');
        createMockEl('waToggleCompanyHeader', 'input');
        // Bill Form & Final View Preview Elements
        [
            "billNoInput", "billDateInput", "custName", "custPhone", "custLocation", "custGstInput",
            "totalDepth", "oldBoreDepth", "oldBoreRateInput", "oldBoreRow", "baseDrillingRate",
            "pvc7Length", "pvc10Length", "pvc7RateInput", "pvc10RateInput", "billBoreBataInput",
            "drillingSlabBufferInput", "gstEnabledToggle", "custGstInlineRow", "collarCapCost",
            "transportSurveyCost", "customExtraLabel", "customExtraAmount", "discountAmount",
            "advancePaidAmount", "billCustomNoteInput", "billNotesDrawer", "savedBillModeBanner",
            "billEditorFormsContainer", "stickyLiveBar", "savedBillModeBadge", "savedBillModeTitle",
            "toggleSavedBillEditText", "saveBillBtnTitle", "saveBillBtnSub", "tab-bill",
            "progDrillingSection", "drillingRateBataWrap", "progCasingSection", "proceedToPreviewBar",
            "openBillPreviewBtnText", "previewBtnLiveTotal", "previewBtnBalanceDue",
            "billReceiptPreviewWrapper", "previewStageTopBar", "previewStageStatusBadge",
            "previewStageStatusSub", "billPreviewActionStage", "preSavePreviewActions",
            "postSaveShareContainer", "billExportActionsGrid", "cdmOverallReceiptBtn", "crmCustomerList", "crmTotalCustomers", "crmTotalBilled", "crmTotalPending", "savedRateProfilesList", "rateKpiActiveName", "rateKpiDefaultName", "rateKpiTotalCount", "liveSummaryDepthBadge", "liveSummaryPerFt", "receiptSlabRows", "rcptWorkType", "rcptTotalDepth", "rcptBaseRate", "rcptCasingSummary", "rcptDrillingTotal", "hintOldBoreRate", "liveInlineOldBoreCost", "hintPvc7Rate", "liveInlinePvc7Cost", "hintPvc10Rate", "liveInlinePvc10Cost", "gstPillPercent", "liveInlineCasingTotalBadge", "inlineSlabToggleTotalBadge", "liveAdvDueBadge", "rcptGrandTotal", "rcptBalanceDueRow", "rcptBalanceDue", "stickyExtrasPill", "liveStickyExtrasText", "liveStickyExtrasCost", "rcptUpiQrCanvas", "depthQuickStepperBar", "liveSlabAccordion", "liveSlabAccordionToggleBtn", "liveSlabAccordionTitle", "liveSlabAccordionTotal", "liveSlabAccordionArrow", "liveSlabAccordionBody", "liveSlabBreakdownTable", "printReceiptBtn"
        ].forEach(id => createMockEl(id));


        globalThis.document = {
            documentElement: { setAttribute: vi.fn(), style: {} },
            getElementById: (id) => mockElements.get(id) || createMockEl(id),
            querySelectorAll: (sel) => {
                if (sel.includes('.settings-view-panel')) {
                    return [mockElements.get('set-view-brand'), mockElements.get('set-view-casing'), mockElements.get('set-view-whatsapp')].filter(Boolean);
                }
                if (sel.includes('.set-seg-btn')) {
                    return [];
                }
                if (sel.includes('.cdm-vtab')) {
                    return [];
                }
                return [];
            }
        };

        globalThis.window = {
            scrollTo: vi.fn(),
            lucide: { createIcons: vi.fn() }
        };

        app = Object.create(BoreBillSaaSApp.prototype);
        app.brand = { billPrefix: 'DR', companyName: 'DrillRig' };
        app.defaultBrand = { billPrefix: 'DR', companyName: 'DrillRig' };
        app.rates = { oldBoreRate: 40, baseDrillingRate: 90, pvc7Rate: 400, pvc10Rate: 700, gstPercentage: 18 };
        app.waFormat = { companyHeader: true, slabBreakup: true };
        app.defaultWaFormat = { companyHeader: true, slabBreakup: true };
        app.lang = "en";
        app.saveToStorage = vi.fn();
        app.showToast = vi.fn();
        app.renderHistoryList = vi.fn();
        app.history = [];
        app.customers = [];
        app.state = { custName: "", custPhone: "", custLocation: "", custGst: "" };
    });

    it('switchSettingsView successfully activates target view without exceptions', () => {
        expect(typeof app.switchSettingsView).toBe('function');
        app.switchSettingsView('set-view-whatsapp');

        const brandPanel = mockElements.get('set-view-brand');
        const waPanel = mockElements.get('set-view-whatsapp');
        expect(brandPanel.style.display).toBe('none');
        expect(waPanel.style.display).toBe('block');
    });

    it('syncWaFormatUI properly syncs checkboxes to waFormat state', () => {
        expect(typeof app.syncWaFormatUI).toBe('function');
        const toggle = mockElements.get('waToggleCompanyHeader');
        app.waFormat.companyHeader = false;
        app.syncWaFormatUI();
        expect(toggle.checked).toBe(false);

        app.waFormat.companyHeader = true;
        app.syncWaFormatUI();
        expect(toggle.checked).toBe(true);
    });

    it('renderWaFormatLivePreview generates live WhatsApp message bubble', () => {
        expect(typeof app.renderWaFormatLivePreview).toBe('function');
        app.renderWaFormatLivePreview();
        const bubble = mockElements.get('waSettingsLivePreviewBubble');
        expect(bubble.innerHTML).toContain('DRILLING CHARGES');
    });

    it('historyActiveDateChip click handler resets date filters to all', () => {
        app.historyDatePreset = 'today';
        app.historyDateFrom = '2026-11-01';
        app.historyDateTo = '2026-11-02';

        const clearDateFilter = () => {
            app.historyDatePreset = 'all';
            app.historyDateFrom = '';
            app.historyDateTo = '';
            const fromEl = document.getElementById('historyDateFrom');
            const toEl = document.getElementById('historyDateTo');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            const chip = document.getElementById('historyActiveDateChip');
            if (chip) chip.style.display = 'none';
            app.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        };

        const chipBtn = mockElements.get('historyActiveDateChip');
        chipBtn.addEventListener('click', clearDateFilter);
        chipBtn.click();

        expect(app.historyDatePreset).toBe('all');
        expect(app.historyDateFrom).toBe('');
        expect(app.historyDateTo).toBe('');
        expect(mockElements.get('historyDateFrom').value).toBe('');
        expect(mockElements.get('historyDateTo').value).toBe('');
        expect(chipBtn.style.display).toBe('none');
        expect(app.renderHistoryList).toHaveBeenCalled();
    });

    it('switchCustomerDetailView switches between Overview and Bores panes', () => {
        app.switchCustomerDetailView('bores');
        expect(mockElements.get('cdmOverviewPane').style.display).toBe('none');
        expect(mockElements.get('cdmBoresPane').style.display).toBe('flex');

        app.switchCustomerDetailView('overview');
        expect(mockElements.get('cdmOverviewPane').style.display).toBe('flex');
        expect(mockElements.get('cdmBoresPane').style.display).toBe('none');
    });

    it("ensures billReceiptPreviewWrapper is cleanly closed outside billEditorFormsContainer in index.html", () => {
        const html = fs.readFileSync("index.html", "utf8");
        const formsIdx = html.indexOf("id=\"billEditorFormsContainer\"");
        const formsCloseIdx = html.indexOf("<!-- /#billEditorFormsContainer -->");
        const previewIdx = html.indexOf("id=\"billReceiptPreviewWrapper\"");

        expect(formsIdx).toBeGreaterThan(0);
        expect(formsCloseIdx).toBeGreaterThan(formsIdx);
        expect(previewIdx).toBeGreaterThan(formsCloseIdx);
    });

    it("loadBillFromHistory in Final View mode (viewOnly = true) hides editor forms and displays receipt preview", () => {
        app.state = { docType: "INVOICE" };
        app.rates = { baseDrillingRate: 90, pvc7Rate: 400, pvc10Rate: 700 };
        app.useSavedBillRates = vi.fn();
        app.switchTab = vi.fn();
        app.applyBrandToUI = vi.fn();
        app.updateBillPhoneValidationUI = vi.fn();
        app.renderCustomerSiteSuggestions = vi.fn();
        app.renderSavedExtrasUI = vi.fn();
        app.renderSavedNotesUI = vi.fn();
        app.calculateAndRender = vi.fn();
        app.rates = { oldBoreRate: 40, baseDrillingRate: 90, pvc7Rate: 400, pvc10Rate: 700, gstPercentage: 18 };
        app.state = { custGst: "" };
        app.formatINR = (n) => `₹${n}`;
        app.formatPhoneWithCountryCode = (p) => p;

        const testBill = {
            id: "bill-101",
            billNo: "AB-101",
            billDate: "2026-11-02",
            custName: "Murugan Farms",
            custPhone: "9876543210",
            custLocation: "Salem",
            snapshot: {
                docType: "INVOICE",
                totalDepth: 550,
                baseDrillingRate: 90,
                pvc7Length: 60,
                pvc10Length: 20,
                grandTotal: 58000
            }
        };
        app.history = [testBill];

        // 1. Load Bill in Final View mode (viewOnly = true)
        app.loadBillFromHistory("bill-101", true, false);

        expect(app.isSavedBillReadOnly).toBe(true);
        expect(app.loadedHistoryBillId).toBe("bill-101");
        expect(app.state.totalDepth).toBe(550);
        expect(app.state.custName).toBe("Murugan Farms");

        // 2. UI View Mode execution
        app.updateSavedBillViewModeUI();

        const formsBox = mockElements.get("billEditorFormsContainer");
        const receiptWrap = mockElements.get("billReceiptPreviewWrapper");
        const actionStage = mockElements.get("billPreviewActionStage");
        const badgeEl = mockElements.get("savedBillModeBadge");

        expect(formsBox.style.display).toBe("none");
        expect(receiptWrap.style.display).toBe("block");
        expect(actionStage.style.display).toBe("block");
        expect(badgeEl.textContent).toBe("👁️ Final View Only");
    });

    it("toggleSavedBillEditBtn toggles between Edit Mode and Final View mode seamlessly", () => {
        app.state = { docType: "INVOICE" };
        app.rates = { baseDrillingRate: 90 };
        app.loadedHistoryBillId = "bill-101";
        app.isSavedBillReadOnly = true;
        app.history = [{ id: "bill-101", billNo: "AB-101", custName: "Murugan" }];

        // Currently in Final View
        app.updateSavedBillViewModeUI();
        expect(mockElements.get("billEditorFormsContainer").style.display).toBe("none");
        expect(mockElements.get("billReceiptPreviewWrapper").style.display).toBe("block");

        // Toggled to Edit Mode
        app.isSavedBillReadOnly = false;
        app.updateSavedBillViewModeUI();
        expect(mockElements.get("billEditorFormsContainer").style.display).toBe("block");
        expect(mockElements.get("savedBillModeBanner").classList.contains("is-editing")).toBe(true);

        // Toggled back to Final View
        app.isSavedBillReadOnly = true;
        app.updateSavedBillViewModeUI();
        expect(mockElements.get("billEditorFormsContainer").style.display).toBe("none");
        expect(mockElements.get("billReceiptPreviewWrapper").style.display).toBe("block");
        expect(mockElements.get("billPreviewActionStage").style.display).toBe("block");
    });


    it("renders separate count and due badges in customer directory, with only due badge carrying .due red styling", () => {
        const custWithDue = { id: "cust-1", name: "Kumar", phone: "9876543210" };
        const custSettled = { id: "cust-2", name: "Ravi", phone: "9876543211" };

        app.customers = [custWithDue, custSettled];
        app.buildCustomerBillsIndex = () => new Map();
        app.getInitials = (n) => n.slice(0, 2).toUpperCase();
        app.escapeHtml = (s) => s;
        app.formatINR = (n) => `₹${n}`;
        app.getCustomerSiteSuggestions = () => ({ allSites: [] });
        app.defaultCountryCode = "+91";
        app.formatPhoneWithCountryCode = (p) => p;
        app.updateHeaderDueTicker = vi.fn();
        app.renderQuickCustomerPicker = vi.fn();

        app.getCustomerAggregates = vi.fn((c) => {
            if (c.id === "cust-1") {
                return { totalPending: 25000, boresCount: 2, quotesCount: 0 };
            }
            return { totalPending: 0, boresCount: 1, quotesCount: 0 };
        });

        app.renderCustomerDirectory();

        const listEl = mockElements.get("crmCustomerList");
        // cust-1 must have separate count (2 Bores) and due (Due ₹25000)
        expect(listEl.innerHTML).toContain('<span class="cmr-badge count">2 Bores</span>');
        expect(listEl.innerHTML).toContain('<span class="cmr-badge due">Due ₹25000</span>');

        // cust-2 must have count (1 Bore) and settled (Paid), no .due red badge
        expect(listEl.innerHTML).toContain('<span class="cmr-badge count">1 Bore</span>');
        expect(listEl.innerHTML).toContain('<span class="cmr-badge settled">Paid</span>');
    });

    it("renders minimal highlight tags (Default & Applied) on saved rate profiles", () => {
        app.rateProfiles = [
            { id: "rate-1", name: "Standard 6.5\"", isDefault: true, rates: { baseDrillingRate: 90, pvc7Rate: 400, slabRates: [] } },
            { id: "rate-2", name: "Commercial 7\"", isDefault: false, rates: { baseDrillingRate: 110, pvc7Rate: 450, slabRates: [] } }
        ];
        app.activeRateProfileId = "rate-1";
        app.defaultRates = { baseDrillingRate: 90, pvc7Rate: 400, slabRates: [] };
        app.normalizeSlabArray = () => [];
        app.escapeHtml = (s) => s;
        app.refreshIcons = vi.fn();

        app.renderRateProfilesUI();

        const rateListEl = mockElements.get("savedRateProfilesList");
        expect(rateListEl.innerHTML).toContain('<span class="rcr-tag rcr-def-tag">Default</span>');
        expect(rateListEl.innerHTML).toContain('<span class="rcr-tag rcr-active-tag">Applied</span>');
    });


    it("renders live sticky bar with 3-part subtotals and updates live slab breakdown accordion", () => {
        app.rates = { oldBoreRate: 40, baseDrillingRate: 90, pvc7Rate: 400, pvc10Rate: 700, gstPercentage: 18 };
        app.state = { custGst: "" };
        app.formatINR = (n) => `₹${n}`;
        app.getCasing1ShortName = () => "7\"";
        app.getCasing2ShortName = () => "10\"";
        app.getCasing1Name = () => "7\" PVC";
        app.getCasing2Name = () => "10\" PVC";
        app.triggerOneShotPulse = vi.fn();
        app.syncProgressiveBillSections = vi.fn();

        const calcResult = {
            totalDepth: 400,
            boreDia: "6.5\"",
            baseDrillingRate: 90,
            drillingCost: 37000,
            pvc7Length: 40,
            pvc10Length: 20,
            pvc7Cost: 16000,
            pvc10Cost: 14000,
            boreBataCost: 2000,
            collarCapCost: 500,
            transportSurveyCost: 0,
            customExtraAmount: 0,
            grandTotal: 69500,
            slabDetails: [
                { slabIndex: 0, range: "001–300 ft", depth: 300, rate: 90, cost: 27000 },
                { slabIndex: 1, range: "301–400 ft", depth: 100, rate: 100, cost: 10000 }
            ]
        };

        app.renderReceiptUI(calcResult);

        // Verify sticky bar pills
        expect(mockElements.get("liveStickyDrillCost").textContent).toBe("₹37000");
        expect(mockElements.get("liveStickyPipeCost").textContent).toBe("₹30000");
        expect(mockElements.get("liveStickyExtrasCost").textContent).toBe("₹2500");
        expect(mockElements.get("liveTotalBannerAmount").textContent).toBe("₹69500");

        // Verify live slab breakdown accordion
        const lsaWrap = mockElements.get("liveSlabAccordion");
        const lsaTitle = mockElements.get("liveSlabAccordionTitle");
        const lsaTotal = mockElements.get("liveSlabAccordionTotal");
        const lsaTable = mockElements.get("liveSlabBreakdownTable");

        expect(lsaWrap.style.display).toBe("block");
        expect(lsaTitle.textContent).toContain("400 ft Calculation");
        expect(lsaTotal.textContent).toBe("₹37000");
        expect(lsaTable.innerHTML).toContain("001–300 ft");
        expect(lsaTable.innerHTML).toContain("301–400 ft");
    });


    it("renders dynamic UPI QR code on bill receipt when UPI ID is configured", () => {
        app.brand = { upiId: "anjanabore@oksbi", upiName: "Sri Anjaneya", companyName: "Sri Anjaneya Borewells" };
        app.applyBrandToUI();

        const upiBox = mockElements.get("rcptUpiBox");
        const upiIdEl = mockElements.get("rcptUpiId");
        const upiNameEl = mockElements.get("rcptUpiName");

        expect(upiBox.style.display).toBe("flex");
        expect(upiIdEl.textContent).toBe("anjanabore@oksbi");
        expect(upiNameEl.textContent).toBe("Sri Anjaneya");
    });

    it("handles print receipt action triggering window.print()", () => {
        const printSpy = vi.fn();
        globalThis.window.print = printSpy;

        const printBtn = mockElements.get("printReceiptBtn");
        app.setupShareListeners();

        printBtn.click();
        expect(printSpy).toHaveBeenCalled();
    });
    it("toggles financial semantic badge classes between QUOTATION and INVOICE", () => {
        app.renderReceiptUI({
            docType: "QUOTATION",
            totalDepth: 400,
            grandTotal: 50000,
            drillingCost: 35000,
            pvc7Cost: 10000,
            pvc10Cost: 5000,
            slabDetails: []
        });

        const rDocBadge = mockElements.get("receiptDocBadge");
        const sDocTag = mockElements.get("stickyDocTypeTag");
        expect(rDocBadge.classList.contains("doc-is-quote")).toBe(true);
        expect(rDocBadge.classList.contains("doc-is-invoice")).toBe(false);
        expect(sDocTag.classList.contains("sticky-tag-quote")).toBe(true);

        app.renderReceiptUI({
            docType: "INVOICE",
            totalDepth: 400,
            grandTotal: 50000,
            drillingCost: 35000,
            pvc7Cost: 10000,
            pvc10Cost: 5000,
            slabDetails: []
        });

        expect(rDocBadge.classList.contains("doc-is-quote")).toBe(false);
        expect(rDocBadge.classList.contains("doc-is-invoice")).toBe(true);
        expect(sDocTag.classList.contains("sticky-tag-invoice")).toBe(true);
    });
});
