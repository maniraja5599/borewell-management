// What the signed-in person may do in their company: role, rigs, subscription state.
// Comes from the server on every sync (drillrig_my_company) and is kept on the phone so the
// app behaves the same offline. Not signed in and never synced = null = single-user mode,
// where the app works exactly as it always did.
//
// The server enforces every rule; this module only decides what the app shows.
import { storage } from '../data/storage.js';

const KEY = 'drillrig_access_v1';
const listeners = new Set();
let access = load();

function load() {
    try {
        const v = JSON.parse(storage.getRaw(KEY) || 'null');
        return v && typeof v === 'object' ? v : null;
    } catch {
        return null;
    }
}

function save() {
    try {
        if (access) storage.setRaw(KEY, JSON.stringify(access));
        else storage.remove(KEY);
    } catch { /* storage full: kept in memory for this session */ }
}

function emit() {
    applyRoleClass();
    for (const cb of listeners) {
        try { cb(access); } catch (e) { console.warn('[access]', e); }
    }
}

// 'driver' is retired (0014 made every driver a manager) but kept so an old saved state still loads.
const ROLES = ['owner', 'manager', 'office', 'driver'];
/** Office staff permissions the owner can tick (server: drillrig.clean_perms, migration 0014). */
export const PERMS = ['bills', 'reports', 'pnl', 'team', 'workers', 'stock', 'expenses'];
// What each role may do without ticks. Office staff get only what the owner ticked.
const ROLE_PERMS = {
    manager: ['bills', 'reports', 'workers', 'stock', 'expenses'],
    driver: ['bills']
};

/** Store the server's answer. Older servers (before migration 0003) send no rigs. */
export function setAccessFromServer(row, userId, userName = '') {
    const rigs = Array.isArray(row?.rigs) ? row.rigs.filter((r) => r && r.id) : [];
    const prev = access;
    let currentRigId = prev?.companyId === row.company_id ? prev?.currentRigId : null;
    if (!rigs.some((r) => r.id === currentRigId)) {
        currentRigId = (rigs.find((r) => r.active && !r.archived) || rigs[0])?.id || null;
    }
    access = {
        userId,
        userName: String(userName || '').trim().slice(0, 80),
        companyId: row.company_id,
        companyName: row.company_name || '',
        // An unknown role never gets owner rights in the app (the server decides anyway).
        role: ROLES.includes(row.role) ? row.role : 'manager',
        perms: prev?.companyId === row.company_id && prev?.role === row.role ? (prev.perms || {}) : {},
        accessRev: row.access_rev === undefined || row.access_rev === null ? null : String(row.access_rev),
        rigs,
        companies: Array.isArray(row.companies) ? row.companies : [],
        invites: Array.isArray(row.invites) ? row.invites : [],
        currentRigId,
        updatedAt: Date.now()
    };
    save();
    emit();
    return { previous: prev, current: access };
}

/** Office staff permissions from the server (drillrig_my_perms). */
export function setPerms(perms) {
    if (!access) return;
    const clean = {};
    for (const k of PERMS) if (perms && perms[k] === true) clean[k] = true;
    if (JSON.stringify(clean) === JSON.stringify(access.perms || {})) return;
    access.perms = clean;
    save();
    emit();
}

/**
 * May the person on this phone do this? Single-user mode and owners: everything.
 * Managers: their rigs' bills, reports, workers, stock, expenses. Office: what was ticked.
 */
export function can(perm) {
    if (!access || access.role === 'owner') return true;
    if (access.role === 'office') return access.perms?.[perm] === true;
    return (ROLE_PERMS[access.role] || []).includes(perm);
}

export function clearAccess() {
    access = null;
    save();
    emit();
}

export function getAccess() { return access; }
export function getRole() { return access?.role || null; }
/** Who is using this phone (for "made by" on new bills); null in single-user mode. */
export function currentUser() { return access?.userId ? { id: access.userId, name: access.userName || '', role: access.role } : null; }
/** Owner, or not using the cloud at all (single-user mode). */
export function isOwnerOrLocal() { return !access || access.role === 'owner'; }
/** Rigs are in use once the server has sent them (migration 0003 applied). */
export function hasRigs() { return !!access && access.rigs.length > 0; }
export function visibleRigs() { return (access?.rigs || []).filter((r) => !r.archived); }

export function getCurrentRig() {
    if (!hasRigs()) return null;
    return access.rigs.find((r) => r.id === access.currentRigId) || access.rigs[0];
}

export function setCurrentRig(id) {
    if (!hasRigs() || !access.rigs.some((r) => r.id === id)) return;
    access.currentRigId = id;
    save();
    emit();
}

/** May a NEW bill be made on the current rig? (false when its subscription has ended) */
export function canCreateBill() {
    const rig = getCurrentRig();
    return !rig || (rig.active && !rig.archived);
}

/** Bill number prefix for the current rig. The company's first rig keeps the Settings prefix. */
export function rigPrefix(brandPrefix) {
    const rig = getCurrentRig();
    if (!rig || rig.is_default) return String(brandPrefix || 'AB').toUpperCase();
    return String(rig.bill_prefix || brandPrefix || 'AB').toUpperCase();
}

/** Does a saved bill belong to the current rig? Old bills without rigId belong to the first rig. */
export function billOnCurrentRig(bill) {
    const rig = getCurrentRig();
    if (!rig) return true;
    return bill?.rigId ? bill.rigId === rig.id : !!rig.is_default;
}

export function rigById(id) {
    return (access?.rigs || []).find((r) => r.id === id) || null;
}

export function onAccessChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/** <html class="role-owner|role-manager|role-office"> and "no-<perm>" drive what CSS hides. */
export function applyRoleClass() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const r of ROLES) root.classList.remove(`role-${r}`);
    for (const p of PERMS) root.classList.remove(`no-${p}`);
    if (access?.role) root.classList.add(`role-${access.role}`);
    if (access) for (const p of PERMS) if (!can(p)) root.classList.add(`no-${p}`);
}

/** Days left on a rig's trial/paid period (negative = ended). */
export function rigDaysLeft(rig, now = Date.now()) {
    const end = Math.max(Date.parse(rig?.trial_ends_at || '') || 0, Date.parse(rig?.paid_until || '') || 0);
    return Math.ceil((end - now) / 86400000);
}

export const __test = { reset: () => { access = load(); } };
