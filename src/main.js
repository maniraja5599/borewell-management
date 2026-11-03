// App entry point (bundled by Vite).
import './styles/app.css';
import { BoreBillSaaSApp } from './app/App.js';
import { initPWAAndZoomLock } from './pwa/initPwa.js';
import { initAccountUI } from './features/account/accountUI.js';

function boot() {
    try {
        initPWAAndZoomLock();
        window.boreBillApp = new BoreBillSaaSApp();
        initAccountUI(window.boreBillApp);
    } catch (err) {
        console.error('DrillRig App Boot Error:', err);
    } finally {
        const splash = document.getElementById('appSplashScreen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('fade-out');
                setTimeout(() => { try { splash.remove(); } catch (_) {} }, 400);
            }, 350);
        }
    }
}

// Module scripts run after the HTML is parsed, so DOMContentLoaded may already have fired.
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
