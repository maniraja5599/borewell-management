// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class SitesMixin {
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
        this.saveToStorage(STORAGE_KEYS.customers, this.customers);
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
                <button type="button" class="site-sug-chip ${isAct ? 'active' : ''}" data-site="${this.escapeHtml(item.name)}">
                    ${item.icon} ${this.escapeHtml(item.name)}
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
                <button type="button" class="smart-site-option" data-pick-site="${this.escapeHtml(currentSite)}">
                    <div class="sso-left">
                        <span class="sso-icon">✨</span>
                        <span class="sso-name">Use "${this.escapeHtml(currentSite)}"</span>
                    </div>
                    <span class="sso-badge new-site">+ New Site</span>
                </button>
            `;
        }

        filtered.slice(0, 12).forEach(p => {
            const isCurrent = currentSite && p.name.toLowerCase() === q;
            optionsHtml += `
                <button type="button" class="smart-site-option ${isCurrent ? 'is-active' : ''}" data-pick-site="${this.escapeHtml(p.name)}">
                    <div class="sso-left">
                        <span class="sso-icon">${p.icon}</span>
                        <span class="sso-name">${this.escapeHtml(p.name)}</span>
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
}
