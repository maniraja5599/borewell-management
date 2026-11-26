// Vehicles, breakdowns and stock & vendors lived on one phone (plain localStorage keys) before
// migration 0018. After the update their first read must move every old record into the synced
// list — none lost, none doubled — and remove the old key.
import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.window = globalThis.window || {};
globalThis.window.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k)
};

const { readMovedList } = await import('../src/data/movedList.js');
const { storage, STORAGE_KEYS } = await import('../src/data/storage.js');

describe('old one-phone lists move into the synced lists', () => {
    beforeEach(() => mem.clear());

    it('moves vehicles once, keeps records already synced, removes the old key', () => {
        storage.setList(STORAGE_KEYS.vehicles, [{ id: 'veh_b', name: 'From the cloud' }]);
        mem.set('drillrig_vehicles_v1', JSON.stringify([{ id: 'veh_a', name: 'Old phone' }, { id: 'veh_b', name: 'Old copy of a synced one' }, { name: 'no id' }]));
        const list = readMovedList(STORAGE_KEYS.vehicles, 'drillrig_vehicles_v1');
        expect(list.map((v) => `${v.id}:${v.name}`)).toEqual(['veh_a:Old phone', 'veh_b:From the cloud']);
        expect(mem.has('drillrig_vehicles_v1')).toBe(false);
        expect(readMovedList(STORAGE_KEYS.vehicles, 'drillrig_vehicles_v1')).toHaveLength(2);
    });

    it('turns the old stock & vendors document into typed records', () => {
        mem.set('drillrig_inventory_v1', JSON.stringify({ items: [{ id: 'inv_1', name: 'Grease' }], vendors: [{ id: 'ven_1', name: 'SM' }], moves: [], purchases: [], payments: [{ id: 'vp_1', amount: 5 }] }));
        const flatten = (d) => [['items', 'item'], ['vendors', 'vendor'], ['payments', 'vpay']].flatMap(([n, t]) => (d[n] || []).map((x) => ({ ...x, t })));
        const list = readMovedList(STORAGE_KEYS.inventory, 'drillrig_inventory_v1', flatten);
        expect(list.map((x) => `${x.t}:${x.id}`).sort()).toEqual(['item:inv_1', 'vendor:ven_1', 'vpay:vp_1']);
    });
});
