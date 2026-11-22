// Cloud sync for a signed-in user.
// The phone stays the working copy (fully offline-capable). This module:
//   - creates/finds the user's company on first sign-in,
//   - downloads what other phones changed, uploads what this phone changed,
//   - reserves bill numbers on the server while online.
// It hooks the app at two points only: saveToStorage and saveCurrentBillToHistory.
import { STORAGE_KEYS, storage } from '../data/storage.js';
import { getSupabase } from './auth.js';
import { isSafeId, sanitizeRecordData } from '../data/sanitize.js';
import { setAccessFromServer, setPerms, clearAccess, getCurrentRig, canCreateBill, rigPrefix } from './access.js';
import { SETTING_IDS, LIST_KINDS, LIST_NAMES, holdMassDeletes, indexLocal, planPull, planPush, applyToLocal, recordKey, dropDefaultCloudSettings, isDefaultSetting, hashData, safePullRev } from './syncPlan.js';

const STATE_KEY = 'drillrig_sync_v1';
const PUSH_BATCH = 200;
const PULL_PAGE = 500;
const PULL_OVERLAP = 50;       // old servers only: re-read a few revs back so a slow concurrent write is never missed
const DEBOUNCE_MS = 2000;
const PERIODIC_MS = 60000;
const CLAIM_TIMEOUT_MS = 4000;

const SYNCED_KEYS = new Set([
    ...LIST_NAMES.map((name) => STORAGE_KEYS[name]),
    ...SETTING_IDS.map((id) => STORAGE_KEYS[id])
]);

let ctx = null; // { app, account, state, timer, interval, running, again, onStatus, handlers }

function loadState() {
    try { return JSON.parse(storage.getRaw(STATE_KEY) || 'null'); } catch { return null; }
}
function saveState(state) {
    try { storage.setRaw(STATE_KEY, JSON.stringify(state)); } catch { /* storage full: next sync redoes it */ }
}

function readJson(key, fallback) {
    try {
        const raw = storage.getRaw(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

/** What is saved on this phone right now. */
function readLocal() {
    const settings = {};
    for (const id of SETTING_IDS) {
        const v = readJson(STORAGE_KEYS[id], undefined);
        if (v !== undefined) settings[id] = v;
    }
    // The big lists are the live in-memory lists (no copy): applyToLocal never edits records in place.
    const local = { settings };
    for (const name of LIST_NAMES) local[name] = storage.getList(STORAGE_KEYS[name]);
    return local;
}

const LIST_KEY = Object.fromEntries(Object.entries(LIST_KINDS).map(([kind, name]) => [kind, STORAGE_KEYS[name]]));
/** Record hashes: the big lists reuse the hash saved with each record instead of re-hashing 50,000 bills. */
const hashFor = (kind, data) => (LIST_KEY[kind] ? storage.hashOf(LIST_KEY[kind], data, hashData) : hashData(data));
const indexPhone = (local) => indexLocal(local, hashFor);

/** Old customers may have no id; give them one so they can be synced. */
function ensureCustomerIds(app) {
    const list = storage.getList(STORAGE_KEYS.customers);
    if (!Array.isArray(list)) return;
    const fixed = [];
    list.forEach((c, i) => {
        if (c && (c.id === undefined || c.id === null || c.id === '')) {
            c.id = `cust_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
            fixed.push(c.id);
        }
    });
    if (!fixed.length) return;
    storage.setList(STORAGE_KEYS.customers, list, fixed);
    app.customers = list;
}

/** Write cloud changes to the phone and redraw the screens that show them. */
function writeLocal(app, local, changed) {
    if (!changed.size) return;
    if (changed.has('customers')) {
        storage.setList(STORAGE_KEYS.customers, local.customers);
        app.customers = local.customers;
    }
    if (changed.has('history')) {
        storage.setList(STORAGE_KEYS.history, local.history);
        app.history = local.history;
    }
    // Lists with their own screens: save and tell those screens (drillrig:<list>-changed).
    for (const name of ['stock', 'workers', 'tools']) {
        if (!changed.has(name)) continue;
        storage.setList(STORAGE_KEYS[name], local[name]);
        try { window.dispatchEvent(new CustomEvent(`drillrig:${name}-changed`)); } catch { /* ignore */ }
    }
    const merge = (id, defaults, isArray) => {
        if (!changed.has(id)) return;
        const v = local.settings[id];
        if (v === undefined) return;
        storage.setRaw(STORAGE_KEYS[id], JSON.stringify(v));
        app[id] = isArray ? v : { ...JSON.parse(JSON.stringify(defaults || {})), ...v };
    };
    merge('brand', app.defaultBrand);
    merge('rates', app.defaultRates);
    merge('waFormat', app.defaultWaFormat);
    merge('rateProfiles', null, true);
    merge('savedExtras', null, true);
    merge('savedNotes', null, true);

    const run = (fn) => { try { fn(); } catch (e) { console.warn('[sync] redraw', e); } };
    run(() => app.applyBrandToUI());
    if (changed.has('rates') || changed.has('rateProfiles')) {
        // The downloaded rates say which card they came from: mark that card as applied.
        const fromCard = app.rates?.profileId;
        if (fromCard && app.rateProfiles?.some((p) => p.id === fromCard)) {
            app.activeRateProfileId = fromCard;
            if (app.state) app.state.activeRateProfileId = fromCard;
        }
        run(() => app.populateRateInputsUI(app.getActiveRateProfile()));
        run(() => app.renderMasterSlabsGrid());
        run(() => app.renderRateProfilesUI());
    }
    run(() => app.renderHistoryList(document.getElementById('historySearchInput')?.value || ''));
    run(() => app.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || ''));
    run(() => app.renderCustomerSiteSuggestions());
    run(() => app.renderSavedExtrasUI({ showDropdown: false }));
    run(() => app.renderSavedNotesUI());
    run(() => app.syncAutoBillNumber(true)); // counters may have changed on another phone
    run(() => app.calculateAndRender());
}

function status(kind, text, extra = {}) {
    ctx?.onStatus?.({ kind, text, at: Date.now(), ...extra });
}

async function rpc(name, args) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) {
        const err = new Error(error.message || String(error));
        err.code = error.code;
        err.hint = error.hint;
        throw err;
    }
    return data;
}

const isMissingFunction = (err) =>
    err?.code === 'PGRST202' || /could not find the function|function .* does not exist/i.test(err?.message || '');

/**
 * Ask the server who we are in which company (every sync: role, rigs and subscription
 * can change at any time). Returns true when this person's access changed since last time.
 */
async function refreshAccess() {
    const st = ctx.state;
    const brand = readJson(STORAGE_KEYS.brand, {}) || {};
    let rows;
    try {
        rows = await rpc('drillrig_my_company', {
            p_name: brand.companyName || '',
            p_prefix: brand.billPrefix || '',
            p_company: st.companyId || readPreferredCompany() || null
        });
    } catch (err) {
        if (!isMissingFunction(err)) throw err;
        rows = await rpc('drillrig_my_company', { p_name: brand.companyName || '' }); // server before migration 0003
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.company_id) throw new Error('Could not open your company in the cloud');

    // This phone holds one company's data. If the server now answers with a different company,
    // the person was removed from (or lost) the old one: never mix the two.
    if (st.companyId && row.company_id !== st.companyId) {
        const err = new Error(`No longer a member of ${st.companyName || 'this company'}`);
        err.code = 'DRILLRIG_REMOVED';
        err.companyName = st.companyName || '';
        throw err;
    }

    setAccessFromServer(row, ctx.account.id, ctx.account.name || String(ctx.account.email || '').split('@')[0]);
    // Office staff: what the owner ticked (0014). Kept as it was when offline or on an older server.
    if (row.role === 'office') {
        try { setPerms(await rpc('drillrig_my_perms', { p_company: row.company_id })); } catch { /* keep last known */ }
    }
    const rev = row.access_rev === undefined || row.access_rev === null ? null : String(row.access_rev);
    // Access changed: a new access number, or a new role (a phone that never stored the number
    // missed the driver → manager change of 0014 and kept seeing only its own bills).
    const changed = (st.accessRev != null && rev != null && rev !== st.accessRev)
        || (!!st.role && !!row.role && st.role !== row.role);
    st.companyId = row.company_id;
    st.companyName = row.company_name;
    st.role = row.role;
    st.accessRev = rev;
    // A rig that is active again: let bills refused for "subscription" be uploaded.
    if (st.rejected && (row.rigs || []).some((r) => r.active)) {
        for (const [k, v] of Object.entries(st.rejected)) if (v?.reason === 'subscription') delete st.rejected[k];
    }
    saveState(st);
    return changed;
}

/** What the server supports (re-asked every 10 minutes; older servers have no such function). */
async function serverCaps() {
    if (ctx.caps && Date.now() - ctx.capsAt < 600000) return ctx.caps;
    try {
        const caps = await rpc('drillrig_capabilities', {});
        ctx.caps = Array.isArray(caps) ? caps : [];
    } catch (err) {
        if (!isMissingFunction(err)) throw err;
        ctx.caps = [];
    }
    ctx.capsAt = Date.now();
    return ctx.caps;
}

const PREF_KEY = 'drillrig_company_pref';
function readPreferredCompany() {
    try { return storage.getRaw(PREF_KEY) || null; } catch { return null; }
}
/** Which company to open on the next sign-in/sync (company switcher, accepted invite). */
export function setPreferredCompany(id) {
    try { if (id) storage.setRaw(PREF_KEY, id); else storage.remove(PREF_KEY); } catch { /* ignore */ }
}

/**
 * Role, rigs or permissions changed: drop the per-rig lists on this phone (bills, pipe stock,
 * workers, bits & hammers) and download what is visible now.
 */
const RIG_KINDS = ['bill', 'stock', 'worker', 'tool'];
function reloadVisibleBills(app) {
    const st = ctx.state;
    for (const kind of RIG_KINDS) storage.setList(STORAGE_KEYS[LIST_KINDS[kind]], []);
    app.history = storage.getList(STORAGE_KEYS.history);
    const isRigKey = (key) => RIG_KINDS.some((k) => key.startsWith(`${k}:`));
    for (const key of Object.keys(st.hashes)) if (isRigKey(key)) delete st.hashes[key];
    if (st.rejected) for (const key of Object.keys(st.rejected)) if (isRigKey(key)) delete st.rejected[key];
    for (const name of ['stock', 'workers', 'tools']) {
        try { window.dispatchEvent(new CustomEvent(`drillrig:${name}-changed`)); } catch { /* ignore */ }
    }
    st.lastRev = 0;
    saveState(st);
    try { app.renderHistoryList?.(''); app.showToast?.('🔄 Your access changed — reloading bills'); } catch { /* ignore */ }
}

// "Clear all" in the bill book: the owner really wants every bill gone, also from the cloud.
const WIPE_KEY = 'drillrig_allow_wipe';
/** Called by "Clear all" (kind 'bill'). The permission lasts 15 minutes. */
export function allowWipe(kind) {
    try { storage.setRaw(WIPE_KEY, JSON.stringify({ kind, at: Date.now() })); } catch { /* ignore */ }
}
function allowedWipes() {
    try {
        const v = JSON.parse(storage.getRaw(WIPE_KEY) || 'null');
        return v && Date.now() - v.at < 15 * 60000 ? [v.kind] : [];
    } catch { return []; }
}

/**
 * Only rows this person may upload; and not ones the server already refused unchanged.
 * Stock, workers and tools wait on the phone until the server supports them (0005 / 0014);
 * drivers (retired role) never upload them.
 */
const KIND_CAP = { stock: 'stock', worker: 'workers', tool: 'tools' };
export function filterPushable(rows, role, rejected = {}, caps = []) {
    return rows.filter((r) => {
        if (KIND_CAP[r.kind] && (!caps.includes(KIND_CAP[r.kind]) || role === 'driver')) return false;
        if (role && role !== 'owner' && (r.kind === 'setting' || r.deleted)) return false;
        const mark = rejected[r.key];
        return !(mark && mark.hash === (r.hash ?? 'deleted'));
    });
}

const REJECT_TEXT = {
    subscription: (n) => `⚠️ ${n} new bill${n === 1 ? '' : 's'} not uploaded — this rig's subscription has ended. ${n === 1 ? 'It is' : 'They are'} saved on this phone and will upload after renewal.`,
    other: (n) => `⚠️ ${n} change${n === 1 ? ' was' : 's were'} not uploaded — not allowed for your role.`
};

function notifyRejected(app, rejected) {
    if (!rejected.length) return;
    console.warn('[sync] refused by server:', rejected);
    const subs = rejected.filter((r) => r.reason === 'subscription').length;
    const other = rejected.length - subs;
    try {
        if (subs) app.showToast?.(REJECT_TEXT.subscription(subs));
        else if (other) app.showToast?.(REJECT_TEXT.other(other));
    } catch { /* ignore */ }
}

/**
 * Download what changed after `since`. Returns the rows and the new "seen up to" mark.
 * With drillrig_pull_v2 (0006) only the last two minutes of changes are ever read twice;
 * older servers re-read the last PULL_OVERLAP revs every time.
 */
async function pullAll(since) {
    since = Math.max(0, Number(since) || 0);
    if (!ctx.noPullV2) {
        try {
            const pages = [];
            const all = [];
            let cursor = since;
            for (;;) {
                const page = await rpc('drillrig_pull_v2', { p_company: ctx.state.companyId, p_since: cursor, p_limit: PULL_PAGE });
                const rows = Array.isArray(page?.rows) ? page.rows : [];
                pages.push({ now: page?.now, rows });
                all.push(...rows);
                if (rows.length < PULL_PAGE) break;
                cursor = rows[rows.length - 1].rev;
            }
            return { rows: all, lastRev: safePullRev(pages, since) };
        } catch (e) {
            if (!isMissingFunction(e)) throw e;
            ctx.noPullV2 = true; // server without 0006: ask again next app start
        }
    }
    const all = [];
    let cursor = since > 0 ? Math.max(0, since - PULL_OVERLAP) : 0;
    for (;;) {
        const page = await rpc('drillrig_pull', { p_company: ctx.state.companyId, p_since: cursor, p_limit: PULL_PAGE });
        const rows = Array.isArray(page) ? page : [];
        all.push(...rows);
        if (rows.length < PULL_PAGE) break;
        cursor = rows[rows.length - 1].rev;
    }
    return { rows: all, lastRev: all.reduce((m, r) => Math.max(m, Number(r.rev) || 0), since) };
}

/**
 * Records written by other people's phones are cleaned before they touch this phone
 * (see data/sanitize.js). Done before planning, so the stored copy and the remembered
 * hash agree and a cleaned record is not re-uploaded on every sync.
 */
export function cleanPulledRows(rows) {
    const out = [];
    for (const r of rows || []) {
        if (!r || !isSafeId(String(r.id ?? '')) || !(r.kind === 'setting' || LIST_KINDS[r.kind])) continue;
        if (r.deleted) { out.push(r); continue; }
        const data = sanitizeRecordData(r.kind, r.data);
        if (data === null) continue;
        if (r.kind !== 'setting' && String(data.id) !== String(r.id)) continue; // row id must match its content
        out.push({ ...r, data });
    }
    return out;
}

/** Say which bills/customers were edited on two phones at once (this phone's copy is kept). */
export function describeConflicts(keys, index) {
    const names = keys.slice(0, 3).map((key) => {
        const d = index.get(key)?.data || {};
        return key.startsWith('bill:') ? `#${d.billNo || key.slice(5)}` : (d.name || 'a customer');
    });
    const more = keys.length > 3 ? ` +${keys.length - 3} more` : '';
    return `⚠️ ${names.join(', ')}${more} also changed on another phone — this phone's version was kept. Please check.`;
}

function notifyConflicts(app, keys, index) {
    console.warn('[sync] edited on two phones, kept this phone\'s copy:', keys);
    try { app.showToast?.(describeConflicts(keys, index)); } catch { /* ignore */ }
}

async function pushRows(rows) {
    const st = ctx.state;
    st.rejected = st.rejected || {};
    const refused = [];
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
        const batch = rows.slice(i, i + PUSH_BATCH);
        const res = await rpc('drillrig_push', {
            p_company: st.companyId,
            p_rows: batch.map(({ kind, id, data, deleted }) => ({ kind, id, data, deleted }))
        });
        // Server 0003+ answers {rev, rejected:[{kind,id,reason}]}; older servers a number.
        const rejected = Array.isArray(res?.rejected) ? res.rejected : [];
        const byKey = new Map(rejected.map((x) => [recordKey(x.kind, x.id), x.reason]));
        for (const r of batch) {
            if (byKey.has(r.key)) {
                st.rejected[r.key] = { hash: r.hash ?? 'deleted', reason: byKey.get(r.key) };
                refused.push({ key: r.key, reason: byKey.get(r.key) });
                continue;
            }
            delete st.rejected[r.key];
            if (r.hash === null) delete st.hashes[r.key];
            else st.hashes[r.key] = r.hash;
        }
        saveState(st);
    }
    return refused;
}

// Raise to make every staff phone download what it may see once more (after a server change
// that widened what staff can see). 2 = 2026-11-22: drivers became managers (0014).
const VISIBILITY_MARK = 2;

async function syncOnce() {
    const { app } = ctx;
    const st = ctx.state;
    let accessChanged = await refreshAccess();
    if (st.visibilityMark !== VISIBILITY_MARK) {
        if ((st.role || 'owner') !== 'owner' && st.firstSyncDone) accessChanged = true; // owners already see everything
        st.visibilityMark = VISIBILITY_MARK;
        saveState(st);
    }
    const role = st.role || 'owner';
    ensureCustomerIds(app);
    // Saved hashes must include any bill edited in place since the last save check.
    storage.verifyNow();

    const firstSync = !st.firstSyncDone;
    const defaults = { brand: app.defaultBrand, rates: app.defaultRates, waFormat: app.defaultWaFormat };

    // Staff joining a company must not upload bills/customers that were already on this phone
    // (their own trial data, or another business): ask first.
    if (firstSync && role !== 'owner') {
        const local = readLocal();
        const bills = (local.history || []).length;
        const customers = (local.customers || []).length;
        if (bills || customers) {
            const err = new Error('This phone already has bills that are not part of ' + (st.companyName || 'the company'));
            err.code = 'DRILLRIG_STAFF_LOCAL_DATA';
            Object.assign(err, { companyName: st.companyName || '', role, bills, customers });
            throw err;
        }
    }
    const { rows: rawPulled, lastRev: nextRev } = await pullAll(firstSync ? 0 : st.lastRev);
    const pulled = cleanPulledRows(rawPulled);
    // Only the owner's phone may upload settings, so staff never "keep" their own copy.
    const rows = role === 'owner' ? dropDefaultCloudSettings(pulled, readLocal(), defaults) : pulled;
    // Cloud only had defaults where this phone has real settings: re-upload the real ones.
    for (const r of pulled) {
        if (!rows.includes(r)) delete st.hashes[recordKey(r.kind, r.id)];
    }
    const before = indexPhone(readLocal());
    const plan = planPull(rows, before, st.hashes, { firstSync, defaults, cloudWinsSettings: role !== 'owner' });
    if (plan.conflicts?.length) notifyConflicts(app, plan.conflicts, before);
    const { local, changed } = applyToLocal(readLocal(), plan.apply);
    writeLocal(app, local, changed);
    for (const [key, hash] of Object.entries(plan.synced)) {
        if (hash === null) delete st.hashes[key];
        else st.hashes[key] = hash;
    }
    // Advance past every downloaded row that is final (including ones dropped by cleanPulledRows).
    st.lastRev = Math.max(st.lastRev || 0, nextRev);
    saveState(st);

    const pushIndex = indexPhone(readLocal());
    const guard = holdMassDeletes(planPush(pushIndex, st.hashes, defaults), pushIndex, st.hashes, { allowWipe: allowedWipes() });
    if (guard.held.length) {
        console.warn('[sync] held back deleting every record of:', guard.held);
        try { app.showToast?.('⚠️ This phone shows no bills, but the cloud has them. Nothing was deleted. Close and reopen DrillRig; if it stays empty, contact support.'); } catch { /* ignore */ }
    }
    const toPush = filterPushable(guard.rows, role, st.rejected || {}, await serverCaps());
    const refused = await pushRows(toPush);
    notifyRejected(app, refused);

    if (accessChanged) {
        reloadVisibleBills(app);
        ctx.again = true; // next pass downloads everything this person can now see
    }

    if (firstSync) {
        st.firstSyncDone = true;
        saveState(st);
        const down = plan.apply.filter((r) => !r.deleted).length;
        const up = toPush.filter((r) => !r.deleted).length;
        try { app.showToast?.(`☁️ Cloud ready — ${up} uploaded, ${down} downloaded`); } catch { /* ignore */ }
    }
    st.lastSyncAt = Date.now();
    saveState(st);
    return { pulled: plan.apply.length, pushed: toPush.length };
}

/** Run a sync now (coalesces overlapping requests). */
export async function syncNow() {
    if (!ctx) return;
    if (!navigator.onLine) { status('offline', 'Offline — will sync when internet is back'); return; }
    if (ctx.running) { ctx.again = true; return; }
    ctx.running = true;
    status('syncing', 'Syncing…');
    try {
        let pulled = 0;
        let pushed = 0;
        do {
            ctx.again = false;
            const r = await syncOnce();
            pulled += r?.pulled || 0;
            pushed += r?.pushed || 0;
        } while (ctx?.again);
        // pulled / pushed let the top bar say "3 new from cloud" only when something moved.
        status('ok', 'Synced', { pulled, pushed });
    } catch (err) {
        console.warn('[sync]', err);
        // The DrillRig team paused this business (see 0007): stop retrying, keep everything on the phone.
        if (err?.hint === 'DRILLRIG_SUSPENDED' || /paused for this business/i.test(err?.message || '')) err.code = 'DRILLRIG_SUSPENDED';
        if (err?.code === 'DRILLRIG_REMOVED' || err?.code === 'DRILLRIG_STAFF_LOCAL_DATA' || err?.code === 'DRILLRIG_SUSPENDED') {
            status('blocked', err.code === 'DRILLRIG_REMOVED'
                ? `No access to ${err.companyName || 'this company'} — tap to fix`
                : err.code === 'DRILLRIG_SUSPENDED' ? 'Cloud paused — tap for details' : 'Not syncing — tap to fix');
            try { ctx?.onBlocked?.(err); } catch { /* ignore */ }
            return;
        }
        const notReady = /drillrig_|function .* does not exist|schema cache/i.test(err?.message || '');
        status('error', notReady ? 'Cloud not set up yet' : `Sync failed — will retry (${err?.message || 'error'})`);
    } finally {
        if (ctx) ctx.running = false;
    }
}

function scheduleSync(delay = DEBOUNCE_MS) {
    if (!ctx) return;
    clearTimeout(ctx.timer);
    ctx.timer = setTimeout(syncNow, delay);
}

/** Before saving a NEW bill online, reserve its number on the server. */
async function claimNumberBeforeSave() {
    const { app, state: st } = ctx;
    if (!st.companyId || !st.firstSyncDone || !navigator.onLine) return;
    if (app.loadedHistoryBillId || app.isSavedBillReadOnly || !app.lastResult) return;

    const input = document.getElementById('billNoInput');
    if (!input) return;
    const docType = app.state?.docType === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
    const rig = getCurrentRig();
    if (rig && !canCreateBill()) return; // the save is refused by the subscription guard
    const prefix = rigPrefix(app.brand?.billPrefix);
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = docType === 'INVOICE' ? new RegExp(`^${esc}-(\\d+)$`, 'i') : new RegExp(`^${esc}-Q(\\d+)$`, 'i');
    const current = input.value.trim();
    const m = current.match(re);
    if (!m) return; // a number the user typed by hand — leave it alone

    // A number this phone already reserved but has not used yet (e.g. the save was stopped by a check).
    if (ctx.claimed && ctx.claimed.no === current && !app.history.some((h) => h.billNo === current)) return;

    const wanted = parseInt(m[1], 10);
    const got = await Promise.race([
        rpc('drillrig_claim_number', rig
            ? { p_company: st.companyId, p_doc_type: docType, p_min: wanted, p_rig: rig.id }
            : { p_company: st.companyId, p_doc_type: docType, p_min: wanted }),
        new Promise((resolve) => setTimeout(() => resolve(null), CLAIM_TIMEOUT_MS))
    ]);
    const n = parseInt(got, 10);
    if (!n) return; // slow network: keep the phone's number

    const no = docType === 'INVOICE' ? `${prefix}-${n}` : `${prefix}-Q${n}`;
    ctx.claimed = { no };
    if (n !== wanted) {
        input.value = no;
        if (!rig || rig.is_default) { // other rigs count from their own bills
            if (docType === 'INVOICE') app.brand.nextBillSeq = n;
            else app.brand.nextQuoteSeq = n;
        }
        try { app.showToast?.(`#${current} was already used on another phone — this bill is #${no}`); } catch { /* ignore */ }
    }
}

function hookApp(app) {
    if (app.__drillrigHooked) return;
    app.__drillrigHooked = true;

    const origSave = app.saveToStorage.bind(app);
    app.saveToStorage = (key, data, changed) => {
        const ok = origSave(key, data, changed);
        if (ok && ctx && SYNCED_KEYS.has(key)) scheduleSync();
        return ok;
    };

    const origSaveBill = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = async (...args) => {
        if (ctx) {
            try { await claimNumberBeforeSave(); } catch (e) { console.warn('[sync] claim', e); }
        }
        return origSaveBill(...args);
    };
}

/** Start syncing for this signed-in account. */
export function startSync(app, account, onStatus, onBlocked) {
    if (ctx && ctx.account.id === account.id) { ctx.onStatus = onStatus; ctx.onBlocked = onBlocked; syncNow(); return; }
    stopSync();
    hookApp(app);

    let state = loadState();
    if (!state || state.userId !== account.id) {
        state = { userId: account.id, email: account.email || '', companyId: null, lastRev: 0, hashes: {}, firstSyncDone: false };
        saveState(state);
    } else if (account.email && state.email !== account.email) {
        state.email = account.email;
        saveState(state);
    }

    const onOnline = () => scheduleSync(500);
    const onVisible = () => { if (document.visibilityState === 'visible') scheduleSync(500); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    ctx = {
        app, account, state, onStatus, onBlocked,
        timer: null, running: false, again: false, claimed: null,
        interval: setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, PERIODIC_MS),
        handlers: { onOnline, onVisible }
    };
    syncNow();
}

export function stopSync() {
    if (!ctx) return;
    clearTimeout(ctx.timer);
    clearInterval(ctx.interval);
    window.removeEventListener('online', ctx.handlers.onOnline);
    document.removeEventListener('visibilitychange', ctx.handlers.onVisible);
    ctx = null;
}

/**
 * Does this phone hold another account's company data?
 * A first sync uploads everything on the phone, so without this check signing in with a
 * second Google account would copy the first account's customers and bills into the
 * second account's company. Returns null when it is safe to start syncing.
 */
export function checkPhoneOwner(app, account) {
    const st = loadState();
    if (!st || !st.userId || st.userId === account.id) return null;
    const local = readLocal();
    const bills = Array.isArray(local.history) ? local.history.length : 0;
    const customers = Array.isArray(local.customers) ? local.customers.length : 0;
    const defaults = { brand: app.defaultBrand, rates: app.defaultRates, waFormat: app.defaultWaFormat };
    const realBrand = !isDefaultSetting('brand', local.settings.brand, defaults);
    if (!bills && !customers && !realBrand) return null;
    let unsynced = 0;
    try {
        storage.verifyNow();
        unsynced = planPush(indexPhone(local), st.hashes || {}, defaults).filter((r) => !r.deleted).length;
    } catch { /* count is only informational */ }
    return { email: st.email || '', bills, customers, unsynced };
}

/** Remove all company data from this phone (used when another account takes over the phone). */
export function clearPhoneData() {
    stopSync();
    const keys = [
        ...LIST_NAMES.map((name) => STORAGE_KEYS[name]), STORAGE_KEYS.lastSession,
        ...SETTING_IDS.map((id) => STORAGE_KEYS[id]), STATE_KEY
    ];
    for (const k of keys) {
        try { storage.remove(k); } catch { /* ignore */ }
    }
    clearAccess();
}

/**
 * Called before a backup is restored. Forgets what was last synced, so the next sync
 * MERGES with the cloud instead of treating "not in the backup" as "deleted":
 *   - records in the backup win (they are uploaded),
 *   - records only in the cloud (e.g. bills made after the backup) come back down.
 * Without this, restoring an old backup deleted newer bills on every phone.
 */
export function resetSyncBaseline() {
    const st = ctx?.state || loadState();
    if (!st) return;
    st.hashes = {};
    st.lastRev = 0;
    saveState(st);
    if (ctx) { ctx.again = true; scheduleSync(500); }
}

export function getSyncInfo() {
    const st = ctx?.state || loadState();
    return st ? { companyName: st.companyName, role: st.role, lastSyncAt: st.lastSyncAt, companyId: st.companyId, userId: st.userId } : null;
}

/** Changes on this phone that are not in the cloud yet (0 = safe to clear the phone). */
export function unsyncedCount(app) {
    const st = ctx?.state || loadState();
    if (!st) return 0;
    try {
        storage.verifyNow();
        const defaults = { brand: app.defaultBrand, rates: app.defaultRates, waFormat: app.defaultWaFormat };
        const rows = planPush(indexPhone(readLocal()), st.hashes || {}, defaults);
        return filterPushable(rows, st.role || 'owner', st.rejected || {}, ctx?.caps || []).length;
    } catch {
        return 0;
    }
}

/** Sync now and wait for it to finish; returns how many changes are still only on this phone. */
export async function flushSync(app) {
    const idle = async () => { for (let i = 0; ctx?.running && i < 120; i++) await new Promise((r) => setTimeout(r, 250)); };
    await idle();
    await syncNow();
    await idle();
    return unsyncedCount(app);
}

// Exposed for tests / debugging.
export const __internal = { readLocal, recordKey };
