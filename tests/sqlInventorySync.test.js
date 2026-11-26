// Migration 0018 on real Postgres (PGlite): vehicles (whole business), breakdowns (per rig) and
// stock & vendors ('inv': vendors for the whole business, everything else per rig).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000e1';
const MANAGER = '00000000-0000-4000-8000-0000000000e2';
const MANAGER2 = '00000000-0000-4000-8000-0000000000e3';
const STOCKOFF = '00000000-0000-4000-8000-0000000000e4';
const BILLOFF = '00000000-0000-4000-8000-0000000000e5';

let db;
let company;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const pull = async (kind) => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === kind && !r.deleted);
const ids = async (kind) => (await pull(kind)).map((r) => r.id).sort();
const reasons = (r) => r.rejected.map((x) => `${x.id}:${x.reason}`).sort();
const rec = (kind, id, data) => ({ kind, id, data: { id, ...data } });
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
        insert into auth.users (id, email) values ('${OWNER}', 'o@x.com'), ('${MANAGER}', 'm@x.com'), ('${MANAGER2}', 'm2@x.com'),
            ('${STOCKOFF}', 's@x.com'), ('${BILLOFF}', 'b@x.com');
    `);
    const files = ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql',
        '0013_has_company.sql', '0014_office_workers_tools.sql', '0015_storage_limits.sql', '0016_expenses_cash.sql', '0017_attendance.sql',
        '0018_vehicles_breakdowns_inventory.sql'];
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0018_vehicles_breakdowns_inventory.sql')); // safe to run again
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    await join(MANAGER, `select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await join(MANAGER2, `select public.drillrig_invite($1, 'm2@x.com', 'manager', array[$2::uuid])`, [company, rig2]);
    await join(STOCKOFF, `select public.drillrig_invite($1, 's@x.com', 'office', null, '{"stock":true}'::jsonb)`, [company]);
    await join(BILLOFF, `select public.drillrig_invite($1, 'b@x.com', 'office', null, '{"bills":true}'::jsonb)`, [company]);
}, 90000);

describe('0018 vehicles, breakdowns, stock & vendors', () => {
    it('capabilities list the three new kinds; the old ones are still there', async () => {
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toEqual(expect.arrayContaining(['cash', 'attendance', 'vehicles', 'breakdowns', 'inventory']));
    });

    it('vehicles are for the whole business: managers see and edit them, never on a rig; only the owner deletes', async () => {
        await as(MANAGER);
        expect(reasons(await push([rec('vehicle', 'veh_1', { name: 'TN 45 AB 1234', kind: 'hired', rigId: rig1, settlements: [] })]))).toEqual([]);
        expect((await pull('vehicle'))[0].rig_id ?? null).toBeNull();
        await as(MANAGER2);
        expect(await ids('vehicle')).toEqual(['veh_1']);
        expect(reasons(await push([{ kind: 'vehicle', id: 'veh_1', deleted: true }]))).toEqual(['veh_1:role']);
        await as(BILLOFF);
        expect(await ids('vehicle')).toEqual(['veh_1']);
        await as(OWNER);
        expect(reasons(await push([{ kind: 'vehicle', id: 'veh_1', deleted: true }]))).toEqual([]);
        expect(await ids('vehicle')).toEqual([]);
    });

    it('breakdowns belong to a rig: a manager reports on their rig only and sees only theirs', async () => {
        await as(MANAGER);
        const r = await push([
            rec('breakdown', 'bd_1', { rigId: rig1, reason: 'compressor', startAt: 1, endAt: null, cost: 0 }),
            rec('breakdown', 'bd_2', { rigId: rig2, reason: 'engine', startAt: 1, endAt: null, cost: 0 })
        ]);
        expect(reasons(r)).toEqual(['bd_2:rig']);
        await as(MANAGER2);
        expect(await ids('breakdown')).toEqual([]);
        expect(reasons(await push([rec('breakdown', 'bd_3', { rigId: rig2, reason: 'engine', startAt: 1, endAt: 2, cost: 4500 })]))).toEqual([]);
        await as(BILLOFF);
        expect(await ids('breakdown')).toEqual(['bd_1', 'bd_3']);
        await as(OWNER);
        // "local" (a phone without rigs) lands on the first rig
        expect(reasons(await push([rec('breakdown', 'bd_4', { rigId: 'local', reason: 'other', startAt: 1 })]))).toEqual([]);
        expect((await pull('breakdown')).find((x) => x.id === 'bd_4').data.rigId).toBe(rig1);
    });

    it('stock & vendors: vendors for everyone with stock access, items / purchases per rig', async () => {
        await as(MANAGER);
        expect(reasons(await push([
            rec('inv', 'ven_1', { t: 'vendor', name: 'Sri Murugan Spares' }),
            rec('inv', 'inv_1', { t: 'item', name: 'Grease', rigId: rig1 }),
            rec('inv', 'pur_1', { t: 'purchase', vendorId: 'ven_1', total: 20300, rigId: rig1, lines: [] }),
            rec('inv', 'inv_2', { t: 'item', name: 'Collar', rigId: rig2 })
        ]))).toEqual(['inv_2:rig']);
        await as(MANAGER2);
        expect(await ids('inv')).toEqual(['ven_1']); // the vendor yes, rig 1's items and purchases no
        expect(reasons(await push([rec('inv', 'vp_1', { t: 'vpay', vendorId: 'ven_1', amount: 5000, rigId: rig2 })]))).toEqual([]);
        await as(STOCKOFF);
        expect(await ids('inv')).toEqual(['inv_1', 'pur_1', 'ven_1', 'vp_1']);
        await as(BILLOFF);
        expect(await ids('inv')).toEqual([]);
        expect(reasons(await push([rec('inv', 'ven_2', { t: 'vendor', name: 'X' })]))).toEqual(['ven_2:role']);
        await as(MANAGER);
        expect(reasons(await push([{ kind: 'inv', id: 'inv_1', deleted: true }]))).toEqual(['inv_1:role']);
        // a rig record cannot be turned into a vendor to escape its rig
        expect(reasons(await push([rec('inv', 'pur_1', { t: 'vendor', name: 'sneaky' })]))).toEqual(['pur_1:rig']);
    });

    it('old kinds keep working after 0018', async () => {
        await as(MANAGER);
        expect(reasons(await push([rec('cash', 'cash_1', { type: 'expense', amount: 100, date: '2026-11-26', rigId: rig1, holderId: MANAGER })]))).toEqual([]);
        expect(await ids('cash')).toEqual(['cash_1']);
    });
});
