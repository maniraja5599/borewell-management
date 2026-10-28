// App entry point (bundled by Vite).
import './styles/app.css';
import { BoreBillSaaSApp } from './app/App.js';
import { initPWAAndZoomLock } from './pwa/initPwa.js';
import { initAccountUI } from './features/account/accountUI.js';

function boot() {
    initPWAAndZoomLock();
    window.boreBillApp = new BoreBillSaaSApp();
    initAccountUI(window.boreBillApp);
}

// Module scripts run after the HTML is parsed, so DOMContentLoaded may already have fired.
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
