// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class CustomerRecordMixin {
    upsertCustomerRecord({ name, phone, countryCode = null, village, site = '', allowOverwrite = false }) {
        const cleanName = (name || '').trim();
        const parsed = this.parsePhoneWithCountryCode(phone, countryCode || this.defaultCountryCode);
        const cleanPhone = parsed.localDigits;
        const formattedPhone = cleanPhone ? `${parsed.countryCode} ${cleanPhone}` : '';
        const cleanVillage = (village || '').trim();
        const cleanSite = (site || '').trim();
        if (!cleanName && !cleanPhone) return null;

        let existing = null;
        if (cleanPhone.length >= parsed.meta.minLen) {
            existing = this.customers.find(c => this.normalizeMobileNumber(c.phone) === cleanPhone);
        }
        if (!existing && cleanName && !cleanPhone) {
            existing = this.customers.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
        }

        if (existing) {
            if (allowOverwrite || !existing.name || existing.name.toLowerCase() === cleanName.toLowerCase()) {
                existing.name = cleanName || existing.name;
                if (formattedPhone) {
                    existing.phone = formattedPhone;
                    existing.countryCode = parsed.countryCode;
                }
                existing.village = cleanVillage || existing.village;
                if (!Array.isArray(existing.sites)) existing.sites = [];
                if (cleanSite && cleanSite.toLowerCase() !== (existing.village || '').toLowerCase()) {
                    if (!existing.sites.some(s => s.toLowerCase() === cleanSite.toLowerCase())) {
                        existing.sites.unshift(cleanSite);
                    }
                }
                delete existing.rig;
                existing.updatedAt = new Date().toISOString();
            }
        } else {
            const initialSites = [];
            if (cleanSite && cleanSite.toLowerCase() !== cleanVillage.toLowerCase()) {
                initialSites.push(cleanSite);
            }
            existing = {
                id: 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name: cleanName || 'Customer',
                phone: formattedPhone,
                countryCode: parsed.countryCode,
                village: cleanVillage,
                sites: initialSites,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.customers.unshift(existing);
        }

        this.saveToStorage(STORAGE_KEYS.customers, this.customers);
        this.renderCustomerDirectory();
        return existing;
    }
}
