// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class HeaderMixin {
    updateHeaderDueTicker(explicitTotalPending = null) {
        this.updateTopHeaderDynamicMarquee(explicitTotalPending);
    }

    updateTopHeaderDynamicMarquee(explicitTotalPending = null) {
        let totalPending = 0;
        let pendingCount = 0;

        if (explicitTotalPending !== null) {
            totalPending = explicitTotalPending;
            this.history.forEach(b => {
                const snap = b.snapshot || {};
                if ((snap.docType || 'QUOTATION') === 'INVOICE' && this.getBillPendingAmount(b) > 0) {
                    pendingCount++;
                }
            });
        } else {
            this.history.forEach(b => {
                const snap = b.snapshot || {};
                if ((snap.docType || 'QUOTATION') === 'INVOICE') {
                    const due = this.getBillPendingAmount(b);
                    if (due > 0) {
                        totalPending += due;
                        pendingCount++;
                    }
                }
            });
        }

        // 1. Update Slide 2: Outstanding Dues
        const dueCountEl = document.getElementById('marqueeDueBillsCount');
        const dueBadgeEl = document.getElementById('marqueeDueTotalBadge');
        if (dueCountEl) {
            dueCountEl.textContent = totalPending > 0
                ? `${pendingCount} ${pendingCount === 1 ? 'Unpaid Bill' : 'Unpaid Bills'}`
                : 'All Accounts Paid';
        }
        if (dueBadgeEl) {
            dueBadgeEl.textContent = totalPending > 0
                ? `${this.formatINR(totalPending)} DUE`
                : 'SETTLED';
            dueBadgeEl.style.background = totalPending > 0 ? '#ef4444' : '#16a34a';
        }

        // 2. Update Slide 3: Today Activity
        const todayWorkTitle = document.getElementById('marqueeTodayWorkTitle');
        const todayDepthBadge = document.getElementById('marqueeTodayDepthBadge');
        if (todayWorkTitle && todayDepthBadge) {
            const todayStr = new Date().toISOString().slice(0, 10);
            let todayBores = 0;
            let todayDepth = 0;
            (this.history || []).forEach(b => {
                const dateRaw = b.billDate || b.date || '';
                if (dateRaw.startsWith(todayStr) || (b.createdAt && b.createdAt.startsWith(todayStr))) {
                    todayBores++;
                    todayDepth += (b.snapshot?.totalDepth || 0);
                }
            });
            if (todayBores > 0) {
                todayWorkTitle.textContent = `${todayBores} ${todayBores === 1 ? 'Bore Drilled' : 'Bores Drilled'}`;
                todayDepthBadge.textContent = `${todayDepth} FT`;
            } else {
                const totalBoresAll = (this.history || []).length;
                todayWorkTitle.textContent = `${totalBoresAll} Total Bills`;
                todayDepthBadge.textContent = 'READY';
            }
        }

        // Multi-slide rotator removed in favor of clean, stable enterprise header branding
    }
}
