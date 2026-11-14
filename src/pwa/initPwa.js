import { storage, STORAGE_KEYS } from '../data/storage.js';

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

    // 6. Native PWA Install Prompt Handler & 3-Second Auto Popup
    window.deferredInstallPrompt = null;

    // Check if app is already running as installed standalone PWA
    const isStandalone = (window.navigator.standalone === true) || 
                         (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                         document.documentElement.classList.contains('pwa-standalone');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const modalOverlay = document.getElementById('pwaInstallModalOverlay');
    const closeBtn = document.getElementById('closePwaInstallModalBtn');
    const dismissBtn = document.getElementById('dismissPwaInstallBtn');
    const confirmBtn = document.getElementById('confirmPwaInstallBtn');
    const iosInstructions = document.getElementById('pwaIosInstructions');
    const confirmBtnText = document.getElementById('confirmPwaInstallBtnText');

    // "Later" is remembered for a week (sessionStorage made it come back on every launch).
    const DISMISS_KEY = 'drillrig_pwa_prompt_dismissed_at';
    const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

    function closePwaModal() {
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch (_) {}
    }

    function recentlyDismissed() {
        try {
            const at = Number(localStorage.getItem(DISMISS_KEY)) || 0;
            return Date.now() - at < DISMISS_MS;
        } catch (_) {
            return false;
        }
    }

    // A brand-new user should see the app first; ask to install once they have saved a bill.
    function hasSavedBill() {
        try {
            return storage.getList(STORAGE_KEYS.history).length > 0;
        } catch (_) {
            return false;
        }
    }

    function showPwaModal() {
        if (isStandalone) return;
        if (recentlyDismissed()) return;

        if (!modalOverlay) return;

        if (isIOS && iosInstructions) {
            iosInstructions.style.display = 'flex';
            if (confirmBtnText) confirmBtnText.textContent = 'Got It';
        }

        modalOverlay.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    }

    // Expose showPwaModal globally
    window.showPwaInstallModal = showPwaModal;
    window.closePwaInstallModal = closePwaModal;

    // Intercept native browser beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredInstallPrompt = e;
    });

    // Auto-popup 3 seconds after launch, only for users who already saved a bill.
    setTimeout(() => {
        if (hasSavedBill()) showPwaModal();
    }, 3000);

    closeBtn?.addEventListener('click', closePwaModal);
    dismissBtn?.addEventListener('click', closePwaModal);
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closePwaModal();
    });

    confirmBtn?.addEventListener('click', async () => {
        if (isIOS) {
            closePwaModal();
            return;
        }

        if (window.deferredInstallPrompt) {
            window.deferredInstallPrompt.prompt();
            try {
                const { outcome } = await window.deferredInstallPrompt.userChoice;
                if (outcome === 'accepted') {
                    window.deferredInstallPrompt = null;
                }
            } catch (_) {}
            closePwaModal();
        } else {
            if (window.boreBillApp?.showToast) {
                window.boreBillApp.showToast('📲 Tap browser menu ⋮ and select "Install app" or "Add to Home Screen"');
            }
            closePwaModal();
        }
    });

    window.addEventListener('appinstalled', () => {
        closePwaModal();
        window.deferredInstallPrompt = null;
    });
}
