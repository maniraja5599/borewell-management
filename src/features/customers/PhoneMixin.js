// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { COUNTRY_DIAL_CODES } from '../../config/constants.js';
import { STORAGE_KEYS, storage } from '../../data/storage.js';

export class PhoneMixin {
    initDefaultCountryCode() {
        try {
            const saved = (storage.getRaw(STORAGE_KEYS.defaultCountryCode) || '').trim();
            if (saved && COUNTRY_DIAL_CODES.some(c => c.code === saved)) {
                return saved;
            }
        } catch (e) { /* ignore */ }
        // First-time default: always Indian country code (+91)
        try {
            storage.setRaw(STORAGE_KEYS.defaultCountryCode, '+91');
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
            storage.setRaw(STORAGE_KEYS.defaultCountryCode, meta.code);
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
                this.saveToStorage(STORAGE_KEYS.customers, this.customers);
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
                this.saveToStorage(STORAGE_KEYS.history, this.history);
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
                    this.saveToStorage(STORAGE_KEYS.brand, this.brand);
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
                <span>⚠️ Mobile <strong>${this.escapeHtml(val.fullPhone)}</strong> already registered to <strong>${this.escapeHtml(dup.name)}</strong>${dup.village ? ` (${this.escapeHtml(dup.village)})` : ''}!</span>
                <div class="phone-dup-actions">
                    ${!isSameSelected ? `<button type="button" class="phone-dup-btn primary" id="applyDupCustToBillBtn">Use ${this.escapeHtml(dup.name)}</button>` : ''}
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
                <span>⚠️ Warning: Mobile <strong>${this.escapeHtml(val.fullPhone)}</strong> already exists for <strong>${this.escapeHtml(dupCust.name)}</strong>${dupCust.village ? ` (${this.escapeHtml(dupCust.village)})` : ''}!</span>
                <div class="phone-dup-actions">
                    <button type="button" class="phone-dup-btn primary" id="switchCrmToExistingCustBtn">Edit ${this.escapeHtml(dupCust.name)}</button>
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
}
