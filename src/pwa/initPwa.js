import { storage, STORAGE_KEYS } from '../data/storage.js';
import { renderIosInstallGuide } from './iosInstallGuide.js';

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

    function isLoggedIn() {
        try {
            const raw = localStorage.getItem('drillrig_auth');
            if (!raw) return false;
            const s = JSON.parse(raw);
            return !!(s?.user?.id || s?.currentSession?.user?.id);
        } catch {
            return false;
        }
    }

    function isAnyPopupOpen() {
        try {
            const isVisible = (sel) => {
                const node = document.querySelector(sel);
                if (!node) return false;
                const style = window.getComputedStyle ? window.getComputedStyle(node) : node.style;
                return style.display !== 'none' && style.visibility !== 'hidden' && !node.hidden;
            };
            return (
                !!window.__drillrigSetupBusy ||
                isVisible('.signin-gate') ||
                isVisible('#profilePromptOverlay.show') ||
                isVisible('.sw-overlay.show') ||
                isVisible('.cust-popup-backdrop:not(#pwaInstallModalOverlay):not([style*="display: none"])')
            );
        } catch {
            return false;
        }
    }

    function showPwaModal() {
        if (isStandalone) return;
        if (recentlyDismissed()) return;

        if (!modalOverlay) return;

        const title = document.getElementById('pwaInstallTitle');
        const desc = document.getElementById('pwaInstallDesc');
        const badge = modalOverlay.querySelector('.pwa-install-badge-pill');
        const benefitsList = document.getElementById('pwaBenefitsList');

        if (isIOS && iosInstructions) {
            // iPhone / iPad have no install button: show the exact taps for this browser.
            renderIosInstallGuide(iosInstructions, {
                onCopied: (ok) => window.boreBillApp?.showToast?.(ok ? 'Link copied. Open Safari and paste it.' : 'Copy the link shown, then open it in Safari.')
            });
            iosInstructions.hidden = false;
            iosInstructions.style.display = 'flex';
            modalOverlay.classList.add('is-ios');
            if (badge) badge.textContent = '🍎 iPHONE & iPAD · 100% OFFLINE';
            if (title) title.textContent = 'Add DrillRig to Home Screen';
            if (desc) desc.textContent = 'Opens full screen like an App, works 100% offline at the rig without network. Takes just 3 quick taps:';
            if (confirmBtnText) confirmBtnText.textContent = 'Got it';
            if (benefitsList) {
                benefitsList.hidden = true;
                benefitsList.style.display = 'none';
            }
        } else {
            // Android / Desktop / Chrome: Instant 1-tap install
            modalOverlay.classList.remove('is-ios');
            if (iosInstructions) {
                iosInstructions.hidden = true;
                iosInstructions.style.display = 'none';
            }
            if (badge) badge.textContent = '⚡ 1-TAP INSTALL · 100% OFFLINE';
            if (title) title.textContent = 'Install DrillRig App';
            if (desc) desc.textContent = 'Install on your mobile phone for lightning-fast 1-tap access. Works 100% offline at remote borewell rig sites with zero delay!';
            if (confirmBtnText) confirmBtnText.textContent = '⚡ Install App Now';
            if (benefitsList) {
                benefitsList.hidden = false;
                benefitsList.style.display = 'flex';
            }
        }

        modalOverlay.style.display = 'flex';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (_) {}
        }
    }

    // Expose showPwaModal globally
    window.showPwaInstallModal = showPwaModal;
    window.closePwaInstallModal = closePwaModal;

    // Intercept native browser beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredInstallPrompt = e;
    });

    // Smart Schedule: After user is logged in, and NO active popups are open, wait 5 seconds then show Install Popup
    let installScheduled = false;
    function scheduleInstallModalCheck() {
        if (installScheduled || isStandalone || recentlyDismissed()) return;
        installScheduled = true;

        const pollAndTrigger = () => {
            if (isStandalone || recentlyDismissed()) return;
            if (!isLoggedIn()) {
                // Check again in 2 seconds for login
                setTimeout(pollAndTrigger, 2000);
                return;
            }

            // User is logged in! Now check if any popup is active:
            if (isAnyPopupOpen()) {
                // A modal is currently open (e.g. Profile Setup): wait and check again in 2 seconds
                setTimeout(pollAndTrigger, 2000);
                return;
            }

            // User is logged in AND screen is clear! Wait 5 seconds as requested:
            setTimeout(() => {
                if (isStandalone || recentlyDismissed()) return;
                if (!isLoggedIn() || isAnyPopupOpen()) {
                    // A popup opened during the 5s window: retry polling
                    setTimeout(pollAndTrigger, 2000);
                    return;
                }
                showPwaModal();
            }, 5000);
        };

        setTimeout(pollAndTrigger, 1500);
    }

    scheduleInstallModalCheck();

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
