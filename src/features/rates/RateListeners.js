// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { DEPTH_SLABS_DEFINITION } from '../../config/constants.js';
import { STORAGE_KEYS } from '../../data/storage.js';

export class RateListeners {
    setupBillDrawerAndRateListeners() {
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
                activeProf.rates = this.ratesForProfile();
                this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
            }
            this.saveToStorage(STORAGE_KEYS.rates, this.rates);
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

        // Progressive Step-by-Step Rate Studio Listeners
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`rateStepInd${i}`)?.addEventListener('click', () => {
                this.setRateStudioStage(i);
            });
        }

        // Stage 1: Next & Edit & Enter key
        document.getElementById('rateStage1NextBtn')?.addEventListener('click', () => {
            const nameEl = document.getElementById('masterProfileName');
            const isNewCard = !document.getElementById('editingRateProfileId')?.value;
            if (nameEl && !nameEl.value.trim()) {
                // A new card gets a unique name instead of copying "Standard 6.5" Rate"
                nameEl.value = isNewCard
                    ? `Rate Card ${this.rateProfiles.length + 1}`
                    : 'Standard 6.5" Rate';
            }
            this.setRateStudioStage(2);
            setTimeout(() => document.getElementById('masterBaseRate')?.focus(), 120);
        });
        document.getElementById('masterProfileName')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('rateStage1NextBtn')?.click();
            }
        });
        document.getElementById('rateStage1EditBtn')?.addEventListener('click', () => {
            this.setRateStudioStage(1);
            setTimeout(() => document.getElementById('masterProfileName')?.focus(), 120);
        });

        // Stage 2: Next & Edit & Enter key
        document.getElementById('rateStage2NextBtn')?.addEventListener('click', () => {
            this.setRateStudioStage(3);
            setTimeout(() => document.getElementById('masterPvc7Rate')?.focus(), 120);
        });
        ['masterBaseRate', 'masterOldBoreRate', 'masterSlabBuffer'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('rateStage2NextBtn')?.click();
                }
            });
        });
        document.getElementById('rateStage2EditBtn')?.addEventListener('click', () => {
            this.setRateStudioStage(2);
            setTimeout(() => document.getElementById('masterBaseRate')?.focus(), 120);
        });

        // Stage 3: Next & Edit & Enter key
        document.getElementById('rateStage3NextBtn')?.addEventListener('click', () => {
            this.setRateStudioStage(4);
        });
        ['masterPvc7Rate', 'masterPvc10Rate', 'masterBoreBata', 'masterGstPercent'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('rateStage3NextBtn')?.click();
                }
            });
        });
        document.getElementById('rateStage3EditBtn')?.addEventListener('click', () => {
            this.setRateStudioStage(3);
            setTimeout(() => document.getElementById('masterPvc7Rate')?.focus(), 120);
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

            // Start the new card from the standard slab ladder, moved to the current base rate
            // (e.g. base ₹110 → 110 / 120 / 140 …). Rows can then be edited, removed or added.
            const curBaseRate = this.rates.baseDrillingRate || 90;
            const shift = curBaseRate - DEPTH_SLABS_DEFINITION[0].defaultRate;
            this.rates.slabRates = DEPTH_SLABS_DEFINITION.map(s => ({
                start: s.start,
                end: s.end,
                span: s.span,
                rangeStr: s.rangeStr,
                rate: Math.max(1, s.defaultRate + shift)
            }));

            this.renderMasterSlabsGrid();
            this.setRateStudioStage(1);
            this.renderRateProfilesUI();
            setTimeout(() => nameEl?.focus(), 220);
            this.showToast('➕ Step 1: Enter Rate Card Name');
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

        // 1st Base Slab Quick Range Pills (1–100 ft | 1–200 ft | 1–300 ft | 1–500 ft)
        document.querySelectorAll('#baseSlabSpanPills .sbtc-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const span = parseInt(pill.dataset.baseSpan, 10) || 300;
                this.revealStage4SubsequentSlabs(true);
                this.setBaseSlabSpan(span);
                const baseRateInp = document.querySelector('.slab-edit-input[data-index="0"]');
                if (baseRateInp) {
                    this.focusAndScrollSlabInput(baseRateInp);
                }
            });
        });

        // Start from Row 1 (Step-by-Step Builder Mode)
        document.getElementById('slabStartFromRow1Btn')?.addEventListener('click', () => {
            this.revealStage4SubsequentSlabs(true);
            this.startSlabsFromRow1();
        });

        // "+ Add Next 100 ft" Step-by-Step Button
        document.getElementById('addNextSlabRowBtn')?.addEventListener('click', () => {
            this.revealStage4SubsequentSlabs(true);
            this.addNextSlabRow();
        });

        // Quick Auto-Fill Buttons (1000 ft / 1500 ft / 2200 ft)
        document.getElementById('slabFill1000Btn')?.addEventListener('click', () => {
            this.revealStage4SubsequentSlabs(true);
            this.autoFillSlabsUpTo(1000);
        });
        document.getElementById('slabFill1500Btn')?.addEventListener('click', () => {
            this.revealStage4SubsequentSlabs(true);
            this.autoFillSlabsUpTo(1500);
        });
        document.getElementById('slabFill2200Btn')?.addEventListener('click', () => {
            this.revealStage4SubsequentSlabs(true);
            this.autoFillSlabsUpTo(2200);
        });

        // Master Slabs Step Controls (− Step / + Step defaults to 1)
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

        // Brand Tab Listeners (Direct Company Entry + View Preview Button)
        document.getElementById('jumpToPreviewBtn')?.addEventListener('click', () => {
            const previewCard = document.getElementById('companyLiveHeroCard');
            if (previewCard) {
                previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.showToast('👁️ Viewing Live Header & Business Card Preview');
            }
        });
    }
}
