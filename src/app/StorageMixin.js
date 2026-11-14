// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { storage, STORAGE_KEYS, isBigKey } from '../data/storage.js';

export class StorageMixin {
    loadFromStorage(key, fallback) {
        // Bills, customers and stock: the live list from IndexedDB (or a parsed localStorage copy).
        if (isBigKey(key)) return storage.getList(key);
        try {
            const raw = storage.getRaw(key);
            if (!raw) return JSON.parse(JSON.stringify(fallback));
            const parsed = JSON.parse(raw);
            if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : [];
            return { ...JSON.parse(JSON.stringify(fallback)), ...parsed };
        } catch (e) {
            return JSON.parse(JSON.stringify(fallback));
        }
    }

    /**
     * @param {string} key
     * @param {*} data
     * @param {Iterable<string>} [changed] for bills/customers/stock: ids of records edited in place
     *   (added, removed or replaced records are found without this)
     */
    saveToStorage(key, data, changed) {
        // While a saved bill is open, this.rates holds that bill's old prices. The stored
        // (and cloud-synced) rates must stay the company's live rates.
        if (key === STORAGE_KEYS.rates && this.ratesBeforeBillEdit && data === this.rates) {
            data = this.ratesBeforeBillEdit;
        }
        try {
            if (isBigKey(key)) {
                this._bigListVersion = (this._bigListVersion || 0) + 1; // screens rebuild their indexes
                storage.setList(key, data, changed);
            }
            else storage.setRaw(key, JSON.stringify(data));
            return true;
        } catch (e) {
            this.showToast('⚠️ Storage full — NOT saved! Download a backup, then remove old bills or use a smaller logo.');
            return false;
        }
    }
}
