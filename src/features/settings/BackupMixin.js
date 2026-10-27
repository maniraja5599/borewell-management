// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class BackupMixin {
    applyBackupPayload(parsed) {
                try {
                    if (parsed.brand) {
                        this.brand = { ...this.defaultBrand, ...parsed.brand };
                        this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                    }
                    if (parsed.rates) {
                        this.rates = { ...this.defaultRates, ...parsed.rates };
                        this.saveToStorage(STORAGE_KEYS.rates, this.rates);
                    }
                    if (Array.isArray(parsed.rateProfiles) && parsed.rateProfiles.length > 0) {
                        this.rateProfiles = parsed.rateProfiles;
                        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
                    }
                    if (Array.isArray(parsed.customers)) {
                        this.customers = parsed.customers;
                        this.saveToStorage(STORAGE_KEYS.customers, this.customers);
                    }
                    if (Array.isArray(parsed.history)) {
                        this.history = parsed.history;
                        this.saveToStorage(STORAGE_KEYS.history, this.history);
                    }
                    if (Array.isArray(parsed.savedExtras)) {
                        this.savedExtras = parsed.savedExtras;
                        this.saveToStorage(STORAGE_KEYS.savedExtras, this.savedExtras);
                    }
                    if (Array.isArray(parsed.savedNotes)) {
                        this.savedNotes = parsed.savedNotes;
                        this.saveToStorage(STORAGE_KEYS.savedNotes, this.savedNotes);
                    }
                    this.migrateStoredPhonesWithCountryCode();
                    this.applyBrandToUI();
                    this.populateRateInputsUI(this.getActiveRateProfile());
                    this.renderMasterSlabsGrid();
                    this.renderRateProfilesUI();
                    this.renderHistoryList();
                    this.renderCustomerDirectory();
                    this.renderSavedExtrasUI({ showDropdown: false });
                    this.renderSavedNotesUI();
                    this.calculateAndRender();
                    this.showToast('✅ Backup Restored Successfully!');
                } catch (err) {
                    this.showToast('❌ Restore failed — backup file may be damaged');
                }
    }
}
