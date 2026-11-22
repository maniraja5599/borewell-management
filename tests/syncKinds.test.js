// Every record kind the phone keeps as a list must be handled everywhere on the way down and up:
// a kind missing in one place is silently dropped (v2.8.0: cash entries never downloaded).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LIST_KINDS, planPull, indexLocal, applyToLocal } from '../src/cloud/syncPlan.js';
import { LIST_RECORD_KINDS, sanitizeRecordData } from '../src/data/sanitize.js';
import { cleanPulledRows, filterPushable } from '../src/cloud/sync.js';
import { BIG_LISTS } from '../src/data/bigStore.js';
import { STORAGE_KEYS } from '../src/data/storage.js';

const KINDS = Object.keys(LIST_KINDS);
const caps = ['stock', 'workers', 'tools', 'cash', 'attendance'];

describe('every list kind goes all the way through sync', () => {
    it('the sanitizer, storage and IndexedDB know every kind', () => {
        expect([...LIST_RECORD_KINDS].sort()).toEqual([...KINDS].sort());
        for (const k of KINDS) {
            expect(sanitizeRecordData(k, { id: 'x1', note: '<b>' }), k).not.toBeNull();
            expect(BIG_LISTS, k).toContain(LIST_KINDS[k]);
            expect(STORAGE_KEYS[LIST_KINDS[k]], k).toBeTruthy();
        }
    });

    it('a downloaded row of each kind lands in its list on the phone', () => {
        for (const k of KINDS) {
            const rows = cleanPulledRows([{ kind: k, id: 'x1', data: { id: 'x1', a: 1 }, deleted: false, rev: 1 }]);
            expect(rows, `${k} dropped on download`).toHaveLength(1);
            const empty = Object.fromEntries(Object.values(LIST_KINDS).map((n) => [n, []]));
            const local = { ...empty, settings: {} };
            const plan = planPull(rows, indexLocal(local), {});
            const { local: after } = applyToLocal(local, plan.apply);
            expect(after[LIST_KINDS[k]].map((x) => x.id), k).toEqual(['x1']);
        }
    });

    it('an owner uploads each kind once the server supports it', () => {
        for (const k of KINDS) {
            expect(filterPushable([{ kind: k, key: `${k}:x1`, id: 'x1', hash: 'h' }], 'owner', {}, caps), k).toHaveLength(1);
        }
    });

    it('the server migration accepts each kind', () => {
        const sql = readFileSync(new URL('../supabase/drillrig/0017_attendance.sql', import.meta.url), 'utf8');
        const line = sql.split(/\r?\n/).find((l) => l.includes('add constraint record_kind_check')) || '';
        for (const k of [...KINDS, 'setting']) expect(line, k).toContain(`'${k}'`);
    });
});
