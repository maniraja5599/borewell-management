// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class HeaderMixin {
    // Header rotator text is sized by CSS for the screen width. A title that still does not fit
    // (a long company name on a small phone) is shrunk step by step, down to 12px; past that it
    // ends with "…". Re-runs when the phone rotates or the window is resized.
    fitHeaderTitles() {
        if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function' || typeof getComputedStyle !== 'function') return;
        const titles = document.querySelectorAll('.header-dynamic-marquee .slide-main-title');
        if (!titles || !titles.length) return;
        const setSize = (t, px) => t.style.setProperty('font-size', `${px}px`, 'important');
        titles.forEach((t) => {
            t.style.removeProperty('font-size');
            t.classList.remove('is-two-line');
            if (!t.clientWidth) return; // hidden slide
            let size = parseFloat(getComputedStyle(t).fontSize) || 16;
            // One line, shrinking to 14px at most.
            while (t.scrollWidth > t.clientWidth + 1 && size > 14) {
                size = Math.max(14, size - 0.5);
                setSize(t, size);
            }
            if (t.scrollWidth <= t.clientWidth + 1) return;
            // Still too long (a long company name): two lines, 15px down to 12px.
            t.classList.add('is-two-line');
            size = 15;
            setSize(t, size);
            while (t.scrollHeight > t.clientHeight + 1 && size > 12) {
                size = Math.max(12, size - 0.5);
                setSize(t, size);
            }
        });
        if (!this._headerFitBound && typeof window !== 'undefined') {
            this._headerFitBound = true;
            let raf = 0;
            const refit = () => {
                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => this.fitHeaderTitles());
            };
            window.addEventListener('resize', refit);
            window.addEventListener('orientationchange', refit);
            // Web fonts load after first paint and change text widths.
            document.fonts?.ready?.then(refit).catch(() => {});
        }
    }

    /**
     * Shows a short message in the top bar right away (e.g. "Synced · 3 new from cloud"), holds it
     * for `ms`, then the normal rotation carries on. Messages that arrive meanwhile wait their turn;
     * a repeat of the message already queued or showing is dropped.
     * tone: 'ok' (green) | 'info' (blue) | 'warn' (amber) | 'error' (red)
     */
    showHeaderNotice({ icon = '🔔', text = '', badge = '', tone = 'info', ms = 5000 } = {}) {
        if (!text || typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
        this._noticeQueue = this._noticeQueue || [];
        const key = `${text}|${badge}`;
        if (this._noticeShowing === key || this._noticeQueue.some((n) => `${n.text}|${n.badge}` === key)) return;
        this._noticeQueue.push({ icon, text, badge, tone, ms });
        if (!this._noticeShowing) this._showNextHeaderNotice();
    }

    _showNextHeaderNotice() {
        const slide = document.getElementById('marqueeSlideNotice');
        const next = (this._noticeQueue || []).shift();
        const all = () => Array.from(document.querySelectorAll('.header-dynamic-marquee .marquee-slide'));
        if (!slide) { this._noticeQueue = []; this._noticeShowing = null; return; }
        if (!next) {
            // Done: hide the notice, back to the company name; rotation resumes on its next tick.
            this._noticeShowing = null;
            slide.classList.remove('active');
            slide.classList.add('exit-up');
            const home = document.getElementById('marqueeSlide0');
            home?.classList.remove('exit-up');
            home?.classList.add('active');
            setTimeout(() => { if (!this._noticeShowing) { slide.style.display = 'none'; slide.classList.remove('exit-up'); } }, 800);
            return;
        }
        this._noticeShowing = `${next.text}|${next.badge}`;
        document.getElementById('marqueeNoticeIcon').textContent = next.icon;
        document.getElementById('marqueeNoticeText').textContent = next.text;
        const badge = document.getElementById('marqueeNoticeBadge');
        badge.textContent = next.badge || '';
        badge.hidden = !next.badge;
        slide.dataset.tone = next.tone;
        slide.style.display = '';
        all().forEach((s) => {
            if (s === slide) return;
            if (s.classList.contains('active')) { s.classList.remove('active'); s.classList.add('exit-up'); }
        });
        slide.classList.remove('exit-up');
        // Next frame, so the slide-in animation runs from below.
        requestAnimationFrame(() => { slide.classList.add('active'); this.fitHeaderTitles(); });
        clearTimeout(this._noticeTimer);
        this._noticeTimer = setTimeout(() => this._showNextHeaderNotice(), Math.max(1500, next.ms));
    }

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

        // With no final bills yet, "All Paid / SETTLED" is misleading: hide the dues slide
        // (and the activity slide when there are no bills at all). The rotator skips hidden slides.
        const hasBills = (this.history || []).length > 0;
        const hasInvoices = (this.history || []).some(b => (b.snapshot?.docType || 'QUOTATION') === 'INVOICE');
        const setSlide = (id, show) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = show ? '' : 'none';
            if (!show && el.classList.contains('active')) {
                el.classList.remove('active');
                document.getElementById('marqueeSlide0')?.classList.add('active');
            }
        };
        setSlide('marqueeSlide1', hasInvoices);
        setSlide('marqueeSlide2', hasBills);

        // 1. Update Slide 2: Outstanding Dues
        const dueCountEl = document.getElementById('marqueeDueBillsCount');
        const dueBadgeEl = document.getElementById('marqueeDueTotalBadge');
        if (dueCountEl) {
            dueCountEl.textContent = totalPending > 0
                ? `${pendingCount} ${pendingCount === 1 ? 'Unpaid' : 'Unpaid'}`
                : 'All Paid';
        }
        if (dueBadgeEl) {
            dueBadgeEl.textContent = totalPending > 0
                ? this.formatINR(totalPending) // "8 Unpaid" beside it already says it is due
                : 'SETTLED';
            dueBadgeEl.style.background = totalPending > 0 ? '#ef4444' : '#16a34a';
        }

        // 2. Update Slide 3: Today Activity
        const todayWorkTitle = document.getElementById('marqueeTodayWorkTitle');
        const todayDepthBadge = document.getElementById('marqueeTodayDepthBadge');
        if (todayWorkTitle && todayDepthBadge) {
            const todayStr = this.toLocalYMD(new Date());
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
                todayWorkTitle.textContent = `${todayBores} ${todayBores === 1 ? 'Bore' : 'Bores'}`;
                todayDepthBadge.textContent = `${todayDepth} FT`;
            } else {
                const totalBoresAll = (this.history || []).length;
                todayWorkTitle.textContent = `${totalBoresAll} Bills`;
                todayDepthBadge.textContent = 'READY';
            }
        }

        this.fitHeaderTitles();

        // 3. Start Multi-Slide Swipe-Up Rotator Timer (4.2 seconds loop)
        if (!this._topMarqueeTimer) {
            this._topMarqueeCurrentIndex = 0;
            this._topMarqueeTimer = setInterval(() => {
                if (this._noticeShowing) return; // a message is on screen: let it finish
                const allSlides = Array.from(document.querySelectorAll('.header-dynamic-marquee .marquee-slide'))
                    .filter(s => s.id !== 'marqueeSlideNotice');
                const visibleSlides = allSlides.filter(s => s.style.display !== 'none');
                // One slide (a new company with no bills: just its name) stays put. Rotating it onto
                // itself marked it both "leaving" and "active", and the company name went blank.
                if (visibleSlides.length <= 1) {
                    allSlides.forEach(s => s.classList.remove('exit-up'));
                    (visibleSlides[0] || document.getElementById('marqueeSlide0'))?.classList.add('active');
                    return;
                }

                const currentSlide = document.querySelector('.header-dynamic-marquee .marquee-slide.active');
                let currPos = visibleSlides.indexOf(currentSlide);
                if (currPos === -1) currPos = 0;
                const nextPos = (currPos + 1) % visibleSlides.length;

                const prevSlide = visibleSlides[currPos];
                const nextSlide = visibleSlides[nextPos];
                this._topMarqueeCurrentIndex = parseInt(nextSlide.dataset.slideIndex || nextPos, 10);

                allSlides.forEach(s => s.classList.remove('active', 'exit-up'));
                if (prevSlide) prevSlide.classList.add('exit-up');
                if (nextSlide) nextSlide.classList.add('active');
            }, 4200);
            if (this._topMarqueeTimer?.unref) {
                this._topMarqueeTimer.unref();
            }
        }
    }
}
