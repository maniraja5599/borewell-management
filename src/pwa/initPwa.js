
export function initPWAAndZoomLock() {
    // 1. Prevent Multi-Touch Pinch-to-Zoom on Mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 2. Prevent iOS / WebKit Pinch & Rotation Gestures
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((evtName) => {
        document.addEventListener(evtName, (e) => {
            e.preventDefault();
        }, { passive: false });
    });

    // 3. Prevent Rapid Double-Tap Zoom while allowing fast Stepper clicks
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 280) {
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && !e.target.closest('.step-btn')) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });

    // 4. Prevent Desktop / Tablet Ctrl + Wheel & Ctrl + (+/-) Zoom
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // Ask the browser not to auto-clear our localStorage (Safari/Chrome may evict data of rarely used sites)
    try {
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
            navigator.storage.persisted().then((already) => {
                if (!already) navigator.storage.persist().catch(() => {});
            }).catch(() => {});
        }
    } catch (_) {}

    // 5. Register Offline-Capable Service Worker (sw.js)
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            if (reg) {
                reg.update();
            }
        }).catch(() => {});
    }

    // 6. Native PWA Install Prompt Handler & Marquee Install Slide Sync
    window.deferredInstallPrompt = null;
    const installBtn = document.getElementById('installPwaBtn');
    const marqueeInstallSlide = document.getElementById('marqueeSlide4');

    // Check if app is already running as installed standalone PWA
    const isStandalone = (window.navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    if (!isStandalone && marqueeInstallSlide) {
        marqueeInstallSlide.style.display = 'flex';
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredInstallPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            if (window.lucide) window.lucide.createIcons();
        }
        if (marqueeInstallSlide && !isStandalone) {
            marqueeInstallSlide.style.display = 'flex';
        }
    });

    installBtn?.addEventListener('click', async () => {
        if (!window.deferredInstallPrompt) return;
        window.deferredInstallPrompt.prompt();
        const { outcome } = await window.deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
            if (installBtn) installBtn.style.display = 'none';
            if (marqueeInstallSlide) marqueeInstallSlide.style.display = 'none';
        }
        window.deferredInstallPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        if (installBtn) installBtn.style.display = 'none';
        if (marqueeInstallSlide) marqueeInstallSlide.style.display = 'none';
        window.deferredInstallPrompt = null;
    });
}
