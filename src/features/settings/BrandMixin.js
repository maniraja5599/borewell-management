// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class BrandMixin {
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
        this.saveToStorage(STORAGE_KEYS.brand, this.brand);
        this.saveToStorage(STORAGE_KEYS.rates, this.rates);
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
        this.brand.upiName = (document.getElementById('brandUpiName')?.value || '').trim();
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
            this.saveToStorage(STORAGE_KEYS.brand, this.brand);
            this.saveToStorage(STORAGE_KEYS.rates, this.rates);
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
            violet: '#7c3aed',
            slate: '#0f172a',
            teal: '#0f766e',
            copper: '#c2410c',
            indigo: '#4338ca',
            graphite: '#334155'
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

        const headerCompEl = document.getElementById('headerCompanyName');
        if (headerCompEl) {
            headerCompEl.textContent = compName;
        }
        const headerTaglineEl = document.getElementById('headerCompanyTagline');
        if (headerTaglineEl) {
            headerTaglineEl.textContent = tagline;
            headerTaglineEl.style.display = 'none'; // Slogan completely hidden in top fixed bar
        }
        const headerLocKicker = document.getElementById('marqueeLocKicker');
        if (headerLocKicker) {
            const locText = (address.split(',')[0] || '').trim();
            headerLocKicker.textContent = locText ? `📍 ${locText}` : '';
        }

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
            const phoneRow = rcptPhoneEl.closest('span');
            if (phoneRow) phoneRow.style.display = phones ? '' : 'none';
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
        const upiTxt = (b.upiId && b.upiId.trim()) 
            ? (b.upiName ? `${b.upiId.trim()} (${b.upiName})` : b.upiId.trim()) 
            : 'Not Set';
        setCardTxt('brandCardUpiText', upiTxt);
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
            const upiNameLine = document.getElementById('rcptUpiNameLine');
            const upiNameVal = document.getElementById('rcptUpiName');
            if (upiNameLine && upiNameVal) {
                if (b.upiName && b.upiName.trim()) {
                    upiNameVal.textContent = b.upiName.trim();
                    upiNameLine.style.display = 'block';
                } else {
                    upiNameLine.style.display = 'none';
                }
            }
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
        setInputIfNotFocused('brandUpiName', b.upiName || '');
        setInputIfNotFocused('brandTermsNote', quoteTermsNote);
        setInputIfNotFocused('brandFinalBillTermsNote', finalBillTermsNote);

        const themeLabels = {
            emerald: 'Emerald Green',
            royal: 'Royal Blue',
            crimson: 'Rig Red',
            amber: 'Earth Gold',
            violet: 'Royal Violet',
            slate: 'Slate Dark',
            teal: 'Aqua Teal',
            copper: 'Copper Bronze',
            indigo: 'Deep Indigo',
            graphite: 'Graphite Pro'
        };

        const activeLbl = document.getElementById('activeThemeBadgeLabel');
        if (activeLbl) {
            activeLbl.textContent = `Active: ${themeLabels[themeName] || themeName}`;
        }

        const tlpName = document.getElementById('tlpSampleCompanyName');
        if (tlpName) {
            tlpName.textContent = compName;
        }

        document.querySelectorAll('.theme-swatch, .theme-preset-card').forEach(sw => {
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
                this.saveToStorage(STORAGE_KEYS.brand, this.brand);
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
}
