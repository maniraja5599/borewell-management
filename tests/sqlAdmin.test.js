// Admin console (supabase/drillrig/0007_admin_console.sql) on real Postgres (PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const OWNER = '00000000-0000-4000-8000-0000000000a2';
const STAFF = '00000000-0000-4000-8000-0000000000a3';
const STRANGER = '00000000-0000-4000-8000-0000000000a4';

let db;
let murugan;
let rig;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const rpc = async (name, args = '', params = []) => Object.values(await one(`select public.${name}(${args}) as r`, params))[0];

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(),
            raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz default now());
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email, raw_user_meta_data) values
          ('${ADMIN}', 'dev@x.com', '{"full_name":"Dev"}'), ('${OWNER}', 'murugan@x.com', '{"full_name":"Murugan"}'),
          ('${STAFF}', 'staff@x.com', '{}'), ('${STRANGER}', 'stranger@x.com', '{}');
    `);
    for (const f of ['0001_drillrig_sync.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql', '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql']) await db.exec(sql(f));
    await db.exec(`insert into drillrig.admin (user_id) values ('${ADMIN}')`);

    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company('Sri Murugan Borewells', 'SM')`);
    murugan = me.company_id;
    rig = me.rigs[0].id;
    const rows = [
        { kind: 'customer', id: 'c1', data: { id: 'c1', name: 'Ravi' } },
        { kind: 'bill', id: 'b1', data: { id: 'b1', billNo: 'SM-101', snapshot: { grandTotal: 45000 } } },
        { kind: 'bill', id: 'b2', data: { id: 'b2', billNo: 'SM-102', snapshot: { grandTotal: 30000 } } }
    ];
    await db.query(`select public.drillrig_push($1, $2::jsonb)`, [murugan, JSON.stringify(rows)]);
    await db.query(`select public.drillrig_invite($1, 'staff@x.com', 'manager', array[$2::uuid])`, [murugan, rig]);
    await as(STAFF);
    await db.query(`select * from public.drillrig_my_company()`);
    await as(ADMIN);
    await db.query(`select * from public.drillrig_my_company('Dev Test Co', 'DT')`);
}, 60000);

describe('admin console', () => {
    it('only admins get in; everyone else is refused; anon cannot even call', async () => {
        for (const uid of [OWNER, STAFF, STRANGER]) {
            await as(uid);
            expect(await rpc('drillrig_admin_whoami')).toMatchObject({ admin: false });
            await expect(rpc('drillrig_admin_overview')).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_companies')).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_export', '$1', [murugan])).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_pause', '$1, true', [murugan])).rejects.toThrow(/not an admin/);
        }
        const g = await one(`select has_function_privilege('anon', 'public.drillrig_admin_overview()', 'execute') as anon`);
        expect(g.anon).toBe(false);
        await as(ADMIN);
        expect(await rpc('drillrig_admin_whoami')).toEqual({ admin: true, email: 'dev@x.com' });
    }, 30000);

    it('overview counts businesses, users, staff, bills, customers and rigs', async () => {
        await as(ADMIN);
        const o = await rpc('drillrig_admin_overview');
        expect(o).toMatchObject({ businesses: 2, users: 3, staff: 1, bills: 2, customers: 1, paused: 0, active_7d: 1 });
        expect(o.rigs).toEqual({ free: 2 });
        expect(o.cloud_bytes).toBeGreaterThan(0);
    }, 30000);

    it('business list: search by name or by any member email; counts and owner shown', async () => {
        await as(ADMIN);
        const byName = await rpc('drillrig_admin_companies', `'murugan'`);
        expect(byName.total).toBe(1);
        expect(byName.rows[0]).toMatchObject({ name: 'Sri Murugan Borewells', owner_email: 'murugan@x.com', members: 2, bills: 2, customers: 1, rigs: ['free'] });
        expect((await rpc('drillrig_admin_companies', `'staff@x'`)).rows[0].id).toBe(murugan);
        expect((await rpc('drillrig_admin_companies')).total).toBe(2);
    }, 30000);

    it('business detail shows members, rigs, counts and activity, and is logged', async () => {
        await as(ADMIN);
        const d = await rpc('drillrig_admin_company', '$1', [murugan]);
        expect(d.members.map((m) => [m.email, m.role])).toEqual([['murugan@x.com', 'owner'], ['staff@x.com', 'manager']]);
        expect(d.rigs[0]).toMatchObject({ name: 'Rig 1', bill_prefix: 'SM', state: 'free', bills: 2 });
        expect(d.counts).toMatchObject({ bill: 2, customer: 1 });
        expect(d.activity.length).toBeGreaterThan(0);
        const log = await rpc('drillrig_admin_log');
        expect(log[0]).toMatchObject({ action: 'view_business', admin: 'dev@x.com', company: 'Sri Murugan Borewells' });
    }, 30000);

    it('users list: everyone in a DrillRig business, with their businesses', async () => {
        await as(ADMIN);
        const u = await rpc('drillrig_admin_users', `'staff'`);
        expect(u).toHaveLength(1);
        expect(u[0]).toMatchObject({ email: 'staff@x.com' });
        expect(u[0].businesses[0]).toMatchObject({ name: 'Sri Murugan Borewells', role: 'manager', paused: false });
        expect((await rpc('drillrig_admin_users')).map((x) => x.email).sort()).toEqual(['dev@x.com', 'murugan@x.com', 'staff@x.com']);
    }, 30000);

    it('rig dates: ending the free period stops new bills; paid-until restores; phones are told', async () => {
        await as(ADMIN);
        const before = (await one(`select access_rev from drillrig.member where company_id = $1 and user_id = $2`, [murugan, OWNER])).access_rev;
        const ended = await rpc('drillrig_admin_set_rig_dates', `$1, now() - interval '1 day', null, true`, [rig]);
        expect(ended).toMatchObject({ state: 'ended', active: false });
        const after = (await one(`select access_rev from drillrig.member where company_id = $1 and user_id = $2`, [murugan, OWNER])).access_rev;
        expect(Number(after)).toBe(Number(before) + 1);
        const paid = await rpc('drillrig_admin_set_rig_dates', `$1, null, now() + interval '30 days'`, [rig]);
        expect(paid).toMatchObject({ state: 'paid', active: true });
        const log = await rpc('drillrig_admin_log');
        expect(log[0].action).toBe('set_rig_dates');
        expect(log[0].details.after.paid_until).toBeTruthy();
    }, 30000);

    it('pause: the business cannot sync (clear message), billing data stays; resume brings it back', async () => {
        await as(ADMIN);
        await rpc('drillrig_admin_pause', `$1, true, 'unpaid'`, [murugan]);
        for (const uid of [OWNER, STAFF]) {
            await as(uid);
            await expect(db.query(`select * from public.drillrig_pull($1, 0, 500)`, [murugan])).rejects.toThrow(/paused for this business: unpaid/);
            await expect(db.query(`select public.drillrig_push($1, '[]'::jsonb)`, [murugan])).rejects.toThrow(/paused/);
        }
        await as(ADMIN);
        expect((await rpc('drillrig_admin_overview')).paused).toBe(1);
        expect((await one(`select count(*)::int as n from drillrig.record where company_id = $1`, [murugan])).n).toBe(3);
        await rpc('drillrig_admin_pause', `$1, false`, [murugan]);
        await as(OWNER);
        expect((await db.query(`select * from public.drillrig_pull($1, 0, 500)`, [murugan])).rows.length).toBe(3);
    }, 30000);

    it('export gives every record of the business, and is logged', async () => {
        await as(ADMIN);
        const e = await rpc('drillrig_admin_export', '$1', [murugan]);
        expect(e.company.name).toBe('Sri Murugan Borewells');
        expect(e.records.map((r) => `${r.kind}:${r.id}`)).toEqual(['bill:b1', 'bill:b2', 'customer:c1']);
        expect((await rpc('drillrig_admin_log'))[0].action).toBe('export');
    }, 30000);

    it('delete needs the exact name, removes everything, and the log keeps a note', async () => {
        await as(ADMIN);
        await expect(rpc('drillrig_admin_delete_company', `$1, 'Sri Murugan'`, [murugan])).rejects.toThrow(/exactly/);
        const r = await rpc('drillrig_admin_delete_company', `$1, 'Sri Murugan Borewells'`, [murugan]);
        expect(r).toEqual({ deleted: 'Sri Murugan Borewells', records: { bill: 2, customer: 1 } });
        for (const t of ['record', 'member', 'rig', 'activity']) {
            expect((await one(`select count(*)::int as n from drillrig.${t} where company_id = $1`, [murugan])).n).toBe(0);
        }
        const log = await rpc('drillrig_admin_log');
        expect(log[0]).toMatchObject({ action: 'delete_business', target: 'Sri Murugan Borewells', company: null });
    }, 30000);
});
