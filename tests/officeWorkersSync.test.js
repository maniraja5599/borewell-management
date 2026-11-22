// Office staff permissions in the app (cloud/access.js) and the worker / tool record kinds in sync.
import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessFromServer, setPerms, clearAccess, getAccess, can, isOwnerOrLocal } from '../src/cloud/access.js';
import { filterPushable, cleanPulledRows } from '../src/cloud/sync.js';
import { indexLocal, planPush, applyToLocal, LIST_KINDS } from '../src/cloud/syncPlan.js';

function installStorage() {
    const data = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (k) => (data.has(k) ? data.get(k) : null),
            setItem: (k, v) => data.set(k, String(v)),
            removeItem: (k) => data.delete(k)
        }
    };
}
const server = (over = {}) => ({ company_id: 'co1', company_name: 'Co', role: 'owner', access_rev: 1, rigs: [], companies: [], invites: [], ...over });

describe('access: roles and permissions', () => {
    beforeEach(() => { installStorage(); clearAccess(); });

    it('single-user mode and owners can do everything', () => {
        expect(can('pnl')).toBe(true);
        setAccessFromServer(server(), 'u1');
        expect(['bills', 'pnl', 'team', 'workers'].every(can)).toBe(true);
    });

    it('an unknown role from a newer server never gets owner rights', () => {
        setAccessFromServer(server({ role: 'superstar' }), 'u1');
        expect(getAccess().role).toBe('manager');
        expect(isOwnerOrLocal()).toBe(false);
        expect(can('team')).toBe(false);
    });

    it('managers: bills, reports, workers, stock, expenses; not team or P&L', () => {
        setAccessFromServer(server({ role: 'manager' }), 'u1');
        expect(['bills', 'reports', 'workers', 'stock', 'expenses'].every(can)).toBe(true);
        expect(can('team')).toBe(false);
        expect(can('pnl')).toBe(false);
    });

    it('office staff: only what the owner ticked; unknown ticks are ignored', () => {
        setAccessFromServer(server({ role: 'office' }), 'u1');
        expect(can('bills')).toBe(false);
        setPerms({ workers: true, stock: true, hack: true, bills: 'yes' });
        expect(getAccess().perms).toEqual({ workers: true, stock: true });
        expect(can('workers')).toBe(true);
        expect(can('bills')).toBe(false);
        expect(isOwnerOrLocal()).toBe(false);
    });

    it('office perms survive a normal re-sync but not a role change', () => {
        setAccessFromServer(server({ role: 'office' }), 'u1');
        setPerms({ reports: true });
        setAccessFromServer(server({ role: 'office', access_rev: 2 }), 'u1');
        expect(can('reports')).toBe(true);
        setAccessFromServer(server({ role: 'manager', access_rev: 3 }), 'u1');
        expect(getAccess().perms).toEqual({});
    });
});

describe('sync: workers and tools', () => {
    const worker = { key: 'worker:w1', kind: 'worker', hash: 'h1' };
    const tool = { key: 'tool:t1', kind: 'tool', hash: 'h2' };

    it('wait on the phone until the server supports them (migration 0014)', () => {
        expect(filterPushable([worker, tool], 'owner', {}, ['stock'])).toEqual([]);
        expect(filterPushable([worker, tool], 'owner', {}, ['stock', 'workers', 'tools'])).toHaveLength(2);
        expect(filterPushable([worker, tool], 'driver', {}, ['workers', 'tools'])).toHaveLength(0);
    });

    it('are indexed, uploaded, cleaned and stored in their own lists', () => {
        expect(LIST_KINDS.worker).toBe('workers');
        const index = indexLocal({ workers: [{ id: 'w1', name: 'Kumar' }], tools: [{ id: 't1', tool: 'bit' }] });
        expect(planPush(index, {}).map((r) => r.key).sort()).toEqual(['tool:t1', 'worker:w1']);
        const rows = cleanPulledRows([
            { kind: 'worker', id: 'w2', rev: 1, data: { id: 'w2', name: '<img src=x>Ravi' } },
            { kind: 'tool', id: 't2', rev: 2, data: { id: 't2', tool: 'hammer' } },
            { kind: 'mystery', id: 'm1', rev: 3, data: { id: 'm1' } }
        ]);
        expect(rows.map((r) => r.kind)).toEqual(['worker', 'tool']);
        expect(rows[0].data.name).not.toContain('<');
        const { local, changed } = applyToLocal({ workers: [], tools: [] }, rows.map((r) => ({ ...r, key: `${r.kind}:${r.id}`, deleted: false })));
        expect([...changed].sort()).toEqual(['tools', 'workers']);
        expect(local.workers.map((w) => w.id)).toEqual(['w2']);
        expect(local.tools.map((t) => t.id)).toEqual(['t2']);
    });
});

import { holdMassDeletes } from '../src/cloud/syncPlan.js';

describe('sync safety: a phone whose list suddenly became empty', () => {
    const hashes = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`bill:b${i}`, `h${i}`]));
    const deletes = Object.keys(hashes).map((key) => ({ kind: 'bill', id: key.slice(5), deleted: true, key }));

    it('holds back deleting every bill (nothing reaches the cloud)', () => {
        const r = holdMassDeletes(deletes, new Map(), hashes);
        expect(r.rows).toEqual([]);
        expect(r.held).toEqual(['bill']);
    });

    it('lets "Clear all" through, and normal deletes always pass', () => {
        expect(holdMassDeletes(deletes, new Map(), hashes, { allowWipe: ['bill'] }).rows).toHaveLength(25);
        const index = new Map([['bill:b0', { kind: 'bill', id: 'b0' }]]); // one bill still on the phone
        expect(holdMassDeletes(deletes.slice(1), index, hashes).rows).toHaveLength(24);
        const few = Object.fromEntries(Object.entries(hashes).slice(0, 5));
        expect(holdMassDeletes(deletes.slice(0, 5), new Map(), few).rows).toHaveLength(5); // small lists: no guard
    });

    it('other kinds and uploads are untouched', () => {
        const up = { kind: 'customer', id: 'c1', deleted: false, key: 'customer:c1' };
        expect(holdMassDeletes([...deletes, up], new Map([['customer:c1', { kind: 'customer' }]]), hashes).rows).toEqual([up]);
    });
});

import { planPull, mergeBillPayments, hashData as hashOf, recordKey } from '../src/cloud/syncPlan.js';

describe('a bill paid on two phones at once keeps both payments', () => {
    const base = { id: 'b1', billNo: 'AB-108', snapshot: { docType: 'INVOICE', grandTotal: 1000 }, payments: [{ id: 'p0', amount: 100, date: '2026-11-20' }] };
    const mine = { ...base, payments: [...base.payments, { id: 'pPhone', amount: 200, date: '2026-11-22' }] };
    const theirs = { ...base, payments: [...base.payments, { id: 'pOwner', amount: 50, date: '2026-11-21' }] };

    it('merges by payment id, in date order', () => {
        expect(mergeBillPayments(mine, theirs).payments.map((p) => p.id)).toEqual(['p0', 'pOwner', 'pPhone']);
        expect(mergeBillPayments(mine, mine)).toBeNull();
    });

    it('planPull applies the merged bill and leaves it to be uploaded', () => {
        const key = recordKey('bill', 'b1');
        const index = new Map([[key, { kind: 'bill', id: 'b1', data: mine, hash: hashOf(mine) }]]);
        const hashes = { [key]: hashOf(base) };
        const plan = planPull([{ kind: 'bill', id: 'b1', data: theirs, deleted: false, rev: 9 }], index, hashes);
        expect(plan.conflicts).toEqual([key]);
        expect(plan.apply).toHaveLength(1);
        expect(plan.apply[0].merged).toBe(true);
        expect(plan.apply[0].data.payments.map((p) => p.amount)).toEqual([100, 50, 200]);
        expect(plan.synced[key]).toBeUndefined(); // still different from the cloud: uploaded next
    });
});
