// Migration 0017 on real Postgres (PGlite): attendance (one worker, one day) with per-rig access;
// office staff (no rig) marked only by the owner / office; two phones marking the same day.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { indexLocal, planPush, planPull, applyToLocal, LIST_KINDS } from '../src/cloud/syncPlan.js';
import { cleanPulledRows, filterPushable } from '../src/cloud/sync.js';
import { markDay, ledger } from '../src/features/workers/attendanceMath.js';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000d1';
const MANAGER = '00000000-0000-4000-8000-0000000000d2';
const MANAGER2 = '00000000-0000-4000-8000-0000000000d3';
const OFFICE = '00000000-0000-4000-8000-0000000000d4';
const OFFICE2 = '00000000-0000-4000-8000-0000000000d5';

let db;
let company;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const pull = async (kind = 'attendance') => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === kind);
const ids = async () => (await pull()).map((r) => r.id).sort();
const reasons = (r) => r.rejected.map((x) => `${x.id}:${x.reason}`);
const att = (workerId, date, rigId, status = 'present') => ({
    kind: 'attendance', id: `att_${workerId}_${date}`,
    data: { id: `att_${workerId}_${date}`, workerId, workerName: 'Kumar · OP-001', date, status, rigId }
});
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
            ('${OFFICE}', 'f@x.com'), ('${OFFICE2}', 'g@x.com');
    `);
    const files = ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql',
        '0013_has_company.sql', '0014_office_workers_tools.sql', '0015_storage_limits.sql', '0016_expenses_cash.sql', '0017_attendance.sql'];
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0017_attendance.sql')); // safe to run again
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    await join(MANAGER, `select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await join(MANAGER2, `select public.drillrig_invite($1, 'm2@x.com', 'manager', array[$2::uuid])`, [company, rig2]);
    await join(OFFICE, `select public.drillrig_invite($1, 'f@x.com', 'office', null, '{"workers":true}'::jsonb)`, [company]);
    await join(OFFICE2, `select public.drillrig_invite($1, 'g@x.com', 'office', null, '{"reports":true}'::jsonb)`, [company]);
}, 90000);

describe('0017 attendance', () => {
    it('capabilities list attendance', async () => {
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toEqual(expect.arrayContaining(['cash', 'attendance']));
    });

    it('a manager marks workers of their rig only, never office staff', async () => {
        await as(MANAGER);
        const r = await push([att('w1', '2026-11-21', rig1), att('w9', '2026-11-21', rig2), att('off1', '2026-11-21', null)]);
        expect(reasons(r).sort()).toEqual(['att_off1_2026-11-21:rig', 'att_w9_2026-11-21:rig']);
        expect(await ids()).toEqual(['att_w1_2026-11-21']);
    });

    it('office staff with "workers" mark anyone, office staff included; delete is owner only', async () => {
        await as(OFFICE);
        expect(reasons(await push([att('off1', '2026-11-21', null), att('w9', '2026-11-21', rig2, 'half')]))).toEqual([]);
        expect(reasons(await push([{ kind: 'attendance', id: 'att_w9_2026-11-21', deleted: true }]))).toEqual(['att_w9_2026-11-21:role']);
        await as(OFFICE2);
        expect(await ids()).toEqual([]);
        expect(reasons(await push([att('w1', '2026-11-22', rig1)]))).toEqual(['att_w1_2026-11-22:role']);
        await as(MANAGER2);
        expect(await ids()).toEqual(['att_w9_2026-11-21']);
        await as(OWNER);
        expect((await ids()).length).toBe(3);
        expect(reasons(await push([{ kind: 'attendance', id: 'att_w9_2026-11-21', deleted: true }]))).toEqual([]);
    });

    it('the same worker and day from two phones is one record (the later mark wins)', async () => {
        const kumar = { id: 'w1', name: 'Kumar', code: 'OP-001', rigId: rig1, wages: [{ from: '2026-01-01', perDay: 800 }] };
        const now = new Date('2026-11-22T12:00:00');
        await as(MANAGER);
        await push([{ kind: 'attendance', id: `att_w1_2026-11-22`, data: markDay(kumar, '2026-11-22', 'present', { now }).record }]);
        await as(OFFICE);
        await push([{ kind: 'attendance', id: `att_w1_2026-11-22`, data: markDay(kumar, '2026-11-22', 'half', { now }).record }]);
        await as(OWNER);
        const rows = (await pull()).filter((r) => r.data.workerId === 'w1' && !r.deleted).map((r) => r.data);
        expect(rows.filter((r) => r.date === '2026-11-22')).toHaveLength(1);
        expect(ledger(kumar, rows, [], { until: '2026-11-22' })).toMatchObject({ present: 1, half: 1, earned: 1200 });
    });
});
