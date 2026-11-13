// The "Sign in with Google" card at the top of Settings.
// Sign-in is optional: nothing else in the app depends on it yet.
import { getCurrentAccount, onAccountChange, renderGoogleButton, signOut } from '../../cloud/auth.js';
import { startSync, stopSync, syncNow, checkPhoneOwner, clearPhoneData } from '../../cloud/sync.js';

export function initAccountUI(app) {
    const card = document.getElementById('accountCard');
    if (!card) return;

    const signedOut = document.getElementById('accSignedOut');
    const signedIn = document.getElementById('accSignedIn');
    const slot = document.getElementById('googleBtnSlot');
    const msg = document.getElementById('accMsg');
    const toast = (t) => { try { app?.showToast?.(t); } catch { /* ignore */ } };

    let buttonRendered = false;
    const isVisible = () => card.offsetParent !== null;
    let busy = false;

    const setMsg = (text) => {
        msg.textContent = text || '';
        msg.hidden = !text;
    };

    const syncBtn = document.getElementById('accSyncBtn');
    const syncText = document.getElementById('accSyncText');
    let lastStatus = null;
    const timeAgo = (t) => {
        const s = Math.round((Date.now() - t) / 1000);
        if (s < 45) return 'just now';
        const m = Math.round(s / 60);
        if (m < 60) return `${m} min ago`;
        const h = Math.round(m / 60);
        return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
    };
    const paintStatus = () => {
        if (!lastStatus) return;
        syncBtn.dataset.state = lastStatus.kind;
        syncText.textContent = lastStatus.kind === 'ok' ? `Synced ${timeAgo(lastStatus.at)}` : lastStatus.text;
    };
    setInterval(paintStatus, 30000);
    const onStatus = (st) => { lastStatus = st; paintStatus(); };

    // Set when this phone still holds another account's company data: syncing is paused
    // until the user agrees to remove it (otherwise it would be uploaded into this account).
    let blockedAccount = null;
    const askToTakeOverPhone = (acc, other) => {
        const who = other.email || 'another Google account';
        const parts = [];
        if (other.bills) parts.push(`${other.bills} bill${other.bills === 1 ? '' : 's'}`);
        if (other.customers) parts.push(`${other.customers} customer${other.customers === 1 ? '' : 's'}`);
        const lost = other.unsynced
            ? ` ${other.unsynced} change${other.unsynced === 1 ? ' was' : 's were'} never uploaded and will be LOST.`
            : ` They are already saved in ${who}'s cloud.`;
        app.confirmDeleteModal({
            title: 'Different account on this phone',
            subtitle: `To use ${acc.email} here, the old data must be removed from this phone`,
            itemLabel: `📱 ${who}${parts.length ? ' — ' + parts.join(', ') : ''}`,
            message: `This phone has company data from ${who}.${lost} Remove it from this phone and load ${acc.email}'s data? (Cancel = keep it; sign out and sign in again with ${who}.)`,
            confirmBtnLabel: 'Remove & continue',
            requireTypeText: other.unsynced ? 'REMOVE' : null,
            onConfirm: () => {
                clearPhoneData();
                // Reload so every screen starts clean; the Google session is kept.
                window.location.reload();
            }
        });
    };
    const showBlocked = () => {
        onStatus({ kind: 'error', text: 'Not syncing — tap to fix', at: Date.now() });
    };

    syncBtn.addEventListener('click', () => {
        if (blockedAccount) {
            const other = checkPhoneOwner(app, blockedAccount);
            if (other) { askToTakeOverPhone(blockedAccount, other); return; }
            const acc = blockedAccount;
            blockedAccount = null;
            startSync(app, acc, onStatus);
            return;
        }
        syncNow();
    });

    let currentId = null;
    const showAccount = (acc) => {
        signedOut.hidden = !!acc;
        signedIn.hidden = !acc;
        if (!acc) {
            if (currentId) { stopSync(); currentId = null; }
            blockedAccount = null;
            if (isVisible()) tryRenderButton();
            return;
        }
        if (currentId !== acc.id) {
            currentId = acc.id;
            const other = checkPhoneOwner(app, acc);
            if (other) {
                stopSync();
                blockedAccount = acc;
                showBlocked();
                askToTakeOverPhone(acc, other);
            } else {
                blockedAccount = null;
                startSync(app, acc, onStatus);
            }
        }

        document.getElementById('accName').textContent = acc.name;
        document.getElementById('accEmail').textContent = acc.email;
        const avatar = document.getElementById('accAvatar');
        avatar.textContent = '';
        if (acc.avatarUrl) {
            const img = document.createElement('img');
            img.src = acc.avatarUrl;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            img.onerror = () => { avatar.textContent = acc.name.charAt(0).toUpperCase(); };
            avatar.appendChild(img);
        } else {
            avatar.textContent = acc.name.charAt(0).toUpperCase();
        }
        setMsg('');
    };

    async function tryRenderButton() {
        if (buttonRendered || busy) return;
        if (!navigator.onLine) { setMsg('You are offline. Connect to the internet to sign in.'); return; }
        busy = true;
        try {
            await renderGoogleButton(slot, ({ account, error }) => {
                if (error) {
                    setMsg(/not.*(allowed|authorized)|access/i.test(error)
                        ? 'This Google account is not allowed yet. Ask the admin to add it.'
                        : `Sign-in failed: ${error}`);
                    return;
                }
                showAccount(account);
                toast(`✅ Signed in as ${account.email}`);
            });
            buttonRendered = true;
            setMsg('');
        } catch (err) {
            setMsg(err?.message || 'Could not load Google sign-in.');
        } finally {
            busy = false;
        }
    }

    document.getElementById('accLoadBtn')?.addEventListener('click', tryRenderButton);
    window.addEventListener('online', () => { if (!signedOut.hidden) tryRenderButton(); });

    document.getElementById('accSignOutBtn').addEventListener('click', async () => {
        try {
            await signOut();
            buttonRendered = false;
            showAccount(null);
            toast('Signed out');
        } catch (err) {
            setMsg(err?.message || 'Sign-out failed');
        }
    });

    // Google's script is only fetched once the Settings card is on screen.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting) && !signedOut.hidden) tryRenderButton();
        }).observe(card);
    }

    // Load the cloud library only after the app has painted.
    const start = async () => {
        try {
            showAccount(await getCurrentAccount());
            await onAccountChange(showAccount);
        } catch {
            // Offline or blocked: keep the signed-out card and its fallback button.
        }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
    else setTimeout(start, 800);
}
