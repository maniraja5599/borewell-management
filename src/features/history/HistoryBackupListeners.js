// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS } from '../../data/storage.js';

export class HistoryBackupListeners {
    setupHistoryAndBackupListeners() {
        let histSearchDebounceTimer;
        document.getElementById('historySearchInput')?.addEventListener('input', (e) => {
            clearTimeout(histSearchDebounceTimer);
            histSearchDebounceTimer = setTimeout(() => {
                this.historyPage = 1;
                this.renderHistoryList(e.target.value);
            }, 75);
        });
        document.getElementById('clearAllHistoryBtn')?.addEventListener('click', () => {
            if (!this.history || this.history.length === 0) {
                this.showToast('ℹ️ No saved bills to clear');
                return;
            }
            const backupBills = JSON.parse(JSON.stringify(this.history));
            this.confirmDeleteModal({
                title: '⚠️ Clear All Saved Bills?',
                itemLabel: `📚 All ${backupBills.length} Saved ${backupBills.length === 1 ? 'Bill / Quotation' : 'Bills & Quotations'}`,
                message: 'WARNING: All saved bills and quotations will be permanently deleted from the Bill Book! Type "CLEAR ALL" or "I CONFIRM" below to proceed.',
                requireTypeText: ['CLEAR ALL', 'I CONFIRM'],
                confirmBtnLabel: 'Clear All Bills',
                onConfirm: () => {
                    this.history = [];
                    if (this.loadedHistoryBillId) {
                        this.exitSavedBillMode(true);
                    }
                    this.saveToStorage(STORAGE_KEYS.history, this.history);
                    this.renderHistoryList();
                    this.renderCustomerDirectory();
                    this.applyBrandToUI();

                    this.showUndoToast(`🗑️ Cleared all ${backupBills.length} bills`, () => {
                        this.history = backupBills;
                        this.saveToStorage(STORAGE_KEYS.history, this.history);
                        this.renderHistoryList();
                        this.renderCustomerDirectory();
                        this.applyBrandToUI();
                    });
                }
            });
        });

        // JSON Backup & Restore
        document.getElementById('exportDataJsonBtn')?.addEventListener('click', () => {
            const payload = {
                version: '2.3',
                exportedAt: new Date().toISOString(),
                brand: this.brand,
                rates: this.rates,
                rateProfiles: this.rateProfiles,
                customers: this.customers,
                history: this.history,
                savedExtras: this.savedExtras,
                savedNotes: this.savedNotes,
                waFormat: this.waFormat
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BoreBill_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('⬇️ Full Backup JSON Downloaded!');
        });

        document.getElementById('importDataJsonInput')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            const reader = new FileReader();
            reader.onload = (evt) => {
                let parsed;
                try {
                    parsed = JSON.parse(evt.target.result);
                } catch (err) {
                    this.showToast('❌ Invalid backup JSON file');
                    return;
                }
                const looksLikeBackup = parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                    (Array.isArray(parsed.history) || Array.isArray(parsed.customers) || (parsed.brand && typeof parsed.brand === 'object'));
                if (!looksLikeBackup) {
                    this.showToast('❌ This file is not a DrillRig backup');
                    return;
                }
                const billCount = Array.isArray(parsed.history) ? parsed.history.length : 0;
                const custCount = Array.isArray(parsed.customers) ? parsed.customers.length : 0;
                // Signed in, the restored data is synced: bills missing from the backup are
                // removed for the whole company, on every phone.
                const synced = document.getElementById('accSignedIn') && !document.getElementById('accSignedIn').hidden;
                this.confirmDeleteModal({
                    title: 'Restore Backup?',
                    subtitle: 'This cannot be undone',
                    itemLabel: `📦 ${file.name} — ${billCount} bills, ${custCount} customers`,
                    message: synced
                        ? 'This will REPLACE all bills, customers, rates and company details for your WHOLE COMPANY — every signed-in phone. Bills that are not in this backup will be deleted everywhere. Download a backup of the current data first.'
                        : 'This will REPLACE all current bills, customers, rates and company details on this device. Download a backup of current data first if needed.',
                    confirmBtnLabel: 'Yes, Restore',
                    onConfirm: () => this.applyBackupPayload(parsed)
                });
            };
            reader.readAsText(file);
        });
    }
}
