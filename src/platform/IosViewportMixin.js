// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class IosViewportMixin {
    setupIosPwaViewportFix() {
        try {
            const ua = navigator.userAgent || '';
            const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isCriOS = isIOS && /CriOS/i.test(ua);
            const isAndroid = /Android/i.test(ua);
            const isStandalone = (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
            const root = document.documentElement;
            if (isIOS) {
                root.classList.add('ios-device');
                if (isCriOS) {
                    root.classList.add('ios-crios');
                }
            }
            if (isAndroid) {
                root.classList.add('android-device');
            }
            if (isStandalone) {
                root.classList.add('pwa-standalone');
                if (isIOS) {
                    root.classList.add('ios-standalone');
                }
                if (isAndroid) {
                    root.classList.add('android-standalone');
                }
            }
        } catch (e) {
            // Ignore environment detection errors
        }
    }

    syncIosTopSafeBarColor() {
        const liveBar = document.getElementById('stickyLiveBar');
        const isLiveBarVisible = Boolean(liveBar && liveBar.style.display !== 'none');
        if (document.body) {
            document.body.classList.toggle('live-bar-hidden', !isLiveBarVisible);
        }
    }

    syncTopHeaderWrapLock() {
        if (this._headerLockRafId) return;
        this._headerLockRafId = requestAnimationFrame(() => {
            this._headerLockRafId = null;
            const headerWrap = document.querySelector('.app-top-header-wrap');
            if (!headerWrap) return;

            const vv = window.visualViewport;
            // Keep fixed top bar completely pinned in New Bill (tab-bill)
            const isBillTab = (!this.state || !this.state.activeTab || this.state.activeTab === 'tab-bill');
            const offsetTop = (vv && isBillTab) ? Math.max(0, Math.round(vv.offsetTop || 0)) : 0;

            if (offsetTop > 0) {
                headerWrap.style.transform = `translate3d(0, ${offsetTop}px, 0)`;
            } else if (headerWrap.style.transform) {
                headerWrap.style.transform = '';
            }
        });
    }

    startIosViewportSyncLoop() {
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
    }
}
