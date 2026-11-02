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

        globalThis.document = {
            getElementById: (id) => mockElements.get(id) || null,
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
        app.waFormat = { companyHeader: true, slabBreakup: true };
        app.defaultWaFormat = { companyHeader: true, slabBreakup: true };
        app.saveToStorage = vi.fn();
        app.showToast = vi.fn();
        app.renderHistoryList = vi.fn();
        app.history = [];
        app.customers = [];
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
});
