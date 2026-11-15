// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { DEPTH_SLABS_DEFINITION } from '../../config/constants.js';
import { STORAGE_KEYS } from '../../data/storage.js';
import { ratesForSavedBill } from '../../core/billRates.js';

export class RatesMixin {
    getDefaultRateProfile() {
        return this.rateProfiles.find(p => p.isDefault) || this.rateProfiles[0];
    }

    getActiveRateProfile() {
        return this.rateProfiles.find(p => p.id === this.activeRateProfileId) || this.getDefaultRateProfile();
    }

    /** The company's live rates, even while a saved bill (with its own prices) is open. */
    liveRates() {
        return this.ratesBeforeBillEdit || this.rates;
    }

    /** Open a saved bill with the prices it was billed at; the live rates are kept aside. */
    useSavedBillRates(snapshot) {
        if (!this.ratesBeforeBillEdit) {
            this.ratesBeforeBillEdit = JSON.parse(JSON.stringify(this.rates));
        }
        this.rates = ratesForSavedBill(snapshot, this.ratesBeforeBillEdit);
    }

    /** Leaving a saved bill: back to the live rates for new bills. */
    restoreLiveRates() {
        if (!this.ratesBeforeBillEdit) return;
        this.rates = this.ratesBeforeBillEdit;
        this.ratesBeforeBillEdit = null;
        const baseInput = document.getElementById('baseDrillingRate');
        if (baseInput) baseInput.value = this.rates.baseDrillingRate;
        this.populateRateInputsUI(this.getActiveRateProfile());
        this.renderMasterSlabsGrid();
    }

    /** Copy of the live rates to store inside a rate card (without the live-only profileId). */
    ratesForProfile() {
        const copy = JSON.parse(JSON.stringify(this.rates));
        delete copy.profileId;
        return copy;
    }

    toggleRateStudio(forceOpen = null) {
        const studioCard = document.getElementById('rateEditorCard');
        if (!studioCard) return;
        const willOpen = forceOpen !== null ? forceOpen : (studioCard.style.display === 'none');
        studioCard.style.display = willOpen ? 'block' : 'none';
        if (willOpen) {
            // The editor works on this.rates, which is also what the bill uses.
            // Keep a copy so closing without saving puts the bill's rates back.
            if (!this.ratesBeforeStudio) {
                this.ratesBeforeStudio = JSON.parse(JSON.stringify(this.rates));
            }
            setTimeout(() => studioCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        } else if (this.ratesBeforeStudio) {
            this.rates = this.ratesBeforeStudio;
            this.ratesBeforeStudio = null;
            const baseInput = document.getElementById('baseDrillingRate');
            if (baseInput) baseInput.value = this.rates.baseDrillingRate;
            this.populateRateInputsUI(this.getActiveRateProfile());
            this.renderMasterSlabsGrid();
            this.calculateAndRender();
        }
    }

    isRateStudioOpen() {
        const studioCard = document.getElementById('rateEditorCard');
        return Boolean(studioCard && studioCard.style.display !== 'none');
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

        // 2. Rates page: one card per rate (figures, slab ladder, Use / Edit / Default / Delete)
        const headSub = document.getElementById('ratesHeadSub');
        if (headSub && activeProf) {
            headSub.textContent = `New bills use ${activeProf.name}`;
        }
        const listEl = document.getElementById('savedRateProfilesList');
        if (!listEl) return;
        const canDelete = this.rateProfiles.length > 1;

        listEl.innerHTML = this.rateProfiles.map((p, idx) => {
            const num = idx + 1;
            const r = p.rates || this.defaultRates;
            const isActive = p.id === this.activeRateProfileId;
            const isEditing = studioVisible && p.id === editingId;
            const slabs = this.normalizeSlabArray(r.slabRates, r.baseDrillingRate || 90);
            const endFt = slabs[slabs.length - 1]?.end || 0;
            const firstEnd = slabs[0]?.end || 300;
            return `
                <div class="rate-clean-row rc2 ${isActive ? 'is-active-rate' : ''} ${isEditing ? 'is-editing-card' : ''}" data-rateid="${p.id}">
                    <div class="rc2-top">
                        <span class="rc2-num">${num}</span>
                        <div class="rc2-title">
                            <span class="rcr-name">${this.escapeHtml(p.name)}</span>
                            <span class="rc2-tags">${p.isDefault ? '<span class="rcr-tag rcr-def-tag">Default</span>' : ''}${isActive ? '<span class="rcr-tag rcr-active-tag">Applied</span>' : ''}</span>
                        </div>
                        <span class="rc2-chev" aria-hidden="true">›</span>
                    </div>
                    <div class="rc2-figs">
                        <div><span>Drilling</span><strong>₹${r.baseDrillingRate}<small>/ft</small></strong><em>1–${firstEnd} ft</em></div>
                        <div><span>${this.escapeHtml((this.getCasing1Name?.() || '7"').replace(/\s*casing\s*pipe/i, ''))} pipe</span><strong>₹${r.pvc7Rate}<small>/ft</small></strong></div>
                        <div><span>${this.escapeHtml((this.getCasing2Name?.() || '10"').replace(/\s*casing\s*pipe/i, ''))} pipe</span><strong>₹${r.pvc10Rate}<small>/ft</small></strong></div>
                        <div><span>Slabs</span><strong>${slabs.length}</strong><em>to ${endFt.toLocaleString('en-IN')} ft</em></div>
                    </div>
                    <div class="rc2-actions">
                        <button type="button" class="rcr-action-btn rcr-apply-btn ${isActive ? 'is-applied' : ''}" data-applybtn="${p.id}" title="${isActive ? 'New bills use this rate' : 'Use this rate on bills'}">${isActive ? '✓ In use on bills' : 'Use on bills'}</button>
                        <button type="button" class="rcr-action-btn rcr-edit-btn" data-editbtn="${p.id}" title="Edit this rate"><i data-lucide="pencil" class="icon-xs"></i><span>Edit</span></button>
                        <button type="button" class="rcr-icon-btn rcr-default-btn ${p.isDefault ? 'is-def' : ''}" data-defbtn="${p.id}" title="${p.isDefault ? 'Default rate' : 'Make default'}" aria-label="${p.isDefault ? 'Default rate' : 'Make default'}">★</button>
                        ${canDelete ? `<button type="button" class="rcr-icon-btn rcr-del-btn" data-delbtn="${p.id}" title="Delete rate" aria-label="Delete ${this.escapeHtml(p.name)}"><i data-lucide="trash-2" class="icon-xs"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        this.refreshIcons();

        listEl.querySelectorAll('.rcr-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRateProfileInStudio(btn.dataset.editbtn);
            });
        });

        listEl.querySelectorAll('.rcr-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRateProfile(btn.dataset.delbtn);
            });
        });

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
        if (titleEl) titleEl.textContent = p.name;
        if (subEl) subEl.textContent = `${slabs.length} slabs · up to ${maxEndDepth.toLocaleString('en-IN')} ft`;

        const fig = (lbl, val, sub = '') => `<div class="rd2-fig"><span>${lbl}</span><strong>${val}</strong>${sub ? `<em>${sub}</em>` : ''}</div>`;
        bodyEl.innerHTML = `
            <div class="rd2-chips">
                ${p.isDefault ? '<span class="rd2-chip is-def">★ Default rate</span>' : ''}
                ${isActive ? '<span class="rd2-chip is-use">✓ In use on bills</span>' : '<span class="rd2-chip">Not in use</span>'}
            </div>
            <section class="rd2-card" aria-label="Prices">
                <div class="rd2-figs">
                    ${fig('Drilling', `₹${r.baseDrillingRate}/ft`, baseRangeText)}
                    ${fig('Old bore flushing', `₹${r.oldBoreRate}/ft`)}
                    ${fig(this.escapeHtml(this.getCasing1Name?.() || '7" casing pipe'), `₹${r.pvc7Rate}/ft`)}
                    ${fig(this.escapeHtml(this.getCasing2Name?.() || '10" casing pipe'), `₹${r.pvc10Rate}/ft`)}
                    ${fig('Bore bata', this.formatINR(r.boreBataRate ?? 2000), 'per bore')}
                    ${fig('GST · grace', `${r.gstPercentage ?? 18}%`, `${r.slabBufferFt ?? 5} ft grace`)}
                </div>
            </section>
            <section class="rd2-card" aria-label="Depth slabs">
                <div class="rd2-sec-head"><span>Depth slabs</span><span>${slabs.length} · 1–${maxEndDepth.toLocaleString('en-IN')} ft</span></div>
                <div class="rd2-slabs">
                    ${slabs.map((x, i) => `
                        <div class="rd2-slab">
                            <span class="rd2-s-range">${this.escapeHtml(x.rangeStr)}</span>
                            <span class="rd2-s-step">${i === 0 ? 'Base' : this.formatSlabStep(x.rate - slabs[i - 1].rate)}</span>
                            <strong class="rd2-s-rate">₹${x.rate}</strong>
                        </div>`).join('')}
                </div>
            </section>
        `;

        footEl.innerHTML = `
            <button type="button" class="bdm-act is-pri" id="rdmFootApplyBtn">${isActive ? '✓ In use · New bill' : 'Use on bills'}</button>
            <button type="button" class="bdm-act" id="rdmFootEditBtn">Edit</button>
            <button type="button" class="bdm-act ${p.isDefault ? 'is-def-on' : ''}" id="rdmMakeDefaultBtn">${p.isDefault ? '★ Default' : '☆ Make default'}</button>
            ${this.rateProfiles.length > 1 ? '<button type="button" class="bdm-act is-danger" id="rdmFootDeleteBtn">Delete</button>' : ''}
        `;
        footEl.classList.toggle('has-four', this.rateProfiles.length > 1);

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
            this.deleteRateProfile(p.id);
        });

        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    /** Ask, then delete a rate card (with Undo). Used by the list row and the detail popup. */
    deleteRateProfile(profileId) {
        if (this.rateProfiles.length <= 1) return;
        const targetId = profileId;
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
                this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
                this.renderRateProfilesUI();
                this.applyBrandToUI();

                this.showUndoToast(`🗑️ Deleted Rate "${deletedProf.name}"`, () => {
                    if (!this.rateProfiles.some(x => x.id === deletedProf.id)) {
                        if (deletedProf.isDefault) {
                            this.rateProfiles.forEach(pr => { pr.isDefault = false; });
                        }
                        const insertAt = Math.min(origIdx, this.rateProfiles.length);
                        this.rateProfiles.splice(insertAt, 0, deletedProf);
                        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
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
    }

    closeRateDetailModal() {
        const overlay = document.getElementById('rateDetailModalOverlay');
        if (overlay) overlay.style.display = 'none';
        this.activeDetailRateId = null;
    }

    setRateStudioStage(targetStage = 1) {
        this.currentRateStage = Math.max(1, Math.min(4, targetStage));
        this.syncRateStudioProgressiveUI();
    }

    syncRateStudioProgressiveUI() {
        const stage = this.currentRateStage || 1;
        const nameVal = (document.getElementById('masterProfileName')?.value || '').trim();
        const baseVal = document.getElementById('masterBaseRate')?.value || '90';
        const flushVal = document.getElementById('masterOldBoreRate')?.value || '40';
        const bufVal = document.getElementById('masterSlabBuffer')?.value || '5';
        const p7Val = document.getElementById('masterPvc7Rate')?.value || '400';
        const p10Val = document.getElementById('masterPvc10Rate')?.value || '700';
        const bataVal = document.getElementById('masterBoreBata')?.value || '2000';
        const gstVal = document.getElementById('masterGstPercent')?.value || '18';

        // 1. Update Stepper Progress Indicators
        for (let i = 1; i <= 4; i++) {
            const ind = document.getElementById(`rateStepInd${i}`);
            if (ind) {
                ind.classList.toggle('active', i === stage);
                ind.classList.toggle('completed', i < stage);
            }
        }

        // 2. Stage 1: Rate Card Name
        const s1Card = document.getElementById('rateStage1Card');
        const s1Sum = document.getElementById('rateStage1SummaryBar');
        const s1Title = document.getElementById('rateStage1SummaryTitle');
        const s1Sub = document.getElementById('rateStage1SummarySub');
        if (s1Title) s1Title.textContent = nameVal || 'Unnamed Rate Card';
        const isDef = document.getElementById('masterIsDefaultCheckbox')?.checked;
        if (s1Sub) s1Sub.textContent = isDef ? '★ Default Price List for New Bills' : 'Saved Rate Card Profile';

        if (stage === 1) {
            if (s1Card) s1Card.style.display = 'block';
            if (s1Sum) s1Sum.style.display = 'none';
        } else {
            if (s1Card) s1Card.style.display = 'none';
            if (s1Sum) s1Sum.style.display = 'flex';
        }

        // 3. Stage 2: Base Rate & Flushing
        const s2Card = document.getElementById('rateStage2Card');
        const s2Sum = document.getElementById('rateStage2SummaryBar');
        const s2Title = document.getElementById('rateStage2SummaryTitle');
        const s2Sub = document.getElementById('rateStage2SummarySub');
        if (s2Title) s2Title.textContent = `Base Rate: ₹${baseVal}/ft`;
        if (s2Sub) s2Sub.textContent = `Old Bore Flush: ₹${flushVal}/ft • Buffer: ${bufVal} ft`;

        if (stage === 2) {
            if (s2Card) s2Card.style.display = 'block';
            if (s2Sum) s2Sum.style.display = 'none';
        } else if (stage > 2) {
            if (s2Card) s2Card.style.display = 'none';
            if (s2Sum) s2Sum.style.display = 'flex';
        } else {
            if (s2Card) s2Card.style.display = 'none';
            if (s2Sum) s2Sum.style.display = 'none';
        }

        // 4. Stage 3: Pipes & Bata
        const s3Card = document.getElementById('rateStage3Card');
        const s3Sum = document.getElementById('rateStage3SummaryBar');
        const s3Title = document.getElementById('rateStage3SummaryTitle');
        const s3Sub = document.getElementById('rateStage3SummarySub');
        if (s3Title) s3Title.textContent = `Pipes: 7" ₹${p7Val} • 10" ₹${p10Val}/ft`;
        if (s3Sub) s3Sub.textContent = `Bata: ₹${bataVal} • GST: ${gstVal}%`;

        if (stage === 3) {
            if (s3Card) s3Card.style.display = 'block';
            if (s3Sum) s3Sum.style.display = 'none';
        } else if (stage > 3) {
            if (s3Card) s3Card.style.display = 'none';
            if (s3Sum) s3Sum.style.display = 'flex';
        } else {
            if (s3Card) s3Card.style.display = 'none';
            if (s3Sum) s3Sum.style.display = 'none';
        }

        // 5. Stage 4: Depth Slabs Editor
        const s4Card = document.getElementById('rateStage4Card');
        if (s4Card) {
            s4Card.style.display = (stage === 4) ? 'block' : 'none';
            if (stage === 4) {
                // Always show the slab ladder (rows, + Step, Add Next, Auto-Fill). It used to stay
                // hidden for a new card until a base-span pill was tapped, so cards got saved with 1 slab.
                this.revealStage4SubsequentSlabs(true);
                this.renderMasterSlabsGrid();
            }
        }

        this.refreshIcons();
    }

    revealStage4SubsequentSlabs(show = true) {
        this.baseSlabConfirmed = show;
        const subBox = document.getElementById('stage4SubsequentSlabsBox');
        const stepBox = document.getElementById('stage4StepAdjusterBox');
        if (subBox) subBox.style.display = show ? 'block' : 'none';
        if (stepBox) stepBox.style.display = show ? 'block' : 'none';
    }

    switchStudioSubTab(viewMode = 'core') {
        // Compatibility mapper for any legacy call
        if (viewMode === 'core') this.setRateStudioStage(2);
        else if (viewMode === 'slabs') this.setRateStudioStage(4);
        else this.setRateStudioStage(1);
    }

    applyRateProfileToBill(profileId, showNotification = true) {
        const prof = this.rateProfiles.find(p => p.id === profileId) || this.getDefaultRateProfile();
        if (!prof) return;

        // Applying a card ends any unsaved edit, otherwise closing the editor later
        // would put the old rates back over the card just applied.
        if (this.isRateStudioOpen()) this.toggleRateStudio(false);
        // Applying a card while a saved bill is open re-prices that bill with the card,
        // and the card also becomes the live rate for new bills.
        if (this.ratesBeforeBillEdit) {
            this.ratesBeforeBillEdit = { ...JSON.parse(JSON.stringify(prof.rates)), profileId: prof.id };
        }

        this.activeRateProfileId = prof.id;
        this.state.activeRateProfileId = prof.id;
        this.rates = JSON.parse(JSON.stringify(prof.rates));
        this.rates.profileId = prof.id;
        if (this.rates.boreBataRate === undefined || this.rates.boreBataRate === null) {
            this.rates.boreBataRate = 2000;
        }
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.saveToStorage(STORAGE_KEYS.rates, this.rates);

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
        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
        this.applyRateProfileToBill(profileId, false);
        this.showToast(`★ "${target.name}" set as Default Rate!`);
    }

    loadRateProfileIntoEditor(prof) {
        if (!prof) return;
        this.rates = JSON.parse(JSON.stringify(prof.rates));
        this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.populateRateInputsUI(prof);
        this.renderMasterSlabsGrid();
        this.setRateStudioStage(1);
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
                modeBadge.textContent = `Editing · ${prof.name}`;
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
        if (stepInp) stepInp.value = this.uniformSlabStep(this.normalizeSlabArray(r.slabRates, r.baseDrillingRate || 90)) ?? 10;
    }

    // The step every slab shares (e.g. all +₹10), or null when the steps differ.
    uniformSlabStep(slabs) {
        if (!slabs || slabs.length < 2) return null;
        const first = slabs[1].rate - slabs[0].rate;
        return slabs.every((x, i) => i === 0 || x.rate - slabs[i - 1].rate === first) ? first : null;
    }

    formatSlabStep(diff) {
        if (diff > 0) return `+₹${diff}`;
        if (diff < 0) return `−₹${Math.abs(diff)}`;
        return 'same';
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
            targetProfile.rates = this.ratesForProfile();
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
                rates: this.ratesForProfile()
            };
            this.rateProfiles.push(targetProfile);
        }

        if (!this.rateProfiles.some(p => p.isDefault)) {
            this.rateProfiles[0].isDefault = true;
        }

        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
        this.ratesBeforeStudio = null; // saved: nothing to put back
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
            masterBaseLbl.textContent = `Drilling (1–${baseSpan} ft)`;
        }
        const tabSlabsLbl = document.getElementById('studioSlabsTabLabel');
        if (tabSlabsLbl) {
            tabSlabsLbl.textContent = `Depth slabs (${slabs.length})`;
        }
        const endFt = last?.end || 0;
        const summary = document.getElementById('slabLadderSummary');
        if (summary) {
            const lower = slabs.findIndex((x, i) => i > 0 && x.rate < slabs[i - 1].rate);
            summary.textContent = '';
            const main = document.createElement('div');
            main.className = 'sls-main';
            main.textContent = `${slabs.length} ${slabs.length === 1 ? 'slab' : 'slabs'} · 1–${endFt} ft · ₹${slabs[0]?.rate || 0} to ₹${last?.rate || 0} per ft`;
            const sub = document.createElement('div');
            sub.className = 'sls-sub';
            sub.textContent = `New bills on this card can go up to ${endFt} ft. Add a slab below to bill deeper.`;
            summary.append(main, sub);
            if (lower > 0) {
                const warn = document.createElement('div');
                warn.className = 'sls-warn';
                warn.textContent = `⚠️ ${slabs[lower].rangeStr} is cheaper than the slab before it. Check the rate.`;
                summary.append(warn);
            }
        }
        const coreHint = document.getElementById('corePanelSlabsHint');
        if (coreHint) coreHint.textContent = `${slabs.length} slabs · up to ${endFt} ft`;
        const stdBase = document.getElementById('slabStandardBaseTxt');
        if (stdBase) stdBase.textContent = String(slabs[0]?.rate || this.rates.baseDrillingRate || 90);
        const uni = this.uniformSlabStep(slabs);
        document.querySelectorAll('.ssg-step-chip').forEach(chip => {
            chip.classList.toggle('active', uni !== null && parseFloat(chip.dataset.stepVal) === uni);
        });
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

    
    openRateProfileInStudio(profileId) {
        const prof = this.rateProfiles.find(p => p.id === profileId);
        if (!prof) return;
        this.toggleRateStudio(true);
        this.loadRateProfileIntoEditor(prof);
        this.switchStudioTab('core');
        this.showToast(`✏️ Editing "${prof.name}"`);
    }

    switchStudioTab(tabName = 'core') {
        const isCore = tabName === 'core';
        const coreBtn = document.getElementById('studioTabBtnCore');
        const slabsBtn = document.getElementById('studioTabBtnSlabs');
        const corePanel = document.getElementById('studioPanelCore');
        const slabsPanel = document.getElementById('studioPanelSlabs');

        if (coreBtn) coreBtn.classList.toggle('active', isCore);
        if (slabsBtn) slabsBtn.classList.toggle('active', !isCore);
        if (corePanel) corePanel.style.display = isCore ? 'block' : 'none';
        if (slabsPanel) slabsPanel.style.display = !isCore ? 'block' : 'none';

        if (!isCore) {
            this.updateSsgBasePill();
            this.renderMasterSlabsGrid();
        }
    }

    updateSsgBasePill() {
        // Shows the card being edited (it used to target a missing element and stay at "₹90/ft").
        const baseVal = this.rates?.baseDrillingRate || 90;
        const firstEnd = this.normalizeSlabArray(this.rates?.slabRates, baseVal)[0]?.end || 300;
        const pill = document.getElementById('ssgBasePillPreview');
        if (pill) pill.textContent = `Base: 1–${firstEnd} ft @ ₹${baseVal}/ft`;
    }

    // Same step on every slab of THIS card. Keeps the card's own rows and ranges (it used to
    // replace them with the built-in 19-row ladder).
    applyStepIncrementToAllSlabs(stepVal) {
        const step = Math.max(0, Math.min(10000, parseFloat(stepVal) || 0));
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates?.baseDrillingRate || 90);
        const before = JSON.parse(JSON.stringify(slabs));
        const baseR = Math.max(1, parseFloat(slabs[0]?.rate) || parseFloat(this.rates?.baseDrillingRate) || 90);
        slabs.forEach((x, idx) => { x.rate = baseR + idx * step; });
        this.rates.slabRates = slabs;

        const customInput = document.getElementById('customSlabStepInput');
        if (customInput) customInput.value = step;

        this.renderMasterSlabsGrid();
        this.calculateAndRender();
        this.showUndoToast(`All ${slabs.length} slabs: ₹${baseR}, then +₹${step} each`, () => {
            this.rates.slabRates = before;
            this.renderMasterSlabsGrid();
            this.calculateAndRender();
        });
    }

    renderMasterSlabsGrid() {
        const grid = document.getElementById('masterSlabsGrid');
        if (!grid) return;

        this.updateSsgBasePill();
        const slabs = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
        this.rates.slabRates = slabs;

        grid.innerHTML = slabs.map((s, idx) => {
            const currentRate = s.rate;
            const prevRate = idx > 0 ? slabs[idx - 1].rate : currentRate;
            const diff = currentRate - prevRate;
            const stepDiff = idx === 0 ? 'Base' : this.formatSlabStep(diff);
            const isBase = idx === 0;
            const isLast = idx === slabs.length - 1 && idx > 0;

            return `
                <div class="slab-clean-row ${isBase ? 'is-base' : ''}" data-row-idx="${idx}">
                    <div class="scr-col-left">
                        <span class="scr-idx">${idx + 1}</span>
                        <span class="scr-range">${this.escapeHtml(s.rangeStr)}</span>
                        <span class="scr-step-badge ${isBase ? 'scr-step-base' : ''} ${!isBase && diff < 0 ? 'scr-step-neg' : ''}" id="stepBadge_${idx}">${stepDiff}</span>
                    </div>
                    <div class="scr-col-right">
                        <div class="scr-rate-wrap">
                            <span class="scr-cur">₹</span>
                            <input type="number" class="slab-edit-input" data-index="${idx}" value="${currentRate}" min="1" step="1" inputmode="numeric" aria-label="Rate for ${this.escapeHtml(s.rangeStr)}">
                            <span class="scr-unit">/ft</span>
                        </div>
                        ${isLast
                            ? `<button type="button" class="slab-row-del-btn" data-del-slab-idx="${idx}" title="Remove the last slab" aria-label="Remove the last slab (${this.escapeHtml(s.rangeStr)})">✕</button>`
                            : '<span class="scr-del-gap" aria-hidden="true"></span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.updateAddNextSlabButtonUI();

        // Listeners for .slab-edit-input
        grid.querySelectorAll('.slab-edit-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const raw = (e.target.value || '').trim();
                if (raw === '') return;
                const idx = parseInt(e.target.dataset.index, 10);
                const val = Math.max(1, parseFloat(raw) || 0);

                this.rates.slabRates[idx].rate = val;

                if (idx === 0) {
                    this.rates.baseDrillingRate = val;
                    this.updateSsgBasePill();
                    const mBase = document.getElementById('masterBaseRate');
                    if (mBase && document.activeElement !== mBase) mBase.value = val;
                    const bBase = document.getElementById('baseDrillingRate');
                    if (bBase && document.activeElement !== bBase) bBase.value = val;
                }

                const setBadge = (i) => {
                    if (i <= 0 || i >= this.rates.slabRates.length) return;
                    const d = this.rates.slabRates[i].rate - this.rates.slabRates[i - 1].rate;
                    const badge = document.getElementById(`stepBadge_${i}`);
                    if (badge) {
                        badge.textContent = this.formatSlabStep(d);
                        badge.classList.toggle('scr-step-neg', d < 0);
                    }
                };
                setBadge(idx);
                setBadge(idx + 1);

                this.updateAddNextSlabButtonUI();
                this.calculateAndRender();
            });
        });

        // Delete buttons
        grid.querySelectorAll('.slab-row-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const delIdx = parseInt(btn.dataset.delSlabIdx, 10);
                // Only the last slab can be removed: removing one in the middle slid every later
                // range down, so its rate quietly applied to shallower depths.
                if (delIdx > 0 && delIdx === this.rates.slabRates.length - 1) {
                    const removedSlab = this.rates.slabRates[delIdx];
                    const backupSlabs = JSON.parse(JSON.stringify(this.rates.slabRates));
                    this.rates.slabRates.splice(delIdx, 1);
                    this.rates.slabRates = this.normalizeSlabArray(this.rates.slabRates, this.rates.baseDrillingRate || 90);
                    this.renderMasterSlabsGrid();
                    this.calculateAndRender();
                    this.showUndoToast(`Removed ${removedSlab.rangeStr || 'the last slab'}`, () => {
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
}
