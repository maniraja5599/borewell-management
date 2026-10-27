// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { storage } from '../data/storage.js';

export class StorageMixin {
    loadFromStorage(key, fallback) {
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

    saveToStorage(key, data) {
        try {
            storage.setRaw(key, JSON.stringify(data));
            return true;
        } catch (e) {
            this.showToast('⚠️ Storage full — NOT saved! Download a backup, then remove old bills or use a smaller logo.');
            return false;
        }
    }
}
