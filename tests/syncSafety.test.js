import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS } from '../src/data/storage.js';
import { checkPhoneOwner, clearPhoneData, resetSyncBaseline } from '../src/cloud/sync.js';
import { indexLocal, planPush, planPull } from '../src/cloud/syncPlan.js';

// Minimal localStorage so sync.js can read/write the phone's data under Node.
function installStorage() {
    const data = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (k) => (data.has(k) ? data.get(k) : null),
            setItem: (k, v) => data.set(k, String(v)),
            removeItem: (k) => data.delete(k)
        }
    };
    return data;
}
const STATE_KEY = 'drillrig_sync_v1';
const app = { defaultBrand: { companyName: 'Your Borewell Company' }, defaultRates: {}, defaultWaFormat: {} };
const put = (store, key, v) => store.set(key, JSON.stringify(v));

describe('Account switch on one phone', () => {
    let store;
    beforeEach(() => { store = installStorage(); });

    it('is safe when nobody has synced on this phone yet (offline user signs in)', () => {
        put(store, STORAGE_KEYS.history, [{ id: 'b1' }]);
        expect(checkPhoneOwner(app, { id: 'userB' })).toBeNull();
    });

    it('is safe when the same account signs in again', () => {
        put(store, STORAGE_KEYS.history, [{ id: 'b1' }]);
        put(store, STATE_KEY, { userId: 'userA', hashes: {} });
        expect(checkPhoneOwner(app, { id: 'userA' })).toBeNull();
    });

    it('is safe for a different account when the phone holds no company data', () => {
        put(store, STATE_KEY, { userId: 'userA', email: 'a@x.com', hashes: {} });
        expect(checkPhoneOwner(app, { id: 'userB' })).toBeNull();
    });

    it("blocks a different account while another account's bills are on the phone", () => {
        put(store, STORAGE_KEYS.history, [{ id: 'b1' }, { id: 'b2' }]);
        put(store, STORAGE_KEYS.customers, [{ id: 'c1' }]);
        put(store, STATE_KEY, { userId: 'userA', email: 'a@x.com', hashes: {} });
        const res = checkPhoneOwner(app, { id: 'userB' });
        expect(res).toMatchObject({ email: 'a@x.com', bills: 2, customers: 1 });
        expect(res.unsynced).toBe(3); // nothing was ever uploaded
    });

    it("counts a real company profile as another account's data", () => {
        put(store, STORAGE_KEYS.brand, { companyName: 'Sri Murugan Borewells', phones: '98427 00000' });
        put(store, STATE_KEY, { userId: 'userA', hashes: {} });
        expect(checkPhoneOwner(app, { id: 'userB' })).not.toBeNull();
    });

    it('clearPhoneData removes company data and sync state but keeps device preferences', () => {
        put(store, STORAGE_KEYS.history, [{ id: 'b1' }]);
        put(store, STORAGE_KEYS.customers, [{ id: 'c1' }]);
        put(store, STORAGE_KEYS.brand, { companyName: 'X' });
        put(store, STATE_KEY, { userId: 'userA', hashes: {} });
        store.set(STORAGE_KEYS.lang, 'ta');
        clearPhoneData();
        expect(store.has(STORAGE_KEYS.history)).toBe(false);
        expect(store.has(STORAGE_KEYS.customers)).toBe(false);
        expect(store.has(STORAGE_KEYS.brand)).toBe(false);
        expect(store.has(STATE_KEY)).toBe(false);
        expect(store.get(STORAGE_KEYS.lang)).toBe('ta');
        expect(checkPhoneOwner(app, { id: 'userB' })).toBeNull();
    });
});

describe('Restoring an old backup while synced', () => {
    let store;
    beforeEach(() => { store = installStorage(); });

    it('without a reset, bills missing from the backup would be pushed as deletes', () => {
        const before = indexLocal({ history: [{ id: 'old' }, { id: 'new' }] });
        const hashes = Object.fromEntries([...before].map(([k, r]) => [k, r.hash]));
        const afterRestore = indexLocal({ history: [{ id: 'old' }] });
        const rows = planPush(afterRestore, hashes);
        expect(rows).toEqual([expect.objectContaining({ id: 'new', deleted: true })]);
    });

    it('resetSyncBaseline makes the next sync a merge: no deletes, cloud-only bills come back', () => {
        put(store, STATE_KEY, { userId: 'userA', lastRev: 99, firstSyncDone: true, hashes: { 'bill:new': 'h1', 'bill:old': 'h2' } });
        resetSyncBaseline();
        const st = JSON.parse(store.get(STATE_KEY));
        expect(st.hashes).toEqual({});
        expect(st.lastRev).toBe(0);
        expect(st.firstSyncDone).toBe(true);

        const local = indexLocal({ history: [{ id: 'old', total: 1 }] }); // restored from backup
        expect(planPush(local, st.hashes).some((r) => r.deleted)).toBe(false);

        const cloud = [
            { kind: 'bill', id: 'new', data: { id: 'new', total: 5 }, deleted: false },  // made after the backup
            { kind: 'bill', id: 'old', data: { id: 'old', total: 2 }, deleted: false }   // the backup's copy differs
        ];
        const plan = planPull(cloud, local, st.hashes);
        expect(plan.apply.map((r) => r.id)).toEqual(['new']); // newer bill restored to the phone
        expect(plan.keepLocal).toBe(1);                         // backup's version wins and is uploaded
    });

    it('does nothing when this phone never synced', () => {
        expect(() => resetSyncBaseline()).not.toThrow();
        expect(store.has(STATE_KEY)).toBe(false);
    });
});
