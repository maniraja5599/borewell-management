// Migration 0016 on real Postgres (PGlite): money entries (kind 'cash') — expenses, diesel,
// cash in, hand-overs — with per-rig access, own-entries-only for managers, and "Received" only
// by the owner or office staff.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { indexLocal, planPush, planPull, applyToLocal, LIST_KINDS } from '../src/cloud/syncPlan.js';
import { cleanPulledRows, filterPushable } from '../src/cloud/sync.js';
import { makeEntry, markReceived, cashBook } from '../src/features/cash/cashMath.js';

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
const pull = async (kind = 'cash') => (await db.query(`select * from public.drillrig_pull($1, 0, 1000)`, [company])).rows.filter((r) => r.kind === kind);
const ids = async () => (await pull()).map((r) => r.id).sort();
const reasons = (r) => r.rejected.map((x) => `${x.id}:${x.reason}`);
const cash = (id, rigId, holderId, extra = {}) => ({
    kind: 'cash', id,
    data: { id, rigId, holderId, holderName: 'X', type: 'expense', category: 'food', amount: 250, date: '2026-11-22', paidBy: 'cash', ...extra }
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
        '0013_has_company.sql', '0014_office_workers_tools.sql', '0015_storage_limits.sql', '0016_expenses_cash.sql'];
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0016_expenses_cash.sql')); // safe to run again
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company(p_name => 'Co', p_prefix => 'SM', p_company => null)`);
    company = me.company_id;
    rig1 = me.rigs[0].id;
    rig2 = (await one(`select public.drillrig_save_rig($1, null, 'Rig 2', 'R2') as r`, [company])).r.id;
    await join(MANAGER, `select public.drillrig_invite($1, 'm@x.com', 'manager', array[$2::uuid])`, [company, rig1]);
    await join(MANAGER2, `select public.drillrig_invite($1, 'm2@x.com', 'manager', array[$2::uuid])`, [company, rig2]);
    await join(OFFICE, `select public.drillrig_invite($1, 'f@x.com', 'office', null, '{"expenses":true}'::jsonb)`, [company]);
    await join(OFFICE2, `select public.drillrig_invite($1, 'g@x.com', 'office', null, '{"reports":true}'::jsonb)`, [company]);
}, 90000);

describe('0016 cash entries', () => {
    it('capabilities list cash', async () => {
        await as(OWNER);
        expect((await one(`select public.drillrig_capabilities() as c`)).c).toContain('cash');
    });

    it('a manager adds own entries on own rig only', async () => {
        await as(MANAGER);
        const r = await push([
            cash('m-food', rig1, MANAGER),
            cash('m-diesel', rig1, MANAGER, { type: 'diesel', category: 'diesel', litres: 50, rate: 92.5, amount: 4625, bunk: 'IOC Mohanur' }),
            cash('m-other-rig', rig2, MANAGER),
            cash('m-office', null, MANAGER),
            cash('m-as-someone', rig1, MANAGER2)
        ]);
        expect(reasons(r).sort()).toEqual(['m-as-someone:not_yours', 'm-office:rig', 'm-other-rig:rig']);
        expect(await ids()).toEqual(['m-diesel', 'm-food']);
    });

    it('a manager never ticks "Received"; the owner or office does', async () => {
        await as(MANAGER);
        const ho = cash('m-hand', rig1, MANAGER, { type: 'handover', to: 'owner', amount: 5000 });
        expect(reasons(await push([ho]))).toEqual([]);
        expect(reasons(await push([{ ...ho, data: { ...ho.data, receivedAt: '2026-11-22T10:00:00Z' } }]))).toEqual(['m-hand:role']);
        await as(OFFICE);
        expect(reasons(await push([{ ...ho, data: { ...ho.data, receivedAt: '2026-11-22T10:00:00Z', receivedByName: 'Office' } }]))).toEqual([]);
        // Once received, the manager cannot change it (not even the amount)
        await as(MANAGER);
        expect(reasons(await push([{ ...ho, data: { ...ho.data, amount: 100, receivedAt: '2026-11-22T10:00:00Z' } }]))).toEqual(['m-hand:role']);
        await as(OWNER);
        const row = (await pull()).find((x) => x.id === 'm-hand');
        expect(row.data.receivedAt).toBe('2026-11-22T10:00:00Z');
        expect(Number(row.data.amount)).toBe(5000);
    });

    it("a manager cannot change someone else's entry on the same rig", async () => {
        await as(OWNER);
        expect(reasons(await push([cash('o-in', rig1, MANAGER, { type: 'in', amount: 10000, from: 'owner' })]))).toEqual([]);
        await as(MANAGER);
        expect(reasons(await push([cash('o-in', rig1, MANAGER, { type: 'in', amount: 99999, from: 'owner' })]))).toEqual(['o-in:not_yours']);
    });

    it('who sees what: managers their rigs, office with "expenses", not office with only "reports"', async () => {
        await as(MANAGER2);
        expect(reasons(await push([cash('m2-food', rig2, MANAGER2)]))).toEqual([]);
        expect(await ids()).toEqual(['m2-food']);
        await as(MANAGER);
        expect(await ids()).toEqual(['m-diesel', 'm-food', 'm-hand', 'o-in']);
        await as(OFFICE);
        expect(reasons(await push([cash('f-tea', null, OFFICE, { category: 'tea' })]))).toEqual([]);
        expect((await ids()).length).toBe(6);
        await as(OFFICE2);
        expect(await ids()).toEqual([]);
        expect(reasons(await push([cash('g-x', null, OFFICE2)]))).toEqual(['g-x:role']);
        await as(OWNER);
        expect((await ids()).length).toBe(6);
    });

    it('only the owner deletes; the activity log notes cash entries', async () => {
        await as(MANAGER);
        expect(reasons(await push([{ kind: 'cash', id: 'm-food', deleted: true }]))).toEqual(['m-food:role']);
        await as(OWNER);
        expect(reasons(await push([{ kind: 'cash', id: 'm-food', deleted: true }]))).toEqual([]);
        expect((await pull()).find((x) => x.id === 'm-food').deleted).toBe(true);
        const act = await one(`select summary as facts from drillrig.activity where kind = 'cash' and record_id = 'm-diesel' order by id limit 1`);
        expect(act.facts).toMatchObject({ type: 'diesel', amount: 4625 });
    });

    it('other kinds still work as before', async () => {
        await as(MANAGER);
        const r = await push([{ kind: 'tool', id: 't1', data: { id: 't1', rigId: rig1, tool: 'bit', code: 'KB-1' } }, { kind: 'cash', id: 'bad', data: 'x' }]);
        expect(reasons(r)).toEqual(['bad:invalid']);
    });
});

// Two phones through the real sync steps (plan → filter → server push → server pull → clean →
// plan → apply), as sync.js does them. This is what caught cash rows dropped on download (v2.8.0).
describe('cash entries travel between phones', () => {
    const emptyPhone = () => ({ ...Object.fromEntries(Object.values(LIST_KINDS).map((n) => [n, []])), settings: {} });
    const phone = (role) => ({ role, local: emptyPhone(), hashes: {}, rev: 0 });
    async function sync(ph, uid) {
        await as(uid);
        const rows = (await db.query(`select * from public.drillrig_pull($1, $2, 1000)`, [company, ph.rev])).rows;
        ph.rev = Math.max(ph.rev, ...rows.map((r) => Number(r.rev)));
        const pulled = cleanPulledRows(rows.map((r) => ({ ...r, rev: Number(r.rev) })));
        const plan = planPull(pulled, indexLocal(ph.local), ph.hashes);
        ph.local = applyToLocal(ph.local, plan.apply).local;
        Object.assign(ph.hashes, plan.synced);
        const out = filterPushable(planPush(indexLocal(ph.local), ph.hashes), ph.role, {}, ['stock', 'workers', 'tools', 'cash']);
        const res = out.length ? await push(out.map((r) => ({ kind: r.kind, id: r.id, data: r.data, deleted: r.deleted }))) : { rejected: [] };
        const refused = new Set(res.rejected.map((x) => `${x.kind}:${x.id}`));
        for (const r of out) if (!refused.has(r.key)) ph.hashes[r.key] = r.hash ?? null;
        return res.rejected;
    }

    it('manager expense and hand-over reach the owner; "Received" reaches the manager, even over an unsent edit', async () => {
        const mPhone = phone('manager');
        const oPhone = phone('owner');
        await sync(mPhone, MANAGER);
        await sync(oPhone, OWNER);
        const me = { id: MANAGER, name: 'Ravi' };
        const food = makeEntry({ type: 'expense', category: 'food', amount: 400, rigId: rig1 }, { me }).entry;
        const ho = makeEntry({ type: 'handover', amount: 2000, to: 'owner', rigId: rig1 }, { me }).entry;
        mPhone.local.cash.push(food, ho);
        expect(await sync(mPhone, MANAGER)).toEqual([]);

        await sync(oPhone, OWNER);
        const seen = oPhone.local.cash.filter((e) => e.holderId === MANAGER).map((e) => e.id);
        expect(seen).toEqual(expect.arrayContaining([food.id, ho.id]));

        // Owner ticks Received while the manager (offline) adds a note to the same hand-over.
        oPhone.local.cash = oPhone.local.cash.map((e) => (e.id === ho.id ? markReceived(e, { id: OWNER, name: 'Mani' }) : e));
        expect(await sync(oPhone, OWNER)).toEqual([]);
        mPhone.local.cash = mPhone.local.cash.map((e) => (e.id === ho.id ? { ...e, note: 'given at site' } : e));
        await sync(mPhone, MANAGER);
        const mine = mPhone.local.cash.find((e) => e.id === ho.id);
        expect(mine.receivedAt).toBeTruthy();
        // The manager's own cash: the hand-over now counts, on both phones.
        const before = cashBook(mPhone.local.cash, [], MANAGER);
        expect(before.handedOver).toBeGreaterThanOrEqual(2000);
        expect(cashBook(oPhone.local.cash, [], MANAGER).balance).toBe(before.balance);
    });
});
