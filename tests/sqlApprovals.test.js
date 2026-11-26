// Migration 0019 on real Postgres (PGlite): only the owner approves / rejects cash entries and
// bill payments; a manager may send pending (or unchanged) records only.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { decide } from '../src/features/approvals/approvalMath.js';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000f1';
const MANAGER = '00000000-0000-4000-8000-0000000000f2';

let db;
let company;
let rig1;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const push = (rows) => one(`select public.drillrig_push($1, $2::jsonb) as r`, [company, JSON.stringify(rows)]).then((x) => x.r);
const pull = async (kind) => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === kind && !r.deleted);
const reasons = (r) => r.rejected.map((x) => `${x.id}:${x.reason}`).sort();

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
        '0018_vehicles_breakdowns_inventory.sql', '0019_approvals.sql'];
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0019_approvals.sql')); // safe to run again
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    await db.query(`select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await as(MANAGER);
    const iv = (await one(`select public.drillrig_my_invites() as r`)).r.find((x) => x.company_id === company);
    await db.query(`select public.drillrig_accept_invite($1)`, [iv.id]);
}, 90000);

const expense = (extra = {}) => ({ id: 'cash_e1', type: 'expense', amount: 900, paidBy: 'cash', date: '2026-11-26', rigId: rig1, holderId: MANAGER, category: 'food', ...extra });
const bill = (payments) => ({ id: 'b1', billNo: 'SM-1', billDate: '2026-11-26', rigId: rig1, snapshot: { docType: 'INVOICE', grandTotal: 50000 }, payments });

describe('0019 approvals', () => {
    it('capabilities list approvals', async () => {
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toEqual(expect.arrayContaining(['inventory', 'approvals']));
    });

    it('cash: a manager sends pending, cannot approve; the owner approves; unchanged re-sends pass; edits must go pending', async () => {
        await as(MANAGER);
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: expense({ approval: { status: 'pending' } }) }]))).toEqual([]);
        const forged = decide(expense(), 'approved', { by: { id: MANAGER, name: 'M' } });
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: forged }]))).toEqual(['cash_e1:approval']);

        await as(OWNER);
        const ok = decide(expense(), 'approved', { by: { id: OWNER, name: 'Owner' } });
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: ok }]))).toEqual([]);

        await as(MANAGER);
        const stored = (await pull('cash')).find((r) => r.id === 'cash_e1').data;
        expect(stored.approval.status).toBe('approved');
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: stored }]))).toEqual([]); // unchanged
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: { ...stored, amount: 9000 } }]))).toEqual(['cash_e1:approval']);
        expect(reasons(await push([{ kind: 'cash', id: 'cash_e1', data: { ...stored, amount: 9000, approval: { status: 'pending' } } }]))).toEqual([]);
    });

    it('bill payments: a manager cannot add an approved / rejected payment; the owner can', async () => {
        await as(MANAGER);
        const p1 = { id: 'p1', amount: 20000, mode: 'Cash', date: '2026-11-26', by: { id: MANAGER, name: 'M' }, approval: { status: 'pending' } };
        expect(reasons(await push([{ kind: 'bill', id: 'b1', data: bill([p1]) }]))).toEqual([]);
        expect(reasons(await push([{ kind: 'bill', id: 'b1', data: bill([decide(p1, 'approved')]) }]))).toEqual(['b1:approval']);
        await as(OWNER);
        const approved = decide(p1, 'approved', { by: { id: OWNER, name: 'Owner' } });
        expect(reasons(await push([{ kind: 'bill', id: 'b1', data: bill([approved]) }]))).toEqual([]);
        await as(MANAGER);
        const stored = (await pull('bill')).find((r) => r.id === 'b1').data;
        // the manager adds a second payment and keeps the approved one exactly as stored: fine
        const p2 = { id: 'p2', amount: 5000, mode: 'UPI', date: '2026-11-26', by: { id: MANAGER, name: 'M' }, approval: { status: 'pending' } };
        expect(reasons(await push([{ kind: 'bill', id: 'b1', data: { ...stored, payments: [...stored.payments, p2] } }]))).toEqual([]);
        // ...but not with the approved payment's amount changed
        expect(reasons(await push([{ kind: 'bill', id: 'b1', data: { ...stored, payments: [{ ...stored.payments[0], amount: 1 }] } }]))).toEqual(['b1:approval']);
    });
});
