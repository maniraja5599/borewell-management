// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';
import { resetSyncBaseline } from '../../cloud/sync.js';
import { neutralize, sanitizeList } from '../../data/sanitize.js';

export class BackupMixin {
    applyBackupPayload(rawParsed) {
                // A backup file may come from anyone: clean it before anything is saved or shown.
                const parsed = neutralize(rawParsed || {});
                const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
                // Must run first: the next cloud sync then merges the backup with the cloud
                // instead of deleting every bill that is missing from the backup.
                try { resetSyncBaseline(); } catch (_) { /* not signed in */ }
                try {
                    if (isObj(parsed.brand)) {
                        this.brand = { ...this.defaultBrand, ...parsed.brand };
                        this.saveToStorage(STORAGE_KEYS.brand, this.brand);
                    }
                    if (isObj(parsed.rates)) {
                        this.rates = { ...this.defaultRates, ...parsed.rates };
                        this.saveToStorage(STORAGE_KEYS.rates, this.rates);
                    }
                    if (Array.isArray(parsed.rateProfiles) && parsed.rateProfiles.length > 0) {
                        this.rateProfiles = parsed.rateProfiles.filter(isObj);
                        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
                    }
                    if (Array.isArray(parsed.customers)) {
                        this.customers = sanitizeList(parsed.customers, 'cust');
                        this.saveToStorage(STORAGE_KEYS.customers, this.customers, []);
                    }
                    if (Array.isArray(parsed.history)) {
                        this.history = sanitizeList(parsed.history, 'bill');
                        this.saveToStorage(STORAGE_KEYS.history, this.history, []);
                    }
                    if (Array.isArray(parsed.savedExtras)) {
                        this.savedExtras = parsed.savedExtras.filter((x) => x !== null && x !== undefined);
                        this.saveToStorage(STORAGE_KEYS.savedExtras, this.savedExtras);
                    }
                    if (isObj(parsed.waFormat)) {
                        this.waFormat = { ...this.defaultWaFormat, ...parsed.waFormat };
                        this.saveToStorage(STORAGE_KEYS.waFormat, this.waFormat);
                    }
                    if (Array.isArray(parsed.stock)) {
                        this.saveToStorage(STORAGE_KEYS.stock, sanitizeList(parsed.stock, 'stk'), []);
                        try { window.dispatchEvent(new CustomEvent('drillrig:stock-changed')); } catch (_) { /* ignore */ }
                    }
                    // Rig work lists (backups from v2.9.1 on); older backups leave them as they are.
                    for (const [key, list, prefix, evt] of [
                        [STORAGE_KEYS.workers, parsed.workers, 'wkr', 'workers'],
                        [STORAGE_KEYS.tools, parsed.tools, 'tool', 'tools'],
                        [STORAGE_KEYS.cash, parsed.cash, 'cash', 'cash'],
                        [STORAGE_KEYS.attendance, parsed.attendance, 'att', 'attendance']
                    ]) {
                        if (!Array.isArray(list)) continue;
                        this.saveToStorage(key, sanitizeList(list, prefix), []);
                        try { window.dispatchEvent(new CustomEvent(`drillrig:${evt}-changed`)); } catch (_) { /* ignore */ }
                    }
                    if (Array.isArray(parsed.savedNotes)) {
                        this.savedNotes = parsed.savedNotes.filter((x) => x !== null && x !== undefined);
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
