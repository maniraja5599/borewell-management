// App entry point (bundled by Vite).
import './styles/app.css';
import './styles/ui-v3.css';
import './styles/popups-v2.css'; // bill + customer popups (after ui-v3 so its rules win)
import './styles/team-v2.css'; // Team & Rigs, invitation cards, Your businesses
import './styles/rates-v2.css'; // Rates page, rate popup, rate editor // new look; only applies with FEATURES.uiV3 (html.ui-v3)
import './styles/small-screens.css'; // narrow phones + large font/zoom (loaded last)
import { initFitText } from './ui/fitText.js';
import { versionLabel, APP_BUILD_DATE } from './config/version.js';
import { BoreBillSaaSApp } from './app/App.js';
import { initPWAAndZoomLock } from './pwa/initPwa.js';
import { initAccountUI } from './features/account/accountUI.js';
import { initSetupWizard } from './features/onboarding/setupWizard.js';
import { initFirstBillGuide } from './features/onboarding/firstBillGuide.js';
import { applyRoleClass } from './cloud/access.js';
import { initRigBar } from './features/team/rigBar.js';
import { initTeamUI } from './features/team/teamUI.js';
import { captureJoinCode } from './features/team/joinLink.js';
import { initAnalytics, trackScreen } from './analytics.js';
import { initComingSoon } from './features/settings/comingSoon.js';
import { applyNavIcons3d } from './ui/navIcons3d.js';
import { initSuperAdmin } from './features/account/superAdmin.js';
import { initStockUI } from './features/stock/stockUI.js';
import { initStorage, setStorageErrorHandler, storage, storageMode } from './data/storage.js';
import { FEATURES } from './config/features.js';
import { initSignInGate } from './features/account/signInGate.js';
import { billFooterEnquiryLink, supportWhatsAppDisplay } from './config/plans.js';

if (FEATURES.uiV3) document.documentElement.classList.add('ui-v3');

async function boot() {
    try {
        // Bills, customers and stock come from IndexedDB; load them before the app draws anything.
        await initStorage();
        // Read-only status for support and tests: where data lives and how many changes are not on disk yet.
        window.drillrigStorageStatus = () => ({ mode: storageMode(), pending: storage.pending() });
        initPWAAndZoomLock();
        applyRoleClass(); // staff role from the last sync, so the app looks right offline too
        window.boreBillApp = new BoreBillSaaSApp();
        setStorageErrorHandler((e) => {
            console.error('Save failed:', e);
            window.boreBillApp?.showToast('⚠️ Could not save to this phone — storage may be full. Download a backup now.');
        });
        // "Made with DrillRig" line on the bill: opens WhatsApp to the DrillRig team.
        const footerLink = document.getElementById('rcptDrillrigLink');
        if (footerLink) footerLink.href = billFooterEnquiryLink();
        const footerNum = document.getElementById('rcptDrillrigWaNum');
        if (footerNum) footerNum.textContent = supportWhatsAppDisplay();
        initRigBar(window.boreBillApp);
        if (FEATURES.pipeStock) initStockUI(window.boreBillApp);
        captureJoinCode(); // ?join=CODE from a WhatsApp invite link: used right after sign-in
        initAnalytics(); // live site only; no personal data (see src/analytics.js)
        {
            const app = window.boreBillApp;
            const orig = app.switchTab.bind(app);
            app.switchTab = (tabId, ...rest) => { const r = orig(tabId, ...rest); try { trackScreen(tabId); } catch { /* never break the app */ } return r; };
        }
        // App shortcuts (long-press the app icon): ?tab=bill | history | customers | rates | brand
        try {
            const url = new URL(window.location.href);
            const t = url.searchParams.get('tab');
            if (t && ['bill', 'history', 'customers', 'rates', 'brand'].includes(t)) {
                window.boreBillApp.switchTab(`tab-${t}`);
                url.searchParams.delete('tab');
                window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
        } catch { /* ignore */ }
        initAccountUI(window.boreBillApp);
        initSignInGate(window.boreBillApp); // sign-in is required before using the app
        initTeamUI(window.boreBillApp);
        initFirstBillGuide(window.boreBillApp); // New Bill: "Make your first bill" checklist until the first bill
        initComingSoon(); // Settings: "Coming soon" tiles (Expenses, Staff, Stock, Profit & Loss)
        applyNavIcons3d(); // bottom bar: 3D icons
        { const v = document.getElementById('appVersionChip'); if (v) { v.textContent = versionLabel(); if (APP_BUILD_DATE) v.title = `DrillRig ${versionLabel()} · built ${APP_BUILD_DATE}`; } }
        initFitText(); // shrink money amounts that would not fit (narrow / zoomed phones)
        initSuperAdmin(); // admins only (checked on the server): Super admin card in Settings
        // Note: First-run profile onboarding is now handled seamlessly after Google Sign-in by maybeAskProfile (no duplicate banners)
    } catch (err) {
        console.error('DrillRig App Boot Error:', err);
    } finally {
        const splash = document.getElementById('appSplashScreen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('fade-out');
                setTimeout(() => { try { splash.remove(); } catch (_) {} }, 400);
            }, 850);
        }
    }
}

// Module scripts run after the HTML is parsed, so DOMContentLoaded may already have fired.
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
