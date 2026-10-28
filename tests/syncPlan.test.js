import { describe, it, expect } from 'vitest';
import { indexLocal, planPush, planPull, applyToLocal, hashData, recordKey } from '../src/cloud/syncPlan.js';

const bill = (id, extra = {}) => ({ id: String(id), createdAt: new Date(Number(id)).toISOString(), billNo: `AB-${id}`, payments: [], ...extra });
const cust = (id, name) => ({ id, name });

function syncedHashes(local) {
    const h = {};
    for (const [k, r] of indexLocal(local)) h[k] = r.hash;
    return h;
}

describe('indexLocal', () => {
    it('indexes customers, bills and settings, skipping items without an id', () => {
        const idx = indexLocal({
            customers: [cust('c1', 'Ravi'), { name: 'no id' }],
            history: [bill(1000)],
            settings: { brand: { companyName: 'X' }, rates: undefined }
        });
        expect([...idx.keys()].sort()).toEqual(['bill:1000', 'customer:c1', 'setting:brand']);
    });

    it('keeps the first copy when an id is duplicated', () => {
        const idx = indexLocal({ history: [bill(1, { billNo: 'first' }), bill(1, { billNo: 'second' })] });
        expect(idx.get('bill:1').data.billNo).toBe('first');
    });
});

describe('planPush', () => {
    it('uploads everything on a fresh phone', () => {
        const local = { customers: [cust('c1', 'A')], history: [bill(1)], settings: { brand: { a: 1 } } };
        expect(planPush(indexLocal(local), {})).toHaveLength(3);
    });

    it('uploads nothing when nothing changed', () => {
        const local = { customers: [cust('c1', 'A')], history: [bill(1)], settings: {} };
        expect(planPush(indexLocal(local), syncedHashes(local))).toHaveLength(0);
    });

    it('uploads an edited bill and marks a removed customer as deleted', () => {
        const before = { customers: [cust('c1', 'A'), cust('c2', 'B')], history: [bill(1)], settings: {} };
        const hashes = syncedHashes(before);
        const after = { customers: [cust('c1', 'A')], history: [bill(1, { payments: [{ id: 'p', amount: 500 }] })], settings: {} };
        const rows = planPush(indexLocal(after), hashes);
        expect(rows.map((r) => `${r.key}:${r.deleted}`).sort()).toEqual(['bill:1:false', 'customer:c2:true']);
    });
});

describe('planPull', () => {
    it('takes a cloud change the phone has not touched', () => {
        const local = { customers: [cust('c1', 'Old')], history: [], settings: {} };
        const hashes = syncedHashes(local);
        const rows = [{ kind: 'customer', id: 'c1', data: cust('c1', 'New'), deleted: false, rev: 5 }];
        const plan = planPull(rows, indexLocal(local), hashes);
        expect(plan.apply).toHaveLength(1);
        expect(plan.keepLocal).toBe(0);
    });

    it('keeps an unsynced edit made on this phone (it is uploaded next)', () => {
        const synced = { customers: [cust('c1', 'Old')], history: [], settings: {} };
        const hashes = syncedHashes(synced);
        const editedHere = { customers: [cust('c1', 'Mine')], history: [], settings: {} };
        const rows = [{ kind: 'customer', id: 'c1', data: cust('c1', 'Theirs'), deleted: false, rev: 6 }];
        const plan = planPull(rows, indexLocal(editedHere), hashes);
        expect(plan.apply).toHaveLength(0);
        expect(plan.keepLocal).toBe(1);
        expect(planPush(indexLocal(editedHere), { ...hashes, ...plan.synced })[0].data.name).toBe('Mine');
    });

    it('on first sync the company settings win over a new phone\'s defaults', () => {
        const newPhone = { customers: [], history: [], settings: { brand: { companyName: 'Your Borewell Company' } } };
        const rows = [{ kind: 'setting', id: 'brand', data: { companyName: 'SRI ANJANEYA' }, deleted: false, rev: 1 }];
        const plan = planPull(rows, indexLocal(newPhone), {}, { firstSync: true });
        const { local } = applyToLocal(newPhone, plan.apply);
        expect(local.settings.brand.companyName).toBe('SRI ANJANEYA');
        // ...and the default brand is not pushed back over it
        expect(planPush(indexLocal(local), plan.synced)).toHaveLength(0);
    });

    it('first sync merges: bills only on the phone are uploaded, bills only in the cloud are downloaded', () => {
        const phone = { customers: [], history: [bill(2000)], settings: {} };
        const rows = [{ kind: 'bill', id: '1000', data: bill(1000), deleted: false, rev: 1 }];
        const plan = planPull(rows, indexLocal(phone), {}, { firstSync: true });
        const { local } = applyToLocal(phone, plan.apply);
        expect(local.history.map((h) => h.id)).toEqual(['2000', '1000']);
        const push = planPush(indexLocal(local), plan.synced);
        expect(push.map((r) => r.key)).toEqual(['bill:2000']);
    });

    it('a bill deleted on another phone is removed here', () => {
        const local = { customers: [], history: [bill(1), bill(2)], settings: {} };
        const hashes = syncedHashes(local);
        const rows = [{ kind: 'bill', id: '1', data: {}, deleted: true, rev: 9 }];
        const plan = planPull(rows, indexLocal(local), hashes);
        const { local: out } = applyToLocal(local, plan.apply);
        expect(out.history.map((h) => h.id)).toEqual(['2']);
        expect(plan.synced[recordKey('bill', '1')]).toBeNull();
    });

    it('re-reading rows the phone already has changes nothing', () => {
        const local = { customers: [cust('c1', 'A')], history: [], settings: {} };
        const hashes = syncedHashes(local);
        const rows = [{ kind: 'customer', id: 'c1', data: cust('c1', 'A'), deleted: false, rev: 3 }];
        const plan = planPull(rows, indexLocal(local), hashes);
        expect(plan.apply).toHaveLength(0);
        expect(plan.synced['customer:c1']).toBe(hashData(cust('c1', 'A')));
    });
});

describe('applyToLocal', () => {
    it('keeps the bill book newest first', () => {
        const local = { customers: [], history: [bill(3000), bill(1000)], settings: {} };
        const { local: out } = applyToLocal(local, [{ kind: 'bill', id: '2000', data: bill(2000), deleted: false }]);
        expect(out.history.map((h) => h.id)).toEqual(['3000', '2000', '1000']);
    });

    it('ignores unknown setting ids', () => {
        const { changed } = applyToLocal({ settings: {} }, [{ kind: 'setting', id: 'evil', data: {}, deleted: false }]);
        expect(changed.size).toBe(0);
    });
});

import { isDefaultSetting, dropDefaultCloudSettings } from '../src/cloud/syncPlan.js';

describe('default settings never overwrite real ones on first sync', () => {
    const defaults = { brand: { companyName: 'Your Borewell Company' }, waFormat: { note: true } };

    it('recognises an untouched brand', () => {
        expect(isDefaultSetting('brand', { companyName: 'Your Borewell Company', phones: '' }, defaults)).toBe(true);
        expect(isDefaultSetting('brand', { companyName: 'SRI ANJANEYA BOREWELLS' }, defaults)).toBe(false);
        expect(isDefaultSetting('brand', { companyName: 'Your Borewell Company', phones: '96596 57777' }, defaults)).toBe(false);
    });

    it('a real phone keeps its brand when the cloud only has defaults (and uploads it)', () => {
        const realPhone = { customers: [], history: [], settings: { brand: { companyName: 'SRI ANJANEYA BOREWELLS', phones: '9659657777' } } };
        const cloud = [{ kind: 'setting', id: 'brand', data: { companyName: 'Your Borewell Company', phones: '' }, deleted: false, rev: 1 }];
        const rows = dropDefaultCloudSettings(cloud, realPhone, defaults);
        expect(rows).toHaveLength(0);
        const plan = planPull(rows, indexLocal(realPhone), {}, { firstSync: true });
        const { local } = applyToLocal(realPhone, plan.apply);
        expect(local.settings.brand.companyName).toBe('SRI ANJANEYA BOREWELLS');
        expect(planPush(indexLocal(local), plan.synced).map((r) => r.key)).toEqual(['setting:brand']);
    });

    it('a new empty phone still takes the real brand from the cloud', () => {
        const newPhone = { settings: { brand: { companyName: 'Your Borewell Company' } } };
        const cloud = [{ kind: 'setting', id: 'brand', data: { companyName: 'SRI ANJANEYA BOREWELLS' }, deleted: false, rev: 1 }];
        expect(dropDefaultCloudSettings(cloud, newPhone, defaults)).toHaveLength(1);
    });
});

describe('default detection ignores field order', () => {
    it('treats re-ordered default rates as default', () => {
        const defaults = { rates: { baseDrillingRate: 90, pvc7Rate: 400, slabRates: [{ start: 1, rate: 90 }] } };
        const stored = { pvc7Rate: 400, slabRates: [{ rate: 90, start: 1 }], baseDrillingRate: 90 };
        expect(isDefaultSetting('rates', stored, defaults)).toBe(true);
        expect(isDefaultSetting('rates', { ...stored, baseDrillingRate: 100 }, defaults)).toBe(false);
    });
});
