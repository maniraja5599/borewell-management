// Admin console business data (supabase/drillrig/0008_admin_business_data.sql) on real Postgres (PGlite).
// The server's money figures must match the app's own report maths (reportMath.js) bill for bill.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { isInvoice, paidOf, totalOf, dueOf } from '../src/features/report/reportMath.js';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const ADMIN = '00000000-0000-4000-8000-0000000000b1';
const OWNER = '00000000-0000-4000-8000-0000000000b2';
const STRANGER = '00000000-0000-4000-8000-0000000000b3';

let db;
let company;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const rpc = async (name, args = '', params = []) => Object.values(await one(`select public.${name}(${args}) as r`, params))[0];

const pad = (n) => String(n).padStart(2, '0');
const istToday = () => { const d = new Date(Date.now() + 5.5 * 3600e3); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const monthStart = istToday().slice(0, 8) + '01';
const lastMonthDay = (() => { const [y, m] = monthStart.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 10)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-10`; })();

const customers = [
    { id: 'c1', name: 'Ravi Kumar', phone: '+91 98765 43210', village: 'Salem' },
    { id: 'c2', name: 'Lakshmi N', phone: '+91 94430 12345', village: 'Rasipuram' },
    { id: 'c3', name: 'Old Phone Only', phone: '9842011223', village: 'Namakkal' }
];
const bill = (id, no, day, total, extra = {}) => ({
    id, billNo: no, billDate: day, custName: extra.custName || 'Ravi Kumar', custPhone: extra.custPhone || '+91 98765 43210',
    custLocation: extra.place || 'Salem', customerId: extra.customerId,
    snapshot: { docType: extra.doc || 'INVOICE', grandTotal: total, totalDepth: extra.depth || 400, drillingType: 'new', advancePaidAmount: extra.advance },
    ...(extra.payments ? { payments: extra.payments } : {})
});
const bills = [
    bill('b1', 'SM-101', monthStart, 45000, { customerId: 'c1', payments: [{ amount: 45000, date: monthStart }] }),                       // paid
    bill('b2', 'SM-102', monthStart, 60500, { customerId: 'c2', custName: 'Lakshmi N', custPhone: '+91 94430 12345', place: 'Rasipuram',
        payments: [{ amount: 10000, date: lastMonthDay }, { amount: '5000', date: monthStart }] }),                                       // due 45,500
    bill('b3', 'SM-090', lastMonthDay, 30000, { custName: 'Old Phone Only', custPhone: '98420 11223', place: 'Namakkal', advance: 12000 }), // old bill: advance only, matched by phone
    bill('q1', 'Q-11', monthStart, 99999, { doc: 'QUOTATION' })                                                                          // quotation
];

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(),
            raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz default now());
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${ADMIN}', 'dev@x.com'), ('${OWNER}', 'owner@x.com'), ('${STRANGER}', 'stranger@x.com');
    `);
    for (const f of ['0001_drillrig_sync.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql', '0005_pipe_stock.sql',
        '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql']) await db.exec(sql(f));
    await db.exec(`insert into drillrig.admin (user_id) values ('${ADMIN}')`);
    await as(OWNER);
    const me = await one(`select * from public.drillrig_my_company('Sri Murugan Borewells', 'SM')`);
    company = me.company_id;
    const rows = [
        ...customers.map((c) => ({ kind: 'customer', id: c.id, data: c })),
        ...bills.map((b) => ({ kind: 'bill', id: b.id, data: b }))
    ];
    await db.query(`select public.drillrig_push($1, $2::jsonb)`, [company, JSON.stringify(rows)]);
}, 60000);

describe('admin business data', () => {
    it('refuses everyone who is not an admin', async () => {
        for (const uid of [OWNER, STRANGER]) {
            await as(uid);
            await expect(rpc('drillrig_admin_report', '$1', [company])).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_bills', '$1', [company])).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_bill', '$1, $2', [company, 'b1'])).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_customers', '$1', [company])).rejects.toThrow(/not an admin/);
            await expect(rpc('drillrig_admin_new_businesses')).rejects.toThrow(/not an admin/);
        }
    });

    it('report totals match the app\'s report maths exactly', async () => {
        await as(ADMIN);
        const r = await rpc('drillrig_admin_report', '$1', [company]);
        // The app's own push may normalise the bill JSON; compute expectations from what the server stores.
        const stored = (await db.query(`select data from drillrig.record where company_id = $1 and kind = 'bill' and not deleted`, [company])).rows.map((x) => x.data);
        const inv = stored.filter(isInvoice);
        expect(Number(r.all.bills)).toBe(inv.length);
        expect(Number(r.all.billed)).toBe(inv.reduce((s, b) => s + totalOf(b), 0));
        expect(Number(r.all.received)).toBe(inv.reduce((s, b) => s + paidOf(b), 0));
        expect(Number(r.all.due)).toBe(inv.reduce((s, b) => s + dueOf(b), 0));
        expect(Number(r.all.due)).toBe(45500 + 18000);
        expect(Number(r.quotes)).toBe(1);
        // this month: b1 + b2 billed; received = 45,000 + 5,000 (the ₹10,000 came last month)
        expect(Number(r.this_month.bills)).toBe(2);
        expect(Number(r.this_month.billed)).toBe(105500);
        expect(Number(r.this_month.received)).toBe(50000);
        expect(Number(r.last_month.billed)).toBe(30000);
        expect(Number(r.last_month.received)).toBe(10000 + 12000);
        expect(r.months).toHaveLength(12);
        expect(r.top_dues[0]).toMatchObject({ customer: 'Lakshmi N' });
        expect(Number(r.top_dues[0].due)).toBe(45500);
    });

    it('bills: newest first, filters, search, sums', async () => {
        await as(ADMIN);
        const all = await rpc('drillrig_admin_bills', '$1', [company]);
        expect(all.total).toBe(3);
        expect(all.rows.map((x) => x.bill_no)).toEqual(['SM-101', 'SM-102', 'SM-090'].sort((a, b) => (a === 'SM-090') - (b === 'SM-090')));
        const due = await rpc('drillrig_admin_bills', `$1, null, 'due'`, [company]);
        expect(due.rows.map((x) => x.bill_no).sort()).toEqual(['SM-090', 'SM-102']);
        expect(Number(due.sum.due)).toBe(63500);
        const paid = await rpc('drillrig_admin_bills', `$1, null, 'paid'`, [company]);
        expect(paid.rows.map((x) => x.bill_no)).toEqual(['SM-101']);
        const quotes = await rpc('drillrig_admin_bills', `$1, null, 'quote'`, [company]);
        expect(quotes.rows.map((x) => x.bill_no)).toEqual(['Q-11']);
        expect((await rpc('drillrig_admin_bills', `$1, 'rasi'`, [company])).rows.map((x) => x.bill_no)).toEqual(['SM-102']);
        expect((await rpc('drillrig_admin_bills', `$1, '94430'`, [company])).rows.map((x) => x.bill_no)).toEqual(['SM-102']);
        expect((await rpc('drillrig_admin_bills', `$1, 'sm-09'`, [company])).rows.map((x) => x.bill_no)).toEqual(['SM-090']);
        const b2 = all.rows.find((x) => x.bill_no === 'SM-102');
        expect(b2).toMatchObject({ customer: 'Lakshmi N', place: 'Rasipuram', payments: 2 });
        expect([Number(b2.total), Number(b2.paid), Number(b2.due)]).toEqual([60500, 15000, 45500]);
        expect(b2.made_by).toBe('owner@x.com');
        const full = await rpc('drillrig_admin_bill', '$1, $2', [company, 'b2']);
        expect(full.billNo).toBe('SM-102');
    });

    it('customers: bills matched by customerId, else phone; sorted by due', async () => {
        await as(ADMIN);
        const c = await rpc('drillrig_admin_customers', '$1', [company]);
        expect(c.total).toBe(3);
        const by = Object.fromEntries(c.rows.map((x) => [x.name, x]));
        expect(Number(by['Lakshmi N'].due)).toBe(45500);
        expect(Number(by['Old Phone Only'].bills)).toBe(1);   // matched by phone digits
        expect(Number(by['Old Phone Only'].due)).toBe(18000);
        expect(Number(by['Ravi Kumar'].due)).toBe(0);
        expect(c.rows[0].name).toBe('Lakshmi N');
        expect((await rpc('drillrig_admin_customers', `$1, 'namak'`, [company])).rows.map((x) => x.name)).toEqual(['Old Phone Only']);
    });

    it('every view is written to the admin log', async () => {
        await as(ADMIN);
        const log = (await db.query(`select action from drillrig.admin_log where company_id = $1 order by id`, [company])).rows.map((r) => r.action);
        expect(log).toEqual(expect.arrayContaining(['view_report', 'view_bills', 'view_bill', 'view_customers']));
    });

    it('lists businesses that joined recently, newest first', async () => {
        await as(ADMIN);
        const rows = await rpc('drillrig_admin_new_businesses', '30');
        expect(rows[0]).toMatchObject({ name: 'Sri Murugan Borewells', owner_email: 'owner@x.com' });
        expect(Number(rows[0].bills)).toBe(4);
    });
});
