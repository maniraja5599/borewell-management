// Migration 0020 on real Postgres (PGlite): the activity log keeps old → new values for money.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000a1';
const MANAGER = '00000000-0000-4000-8000-0000000000a2';

let db;
let company;
let rig1;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const log = async (kind) => (await db.query(`select * from public.drillrig_activity($1, $2, null, 50, null)`, [company, kind])).rows;

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}',
                                 created_at timestamptz default now(), last_sign_in_at timestamptz);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${OWNER}', 'o@x.com'), ('${MANAGER}', 'm@x.com');
    `);
    const files = ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql',
        '0013_has_company.sql', '0014_office_workers_tools.sql', '0015_storage_limits.sql', '0016_expenses_cash.sql', '0017_attendance.sql',
        '0018_vehicles_breakdowns_inventory.sql', '0019_approvals.sql', '0020_money_audit.sql'];
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0020_money_audit.sql')); // safe to run again
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    await db.query(`select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await as(MANAGER);
    const iv = (await one(`select public.drillrig_my_invites() as r`)).r.find((x) => x.company_id === company);
    await db.query(`select public.drillrig_accept_invite($1)`, [iv.id]);
}, 90000);

describe('0020 money audit', () => {
    it('a bill edit records which payment was added, removed or changed, and the discount', async () => {
        await as(MANAGER);
        const base = { id: 'b1', billNo: 'SM-1', billDate: '2026-11-26', custName: 'Murugan', rigId: rig1, snapshot: { docType: 'INVOICE', grandTotal: 50000, discountAmount: 0 } };
        await push([{ kind: 'bill', id: 'b1', data: { ...base, payments: [{ id: 'p1', amount: 20000, mode: 'Cash', date: '2026-11-26', by: { name: 'Ravi' } }, { id: 'p2', amount: 500, mode: 'UPI' }] } }]);
        await push([{ kind: 'bill', id: 'b1', data: { ...base, snapshot: { ...base.snapshot, discountAmount: 1000 },
            payments: [{ id: 'p1', amount: 15000, mode: 'UPI', date: '2026-11-26', by: { name: 'Ravi' } }, { id: 'p3', amount: 5000, mode: 'Cash', date: '2026-11-27', by: { name: 'Ravi' } }] } }]);
        await as(OWNER);
        const [edit, create] = await log('bill');
        expect(create.action).toBe('create');
        expect(edit.action).toBe('update');
        expect(edit.actor_name).toBeTruthy();
        const s = edit.summary;
        expect(s).toMatchObject({ prevPaid: 20500, paid: 20000 });
        expect(s.payAdded).toEqual([{ id: 'p3', amount: 5000, mode: 'Cash', date: '2026-11-27', by: 'Ravi' }]);
        expect(s.payRemoved).toEqual([{ id: 'p2', amount: 500, mode: 'UPI' }]);
        expect(s.payChanged).toEqual([{ id: 'p1', changes: [{ f: 'amount', from: 20000, to: 15000 }, { f: 'mode', from: 'Cash', to: 'UPI' }] }]);
        expect(s.changes).toEqual([{ f: 'snapshot.discountAmount', from: 0, to: 1000 }]);
    });

    it('an expense edit records old → new amount, category and approval', async () => {
        await as(MANAGER);
        const e = { id: 'cash_1', type: 'expense', amount: 900, categoryLabel: 'Food', date: '2026-11-26', paidBy: 'cash', rigId: rig1, holderId: MANAGER, approval: { status: 'pending' } };
        await push([{ kind: 'cash', id: 'cash_1', data: e }]);
        await push([{ kind: 'cash', id: 'cash_1', data: { ...e, amount: 1900, categoryLabel: 'Spares' } }]);
        await as(OWNER);
        await push([{ kind: 'cash', id: 'cash_1', data: { ...e, amount: 1900, categoryLabel: 'Spares', approval: { status: 'rejected' } } }]);
        const [rej, edit] = await log('cash');
        expect(edit.summary.changes).toEqual([{ f: 'amount', from: 900, to: 1900 }, { f: 'categoryLabel', from: 'Food', to: 'Spares' }]);
        expect(rej.summary.changes).toEqual([{ f: 'approval.status', from: 'pending', to: 'rejected' }]);
        expect(rej.actor_is_me).toBe(true);
    });

    it('a delete keeps what was deleted', async () => {
        await as(OWNER);
        await push([{ kind: 'cash', id: 'cash_1', deleted: true }]);
        const [del] = await log('cash');
        expect(del.action).toBe('delete');
        expect(del.summary).toMatchObject({ amount: 1900, type: 'expense' });
    });
});
