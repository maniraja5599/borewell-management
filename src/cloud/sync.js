// Cloud sync for a signed-in user.
// The phone stays the working copy (fully offline-capable). This module:
//   - creates/finds the user's company on first sign-in,
//   - downloads what other phones changed, uploads what this phone changed,
//   - reserves bill numbers on the server while online.
// It hooks the app at two points only: saveToStorage and saveCurrentBillToHistory.
import { STORAGE_KEYS, storage } from '../data/storage.js';
import { getSupabase } from './auth.js';
import { SETTING_IDS, indexLocal, planPull, planPush, applyToLocal, recordKey, dropDefaultCloudSettings } from './syncPlan.js';

const STATE_KEY = 'drillrig_sync_v1';
const PUSH_BATCH = 200;
const PULL_PAGE = 500;
const PULL_OVERLAP = 50;       // re-read a few revs back so a slow concurrent write is never missed
const DEBOUNCE_MS = 2000;
const PERIODIC_MS = 60000;
const CLAIM_TIMEOUT_MS = 4000;

const SYNCED_KEYS = new Set([
    STORAGE_KEYS.customers, STORAGE_KEYS.history,
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
    return {
        customers: readJson(STORAGE_KEYS.customers, []),
        history: readJson(STORAGE_KEYS.history, []),
        settings
    };
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

    const run = (fn) => { try { fn(); } catch (e) { console.warn('[sync] redraw', e); } };
    run(() => app.applyBrandToUI());
    if (changed.has('rates') || changed.has('rateProfiles')) {
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

function status(kind, text) {
    ctx?.onStatus?.({ kind, text, at: Date.now() });
}

async function rpc(name, args) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc(name, args);
    if (error) {
        const err = new Error(error.message || String(error));
        err.code = error.code;
        throw err;
    }
    return data;
}

async function ensureCompany() {
    const st = ctx.state;
    if (st.companyId) return;
    const name = readJson(STORAGE_KEYS.brand, {})?.companyName || '';
    const rows = await rpc('drillrig_my_company', { p_name: name });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.company_id) throw new Error('Could not open your company in the cloud');
    st.companyId = row.company_id;
    st.companyName = row.company_name;
    st.role = row.role;
    saveState(st);
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
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
        const batch = rows.slice(i, i + PUSH_BATCH);
        await rpc('drillrig_push', {
            p_company: st.companyId,
            p_rows: batch.map(({ kind, id, data, deleted }) => ({ kind, id, data, deleted }))
        });
        for (const r of batch) {
            if (r.hash === null) delete st.hashes[r.key];
            else st.hashes[r.key] = r.hash;
        }
        saveState(st);
    }
}

async function syncOnce() {
    const { app } = ctx;
    const st = ctx.state;
    await ensureCompany();
    ensureCustomerIds(app);

    const firstSync = !st.firstSyncDone;
    const defaults = { brand: app.defaultBrand, rates: app.defaultRates, waFormat: app.defaultWaFormat };
    const pulled = await pullAll(firstSync ? 0 : st.lastRev - PULL_OVERLAP);
    const rows = dropDefaultCloudSettings(pulled, readLocal(), defaults);
    // Cloud only had defaults where this phone has real settings: re-upload the real ones.
    for (const r of pulled) {
        if (!rows.includes(r)) delete st.hashes[recordKey(r.kind, r.id)];
    }
    const before = indexLocal(readLocal());
    const plan = planPull(rows, before, st.hashes, { firstSync, defaults });
    const { local, changed } = applyToLocal(readLocal(), plan.apply);
    writeLocal(app, local, changed);
    for (const [key, hash] of Object.entries(plan.synced)) {
        if (hash === null) delete st.hashes[key];
        else st.hashes[key] = hash;
    }
    if (pulled.length) st.lastRev = Math.max(st.lastRev || 0, ...pulled.map((r) => Number(r.rev) || 0));
    saveState(st);

    const toPush = planPush(indexLocal(readLocal()), st.hashes, defaults);
    await pushRows(toPush);

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
        do {
            ctx.again = false;
            await syncOnce();
        } while (ctx?.again);
        status('ok', 'Synced');
    } catch (err) {
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
        return origSaveBill(...args);
    };
}

/** Start syncing for this signed-in account. */
export function startSync(app, account, onStatus) {
    if (ctx && ctx.account.id === account.id) { ctx.onStatus = onStatus; syncNow(); return; }
    stopSync();
    hookApp(app);

    let state = loadState();
    if (!state || state.userId !== account.id) {
        state = { userId: account.id, companyId: null, lastRev: 0, hashes: {}, firstSyncDone: false };
        saveState(state);
    }

    const onOnline = () => scheduleSync(500);
    const onVisible = () => { if (document.visibilityState === 'visible') scheduleSync(500); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    ctx = {
        app, account, state, onStatus,
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

export function getSyncInfo() {
    const st = ctx?.state || loadState();
    return st ? { companyName: st.companyName, role: st.role, lastSyncAt: st.lastSyncAt } : null;
}

// Exposed for tests / debugging.
export const __internal = { readLocal, recordKey };
