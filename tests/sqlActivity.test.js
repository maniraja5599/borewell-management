// Activity log (supabase/drillrig/0004_activity_log.sql) on real Postgres (PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000a1';
const DRIVER = '00000000-0000-4000-8000-0000000000a2';
const MANAGER = '00000000-0000-4000-8000-0000000000a3';
const DRIVER2 = '00000000-0000-4000-8000-0000000000a4';

let db;
let company;
let rig1;
let rig2;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const log = (kind = null, record = null) => db.query(`select * from public.drillrig_activity($1, $2, $3)`, [company, kind, record]).then((r) => r.rows);
const bill = (id, rigId, total, payments = []) => ({ kind: 'bill', id, data: { id, billNo: `SM-${id}`, custName: 'Ravi', rigId, payments, snapshot: { docType: 'INVOICE', grandTotal: total } } });

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email, raw_user_meta_data) values
            ('${OWNER}', 'owner@x.com', '{"full_name":"Mani"}'),
            ('${DRIVER}', 'driver@x.com', '{"full_name":"Murugan"}'),
            ('${MANAGER}', 'manager@x.com', '{}'),
            ('${DRIVER2}', 'driver2@x.com', '{"full_name":"Kumar"}');
    `);
    await db.exec(sql('0001_drillrig_sync.sql'));
    await db.exec(sql('0003_rigs_roles_subscription.sql'));
    await db.exec(sql('0004_activity_log.sql'));

    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company('Co', 'SM')`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    for (const [email, role, rig] of [['driver@x.com', 'driver', rig1], ['manager@x.com', 'manager', rig1], ['driver2@x.com', 'driver', rig1]]) {
        await db.query(`select public.drillrig_invite($1, $2, $3, array[$4::uuid])`, [company, email, role, rig]);
    }
    for (const u of [DRIVER, MANAGER, DRIVER2]) { await as(u); await db.query(`select * from public.drillrig_my_company()`); }
}, 60000);

describe('activity log', () => {
    it('records who created, edited, took a payment on, deleted and restored a bill', async () => {
        await as(DRIVER);
        await push([bill('1', rig1, 50000)]);
        await push([bill('1', rig1, 52000)]);
        await push([bill('1', rig1, 52000, [{ amount: 10000 }])]);
        await push([bill('1', rig1, 52000, [{ amount: 10000 }])]); // no change: not logged
        await as(OWNER);
        await push([{ kind: 'bill', id: '1', data: {}, deleted: true }]);
        await push([bill('1', rig1, 52000, [{ amount: 10000 }])]);

        const rows = (await log('bill', '1')).reverse();
        expect(rows.map((r) => `${r.action}:${r.actor_name}`)).toEqual([
            'create:Murugan', 'update:Murugan', 'update:Murugan', 'delete:Mani', 'restore:Mani'
        ]);
        expect(rows[0].summary).toMatchObject({ billNo: 'SM-1', custName: 'Ravi', total: 50000, paid: 0 });
        expect(rows[1].summary).toMatchObject({ total: 52000, prevTotal: 50000 });
        expect(rows[1].summary.prevPaid).toBeUndefined();
        expect(rows[2].summary).toMatchObject({ paid: 10000, prevPaid: 0 });
        expect(rows[3].summary).toMatchObject({ billNo: 'SM-1', total: 52000 }); // deleted bill still identifiable
    });

    it('a refused upload leaves no log entry', async () => {
        await as(DRIVER);
        const r = await push([bill('2', rig2, 1000)]); // driver has no access to rig 2
        expect(r.rejected[0].reason).toBe('rig');
        await as(OWNER);
        expect(await log('bill', '2')).toEqual([]);
    });

    it('logs customers and settings changes too', async () => {
        await as(OWNER);
        await push([{ kind: 'customer', id: 'c1', data: { id: 'c1', name: 'Ravi', village: 'Salem' } }]);
        await push([{ kind: 'setting', id: 'rates', data: { baseDrillingRate: 95 } }]);
        const rows = await log();
        expect(rows.find((r) => r.kind === 'customer').summary).toEqual({ name: 'Ravi', place: 'Salem' });
        expect(rows.find((r) => r.kind === 'setting').summary).toEqual({ setting: 'rates' });
    });

    it('odd data never breaks a save (text numbers, missing snapshot, bad payments)', async () => {
        await as(OWNER);
        const r = await push([
            { kind: 'bill', id: '3', data: { id: '3', rigId: rig1, payments: 'oops', snapshot: { grandTotal: '1200.50' } } },
            { kind: 'bill', id: '4', data: { id: '4', rigId: rig1, payments: [{ amount: 'abc' }] } }
        ]);
        expect(r.rejected).toEqual([]);
        const rows = await log('bill', '3');
        expect(rows[0].summary).toMatchObject({ total: 1201, paid: 0 });
    });

    it('who can read what', async () => {
        await as(OWNER);
        await push([bill('9', rig2, 7000)]);           // owner's bill on rig 2

        await as(MANAGER);                             // manager: rig 1 bills, customers, settings — not rig 2
        const mgr = await log();
        expect(mgr.some((r) => r.record_id === '1')).toBe(true);
        expect(mgr.some((r) => r.record_id === '9')).toBe(false);
        expect(mgr.some((r) => r.kind === 'customer')).toBe(true);

        await as(DRIVER2);                             // another driver: not Murugan's bill
        expect(await log('bill', '1')).toEqual([]);

        await as(DRIVER);                              // Murugan: his own bill only
        const own = await log();
        expect(own.length).toBeGreaterThan(0);
        expect(own.every((r) => r.kind === 'bill' && r.record_id === '1')).toBe(true);
        expect(own.find((r) => r.action === 'create').actor_is_me).toBe(true);
    });

    it('a stranger reads nothing and the app cannot write the log directly', async () => {
        await as('00000000-0000-4000-8000-0000000000ff');
        await expect(log()).rejects.toThrow(/not a member/);
        const grant = await one(`select has_table_privilege('authenticated', 'drillrig.activity', 'insert') as ins,
                                        has_table_privilege('authenticated', 'drillrig.activity', 'select') as sel`);
        expect(grant).toEqual({ ins: false, sel: false });
    });

    it('can be run twice', async () => {
        await db.exec(sql('0004_activity_log.sql'));
        await as(OWNER);
        await push([bill('1', rig1, 60000, [{ amount: 10000 }])]);
        const rows = await log('bill', '1');
        expect(rows.filter((r) => r.action === 'update' && r.summary.total === 60000)).toHaveLength(1); // one trigger, not two
    });
});
