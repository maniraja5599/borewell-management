// The "Sign in with Google" card at the top of Settings.
// Sign-in is optional: nothing else in the app depends on it yet.
import { getCurrentAccount, onAccountChange, renderGoogleButton, signOut } from '../../cloud/auth.js';

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

    const showAccount = (acc) => {
        signedOut.hidden = !!acc;
        signedIn.hidden = !acc;
        if (!acc) { if (isVisible()) tryRenderButton(); return; }

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
