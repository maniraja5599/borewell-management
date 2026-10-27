// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class NotesExtrasMixin {
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
        this.saveToStorage(STORAGE_KEYS.savedNotes, this.savedNotes);
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

        this.saveToStorage(STORAGE_KEYS.savedExtras, this.savedExtras);
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
                            <span>${isActive ? '✓ ' : icon + ' '}${this.escapeHtml(item.label)} • ${this.formatINR(item.amount)}</span>
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
                            this.saveToStorage(STORAGE_KEYS.savedExtras, this.savedExtras);
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
                            <span class="sso-name">${this.escapeHtml(item.label)}</span>
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
}
