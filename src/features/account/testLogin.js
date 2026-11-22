// Test sign-in with dummy accounts — LOCAL TESTING ONLY (http://localhost or a home-network address
// opened with ?test=1; see signInGate.isLocalTestHost). Google sign-in does not work there, so this
// lets the owner see the app as an owner, a manager or office staff.
//
// These are pretend accounts: the role, rigs and permissions are set on this phone only (as if the
// server had sent them). Nothing goes to the cloud, nothing syncs. On drillrig.in this never runs.
import { isLocalTestHost, SIGNIN_GATE_SKIP_KEY } from './signInGate.js';
import { setAccessFromServer, setPerms, clearAccess, getAccess } from '../../cloud/access.js';
import { el, openSheet, item, pill, avatar } from '../../ui/sheet.js';
import { icon, paintIcons } from '../../ui/icon.js';

const KEY = 'drillrig_test_login';
const RIGS = [
    { id: '00000000-0000-4000-8000-00000000a001', name: 'Rig 1', bill_prefix: 'AB', is_default: true, active: true, archived: false },
    { id: '00000000-0000-4000-8000-00000000a002', name: 'Rig 2', bill_prefix: 'R2', is_default: false, active: true, archived: false }
];
export const TEST_ACCOUNTS = [
    { key: 'owner', email: 'owner@test.local', name: 'Test Owner', role: 'owner', rigs: RIGS, about: 'Owner · both rigs · everything' },
    { key: 'manager', email: 'manager@test.local', name: 'Test Manager', role: 'manager', rigs: [RIGS[0]], about: 'Manager · Rig 1 only' },
    { key: 'office', email: 'office@test.local', name: 'Test Office', role: 'office', rigs: RIGS, perms: { bills: true, reports: true, workers: true, stock: true, expenses: true }, about: 'Office staff · bills, reports, workers, stock, expenses' }
];

const testMode = () => {
    try { return isLocalTestHost(location.hostname) && localStorage.getItem(SIGNIN_GATE_SKIP_KEY) === '1'; } catch { return false; }
};
export const testAccount = () => {
    try { return TEST_ACCOUNTS.find((a) => a.key === localStorage.getItem(KEY)) || null; } catch { return null; }
};

/** Sign in as a dummy account (sets the role on this phone only) and reload. */
export function signInTest(key) {
    const acc = TEST_ACCOUNTS.find((a) => a.key === key);
    if (!acc || !testMode()) return false;
    localStorage.setItem(KEY, acc.key);
    setAccessFromServer({
        company_id: '00000000-0000-4000-8000-0000000c0001', company_name: 'Test Borewells', role: acc.role, access_rev: 1,
        rigs: acc.rigs, companies: [], invites: []
    }, `test-${acc.key}`, acc.name);
    if (acc.perms) setPerms(acc.perms);
    return true;
}

export function signOutTest() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    clearAccess();
}

export function initTestLogin(app) {
    if (!testMode()) return;

    function picker({ first = false } = {}) {
        const sheet = openSheet({ title: 'Test sign-in', sub: 'Local testing only · dummy accounts, no cloud', ic: 'flask-conical' });
        const now = testAccount();
        sheet.body.replaceChildren(
            el('p', { class: 'tt-note is-tip' }, [icon('info'), el('span', { text: 'Google sign-in works only on drillrig.in. Here you can see the app as each role. Nothing syncs; all accounts share this phone\'s bills.' })]),
            el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, [
                ...TEST_ACCOUNTS.map((a) => {
                    const row = item({ avatar: avatar(a.name), title: a.email, subText: a.about, pill: now?.key === a.key ? pill('Signed in', 'is-ok') : pill(a.role === 'office' ? 'Office' : a.role === 'manager' ? 'Manager' : 'Owner', `is-${a.role === 'office' ? 'office' : 'operator'}`) });
                    row.classList.add('tl-row');
                    row.addEventListener('click', () => { signInTest(a.key); location.reload(); });
                    return row;
                }),
                ...(first ? [] : [(() => {
                    const out = item({ avatar: el('span', { class: 'tt-avatar is-muted', 'aria-hidden': 'true' }, [icon('log-out')]), title: 'No account', subText: 'Like a phone that never signed in (single-user)', pill: !now ? pill('Now', 'is-ok') : null });
                    out.classList.add('tl-row');
                    out.addEventListener('click', () => { signOutTest(); location.reload(); });
                    return out;
                })()])
            ])])
        );
        paintIcons();
    }

    // The chip: who is signed in; tap to switch.
    const acc = testAccount();
    // A dummy account has no Google session: hide the "Continue with Google" card meanwhile.
    document.documentElement.classList.toggle('test-login', !!acc);
    const chip = el('button', { type: 'button', class: 'tl-chip', id: 'testLoginChip', title: 'Test sign-in (local only)', 'aria-label': `Test sign-in: ${acc ? acc.email : 'no account'}. Tap to switch.` }, [
        el('span', { 'aria-hidden': 'true', text: '🧪' }),
        el('span', { text: acc ? acc.email : 'Test sign-in' })
    ]);
    chip.addEventListener('click', () => picker());
    document.body.appendChild(chip);

    // First visit in test mode: offer the accounts once.
    try {
        if (!acc && !localStorage.getItem(`${KEY}_asked`) && !getAccess()) {
            localStorage.setItem(`${KEY}_asked`, '1');
            setTimeout(() => picker({ first: true }), 600);
        }
    } catch { /* ignore */ }
}
