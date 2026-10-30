// Cloud sync for a signed-in user.
// The phone stays the working copy (fully offline-capable). This module:
//   - finds the user's company (creates one for a new owner, joins one for invited staff),
//   - downloads what other phones changed, uploads what this phone changed,
//   - reserves bill numbers on the server while online,
//   - applies the user's role (owner / manager / driver) to the app.
// Permissions are enforced by the server; the app side only hides what a role cannot do.
import { STORAGE_KEYS, storage } from '../data/storage.js';
import { getSupabase } from './auth.js';
import { SETTING_IDS, indexLocal, planPull, planPush, applyToLocal, recordKey, dropDefaultCloudSettings } from './syncPlan.js';

const STATE_KEY = 'drillrig_sync_v1';
const PUSH_BATCH = 200;
const PULL_PAGE = 500;
const PULL_OVERLAP = 50;          // re-read a few revs back so a slow concurrent write is never missed
const DEBOUNCE_MS = 2000;
const PERIODIC_MS = 60000;
const CLAIM_TIMEOUT_MS = 4000;
const COMPANY_RECHECK_MS = 10 * 60000; // notice role changes / removal within 10 minutes

const SYNCED_KEYS = new Set([
    STORAGE_KEYS.customers, STORAGE_KEYS.history,
    ...SETTING_IDS.map((id) => STORAGE_KEYS[id])
]);

/** What each role may do in the app. The server enforces the same rules. */
export const ROLE_RULES = {
    owner:   { deleteBills: true,  deleteCustomers: true,  editSettings: true,  manageStaff: true,  seeStaff: true,  restoreBackup: true },
    manager: { deleteBills: false, deleteCustomers: true,  editSettings: true,  manageStaff: false, seeStaff: true,  restoreBackup: false },
    driver:  { deleteBills: false, deleteCustomers: false, editSettings: false, manageStaff: false, seeStaff: false, restoreBackup: false }
};

let ctx = null; // { app, account, state, timer, interval, running, again, onStatus, handlers, claimed }
const listeners = new Set();

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
    return {
        customers: readJson(STORAGE_KEYS.customers, []),
        history: readJson(STORAGE_KEYS.history, []),
        settings
    };
}

function hasBusinessData() {
    const l = readLocal();
    return (Array.isArray(l.customers) && l.customers.length > 0) || (Array.isArray(l.history) && l.history.length > 0);
}

/** Old customers may have no id; give them one so they can be synced. */
function ensureCustomerIds(app) {
    const list = readJson(STORAGE_KEYS.customers, []);
    if (!Array.isArray(list)) return;
    let fixed = 0;
    list.forEach((c, i) => {
        if (c && (c.id === undefined || c.id === null || c.id === '')) {
            c.id = `cust_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
            fixed++;
        }
    });
    if (!fixed) return;
    storage.setRaw(STORAGE_KEYS.customers, JSON.stringify(list));
    app.customers = list;
}

function redraw(app, changed) {
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
    run(() => app.syncAutoBillNumber());
    run(() => app.calculateAndRender());
}

/** Write cloud changes to the phone and redraw the screens that show them. */
function writeLocal(app, local, changed) {
    if (!changed.size) return;
    if (changed.has('customers')) {
        storage.setRaw(STORAGE_KEYS.customers, JSON.stringify(local.customers));
        app.customers = local.customers;
    }
    if (changed.has('history')) {
        storage.setRaw(STORAGE_KEYS.history, JSON.stringify(local.history));
        app.history = local.history;
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
    redraw(app, changed);
}

/**
 * Move this phone's customers & bills into a backup key and start clean.
 * Used when the phone switches to another company (e.g. a driver joining an owner),
 * so one company's bills are never mixed into another's.
 */
function stashLocalBusinessData(app, reason) {
    const key = `drillrig_phone_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
        storage.setRaw(key, JSON.stringify({
            reason,
            savedAt: new Date().toISOString(),
            customers: readJson(STORAGE_KEYS.customers, []),
            history: readJson(STORAGE_KEYS.history, [])
        }));
    } catch {
        // Storage full: keep the data where it is rather than lose it.
        return false;
    }
    storage.setRaw(STORAGE_KEYS.customers, '[]');
    storage.setRaw(STORAGE_KEYS.history, '[]');
    app.customers = [];
    app.history = [];
    redraw(app, new Set(['customers', 'history']));
    return true;
}

function status(kind, text) {
    ctx?.onStatus?.({ kind, text, at: Date.now() });
}

function emitContext() {
    const info = getCloudContext();
    for (const fn of listeners) { try { fn(info); } catch { /* ignore */ } }
}

export async function rpc(name, args) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) {
        const err = new Error(error.message || String(error));
        err.code = error.code;
        throw err;
    }
    return data;
}

class AccessRemoved extends Error {}

function applyRole(role) {
    const body = document.body;
    if (!body) return;
    if (role) body.dataset.cloudRole = role;
    else delete body.dataset.cloudRole;
}

async function ensureCompany(force = false) {
    const { app } = ctx;
    const st = ctx.state;
    const fresh = st.companyCheckedAt && Date.now() - st.companyCheckedAt < COMPANY_RECHECK_MS;
    if (st.companyId && fresh && !force && ctx.companyChecked) return;

    const name = readJson(STORAGE_KEYS.brand, {})?.companyName || '';
    const rows = await rpc('drillrig_my_company', { p_name: name });
    const row = Array.isArray(rows) ? rows[0] : rows;
    ctx.companyChecked = true;
    st.companyCheckedAt = Date.now();

    if (!row || row.removed || !row.company_id) {
        // The owner removed this person. Company data leaves the phone; changes that never
        // reached the cloud are kept in a phone backup so nothing typed is silently lost.
        const unsynced = st.companyId ? planPush(indexLocal(readLocal()), st.hashes || {}, null, { skipSettings: true }) : [];
        if (unsynced.length) {
            try {
                storage.setRaw(`drillrig_unsynced_backup_${Date.now()}`, JSON.stringify(unsynced.map(({ kind, id, data, deleted }) => ({ kind, id, data, deleted }))));
            } catch { /* ignore */ }
        }
        if (st.dataCompanyId) {
            storage.setRaw(STORAGE_KEYS.customers, '[]');
            storage.setRaw(STORAGE_KEYS.history, '[]');
            app.customers = [];
            app.history = [];
            redraw(app, new Set(['customers', 'history']));
        }
        Object.assign(st, { companyId: null, companyName: null, role: null, dataCompanyId: null, lastRev: 0, hashes: {}, firstSyncDone: false, forceRemote: {} });
        saveState(st);
        applyRole(null);
        emitContext();
        throw new AccessRemoved('Your access was removed by the owner');
    }

    const switching = st.dataCompanyId && st.dataCompanyId !== row.company_id;
    if (!st.dataCompanyId) {
        // First company for this phone. An owner's own bills belong to their company (merge).
        // Staff joining someone else's company keep their old phone bills in a backup instead.
        if (!st.firstSyncDone && row.role !== 'owner' && hasBusinessData()) {
            if (stashLocalBusinessData(app, `before joining ${row.company_name}`)) {
                try { app.showToast?.(`Your old bills on this phone were saved as a backup. Showing ${row.company_name}.`); } catch { /* ignore */ }
            }
        }
        st.dataCompanyId = row.company_id;
    } else if (switching) {
        if (hasBusinessData()) stashLocalBusinessData(app, `switching to ${row.company_name}`);
        Object.assign(st, { dataCompanyId: row.company_id, lastRev: 0, hashes: {}, firstSyncDone: false, forceRemote: {} });
    }

    const roleChanged = st.role !== row.role;
    st.companyId = row.company_id;
    st.companyName = row.company_name;
    st.role = row.role;
    if (roleChanged && st.firstSyncDone) st.lastRev = 0; // a new role may see more (or fewer) bills
    saveState(st);
    applyRole(row.role);
    emitContext();
}

async function pullAll(since) {
    const all = [];
    let cursor = Math.max(0, since);
    for (;;) {
        const page = await rpc('drillrig_pull', { p_company: ctx.state.companyId, p_since: cursor, p_limit: PULL_PAGE });
        const rows = Array.isArray(page) ? page : [];
        all.push(...rows);
        if (rows.length < PULL_PAGE) break;
        cursor = rows[rows.length - 1].rev;
    }
    return all;
}

async function pushRows(rows) {
    const st = ctx.state;
    let rejected = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
        const batch = rows.slice(i, i + PUSH_BATCH);
        const res = await rpc('drillrig_push', {
            p_company: st.companyId,
            p_rows: batch.map(({ kind, id, data, deleted }) => ({ kind, id, data, deleted }))
        });
        const refused = new Set((res?.rejected || []).map((r) => recordKey(r.kind, r.id)));
        for (const r of batch) {
            if (refused.has(r.key)) {
                // Not allowed for this role: take the company's version back on the next download.
                delete st.hashes[r.key];
                st.forceRemote = { ...(st.forceRemote || {}), [r.key]: true };
                st.lastRev = 0;
                rejected++;
            } else if (r.hash === null) {
                delete st.hashes[r.key];
            } else {
                st.hashes[r.key] = r.hash;
            }
        }
        saveState(st);
    }
    if (rejected) {
        try { ctx.app.showToast?.(`🔒 ${rejected} change(s) need the owner's permission and were undone`); } catch { /* ignore */ }
    }
    return rejected;
}

async function syncOnce() {
    const { app } = ctx;
    const st = ctx.state;
    await ensureCompany();
    ensureCustomerIds(app);

    const firstSync = !st.firstSyncDone;
    const defaults = { brand: app.defaultBrand, rates: app.defaultRates, waFormat: app.defaultWaFormat };
    let pulled;
    try {
        pulled = await pullAll(firstSync ? 0 : st.lastRev - PULL_OVERLAP);
    } catch (err) {
        if (err.code === '42501') { await ensureCompany(true); pulled = await pullAll(0); }
        else throw err;
    }
    const rows = dropDefaultCloudSettings(pulled, readLocal(), defaults);
    // Cloud only had defaults where this phone has real settings: re-upload the real ones.
    for (const r of pulled) {
        if (!rows.includes(r)) delete st.hashes[recordKey(r.kind, r.id)];
    }
    const before = indexLocal(readLocal());
    const plan = planPull(rows, before, st.hashes, { firstSync, defaults, forceRemote: st.forceRemote || {} });
    const { local, changed } = applyToLocal(readLocal(), plan.apply);
    writeLocal(app, local, changed);
    for (const [key, hash] of Object.entries(plan.synced)) {
        if (hash === null) delete st.hashes[key];
        else st.hashes[key] = hash;
        if (st.forceRemote?.[key]) delete st.forceRemote[key];
    }
    if (pulled.length) st.lastRev = Math.max(st.lastRev || 0, ...pulled.map((r) => Number(r.rev) || 0));
    saveState(st);

    const canWriteSettings = ROLE_RULES[st.role]?.editSettings !== false;
    const toPush = planPush(indexLocal(readLocal()), st.hashes, defaults, { skipSettings: !canWriteSettings })
        .filter((r) => !st.forceRemote?.[r.key]);
    await pushRows(toPush);

    if (firstSync) {
        st.firstSyncDone = true;
        saveState(st);
        const down = plan.apply.filter((r) => !r.deleted).length;
        const up = toPush.filter((r) => !r.deleted).length;
        try { app.showToast?.(`☁️ ${st.companyName || 'Cloud'} ready — ${up} uploaded, ${down} downloaded`); } catch { /* ignore */ }
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
        do {
            ctx.again = false;
            await syncOnce();
        } while (ctx?.again);
        status('ok', 'Synced');
    } catch (err) {
        if (err instanceof AccessRemoved) {
            status('error', 'Access removed — ask the owner to invite you again');
            return;
        }
        console.warn('[sync]', err);
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
    const prefix = String(app.brand?.billPrefix || 'AB').toUpperCase();
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = docType === 'INVOICE' ? new RegExp(`^${esc}-(\\d+)$`, 'i') : new RegExp(`^${esc}-Q(\\d+)$`, 'i');
    const current = input.value.trim();
    const m = current.match(re);
    if (!m) return; // a number the user typed by hand — leave it alone

    // A number this phone already reserved but has not used yet (e.g. the save was stopped by a check).
    if (ctx.claimed && ctx.claimed.no === current && !app.history.some((h) => h.billNo === current)) return;

    const wanted = parseInt(m[1], 10);
    const got = await Promise.race([
        rpc('drillrig_claim_number', { p_company: st.companyId, p_doc_type: docType, p_min: wanted }),
        new Promise((resolve) => setTimeout(() => resolve(null), CLAIM_TIMEOUT_MS))
    ]);
    const n = parseInt(got, 10);
    if (!n) return; // slow network: keep the phone's number

    const no = docType === 'INVOICE' ? `${prefix}-${n}` : `${prefix}-Q${n}`;
    ctx.claimed = { no };
    if (n !== wanted) {
        input.value = no;
        if (docType === 'INVOICE') app.brand.nextBillSeq = n;
        else app.brand.nextQuoteSeq = n;
        try { app.showToast?.(`#${current} was already used on another phone — this bill is #${no}`); } catch { /* ignore */ }
    }
}

/** Which delete confirmations each role may open. */
function deleteRuleFor(title) {
    const t = String(title || '');
    if (/Bill|Quotation|Clear All/i.test(t)) return 'deleteBills';
    if (/Restore Backup/i.test(t)) return 'restoreBackup';
    if (/Customer/i.test(t)) return 'deleteCustomers';
    if (/Rate Card|Logo/i.test(t)) return 'editSettings';
    return null;
}

function hookApp(app) {
    if (app.__drillrigHooked) return;
    app.__drillrigHooked = true;

    const origSave = app.saveToStorage.bind(app);
    app.saveToStorage = (key, data) => {
        const ok = origSave(key, data);
        if (ok && ctx && SYNCED_KEYS.has(key)) scheduleSync();
        return ok;
    };

    const origSaveBill = app.saveCurrentBillToHistory.bind(app);
    app.saveCurrentBillToHistory = async (...args) => {
        if (ctx) {
            try { await claimNumberBeforeSave(); } catch (e) { console.warn('[sync] claim', e); }
        }
        const firstBefore = app.history[0]?.id;
        const result = origSaveBill(...args);
        // Stamp who made a NEW bill (shown to the owner on the bill row).
        const first = app.history[0];
        if (ctx && first && first.id !== firstBefore && !first.createdBy) {
            first.createdBy = { id: ctx.account.id, name: ctx.account.name, role: ctx.state.role || 'owner' };
            app.saveToStorage(STORAGE_KEYS.history, app.history);
            try { app.renderHistoryList(document.getElementById('historySearchInput')?.value || ''); } catch { /* ignore */ }
        }
        return result;
    };

    // Role check on every delete / restore confirmation.
    const origConfirm = app.confirmDeleteModal.bind(app);
    app.confirmDeleteModal = (opts = {}) => {
        if (opts.skipRoleCheck) return origConfirm(opts);
        const role = ctx?.state?.role;
        const rule = deleteRuleFor(opts.title);
        if (role && rule && ROLE_RULES[role] && !ROLE_RULES[role][rule]) {
            try { app.showToast?.('🔒 Only the owner can do this'); } catch { /* ignore */ }
            return;
        }
        return origConfirm(opts);
    };
}

/** Start syncing for this signed-in account. */
export function startSync(app, account, onStatus) {
    if (ctx && ctx.account.id === account.id) { ctx.onStatus = onStatus; syncNow(); return; }
    stopSync();
    hookApp(app);

    let state = loadState();
    if (!state || state.userId !== account.id) {
        state = { userId: account.id, companyId: null, dataCompanyId: null, lastRev: 0, hashes: {}, firstSyncDone: false, forceRemote: {} };
        saveState(state);
    }
    // Phones synced before staff support: their data already belongs to their company.
    if (!state.dataCompanyId && state.firstSyncDone && state.companyId) state.dataCompanyId = state.companyId;
    applyRole(state.role);

    const onOnline = () => scheduleSync(500);
    const onVisible = () => { if (document.visibilityState === 'visible') scheduleSync(500); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    ctx = {
        app, account, state, onStatus,
        timer: null, running: false, again: false, claimed: null, companyChecked: false,
        interval: setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, PERIODIC_MS),
        handlers: { onOnline, onVisible }
    };
    emitContext();
    syncNow();
}

export function stopSync() {
    if (!ctx) return;
    clearTimeout(ctx.timer);
    clearInterval(ctx.interval);
    window.removeEventListener('online', ctx.handlers.onOnline);
    document.removeEventListener('visibilitychange', ctx.handlers.onVisible);
    ctx = null;
    applyRole(null);
    emitContext();
}

/** Re-check the company and role now (after joining, or after the owner changed something). */
export async function refreshCompany() {
    if (!ctx) return;
    ctx.companyChecked = false;
    await syncNow();
}

/** { userId, companyId, companyName, role } of the signed-in user, or null. */
export function getCloudContext() {
    if (!ctx) return null;
    const st = ctx.state;
    return { userId: ctx.account.id, companyId: st.companyId, companyName: st.companyName, role: st.role, lastSyncAt: st.lastSyncAt };
}

export function onCloudContext(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// Exposed for tests / debugging.
export const __internal = { readLocal, recordKey, deleteRuleFor };
