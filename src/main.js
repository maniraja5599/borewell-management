// App entry point (bundled by Vite).
import './styles/app.css';
import { BoreBillSaaSApp } from './app/App.js';
import { initPWAAndZoomLock } from './pwa/initPwa.js';
import { initAccountUI } from './features/account/accountUI.js';
import { initSetupWizard } from './features/onboarding/setupWizard.js';
import { applyRoleClass } from './cloud/access.js';
import { initRigBar } from './features/team/rigBar.js';
import { initTeamUI } from './features/team/teamUI.js';
import { initStockUI } from './features/stock/stockUI.js';
import { initStorage, setStorageErrorHandler, storage, storageMode } from './data/storage.js';
import { FEATURES } from './config/features.js';

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
        initRigBar(window.boreBillApp);
        if (FEATURES.pipeStock) initStockUI(window.boreBillApp);
        initAccountUI(window.boreBillApp);
        initTeamUI(window.boreBillApp);
        // First-run setup opens after the splash has faded.
        setTimeout(() => { try { initSetupWizard(window.boreBillApp); } catch (e) { console.error('Setup wizard error:', e); } }, 900);
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
