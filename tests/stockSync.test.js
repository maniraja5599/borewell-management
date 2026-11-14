import { describe, it, expect } from 'vitest';
import { filterPushable, cleanPulledRows } from '../src/cloud/sync.js';
import { indexLocal, planPush, applyToLocal } from '../src/cloud/syncPlan.js';

const stockRow = { key: 'stock:s1', kind: 'stock', hash: 'h1' };
const billRow = { key: 'bill:b1', kind: 'bill', hash: 'h2' };

describe('pipe stock in cloud sync', () => {
    it('waits on the phone until the server supports stock (migration 0005)', () => {
        expect(filterPushable([stockRow, billRow], 'owner', {}, []).map((r) => r.key)).toEqual(['bill:b1']);
        expect(filterPushable([stockRow, billRow], 'owner', {}, ['stock']).map((r) => r.key)).toEqual(['stock:s1', 'bill:b1']);
    });

    it('managers upload stock, drivers never do', () => {
        expect(filterPushable([stockRow], 'manager', {}, ['stock'])).toHaveLength(1);
        expect(filterPushable([stockRow], 'driver', {}, ['stock'])).toHaveLength(0);
    });

    it('a new stock entry on the phone is planned for upload', () => {
        const index = indexLocal({ stock: [{ id: 's1', type: 'opening', date: '2026-11-14', casing1Ft: 300 }] });
        const rows = planPush(index, {});
        expect(rows.map((r) => r.key)).toEqual(['stock:s1']);
    });

    it('downloaded stock entries are cleaned and stored with the stock list', () => {
        const rows = cleanPulledRows([{ kind: 'stock', id: 's2', rev: 1, data: { id: 's2', note: '<b>x</b>', casing1Ft: 50 } }]);
        expect(rows[0].data.note).toBe('‹b›x‹/b›');
        const { local, changed } = applyToLocal({ stock: [] }, [{ ...rows[0], key: 'stock:s2', deleted: false }]);
        expect(changed.has('stock')).toBe(true);
        expect(local.stock.map((s) => s.id)).toEqual(['s2']);
        const removed = applyToLocal(local, [{ kind: 'stock', id: 's2', deleted: true, key: 'stock:s2' }]);
        expect(removed.local.stock).toEqual([]);
    });
});
