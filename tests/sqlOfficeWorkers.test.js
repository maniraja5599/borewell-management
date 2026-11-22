// Migration 0014 on real Postgres (PGlite): office staff + permissions, drivers become managers,
// workers (payroll list) and tools (bits / hammers) with per-rig and per-permission access.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000c1';
const MANAGER = '00000000-0000-4000-8000-0000000000c2';
const OLD_DRIVER = '00000000-0000-4000-8000-0000000000c3';
const OFFICE = '00000000-0000-4000-8000-0000000000c4';
const OFFICE2 = '00000000-0000-4000-8000-0000000000c5';
const NEWBIE = '00000000-0000-4000-8000-0000000000c6';

let db;
let company;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const errorOf = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const pull = async (kind) => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === kind).map((r) => r.id).sort();
const reasons = (r) => r.rejected.map((x) => `${x.id}:${x.reason}`);
const worker = (id, rigId, name = 'Kumar') => ({ kind: 'worker', id, data: { id, rigId, name, code: 'OP-001', type: 'operator', status: 'active' } });
const tool = (id, rigId) => ({ kind: 'tool', id, data: { id, rigId, tool: 'bit', size: '6.5', code: 'KB-1', brand: 'X', price: 9000, status: 'active' } });
const bill = (id, rigId) => ({ kind: 'bill', id, data: { id, rigId, billNo: id, snapshot: { docType: 'INVOICE', grandTotal: 1000 } } });
const join = async (uid, inviteSql, params) => {
    await as(OWNER);
    await db.query(inviteSql, params);
    await as(uid);
    const iv = (await one(`select public.drillrig_my_invites() as r`)).r.find((x) => x.company_id === company);
    await db.query(`select public.drillrig_accept_invite($1)`, [iv.id]);
};

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}',
                                 created_at timestamptz default now(), last_sign_in_at timestamptz);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${OWNER}', 'o@x.com'), ('${MANAGER}', 'm@x.com'), ('${OLD_DRIVER}', 'd@x.com'),
            ('${OFFICE}', 'f@x.com'), ('${OFFICE2}', 'g@x.com'), ('${NEWBIE}', 'n@x.com');
    `);
    const before = ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql',
        '0013_has_company.sql'];
    for (const f of before) await db.exec(sql(f));
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    // A driver from before 0014.
    await join(OLD_DRIVER, `select public.drillrig_invite($1, 'd@x.com', 'driver', array[$2::uuid])`, [company, rig1]);
    await db.exec(sql('0014_office_workers_tools.sql'));
    await join(MANAGER, `select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await join(OFFICE, `select public.drillrig_invite($1, 'f@x.com', 'office', null, '{"workers":true,"stock":true,"team":true,"bogus":true}'::jsonb)`, [company]);
    await join(OFFICE2, `select public.drillrig_invite($1, 'g@x.com', 'office', null, '{"reports":true}'::jsonb)`, [company]);
}, 90000);

const roleOf = async (uid) => (await one(`select role, perms from drillrig.member where company_id = $1 and user_id = $2`, [company, uid]));

describe('0014 roles', () => {
    it('drivers from before became managers; capabilities list the new kinds', async () => {
        expect((await roleOf(OLD_DRIVER)).role).toBe('manager');
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toEqual(expect.arrayContaining(['office', 'workers', 'tools', 'stock']));
    });

    it('an old app inviting a "driver" gets a manager; unknown roles are refused', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_invite($1, 'n@x.com', 'driver', array[$2::uuid])`, [company, rig1]);
        expect((await one(`select role from drillrig.invite where email = 'n@x.com' and revoked_at is null`)).role).toBe('manager');
        expect(await errorOf(() => db.query(`select public.drillrig_invite($1, 'z@x.com', 'boss', array[$2::uuid])`, [company, rig1]))).toMatch(/unknown role/);
    });

    it('office staff join with only the known permissions ticked; office sees every rig', async () => {
        expect(await roleOf(OFFICE)).toEqual({ role: 'office', perms: { workers: true, stock: true, team: true } });
        await as(OFFICE);
        const me = await one(`select * from public.drillrig_my_company(p_name => null, p_prefix => null, p_company => $1)`, [company]);
        expect(me.role).toBe('office');
        expect(me.rigs.map((r) => r.id).sort()).toEqual([rig1, rig2].sort());
        expect((await one(`select public.drillrig_my_perms($1) as p`, [company])).p).toEqual({ workers: true, stock: true, team: true });
        await as(OWNER);
        expect((await one(`select public.drillrig_my_perms($1) as p`, [company])).p.pnl).toBe(true);
    });

    it('old 5-argument set_member calls still work and keep office perms', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_set_member(p_company => $1, p_user => $2, p_role => 'office', p_rig_ids => null, p_active => true)`, [company, OFFICE2]);
        expect(await roleOf(OFFICE2)).toEqual({ role: 'office', perms: { reports: true } });
        await db.query(`select public.drillrig_set_member($1, $2, 'office', null, true, '{"reports":true,"bills":true}'::jsonb)`, [company, OFFICE2]);
        expect((await roleOf(OFFICE2)).perms).toEqual({ reports: true, bills: true });
        await db.query(`select public.drillrig_set_member($1, $2, 'office', null, true, '{"reports":true}'::jsonb)`, [company, OFFICE2]);
    });

    it('office with "team" manages managers only, never owners or office staff', async () => {
        await as(OFFICE);
        expect((await one(`select public.drillrig_team($1) as t`, [company])).t.my_role).toBe('office');
        await db.query(`select public.drillrig_invite_link($1, '9842712399', 'Ravi', 'manager', array[$2::uuid])`, [company, rig2]);
        expect(await errorOf(() => db.query(`select public.drillrig_invite_link($1, '9842712398', 'X', 'owner', null)`, [company]))).toMatch(/only the owner/);
        expect(await errorOf(() => db.query(`select public.drillrig_invite($1, 'q@x.com', 'office', null)`, [company]))).toMatch(/only the owner/);
        await db.query(`select public.drillrig_set_member($1, $2, 'manager', array[$3::uuid, $4::uuid])`, [company, MANAGER, rig1, rig2]);
        await db.query(`select public.drillrig_set_member($1, $2, 'manager', array[$3::uuid])`, [company, MANAGER, rig1]);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'owner', null)`, [company, MANAGER]))).toMatch(/only the owner/);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'manager', array[$3::uuid])`, [company, OWNER, rig1]))).toMatch(/only the owner/);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'office', null, true, '{"pnl":true}'::jsonb)`, [company, OFFICE]))).toMatch(/only the owner/);
    });

    it('office without "team" cannot open the team', async () => {
        await as(OFFICE2);
        expect(await errorOf(() => db.query(`select public.drillrig_team($1)`, [company]))).toMatch(/only the owner/);
    });
});

describe('0014 workers and tools', () => {
    it('owner: workers on any rig or on no rig; tools on any rig', async () => {
        await as(OWNER);
        const r = await push([worker('w1', rig1), worker('w2', rig2), worker('w0', null, 'Office Selvi'), tool('t1', rig1), tool('t2', rig2)]);
        expect(r.rejected).toEqual([]);
        expect((await one(`select rig_id from drillrig.record where kind = 'worker' and id = 'w0'`)).rig_id).toBeNull();
    });

    it('manager: own rig only, no "no rig" workers, no deletes', async () => {
        await as(MANAGER);
        const r = await push([worker('w3', rig1), worker('w4', rig2), worker('w5', null), tool('t3', rig1), tool('t4', rig2),
            worker('w2', rig1), { kind: 'tool', id: 't1', data: {}, deleted: true }]);
        expect(reasons(r)).toEqual(['w4:rig', 'w5:rig', 't4:rig', 'w2:rig', 't1:role']);
        // moving a worker off the manager's rig to a rig he does not have is refused
        expect(reasons(await push([worker('w3', rig2)]))).toEqual(['w3:rig']);
    });

    it('manager reads only their rig; office by permission; old driver (now manager) too', async () => {
        await as(MANAGER);
        expect(await pull('worker')).toEqual(['w1', 'w3']);
        expect(await pull('tool')).toEqual(['t1', 't3']);
        await as(OLD_DRIVER);
        expect(await pull('worker')).toEqual(['w1', 'w3']);
        await as(OFFICE);
        expect(await pull('worker')).toEqual(['w0', 'w1', 'w2', 'w3']);
        expect(await pull('tool')).toEqual(['t1', 't2', 't3']);
        expect(await pull('bill')).toEqual([]);
        await as(OFFICE2); // reports only
        expect(await pull('worker')).toEqual([]);
        expect(await pull('tool')).toEqual([]);
    });

    it('office writes only what was ticked; nobody but the owner deletes', async () => {
        await as(OFFICE);
        let r = await push([worker('w6', null, 'Office Ravi'), tool('t5', rig2), bill('B1', rig1), { kind: 'worker', id: 'w1', data: {}, deleted: true }]);
        expect(reasons(r)).toEqual(['B1:role', 'w1:role']);
        await as(OFFICE2);
        r = await push([worker('w7', rig1), tool('t6', rig1)]);
        expect(reasons(r)).toEqual(['w7:role', 't6:role']);
        await as(OWNER);
        r = await push([{ kind: 'worker', id: 'w6', data: {}, deleted: true }]);
        expect(r.rejected).toEqual([]);
    });

    it('office with "reports" reads bills but cannot write them', async () => {
        await as(OWNER);
        expect((await push([bill('B2', rig2)])).rejected).toEqual([]);
        await as(OFFICE2);
        expect(await pull('bill')).toEqual(['B2']);
        expect(reasons(await push([bill('B3', rig1)]))).toEqual(['B3:role']);
    });

    it('a worker can be moved to "no rig" by the owner', async () => {
        await as(OWNER);
        expect((await push([worker('w3', null)])).rejected).toEqual([]);
        expect((await one(`select rig_id from drillrig.record where kind = 'worker' and id = 'w3'`)).rig_id).toBeNull();
        await as(MANAGER);
        expect(await pull('worker')).toEqual(['w1']);
    });

    it('workers and tools are in the activity log, seen by the right people', async () => {
        await as(OWNER);
        const all = (await db.query(`select * from public.drillrig_activity($1, null, null, 200)`, [company])).rows;
        const t = all.find((a) => a.kind === 'tool' && a.record_id === 't1');
        expect(t.summary).toMatchObject({ tool: 'bit', size: '6.5', code: 'KB-1', price: 9000 });
        await as(MANAGER);
        const mine = (await db.query(`select * from public.drillrig_activity($1, null, null, 200)`, [company])).rows;
        expect(mine.some((a) => a.record_id === 't2')).toBe(false);
        expect(mine.some((a) => a.record_id === 't3')).toBe(true);
        await as(OFFICE2);
        const rep = (await db.query(`select * from public.drillrig_activity($1, null, null, 200)`, [company])).rows;
        expect(rep.some((a) => a.kind === 'worker' || a.kind === 'tool')).toBe(false);
    });

    it('running 0014 again changes nothing', async () => {
        await db.exec(sql('0014_office_workers_tools.sql'));
        expect(await roleOf(OFFICE)).toEqual({ role: 'office', perms: { workers: true, stock: true, team: true } });
    });
});
