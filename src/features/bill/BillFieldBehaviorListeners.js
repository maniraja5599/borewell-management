// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { DEPTH_SLABS_DEFINITION } from '../../config/constants.js';
import { STORAGE_KEYS } from '../../data/storage.js';

export class BillFieldBehaviorListeners {
    setupBillFieldBehaviorListeners() {
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

        // Depth sanity checks when the field is left (not while typing): a typo like 5000 for 500
        // used to price a ₹1 crore bill without a word.
        const depthEl = document.getElementById('totalDepth');
        const oldDepthEl = document.getElementById('oldBoreDepth');
        const checkDepths = () => {
            const maxDepth = parseInt(depthEl?.max, 10) || 2500;
            const depth = parseInt(depthEl?.value, 10) || 0;
            if (depth > maxDepth) {
                depthEl.value = String(maxDepth);
                this.showToast(`⚠️ ${depth} ft is too deep — set to the ${maxDepth} ft maximum. Please check the depth.`);
                this.calculateAndRender();
            }
            const oldDepth = parseInt(oldDepthEl?.value, 10) || 0;
            const nowDepth = parseInt(depthEl?.value, 10) || 0;
            if (this.state.drillingType === 'repair' && oldDepth > 0 && nowDepth > 0 && oldDepth > nowDepth) {
                this.showToast(`⚠️ Old bore depth (${oldDepth} ft) is more than the total depth (${nowDepth} ft)`);
            }
        };
        depthEl?.addEventListener('change', checkDepths);
        oldDepthEl?.addEventListener('change', checkDepths);

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
                        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
                    }
                    this.saveToStorage(STORAGE_KEYS.rates, this.rates);
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
            this.saveToStorage(STORAGE_KEYS.rates, this.rates);
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
                this.updateQuickTabJumpLabel(e.target);
                this.updateQuickTabJumpPosition();
                this.syncTopHeaderWrapLock();
                setTimeout(() => this.updateQuickTabJumpPosition(), 100);
                setTimeout(() => this.updateQuickTabJumpPosition(), 280);
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
                this.updateQuickTabJumpLabel();
                this.updateQuickTabJumpPosition();
                this.syncTopHeaderWrapLock();
            }, 100);
        });

        // Customer Tab Toolbar: Due Sort & Date Filter
    }
}
