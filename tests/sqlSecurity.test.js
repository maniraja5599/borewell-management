// Attack tests on real Postgres (PGlite) with every migration: what can a signed-in stranger,
// a manager or office staff do to a company that is not theirs / beyond their role?
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000e1';
const STRANGER = '00000000-0000-4000-8000-0000000000e2';
const MANAGER = '00000000-0000-4000-8000-0000000000e3';
const OFFICE = '00000000-0000-4000-8000-0000000000e4';

let db;
let co;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const fails = async (q, p) => { try { await db.query(q, p); return false; } catch { return true; } };
const push = (rows, company = co) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const join = async (uid, inviteSql, params) => {
    await as(OWNER); await db.query(inviteSql, params);
    await as(uid);
    const iv = (await one(`select public.drillrig_my_invites() as r`)).r.find((x) => x.company_id === co);
    await db.query(`select public.drillrig_accept_invite($1)`, [iv.id]);
};

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${OWNER}','o@x.com'),('${STRANGER}','s@x.com'),('${MANAGER}','m@x.com'),('${OFFICE}','f@x.com');
    `);
    for (const f of ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql',
        '0013_has_company.sql', '0014_office_workers_tools.sql']) await db.exec(sql(f));
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    co = me.company_id; rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [co])).r.id;
    await push([{ kind: 'bill', id: 'b1', data: { id: 'b1', rigId: rig1, billNo: 'SM-1', snapshot: { docType: 'INVOICE', grandTotal: 5000 } } },
        { kind: 'bill', id: 'b2', data: { id: 'b2', rigId: rig2, billNo: 'R2-1' } },
        { kind: 'setting', id: 'brand', data: { companyName: 'Co' } }]);
    await join(MANAGER, `select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [co, rig1]);
    await join(OFFICE, `select public.drillrig_invite($1, 'f@x.com', 'office', null, '{"workers":true}'::jsonb)`, [co]);
    await as(STRANGER);
    await db.query(`select * from public.drillrig_my_company(p_name => 'Stranger Co', p_prefix => 'ST', p_company => null)`);
}, 90000);

describe('a signed-in stranger cannot touch another company', () => {
    it('cannot read, write, see the team, the activity or the invites', async () => {
        await as(STRANGER);
        expect(await fails(`select * from public.drillrig_pull($1, 0, 100)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_push($1, '[{"kind":"bill","id":"x","data":{"id":"x"}}]'::jsonb)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_team($1)`, [co])).toBe(true);
        expect(await fails(`select * from public.drillrig_activity($1, null, null, 50, null)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_phone_lookup($1, '9876543210')`, [co])).toBe(true);
        expect((await one(`select public.drillrig_my_perms($1) as p`, [co])).p).toEqual({});
    });

    it('cannot make itself a member or owner, add a rig, or take bill numbers', async () => {
        await as(STRANGER);
        expect(await fails(`select public.drillrig_invite($1, 's@x.com', 'owner', null)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_invite_link($1, '9876543210', 'x', 'owner', null)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_set_member($1, $2, 'owner', null)`, [co, STRANGER])).toBe(true);
        expect(await fails(`select public.drillrig_save_rig($1, null, 'Hack', 'HK')`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_claim_number($1, 'INVOICE', 1, $2)`, [co, rig1])).toBe(true);
        const mine = await one(`select * from public.drillrig_my_company(p_name => null, p_prefix => null, p_company => $1)`, [co]);
        expect(mine.company_id).not.toBe(co); // asking for their company just opens my own
    });

    it('cannot use the admin console', async () => {
        await as(STRANGER);
        expect(await fails(`select public.drillrig_admin_overview()`)).toBe(true);
        expect(await fails(`select * from public.drillrig_admin_companies(null, 50, 0)`)).toBe(true);
        expect(await fails(`select public.drillrig_admin_export($1)`, [co])).toBe(true);
    });

    it('cannot accept an invitation sent to someone else’s Gmail', async () => {
        await as(OWNER);
        const id = (await one(`select public.drillrig_invite($1, 'victim@x.com', 'owner', null) as id`, [co])).id;
        await as(STRANGER);
        expect(await fails(`select public.drillrig_accept_invite($1)`, [id])).toBe(true);
        expect((await one(`select role from drillrig.member where company_id = $1 and user_id = $2`, [co, STRANGER]))).toBeUndefined();
    });
});

describe('staff stay inside their role', () => {
    it('a manager cannot see or write another rig, settings, or delete', async () => {
        await as(MANAGER);
        const ids = (await db.query(`select id from public.drillrig_pull($1, 0, 100) where kind = 'bill'`, [co])).rows.map((r) => r.id);
        expect(ids).toEqual(['b1']);
        const r = await push([
            { kind: 'bill', id: 'b2', data: { id: 'b2', rigId: rig2, billNo: 'hacked' } },
            { kind: 'bill', id: 'b1', data: { id: 'b1', rigId: rig2 } }, // move a bill to a rig I do not have
            { kind: 'setting', id: 'brand', data: { companyName: 'Hacked' } },
            { kind: 'bill', id: 'b1', data: {}, deleted: true }
        ]);
        expect(r.rejected.map((x) => `${x.id}:${x.reason}`)).toEqual(['b2:rig', 'b1:rig', 'brand:role', 'b1:role']);
        expect(await fails(`select public.drillrig_team($1)`, [co])).toBe(true);
        expect(await fails(`select public.drillrig_set_member($1, $2, 'owner', null)`, [co, MANAGER])).toBe(true);
    });

    it('office staff without "bills" cannot read or write bills; cannot raise their own permissions', async () => {
        await as(OFFICE);
        expect((await db.query(`select id from public.drillrig_pull($1, 0, 100) where kind = 'bill'`, [co])).rows).toEqual([]);
        expect((await push([{ kind: 'bill', id: 'b9', data: { id: 'b9', rigId: rig1 } }])).rejected[0].reason).toBe('role');
        expect(await fails(`select public.drillrig_set_member($1, $2, 'office', null, true, '{"bills":true,"pnl":true}'::jsonb)`, [co, OFFICE])).toBe(true);
        expect((await one(`select public.drillrig_my_perms($1) as p`, [co])).p).toEqual({ workers: true });
    });

    it('a record cannot be pushed into another company by naming it', async () => {
        await as(STRANGER);
        const own = (await one(`select * from public.drillrig_my_company(p_name => null, p_prefix => null, p_company => null)`)).company_id;
        const r = await push([{ kind: 'bill', id: 'b1', data: { id: 'b1', rigId: rig1 } }], own); // my company, their rig id
        expect(r.rejected.map((x) => x.reason)).toEqual(['rig']);
        await as(OWNER);
        const b1 = await one(`select data from drillrig.record where company_id = $1 and kind = 'bill' and id = 'b1'`, [co]);
        expect(b1.data.billNo).toBe('SM-1');
    });

    it('oversized and malformed rows are refused, not stored', async () => {
        await as(OWNER);
        const big = 'x'.repeat(2_200_000);
        const r = await push([
            { kind: 'bill', id: 'big', data: { id: 'big', blob: big } },
            { kind: 'nonsense', id: 'n1', data: {} },
            { kind: 'bill', id: '', data: {} }
        ]);
        expect(r.rejected.map((x) => x.reason)).toEqual(['too_large', 'invalid', 'invalid']);
        expect(await fails(`select public.drillrig_push($1, $2::jsonb)`, [co, JSON.stringify(Array.from({ length: 501 }, (_, i) => ({ kind: 'customer', id: `c${i}`, data: { id: `c${i}` } })))])).toBe(true);
    });
});
