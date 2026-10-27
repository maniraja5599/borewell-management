// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class FormatMixin {
    formatINR(amount) {
        return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
    }

    formatFullCurrency(amount) {
        return this.formatINR(amount);
    }

    escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    getDocTypeTitle(docType) {
        if (docType === 'INVOICE') {
            return 'FINAL BILL / INVOICE';
        }
        return 'QUOTATION';
    }

    triggerOneShotPulse(el, className = 'sticky-val-pop') {
        if (!el) return;
        el.classList.remove(className);
        // Force reflow so rapid single steps re-trigger cleanly once and stop
        void el.offsetWidth;
        el.classList.add(className);
        if (el._pulseCleanupTimer) clearTimeout(el._pulseCleanupTimer);
        el._pulseCleanupTimer = setTimeout(() => {
            el.classList.remove(className);
        }, 380);
    }

    getInitials(name) {
        const clean = (name || 'C').trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    }
}
