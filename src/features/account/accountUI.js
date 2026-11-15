// The "Sign in with Google" card at the top of Settings.
// Sign-in itself is required before the app opens (signInGate.js); this card shows the account and sync.
import { getCurrentAccount, onAccountChange, renderGoogleButton, signOut, getSupabase } from '../../cloud/auth.js';
import { startSync, stopSync, syncNow, checkPhoneOwner, clearPhoneData, setPreferredCompany } from '../../cloud/sync.js';
import { consumeJoinCode, pendingJoinCode } from '../team/joinLink.js';
import { maybeAskProfile } from './profilePrompt.js';
import { getAccess, onAccessChange } from '../../cloud/access.js';
import { isEarlyAccess, earlyAccessEndLabel, earlyAccessDaysLeft } from '../../config/plans.js';

export function initAccountUI(app) {
    // Free Early Access note (dates and discount come from config/plans.js).
    const early = document.getElementById('accEarlyAccess');
    if (early) {
        early.hidden = !isEarlyAccess();
        // One short line here; the full pricing promise is in Terms → Pricing ("Details").
        early.querySelector('strong').textContent = '🎁 Free Early Access';
        const days = earlyAccessDaysLeft();
        early.querySelector('span').textContent = ` · ${days} day${days === 1 ? '' : 's'} left · everything free until ${earlyAccessEndLabel()} · `;
    }
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

    // Small cloud badge on the logo (top left): always shows the sync state; tap = sync now.
    // syncing = blue ring turning, ok = green tick, offline = grey, error / paused = red.
    const BADGE_LABEL = { syncing: 'Syncing…', ok: 'Synced', offline: 'Offline — saved on this phone', error: 'Sync failed — will retry', blocked: 'Cloud paused' };
    let badge = null;
    const ensureBadge = () => {
        if (badge || typeof document.createElement !== 'function') return badge;
        const host = document.getElementById('openBrandTabBtn');
        if (!host) return null;
        badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'hdr-sync-badge';
        badge.id = 'hdrSyncBadge';
        badge.hidden = true;
        badge.addEventListener('click', (e) => { e.stopPropagation(); syncBtn.click(); });
        host.appendChild(badge);
        return badge;
    };
    const paintBadge = (kind) => {
        const b = ensureBadge();
        if (!b) return;
        b.hidden = !kind;
        if (!kind) return;
        b.dataset.state = kind;
        const label = kind === 'ok' && lastStatus ? `Synced ${timeAgo(lastStatus.at)} — tap to sync now` : (BADGE_LABEL[kind] || '');
        b.title = label;
        b.setAttribute('aria-label', label);
    };
    let firstSyncShown = false;
    // Top-bar messages for sync events. Only changes are announced: a quiet minute-by-minute
    // "Synced" says nothing; new data, a backup, going offline or a failure does.
    let lastNoticeKind = null;
    const announce = (st) => {
        const say = (n) => app.showHeaderNotice?.(n);
        const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
        if (st.kind === 'ok') {
            const first = !firstSyncShown;
            firstSyncShown = true;
            // after the first sync the company and role are known: ask once for a missing mobile / business name
            if (first) setTimeout(() => maybeAskProfile(app), 600);
            if (st.pulled > 0) say({ icon: '☁️', text: 'Synced', badge: `${plural(st.pulled, 'update', 'updates')} in`, tone: 'ok' });
            else if (st.pushed > 0) say({ icon: '☁️', text: 'Backed up', badge: plural(st.pushed, 'change', 'changes'), tone: 'ok' });
            else if (lastNoticeKind === 'offline' || lastNoticeKind === 'error') say({ icon: '☁️', text: 'Back online', badge: 'SYNCED', tone: 'ok' });
            else if (first || st.manual) say({ icon: '☁️', text: 'Synced', badge: 'UP TO DATE', tone: 'ok', ms: 3000 }); // app opened / tapped sync
        } else if (st.kind !== lastNoticeKind) {
            if (st.kind === 'offline') say({ icon: '📴', text: 'Offline', badge: 'SAVED ON PHONE', tone: 'warn', ms: 6000 });
            else if (st.kind === 'error') say({ icon: '⚠️', text: 'Sync failed', badge: 'WILL RETRY', tone: 'error', ms: 6000 });
            else if (st.kind === 'blocked') say({ icon: '⏸️', text: 'Cloud paused', badge: 'TAP SYNC', tone: 'error', ms: 7000 });
        }
        if (st.kind !== 'syncing') lastNoticeKind = st.kind;
    };
    let manualSync = false;
    const onStatus = (st) => {
        if (st.kind === 'ok' && manualSync) { st = { ...st, manual: true }; manualSync = false; }
        if (st.kind !== 'ok' && st.kind !== 'syncing') manualSync = false;
        lastStatus = st;
        paintStatus();
        paintBadge(st.kind);
        try { announce(st); } catch (_) { /* never break sync */ }
    };

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

    // The server paused syncing for a reason only the user can resolve (see sync.js).
    let blockedErr = null;
    const startOver = (preferredCompany) => {
        setPreferredCompany(preferredCompany || null);
        clearPhoneData();
        window.location.reload(); // every screen starts clean; the Google session is kept
    };
    const explainBlocked = (err) => {
        if (err.code === 'DRILLRIG_SUSPENDED') {
            // Nothing is removed: the phone keeps every bill and keeps billing.
            const why = String(err.message || '').split(': ').slice(1).join(': ');
            app.showToast(`⏸️ Cloud sync is paused for this business${why ? ` (${why})` : ''}. Billing on this phone keeps working. Contact DrillRig support on WhatsApp +91 83000 30123.`);
            return;
        }
        if (err.code === 'DRILLRIG_REMOVED') {
            app.confirmDeleteModal({
                title: 'No access to this company',
                subtitle: 'The owner removed you, or the company was closed',
                itemLabel: `🏢 ${err.companyName || 'Company'}`,
                message: 'This phone still has that company\'s bills. They are safe in the company\'s cloud. Remove them from this phone to continue with your own account?',
                confirmBtnLabel: 'Remove & continue',
                onConfirm: () => startOver(null)
            });
        } else if (err.code === 'DRILLRIG_STAFF_LOCAL_DATA') {
            const parts = [];
            if (err.bills) parts.push(`${err.bills} bill${err.bills === 1 ? '' : 's'}`);
            if (err.customers) parts.push(`${err.customers} customer${err.customers === 1 ? '' : 's'}`);
            app.confirmDeleteModal({
                title: `Join ${err.companyName || 'the team'}`,
                subtitle: `You were invited as ${err.role}`,
                itemLabel: `📱 On this phone: ${parts.join(', ')}`,
                message: `These are not part of ${err.companyName || 'the company'} and will not be uploaded. Need them? Cancel, then Settings → Backup → Download first. Remove them to join the team.`,
                confirmBtnLabel: 'Remove & join',
                requireTypeText: 'REMOVE',
                onConfirm: () => startOver(null)
            });
        }
    };
    const onBlocked = (err) => { blockedErr = err; explainBlocked(err); };

    syncBtn.addEventListener('click', () => {
        if (blockedErr) { explainBlocked(blockedErr); return; }
        if (blockedAccount) {
            const other = checkPhoneOwner(app, blockedAccount);
            if (other) { askToTakeOverPhone(blockedAccount, other); return; }
            const acc = blockedAccount;
            blockedAccount = null;
            startSync(app, acc, onStatus, onBlocked);
            return;
        }
        manualSync = true; // the tap gets a "Synced · up to date" even when nothing changed
        syncNow();
    });

    // Company, role, invites and company switch — shown under the email.
    const companyLine = document.createElement('div');
    companyLine.className = 'acc-company';
    document.getElementById('accEmail')?.insertAdjacentElement('afterend', companyLine);
    const ROLE = { owner: 'Owner', manager: 'Manager', driver: 'Driver' };
    const switchTo = (companyId, name) => app.confirmDeleteModal({
        title: `Open ${name}?`,
        subtitle: 'This phone shows one company at a time',
        itemLabel: `🏢 ${name}`,
        message: 'The current company\'s data is removed from this phone (it stays in its cloud) and the other company is downloaded. Changes not yet synced are lost.',
        confirmBtnLabel: 'Switch',
        onConfirm: () => startOver(companyId)
    });
    const renderCompany = () => {
        const a = getAccess();
        companyLine.textContent = '';
        if (!a || signedIn.hidden) return;
        const line = document.createElement('span');
        line.className = 'acc-company-name';
        // The owner's own Settings name is the freshest (the cloud name may lag until the next sync).
        const ownName = a.role === 'owner' ? String(app.brand?.companyName || '').trim() : '';
        const name = ownName && ownName !== app.defaultBrand?.companyName ? ownName : a.companyName;
        line.textContent = `${ROLE[a.role] || a.role} · ${name || 'Company'}`;
        companyLine.appendChild(line);
        for (const c of (a.companies || []).filter((x) => x.company_id !== a.companyId)) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'acc-mini-btn';
            b.textContent = `Switch to ${c.name}`;
            b.addEventListener('click', () => switchTo(c.company_id, c.name));
            companyLine.appendChild(b);
        }
        for (const iv of a.invites || []) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'acc-mini-btn is-invite';
            b.textContent = `📨 Join ${iv.company_name} as ${ROLE[iv.role] || iv.role}`;
            b.addEventListener('click', async () => {
                try {
                    const sb = await getSupabase();
                    const { data, error } = await sb.rpc('drillrig_accept_invite', { p_invite: iv.id });
                    if (error) throw new Error(error.message);
                    switchTo(data || iv.company_id, iv.company_name);
                } catch (e) {
                    toast(`⚠️ ${e.message}`);
                }
            });
            companyLine.appendChild(b);
        }
    };
    onAccessChange(renderCompany);

    let currentId = null;
    const showAccount = (acc) => {
        signedOut.hidden = !!acc;
        signedIn.hidden = !acc;
        if (!acc) {
            if (currentId) { stopSync(); currentId = null; }
            paintBadge(null);
            firstSyncShown = false;
            blockedAccount = null;
            blockedErr = null;
            renderCompany();
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
                // An invite link waiting? Join that team first, so the first sync opens it.
                if (pendingJoinCode()) consumeJoinCode(app).finally(() => { if (currentId === acc.id) startSync(app, acc, onStatus, onBlocked); });
                else startSync(app, acc, onStatus, onBlocked);
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
        renderCompany();
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
