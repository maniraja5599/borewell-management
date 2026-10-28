// Google sign-in through Supabase.
// Flow: Google's own button gives us an ID token → supabase.auth.signInWithIdToken.
// No client secret and no page redirect, so it also works inside an installed PWA.
// Everything is loaded lazily so the app still opens instantly (and offline) without it.
import { CLOUD } from '../config/cloud.js';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

let clientPromise = null;
let gsiPromise = null;

/** Lazily create the Supabase client (kept out of the first-load bundle). */
export function getSupabase() {
    if (!clientPromise) {
        clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(CLOUD.supabaseUrl, CLOUD.supabasePublishableKey, {
                auth: { persistSession: true, autoRefreshToken: true, storageKey: 'drillrig_auth' }
            })
        );
        clientPromise.catch(() => { clientPromise = null; });
    }
    return clientPromise;
}

/** Load Google Identity Services once. Rejects when offline. */
function loadGoogleScript() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (!gsiPromise) {
        gsiPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = GSI_SRC;
            s.async = true;
            s.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error('Google sign-in did not load')));
            s.onerror = () => reject(new Error('Could not reach Google. Check your internet connection.'));
            document.head.appendChild(s);
        });
        gsiPromise.catch(() => { gsiPromise = null; });
    }
    return gsiPromise;
}

/** Plain summary of the signed-in user, or null. */
export function toAccount(user) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
        id: user.id,
        email: user.email || '',
        name: meta.full_name || meta.name || (user.email || '').split('@')[0] || 'User',
        avatarUrl: meta.avatar_url || meta.picture || ''
    };
}

export async function getCurrentAccount() {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    return toAccount(data.session?.user);
}

/** Calls cb(account|null) now and whenever the session changes. Returns an unsubscribe fn. */
export async function onAccountChange(cb) {
    const sb = await getSupabase();
    const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toAccount(session?.user)));
    return () => data.subscription.unsubscribe();
}

/**
 * Render Google's "Continue with Google" button into `container`.
 * onResult({ account }) on success, onResult({ error }) on failure.
 */
export async function renderGoogleButton(container, onResult) {
    const google = await loadGoogleScript();
    google.accounts.id.initialize({
        client_id: CLOUD.googleClientId,
        callback: async (resp) => {
            try {
                const sb = await getSupabase();
                const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential });
                if (error) throw error;
                onResult({ account: toAccount(data.user) });
            } catch (err) {
                onResult({ error: err?.message || 'Sign-in failed' });
            }
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true
    });
    container.innerHTML = '';
    google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: Math.min(320, Math.max(220, container.clientWidth || 280))
    });
}

export async function signOut() {
    const sb = await getSupabase();
    await sb.auth.signOut();
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* ignore */ }
}
