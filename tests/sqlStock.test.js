// Pipe stock records (supabase/drillrig/0005_pipe_stock.sql) on real Postgres (PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000b1';
const MANAGER = '00000000-0000-4000-8000-0000000000b2';
const DRIVER = '00000000-0000-4000-8000-0000000000b3';

let db;
let company;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const pullStock = async () => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === 'stock');
const stock = (id, rigId, c1, c2 = 0, type = 'purchase') => ({ kind: 'stock', id, data: { id, rigId, type, date: '2026-11-14', casing1Ft: c1, casing2Ft: c2 } });

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${OWNER}', 'o@x.com'), ('${MANAGER}', 'm@x.com'), ('${DRIVER}', 'd@x.com');
    `);
    for (const f of ['0001_drillrig_sync.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql', '0005_pipe_stock.sql']) await db.exec(sql(f));
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company('Co', 'SM')`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    await db.query(`select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await db.query(`select public.drillrig_invite($1, 'd@x.com', 'driver', array[$2::uuid])`, [company, rig1]);
    for (const u of [MANAGER, DRIVER]) { await as(u); await db.query(`select * from public.drillrig_my_company()`); }
}, 60000);

describe('pipe stock (0005)', () => {
    it('the server says it supports stock', async () => {
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toContain('stock');
    });

    it('owner adds stock on any rig; the entry is tagged with its rig', async () => {
        await as(OWNER);
        const r = await push([stock('s1', rig1, 500, 100, 'opening'), stock('s2', rig2, 300)]);
        expect(r.rejected).toEqual([]);
        expect((await one(`select rig_id from drillrig.record where kind = 'stock' and id = 's2'`)).rig_id).toBe(rig2);
    });

    it('manager adds/edits on their rig only and cannot delete; driver cannot write stock', async () => {
        await as(MANAGER);
        let r = await push([stock('s3', rig1, 200), stock('s4', rig2, 50), { kind: 'stock', id: 's1', data: {}, deleted: true }]);
        expect(r.rejected.map((x) => `${x.id}:${x.reason}`)).toEqual(['s4:rig', 's1:role']);
        r = await push([stock('s3', rig1, 250)]);
        expect(r.rejected).toEqual([]);
        await as(DRIVER);
        r = await push([stock('s5', rig1, 10)]);
        expect(r.rejected).toEqual([{ kind: 'stock', id: 's5', reason: 'role' }]);
    });

    it('reads: owner all, manager their rigs, driver none', async () => {
        await as(OWNER);
        expect((await pullStock()).map((r) => r.id).sort()).toEqual(['s1', 's2', 's3']);
        await as(MANAGER);
        expect((await pullStock()).map((r) => r.id).sort()).toEqual(['s1', 's3']);
        await as(DRIVER);
        expect(await pullStock()).toEqual([]);
    });

    it('owner delete is a soft delete; stock changes are in the activity log', async () => {
        await as(OWNER);
        await push([{ kind: 'stock', id: 's3', data: {}, deleted: true }]);
        const kept = await one(`select deleted, data from drillrig.record where kind = 'stock' and id = 's3'`);
        expect(kept.deleted).toBe(true);
        expect(kept.data.casing1Ft).toBe(250);
        const log = (await db.query(`select * from public.drillrig_activity($1, 'stock', 's3')`, [company])).rows.reverse();
        expect(log.map((r) => r.action)).toEqual(['create', 'update', 'delete']);
        expect(log[1].summary).toMatchObject({ type: 'purchase', casing1Ft: 250 });
        await as(MANAGER); // manager sees rig-1 stock history, not rig-2's
        expect((await db.query(`select * from public.drillrig_activity($1, 'stock')`, [company])).rows.some((r) => r.record_id === 's2')).toBe(false);
    });

    it('bills, customers and settings still follow the 0003 rules', async () => {
        await as(DRIVER);
        const r = await push([
            { kind: 'bill', id: 'b1', data: { id: 'b1', rigId: rig1 } },
            { kind: 'bill', id: 'b2', data: { id: 'b2', rigId: rig2 } },
            { kind: 'setting', id: 'rates', data: {} }
        ]);
        expect(r.rejected.map((x) => `${x.id}:${x.reason}`)).toEqual(['b2:rig', 'rates:role']);
    });

    it('can be run twice', async () => {
        await db.exec(sql('0005_pipe_stock.sql'));
        await as(OWNER);
        expect((await push([stock('s9', rig1, 1)])).rejected).toEqual([]);
    });
});
