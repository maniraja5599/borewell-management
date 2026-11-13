import { describe, it, expect, beforeEach } from 'vitest';
import {
    setAccessFromServer, clearAccess, getAccess, getCurrentRig, setCurrentRig, canCreateBill,
    rigPrefix, billOnCurrentRig, isOwnerOrLocal, hasRigs, rigDaysLeft
} from '../src/cloud/access.js';
import { filterPushable } from '../src/cloud/sync.js';
import { planPull, indexLocal } from '../src/cloud/syncPlan.js';
import { BillFlowMixin } from '../src/features/bill/BillFlowMixin.js';

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

const future = new Date(Date.now() + 10 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
const RIG1 = { id: 'r1', name: 'Rig 1', bill_prefix: 'SM', active: true, archived: false, is_default: true, trial_ends_at: future };
const RIG2 = { id: 'r2', name: 'Rig 2', bill_prefix: 'R2', active: true, archived: false, is_default: false, trial_ends_at: future };
const server = (over = {}) => ({ company_id: 'co1', company_name: 'Sri Murugan', role: 'owner', access_rev: 3, rigs: [RIG1, RIG2], companies: [], invites: [], ...over });

describe('access: single-user mode (never signed in)', () => {
    beforeEach(() => { installStorage(); clearAccess(); });

    it('behaves exactly like before: owner powers, company prefix, every bill counts', () => {
        expect(getAccess()).toBeNull();
        expect(isOwnerOrLocal()).toBe(true);
        expect(hasRigs()).toBe(false);
        expect(getCurrentRig()).toBeNull();
        expect(canCreateBill()).toBe(true);
        expect(rigPrefix('ab')).toBe('AB');
        expect(billOnCurrentRig({ rigId: 'anything' })).toBe(true);
    });
});

describe('access: rigs from the server', () => {
    beforeEach(() => { installStorage(); clearAccess(); });

    it('picks the first active rig and remembers the choice across syncs', () => {
        setAccessFromServer(server(), 'u1');
        expect(getCurrentRig().id).toBe('r1');
        setCurrentRig('r2');
        setAccessFromServer(server(), 'u1');
        expect(getCurrentRig().id).toBe('r2');
    });

    it('skips an expired rig when choosing the default', () => {
        setAccessFromServer(server({ rigs: [{ ...RIG1, active: false, trial_ends_at: past }, RIG2] }), 'u1');
        expect(getCurrentRig().id).toBe('r2');
    });

    it('the first rig keeps the Settings prefix; other rigs use their own', () => {
        setAccessFromServer(server(), 'u1');
        expect(rigPrefix('xy')).toBe('XY');
        setCurrentRig('r2');
        expect(rigPrefix('xy')).toBe('R2');
    });

    it('old bills without rigId belong to the first rig only', () => {
        setAccessFromServer(server(), 'u1');
        expect(billOnCurrentRig({})).toBe(true);
        expect(billOnCurrentRig({ rigId: 'r2' })).toBe(false);
        setCurrentRig('r2');
        expect(billOnCurrentRig({})).toBe(false);
        expect(billOnCurrentRig({ rigId: 'r2' })).toBe(true);
    });

    it('an ended subscription blocks new bills on that rig', () => {
        setAccessFromServer(server({ rigs: [{ ...RIG1, active: false }] }), 'u1');
        expect(canCreateBill()).toBe(false);
    });

    it('a server before migration 0003 (no rigs) keeps the old behaviour', () => {
        setAccessFromServer({ company_id: 'co1', company_name: 'X', role: 'owner' }, 'u1');
        expect(hasRigs()).toBe(false);
        expect(canCreateBill()).toBe(true);
        expect(getAccess().accessRev).toBeNull();
    });

    it('counts days left from trial or paid date, whichever is later', () => {
        const in5 = new Date(Date.now() + 5 * 86400000 - 1000).toISOString();
        const in40 = new Date(Date.now() + 40 * 86400000 - 1000).toISOString();
        expect(rigDaysLeft({ trial_ends_at: in5 })).toBe(5);
        expect(rigDaysLeft({ trial_ends_at: in5, paid_until: in40 })).toBe(40);
    });
});

describe('bill numbers per rig', () => {
    const makeApp = (history) => {
        const app = Object.create(BillFlowMixin.prototype);
        app.brand = { billPrefix: 'SM', nextBillSeq: 101, nextQuoteSeq: 101 };
        app.history = history;
        app.state = { docType: 'INVOICE' };
        return app;
    };
    const inv = (billNo, rigId) => ({ billNo, rigId, snapshot: { docType: 'INVOICE' } });

    beforeEach(() => { installStorage(); clearAccess(); });

    it('single-user: unchanged numbering', () => {
        const app = makeApp([inv('SM-120')]);
        expect(app.getNextAutoDocNumber('INVOICE')).toBe('SM-121');
    });

    it('first rig continues the company series (old bills included)', () => {
        setAccessFromServer(server(), 'u1');
        const app = makeApp([inv('SM-120'), inv('R2-105', 'r2')]);
        expect(app.getNextAutoDocNumber('INVOICE')).toBe('SM-121');
    });

    it('another rig has its own series starting at 101', () => {
        setAccessFromServer(server(), 'u1');
        setCurrentRig('r2');
        const app = makeApp([inv('SM-120')]);
        expect(app.getNextAutoDocNumber('INVOICE')).toBe('R2-101');
        app.history.push(inv('R2-101', 'r2'));
        expect(app.getNextAutoDocNumber('INVOICE')).toBe('R2-102');
        expect(app.brand.nextBillSeq).toBe(101); // company counter untouched
    });
});

describe('what a staff phone uploads', () => {
    const rows = [
        { key: 'setting:rates', kind: 'setting', hash: 'h1' },
        { key: 'bill:b1', kind: 'bill', hash: 'h2' },
        { key: 'bill:b2', kind: 'bill', hash: null, deleted: true },
        { key: 'customer:c1', kind: 'customer', hash: 'h3' }
    ];

    it('owner uploads everything', () => {
        expect(filterPushable(rows, 'owner').map((r) => r.key)).toEqual(rows.map((r) => r.key));
    });

    it('manager/driver never upload settings or deletes', () => {
        expect(filterPushable(rows, 'driver').map((r) => r.key)).toEqual(['bill:b1', 'customer:c1']);
    });

    it('a row the server refused is not resent until it changes', () => {
        const rejected = { 'bill:b1': { hash: 'h2', reason: 'not_yours' } };
        expect(filterPushable(rows, 'owner', rejected).map((r) => r.key)).not.toContain('bill:b1');
        const changed = [{ ...rows[1], hash: 'h9' }];
        expect(filterPushable(changed, 'owner', rejected)).toHaveLength(1);
    });
});

describe('staff phones always take the owner\'s settings', () => {
    it('cloudWinsSettings applies the cloud copy even if the phone changed it', () => {
        const local = indexLocal({ settings: { rates: { baseDrillingRate: 50 } } });
        const known = { 'setting:rates': indexLocal({ settings: { rates: { baseDrillingRate: 90 } } }).get('setting:rates').hash };
        const cloud = [{ kind: 'setting', id: 'rates', data: { baseDrillingRate: 100 } }];
        expect(planPull(cloud, local, known).apply).toHaveLength(0);                           // owner phone keeps its edit
        expect(planPull(cloud, local, known, { cloudWinsSettings: true }).apply).toHaveLength(1); // staff phone takes the owner's
    });
});
