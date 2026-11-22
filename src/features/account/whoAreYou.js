// "Who are you?" after the first Google sign-in on a phone, for a person with no business yet
// and no invitation waiting (server: drillrig_has_company, migration 0013).
//
//   I own the rig      -> the app goes on as before: the first sync creates their business,
//                         then the welcome popup asks the business name.
//   I work on a rig    -> a waiting screen: send your details to your owner on WhatsApp, and
//                         the invitation (Accept / Reject) shows here as soon as it is sent.
//                         No business is created for them, so staff never end up "owners".
//
// Without 0013 (older server) or offline, nothing is asked and the app works as before.
import { getSupabase, signOut } from '../../cloud/auth.js';
import { storage } from '../../data/storage.js';
import { checkInvitations } from '../team/invitations.js';
import { icon, paintIcons } from '../../ui/icon.js';

const choiceKey = (uid) => `drillrig_who_${uid}`;
const POLL_MS = 15000;

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
}

const getChoice = (uid) => { try { return storage.getRaw(choiceKey(uid)); } catch { return null; } };
const setChoice = (uid, v) => { try { storage.setRaw(choiceKey(uid), v); } catch { /* ignore */ } };

/** The WhatsApp message a staff member sends to the owner (pure, tested). */
export function staffRequestText({ name, email, phone }) {
    return [
        'Please add me to your rig in DrillRig (drillrig.in).',
        'Settings → Team & Rigs → "Add person to this rig".',
        '',
        `Name: ${name || '-'}`,
        phone ? `Mobile: ${phone}` : null,
        email ? `Gmail: ${email}` : null
    ].filter((x) => x !== null).join('\n');
}

/**
 * Resolves when the app may start syncing: 'owner', 'joined' (accepted an invitation),
 * or 'skip' (already in a business / older server / offline). For staff it stays open
 * (the waiting screen) until an invitation is accepted or they switch to "owner".
 */
export async function askWhoYouAre(app, acc) {
    if (typeof document === 'undefined' || !acc?.id) return 'skip';
    if (getChoice(acc.id) === 'owner') return 'skip';
    let has;
    try {
        const sb = await getSupabase();
        const { data, error } = await sb.rpc('drillrig_has_company');
        if (error) return 'skip'; // server before 0013
        has = !!data;
    } catch { return 'skip'; } // offline: works as before
    if (has) return 'skip';
    return showWhoScreen(app, acc);
}

/** The screen itself (also opened directly by the visual check harness). */
export function showWhoScreen(app, acc) {
    return new Promise((resolve) => {
        const card = el('div', { class: 'sw-card way-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wayTitle' });
        const overlay = el('div', { class: 'sw-overlay', id: 'whoAreYouOverlay' }, [card]);
        let timer = null;
        const stopPoll = () => { if (timer) { clearInterval(timer); timer = null; } };
        const finish = (result) => {
            stopPoll();
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
            resolve(result);
        };
        const first = String(acc.name || '').trim().split(' ')[0] || String(acc.email || '').split('@')[0];

        const showChoice = () => {
            stopPoll();
            const option = (ic, cls, title, text, onclick) => el('button', { type: 'button', class: `way-opt ${cls}`, onclick }, [
                el('span', { class: 'way-opt-ic', 'aria-hidden': 'true' }, [icon(ic)]),
                el('span', { class: 'way-opt-tx' }, [el('strong', { text: title }), el('small', { text })]),
                el('span', { class: 'way-opt-go', 'aria-hidden': 'true' }, [icon('chevron-right')])
            ]);
            card.replaceChildren(
                el('h2', { id: 'wayTitle', class: 'sw-title', text: first ? `Welcome, ${first}!` : 'Welcome!' }),
                el('p', { class: 'sw-sub', text: 'How will you use DrillRig?' }),
                el('div', { class: 'way-opts' }, [
                    option('crown', 'is-owner', 'I own the rig / business', 'Make bills, add your drivers, see reports.', () => { setChoice(acc.id, 'owner'); finish('owner'); }),
                    option('hard-hat', 'is-staff', 'I work on a rig', 'Driver or manager. Your owner adds you to their rig.', () => { setChoice(acc.id, 'staff'); showWaiting(); })
                ]),
                el('p', { class: 'way-foot', text: `Signed in as ${acc.email || acc.name}` })
            );
            paintIcons();
        };

        const showWaiting = () => {
            const phone = el('input', { id: 'wayPhone', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: '14', placeholder: 'Your mobile number' });
            const status = el('p', { class: 'way-status', role: 'status' }, [el('span', { class: 'way-pulse', 'aria-hidden': 'true' }), el('span', { text: 'Waiting for your invitation…' })]);
            const sendBtn = el('button', { type: 'button', class: 'sw-btn primary way-wa' }, [icon('message-circle'), ' Send my details to my owner']);
            const checkBtn = el('button', { type: 'button', class: 'sw-link', text: 'Check now' });
            const ownerBtn = el('button', { type: 'button', class: 'sw-link', text: 'I am the owner: set up my business' });
            const otherBtn = el('button', { type: 'button', class: 'sw-link', text: 'Use another Google account' });
            const step = (n, title, text, extra) => el('li', {}, [
                el('span', { class: 'way-n', 'aria-hidden': 'true', text: String(n) }),
                el('div', {}, [el('strong', { text: title }), el('span', { text }), extra || null])
            ]);
            card.replaceChildren(
                el('h2', { id: 'wayTitle', class: 'sw-title', text: 'Join your owner’s rig' }),
                el('p', { class: 'sw-sub', text: 'Your owner adds you in DrillRig. Then you make bills for their rig from this phone.' }),
                el('ol', { class: 'way-steps' }, [
                    step(1, 'Send your details to your owner', 'Your name, Gmail and mobile go on WhatsApp.', el('div', { class: 'way-send' }, [phone, sendBtn])),
                    step(2, 'Your owner sends you a link', 'They add you in Team & Rigs and send an invite on WhatsApp. Open that link on this phone.'),
                    step(3, 'Tap Accept', 'The invitation opens here by itself. Tap Accept and start billing.')
                ]),
                status,
                el('div', { class: 'sw-links way-links' }, [checkBtn, ownerBtn, otherBtn])
            );
            paintIcons();

            // Prefill the saved mobile (0010) so the owner's lookup shows this person's name.
            (async () => {
                try {
                    const sb = await getSupabase();
                    const { data } = await sb.rpc('drillrig_my_profile');
                    if (data?.phone && !phone.value) phone.value = String(data.phone).replace(/^\+91/, '');
                } catch { /* ignore */ }
            })();

            sendBtn.addEventListener('click', async () => {
                const digits = phone.value.replace(/\D/g, '').slice(-10);
                if (digits.length !== 10) { phone.setAttribute('aria-invalid', 'true'); phone.focus(); app?.showToast?.('Enter your 10-digit mobile number'); return; }
                phone.removeAttribute('aria-invalid');
                try { // saved, so "Add person" on the owner's phone shows who this number is
                    const sb = await getSupabase();
                    await sb.rpc('drillrig_set_my_phone', { p_phone: `+91${digits}` });
                } catch { /* the message still goes */ }
                const text = staffRequestText({ name: acc.name, email: acc.email, phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` });
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
            });

            let checking = false;
            const check = async (manual = false) => {
                if (checking || (document.hidden && !manual)) return;
                checking = true;
                try {
                    const res = await checkInvitations(app, { phoneHasCompany: false });
                    if (res?.open) { finish('joined'); return; }
                    if (manual) app?.showToast?.('No invitation yet. Ask your owner to send it.');
                } catch {
                    if (manual) app?.showToast?.('Could not check. Are you online?');
                } finally { checking = false; }
            };
            checkBtn.addEventListener('click', () => check(true));
            ownerBtn.addEventListener('click', () => { setChoice(acc.id, 'owner'); finish('owner'); });
            otherBtn.addEventListener('click', async () => {
                stopPoll();
                try { await signOut(); } catch { /* ignore */ }
                finish('signed-out');
            });
            stopPoll();
            timer = setInterval(() => check(false), POLL_MS);
        };

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        if (getChoice(acc.id) === 'staff') showWaiting(); else showChoice();
    });
}
