// Runs the real drillrig SQL migrations on Postgres (PGlite, in-process) and checks every
// access rule from docs/MULTI_RIG_ROLES_DESIGN.md. Supabase's auth schema is stubbed.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');

const OWNER = '00000000-0000-4000-8000-000000000001';
const DRIVER = '00000000-0000-4000-8000-000000000002';
const MANAGER = '00000000-0000-4000-8000-000000000003';
const STRANGER = '00000000-0000-4000-8000-000000000004';
const UNVERIFIED = '00000000-0000-4000-8000-000000000005';

let db;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
const one = async (q, params) => (await db.query(q, params)).rows[0];
const rows = async (q, params) => (await db.query(q, params)).rows;
const myCompany = (args = {}) => one(`select * from public.drillrig_my_company(p_name => $1, p_prefix => $2, p_company => $3)`,
    [args.name ?? null, args.prefix ?? null, args.company ?? null]);
const push = (company, list) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(list)]).then((x) => x.r);
const pull = (company, since = 0) => rows(`select * from public.drillrig_pull($1, $2, 1000)`, [company, since]);
const errorOf = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

let company;
let rig1;
let rig2;

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email, raw_user_meta_data) values
            ('${OWNER}', 'owner@x.com', '{"full_name":"Owner"}'),
            ('${DRIVER}', 'Driver@X.com', '{"full_name":"Driver Murugan"}'),
            ('${MANAGER}', 'manager@x.com', '{}'),
            ('${STRANGER}', 'stranger@x.com', '{}');
        insert into auth.users (id, email, email_confirmed_at) values ('${UNVERIFIED}', 'late@x.com', null);
    `);
    await db.exec(sql('0001_drillrig_sync.sql'));

    // An existing company on the OLD version: brand setting, two bills, a used counter.
    await as(OWNER);
    const old = await one(`select * from public.drillrig_my_company('Sri Murugan Borewells')`);
    company = old.company_id;
    await db.query(`select public.drillrig_push($1, $2::jsonb)`, [company, JSON.stringify([
        { kind: 'setting', id: 'brand', data: { companyName: 'Sri Murugan Borewells', billPrefix: 'sm' } },
        { kind: 'bill', id: 'old1', data: { id: 'old1', billNo: 'SM-101' } },
        { kind: 'customer', id: 'c1', data: { id: 'c1', name: 'Ravi' } }
    ])]);
    await db.query(`select public.drillrig_claim_number($1, 'INVOICE', 101)`, [company]);

    await db.exec(sql('0003_rigs_roles_subscription.sql'));
}, 60000);

describe('0003 migration on existing data', () => {
    it('creates "Rig 1" with the company\'s current bill prefix', async () => {
        await as(OWNER);
        const me = await myCompany();
        expect(me.company_id).toBe(company);
        expect(me.role).toBe('owner');
        expect(me.rigs).toHaveLength(1);
        expect(me.rigs[0]).toMatchObject({ name: 'Rig 1', bill_prefix: 'SM', active: true, is_default: true });
        rig1 = me.rigs[0].id;
    });

    it('puts old bills and counters on Rig 1 and keeps counting from the old number', async () => {
        const bill = await one(`select rig_id, data, created_by from drillrig.record where id = 'old1'`);
        expect(bill.rig_id).toBe(rig1);
        expect(bill.data.rigId).toBe(rig1);
        expect(bill.created_by).toBe(OWNER);
        await as(OWNER);
        const n = await one(`select public.drillrig_claim_number($1, 'INVOICE', 101) as n`, [company]); // old 3-arg call
        expect(n.n).toBe(102);
    });

    it('can be run twice without changing anything', async () => {
        await db.exec(sql('0003_rigs_roles_subscription.sql'));
        expect((await rows(`select id from drillrig.rig where company_id = $1`, [company]))).toHaveLength(1);
    });
});

describe('owner: rigs and invites', () => {
    it('adds a second rig with its own prefix and counter', async () => {
        await as(OWNER);
        const r = await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'sm2') as r`, [company]);
        expect(r.r).toMatchObject({ name: 'Rig 2', bill_prefix: 'SM2', active: true });
        rig2 = r.r.id;
        const n = await one(`select public.drillrig_claim_number($1, 'INVOICE', 101, $2) as n`, [company, rig2]);
        expect(n.n).toBe(101);
    });

    it('rejects a duplicate prefix', async () => {
        await as(OWNER);
        expect(await errorOf(() => db.query(`select public.drillrig_save_rig($1, null, 'Rig 3', 'SM')`, [company]))).toMatch(/already uses prefix/);
    });

    it('invites a driver (rig 1) and a manager (rig 1); non-owners cannot invite', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_invite($1, ' driver@x.com ', 'driver', array[$2::uuid])`, [company, rig1]);
        await db.query(`select public.drillrig_invite($1, 'manager@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
        await db.query(`select public.drillrig_invite($1, 'late@x.com', 'driver', array[$2::uuid])`, [company, rig1]);
        expect(await errorOf(() => db.query(`select public.drillrig_invite($1, 'x@x.com', 'driver', '{}')`, [company]))).toMatch(/at least one rig/);
        await as(STRANGER);
        expect(await errorOf(() => db.query(`select public.drillrig_invite($1, 'x@x.com', 'driver', array[$2::uuid])`, [company, rig1]))).toMatch(/only the owner/);
    });
});

describe('staff sign-in joins the company from the invite', () => {
    it('driver joins with role driver and sees only rig 1', async () => {
        await as(DRIVER);
        const me = await myCompany({ name: 'Should not be created' });
        expect(me.company_id).toBe(company);
        expect(me.role).toBe('driver');
        expect(me.rigs.map((r) => r.id)).toEqual([rig1]);
    });

    it('manager joins with role manager', async () => {
        await as(MANAGER);
        const me = await myCompany();
        expect(me).toMatchObject({ company_id: company, role: 'manager' });
    });

    it('an unverified email does not join; it gets its own company instead', async () => {
        await as(UNVERIFIED);
        const me = await myCompany();
        expect(me.company_id).not.toBe(company);
        expect(me.role).toBe('owner');
    });

    it('a stranger gets their own new company with Rig 1', async () => {
        await as(STRANGER);
        const me = await myCompany({ name: 'Other Co', prefix: 'oc' });
        expect(me.company_id).not.toBe(company);
        expect(me.rigs[0].bill_prefix).toBe('OC');
    });
});

describe('what each role can write', () => {
    it('owner writes bills on any rig', async () => {
        await as(OWNER);
        const r = await push(company, [
            { kind: 'bill', id: 'own1', data: { id: 'own1', rigId: rig1 } },
            { kind: 'bill', id: 'own2', data: { id: 'own2', rigId: rig2 } }
        ]);
        expect(r.rejected).toEqual([]);
    });

    it('driver: new bill on own rig ok; other rig, settings, deletes, others\' bills refused', async () => {
        await as(DRIVER);
        const r = await push(company, [
            { kind: 'bill', id: 'drv1', data: { id: 'drv1', rigId: rig1, total: 1 } },
            { kind: 'bill', id: 'drv2', data: { id: 'drv2', rigId: rig2 } },
            { kind: 'setting', id: 'rates', data: { baseDrillingRate: 1 } },
            { kind: 'bill', id: 'own1', data: { id: 'own1', rigId: rig1, hacked: true } },
            { kind: 'bill', id: 'drv1', data: {}, deleted: true },
            { kind: 'customer', id: 'c2', data: { id: 'c2', name: 'New customer' } },
            { kind: 'customer', id: 'c1', data: {}, deleted: true }
        ]);
        expect(r.rejected).toEqual([
            { kind: 'bill', id: 'drv2', reason: 'rig' },
            { kind: 'setting', id: 'rates', reason: 'role' },
            { kind: 'bill', id: 'own1', reason: 'not_yours' },
            { kind: 'bill', id: 'drv1', reason: 'role' },
            { kind: 'customer', id: 'c1', reason: 'role' }
        ]);
        const own1 = await one(`select data from drillrig.record where id = 'own1'`);
        expect(own1.data.hacked).toBeUndefined();
    });

    it('driver can update (record payment on) their own bill', async () => {
        await as(DRIVER);
        const r = await push(company, [{ kind: 'bill', id: 'drv1', data: { id: 'drv1', rigId: rig1, payments: [{ amount: 500 }] } }]);
        expect(r.rejected).toEqual([]);
    });

    it('a bill sent without rigId (old app version) goes to the first rig', async () => {
        await as(OWNER);
        await push(company, [{ kind: 'bill', id: 'legacy', data: { id: 'legacy' } }]);
        const b = await one(`select rig_id, data from drillrig.record where id = 'legacy'`);
        expect(b.rig_id).toBe(rig1);
        expect(b.data.rigId).toBe(rig1);
    });

    it('manager edits any rig-1 bill but cannot delete, change settings, or touch rig 2', async () => {
        await as(MANAGER);
        const r = await push(company, [
            { kind: 'bill', id: 'drv1', data: { id: 'drv1', rigId: rig1, note: 'checked' } },
            { kind: 'bill', id: 'own1', data: {}, deleted: true },
            { kind: 'bill', id: 'own2', data: { id: 'own2', rigId: rig2 } },
            { kind: 'setting', id: 'brand', data: {} }
        ]);
        expect(r.rejected.map((x) => `${x.id}:${x.reason}`)).toEqual(['own1:role', 'own2:rig', 'brand:role']);
    });

    it('nobody can move a bill into a rig they cannot use', async () => {
        await as(DRIVER);
        const r = await push(company, [{ kind: 'bill', id: 'drv1', data: { id: 'drv1', rigId: rig2 } }]);
        expect(r.rejected[0].reason).toBe('rig');
    });

    it('a stranger cannot read or write the company at all', async () => {
        await as(STRANGER);
        expect(await errorOf(() => push(company, []))).toMatch(/not a member/);
        expect(await errorOf(() => pull(company))).toMatch(/not a member/);
        expect(await errorOf(() => db.query(`select public.drillrig_claim_number($1, 'INVOICE', 1)`, [company]))).toMatch(/not a member/);
        expect(await errorOf(() => db.query(`select public.drillrig_team($1)`, [company]))).toMatch(/only the owner/);
    });
});

describe('what each role can read', () => {
    it('driver sees only bills they created, plus customers and settings', async () => {
        await as(DRIVER);
        const got = await pull(company);
        const bills = got.filter((r) => r.kind === 'bill').map((r) => r.id).sort();
        expect(bills).toEqual(['drv1']);
        expect(got.some((r) => r.kind === 'customer')).toBe(true);
        expect(got.some((r) => r.kind === 'setting' && r.id === 'brand')).toBe(true);
    });

    it('manager sees every rig-1 bill and no rig-2 bill', async () => {
        await as(MANAGER);
        const bills = (await pull(company)).filter((r) => r.kind === 'bill').map((r) => r.id).sort();
        expect(bills).toEqual(['drv1', 'legacy', 'old1', 'own1']);
    });

    it('owner sees everything', async () => {
        await as(OWNER);
        const bills = (await pull(company)).filter((r) => r.kind === 'bill').map((r) => r.id).sort();
        expect(bills).toEqual(['drv1', 'legacy', 'old1', 'own1', 'own2']);
    });
});

describe('soft delete', () => {
    it('owner delete keeps the data on the server but phones only get a tombstone', async () => {
        await as(OWNER);
        await push(company, [{ kind: 'bill', id: 'own2', data: {}, deleted: true }]);
        const stored = await one(`select deleted, data from drillrig.record where id = 'own2'`);
        expect(stored.deleted).toBe(true);
        expect(stored.data.id).toBe('own2');
        const pulled = (await pull(company)).find((r) => r.id === 'own2');
        expect(pulled.deleted).toBe(true);
        expect(pulled.data).toEqual({});
    });
});

describe('subscription per rig', () => {
    it('an expired rig refuses NEW bills but still accepts payments on existing ones', async () => {
        await db.query(`update drillrig.rig set trial_ends_at = now() - interval '1 day', paid_until = null where id = $1`, [rig1]);
        await as(OWNER);
        const me = await myCompany();
        expect(me.rigs.find((r) => r.id === rig1).active).toBe(false);
        const r = await push(company, [
            { kind: 'bill', id: 'new-after-expiry', data: { id: 'new-after-expiry', rigId: rig1 } },
            { kind: 'bill', id: 'own1', data: { id: 'own1', rigId: rig1, payments: [{ amount: 1000 }] } }
        ]);
        expect(r.rejected).toEqual([{ kind: 'bill', id: 'new-after-expiry', reason: 'subscription' }]);
        expect(await errorOf(() => db.query(`select public.drillrig_claim_number($1, 'INVOICE', 1, $2)`, [company, rig1]))).toMatch(/subscription/);
    });

    it('the admin function re-activates it; the app cannot call that function', async () => {
        const grant = await one(`select has_function_privilege('authenticated', 'public.drillrig_admin_set_paid_until(uuid, timestamptz)', 'execute') as ok`);
        expect(grant.ok).toBe(false);
        await db.query(`select public.drillrig_admin_set_paid_until($1, now() + interval '30 days')`, [rig1]);
        await as(OWNER);
        const r = await push(company, [{ kind: 'bill', id: 'new-after-expiry', data: { id: 'new-after-expiry', rigId: rig1 } }]);
        expect(r.rejected).toEqual([]);
    });
});

describe('team changes', () => {
    it('changing a member\'s rigs bumps access_rev and changes what they see', async () => {
        await as(DRIVER);
        const before = (await myCompany()).access_rev;
        await as(OWNER);
        await db.query(`select public.drillrig_set_member($1, $2, 'driver', array[$3::uuid])`, [company, DRIVER, rig2]);
        await as(DRIVER);
        const after = await myCompany();
        expect(Number(after.access_rev)).toBeGreaterThan(Number(before));
        expect(after.rigs.map((r) => r.id)).toEqual([rig2]);
        expect((await pull(company)).filter((r) => r.kind === 'bill')).toEqual([]); // drv1 is on rig 1
    });

    it('a removed member loses access immediately', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_set_member($1, $2, 'driver', '{}', false)`, [company, DRIVER]);
        await as(DRIVER);
        expect(await errorOf(() => pull(company))).toMatch(/not a member/);
    });

    it('the last owner cannot remove or demote themselves', async () => {
        await as(OWNER);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'manager', '{}')`, [company, OWNER]))).toMatch(/at least one owner/);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'owner', '{}', false)`, [company, OWNER]))).toMatch(/at least one owner/);
    });

    it('the last rig cannot be archived', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_archive_rig($1, $2, true)`, [company, rig2]);
        expect(await errorOf(() => db.query(`select public.drillrig_archive_rig($1, $2, true)`, [company, rig1]))).toMatch(/at least one rig/);
    });

    it('team view lists members, rigs and open invites for the owner', async () => {
        await as(OWNER);
        const t = (await one(`select public.drillrig_team($1) as t`, [company])).t;
        expect(t.rigs).toHaveLength(2);
        expect(t.members.map((m) => m.role).sort()).toEqual(['manager', 'owner']);
        expect(t.invites.map((i) => i.email)).toEqual(['late@x.com']);
    });

    it('a user who already has a company sees a pending invite and can accept it', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_invite($1, 'stranger@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
        await as(STRANGER);
        const me = await myCompany();
        expect(me.invites.map((i) => i.company_id)).toEqual([company]);
        const joined = await one(`select public.drillrig_accept_invite($1) as c`, [me.invites[0].id]);
        expect(joined.c).toBe(company);
        const now = await myCompany({ company });
        expect(now).toMatchObject({ company_id: company, role: 'manager' });
        expect(now.companies).toHaveLength(2);
    });
});
