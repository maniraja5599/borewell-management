// The "Sign in with Google" card at the top of Settings.
// Sign-in itself is required before the app opens (signInGate.js); this card shows the account and sync.
import { getCurrentAccount, onAccountChange, renderGoogleButton, signOut } from '../../cloud/auth.js';
import { startSync, stopSync, syncNow, checkPhoneOwner, clearPhoneData, setPreferredCompany, getSyncInfo } from '../../cloud/sync.js';
import { checkInvitations, showSwitchCard } from '../team/invitations.js';
import { maybeAskProfile } from './profilePrompt.js';
import { askWhoYouAre } from './whoAreYou.js';
import { getAccess, onAccessChange } from '../../cloud/access.js';
import { isEarlyAccess, earlyAccessEndLabel, earlyAccessDaysLeft } from '../../config/plans.js';
import { icon, paintIcons } from '../../ui/icon.js';

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
        if (st.quiet) { lastNoticeKind = st.kind; return; }
        if (st.kind === 'ok') window.__drillrigSetupBusy = false; // first sync done: other popups may show again
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
    // Waiting for the person to answer "Different account on this phone": no "Sync failed" banner.
    const showBlocked = () => {
        onStatus({ kind: 'error', text: 'Not syncing — tap to fix', at: Date.now(), quiet: true });
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
    // "Your businesses" list (more than one company, or an invitation): full width under the account row.
    const bizSlot = document.createElement('div');
    bizSlot.className = 'acc-biz-slot';
    signedIn.insertAdjacentElement('afterend', bizSlot);
    const ROLE = { owner: 'Owner', manager: 'Manager', office: 'Office staff', driver: 'Manager' };
    const switchTo = (companyId, name) => showSwitchCard(app, companyId, name);
    const renderCompany = () => {
        const a = getAccess();
        companyLine.textContent = '';
        bizSlot.textContent = '';
        if (!a || signedIn.hidden) return;
        // The phone still holds another account's company (waiting for "Different account"): show nothing.
        if (currentId && a.userId && a.userId !== currentId) return;
        const line = document.createElement('span');
        line.className = 'acc-company-name';
        // The owner's own Settings name is the freshest (the cloud name may lag until the next sync).
        const ownName = a.role === 'owner' ? String(app.brand?.companyName || '').trim() : '';
        const name = ownName && ownName !== app.defaultBrand?.companyName ? ownName : a.companyName;
        line.textContent = `${ROLE[a.role] || a.role} · ${name || 'Company'}`;
        companyLine.appendChild(line);

        // Someone in more than one business (e.g. owner of their own + manager in another):
        // a clean list with the one open on this phone and a Switch button for each other one.
        const companies = Array.isArray(a.companies) ? a.companies : [];
        const invites = Array.isArray(a.invites) ? a.invites : [];
        if (companies.length < 2 && !invites.length) return;
        const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
        const box = mk('div', 'acc-biz');
        box.appendChild(mk('div', 'acc-biz-title', companies.length > 1 ? 'Your businesses' : 'Invitations'));
        const row = (lead, title, subText, action, cls = '') => {
            const r = mk('div', `acc-biz-row${cls ? ` ${cls}` : ''}`);
            const txt = mk('div', 'acc-biz-txt');
            txt.append(mk('strong', null, title), mk('small', null, subText));
            r.append(lead, txt, action);
            return r;
        };
        const smallBtn = (label, kind, onClick) => {
            const b = mk('button', `tt-btn is-sm${kind ? ` is-${kind}` : ''}`, label);
            b.type = 'button';
            b.addEventListener('click', onClick);
            return b;
        };
        if (companies.length > 1) {
            for (const c of companies) {
                const isOpen = c.company_id === a.companyId;
                const title = isOpen ? (name || c.name) : c.name;
                const lead = mk('span', `tt-avatar${isOpen ? ' is-open' : ''}`, String(title || '?').trim().charAt(0).toUpperCase());
                const action = isOpen ? mk('span', 'tt-pill is-ok', 'Open') : smallBtn('Switch', '', () => switchTo(c.company_id, c.name));
                if (!isOpen) action.setAttribute('aria-label', `Switch to ${c.name}`);
                box.appendChild(row(lead, title, `${ROLE[c.role] || c.role}${isOpen ? ' · on this phone' : ''}`, action, isOpen ? 'is-open' : ''));
            }
        }
        for (const iv of invites) {
            // Opens the invitation card: Accept / Reject (nothing is joined without a yes).
            const b = smallBtn('View', 'pri', () => checkInvitations(app, { phoneHasCompany: true, only: { ...iv, status: 'open' } }).then(() => syncNow()));
            const lead = mk('span', 'tt-avatar is-warn');
            lead.appendChild(icon('mail'));
            box.appendChild(row(lead, iv.company_name, `Invitation · ${ROLE[iv.role] || iv.role}`, b, 'is-invite'));
        }
        bizSlot.appendChild(box);
        paintIcons();
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
            // Sign-in setup (other account on the phone, "Who are you?", invitations, first sync):
            // the install popup waits until it is done (pwa/initPwa.js).
            window.__drillrigSetupBusy = true;
            const other = checkPhoneOwner(app, acc);
            if (other) {
                stopSync();
                blockedAccount = acc;
                showBlocked();
                askToTakeOverPhone(acc, other);
            } else {
                blockedAccount = null;
                // Invitations (link opened on this phone, or sent to this Gmail) are answered first:
                //  - a phone that already shows this person's company keeps syncing meanwhile;
                //  - a new phone waits, so an accepted invite opens that company instead of a new empty one.
                const info = getSyncInfo();
                const phoneHasCompany = !!(info && info.userId === acc.id && info.companyId);
                if (phoneHasCompany) {
                    startSync(app, acc, onStatus, onBlocked);
                    setTimeout(() => { if (currentId === acc.id) checkInvitations(app, { phoneHasCompany: true }).catch(() => null); }, 1200);
                } else {
                    // No invitation accepted: "Who are you?" (owner / staff) before a business is
                    // created for them; staff wait on that screen for their owner's invitation.
                    checkInvitations(app, { phoneHasCompany: false }).catch(() => null)
                        .then((res) => (res?.open ? 'joined' : askWhoYouAre(app, acc)))
                        .catch(() => 'skip')
                        .then((who) => { if (who !== 'signed-out' && currentId === acc.id) startSync(app, acc, onStatus, onBlocked); });
                }
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
