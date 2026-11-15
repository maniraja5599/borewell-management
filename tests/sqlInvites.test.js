// Migration 0011 on real Postgres (PGlite): invitations are accepted or rejected by the invited
// person, never joined automatically; the company's creator is protected from other owners.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');

const OWNER = '00000000-0000-4000-8000-0000000000a1';
const DRIVER = '00000000-0000-4000-8000-0000000000a2';
const OTHER_OWNER = '00000000-0000-4000-8000-0000000000a3';
const PARTNER = '00000000-0000-4000-8000-0000000000a4';

let db;
const as = (uid) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
const one = async (q, params) => (await db.query(q, params)).rows[0];
const errorOf = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const myCompany = (company = null) => one(`select * from public.drillrig_my_company(p_name => null, p_prefix => null, p_company => $1)`, [company]);
const inviteLink = (company, phone, role, rigs) => one(`select public.drillrig_invite_link($1, $2, 'Murugan', $3, $4::uuid[]) as r`, [company, phone, role, rigs]).then((x) => x.r);
const team = (company) => one(`select public.drillrig_team($1) as t`, [company]).then((x) => x.t);

let company;
let rig1;
let otherCompany;

beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}',
                                 created_at timestamptz default now(), last_sign_in_at timestamptz);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email, raw_user_meta_data) values
            ('${OWNER}', 'owner@x.com', '{"full_name":"Raja"}'),
            ('${DRIVER}', 'driver@x.com', '{"full_name":"Murugan"}'),
            ('${OTHER_OWNER}', 'other@x.com', '{"full_name":"Kumar"}'),
            ('${PARTNER}', 'partner@x.com', '{"full_name":"Partner"}');
    `);
    for (const f of ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql',
        '0005_pipe_stock.sql', '0006_pull_with_server_time.sql', '0007_admin_console.sql', '0008_admin_business_data.sql',
        '0009_admin_business_profile.sql', '0010_phone_and_invite_links.sql', '0011_invite_accept_reject.sql', '0012_phone_lookup.sql']) {
        await db.exec(sql(f));
    }
    await as(OWNER);
    const me = await myCompany();
    company = me.company_id;
    rig1 = me.rigs[0].id;
    await as(OTHER_OWNER);
    otherCompany = (await myCompany()).company_id;
}, 60000);

describe('0011 invitations need a yes', () => {
    it('a Gmail invite is NOT joined automatically at sign-in; it is listed instead', async () => {
        await as(OWNER);
        await db.query(`select public.drillrig_invite($1, 'driver@x.com', 'driver', $2::uuid[])`, [company, [rig1]]);
        await as(DRIVER);
        const me = await myCompany();
        expect(me.company_id).not.toBe(company); // their own new company, not the inviter's
        expect(me.invites).toHaveLength(1);
        const mine = (await one(`select public.drillrig_my_invites() as r`)).r;
        expect(mine).toHaveLength(1);
        expect(mine[0]).toMatchObject({ company_id: company, role: 'driver', invited_by: 'Raja', rig_names: ['Rig 1'], status: 'open' });
    });

    it('accepting the Gmail invite joins; a second accept says "already"', async () => {
        await as(DRIVER);
        const iv = (await one(`select public.drillrig_my_invites() as r`)).r[0];
        const joined = await one(`select public.drillrig_accept_invite($1) as id`, [iv.id]);
        expect(joined.id).toBe(company);
        const me = await myCompany(company);
        expect(me).toMatchObject({ company_id: company, role: 'driver' });
        expect(me.companies).toHaveLength(2); // own company kept
        expect((await one(`select public.drillrig_my_invites() as r`)).r).toHaveLength(0);
    });

    it('link invite: preview shows the card without joining; reject tells the owner', async () => {
        await as(OWNER);
        const link = await inviteLink(company, '9842712345', 'manager', [rig1]);
        await as(OTHER_OWNER);
        const card = (await one(`select public.drillrig_invite_preview($1) as c`, [link.code])).c;
        expect(card).toMatchObject({ company_name: expect.any(String), role: 'manager', status: 'open', already_member: false });
        expect((await myCompany()).company_id).toBe(otherCompany); // nothing joined
        await one(`select public.drillrig_decline_invite(p_code => $1)`, [link.code]);
        expect((await one(`select public.drillrig_invite_preview($1) as c`, [link.code])).c.status).toBe('declined');
        expect(await errorOf(() => one(`select public.drillrig_join_with_code($1)`, [link.code]))).toMatch(/cancelled or rejected/);
        await as(OWNER);
        const t = await team(company);
        expect(t.invites.find((i) => i.code === link.code)).toMatchObject({ declined: true });
        await db.query(`select public.drillrig_revoke_invite($1, $2)`, [company, t.invites.find((i) => i.code === link.code).id]);
        expect((await team(company)).invites.find((i) => i.code === link.code)).toBeUndefined(); // cleared from the list
    });

    it('an owner of another company accepts as manager: keeps their own company, opens the new one by choice', async () => {
        await as(OWNER);
        const link = await inviteLink(company, '9842700000', 'manager', [rig1]);
        await as(OTHER_OWNER);
        const res = (await one(`select public.drillrig_join_with_code($1) as r`, [link.code])).r;
        expect(res).toMatchObject({ company_id: company, role: 'manager' });
        expect((await myCompany(otherCompany))).toMatchObject({ company_id: otherCompany, role: 'owner' }); // still owner there
        expect((await myCompany(company))).toMatchObject({ company_id: company, role: 'manager' });
        expect(await errorOf(() => one(`select public.drillrig_join_with_code($1)`, [link.code]))).toMatch(/already used/);
    });

    it('a member cannot use another invite to the same company', async () => {
        await as(OWNER);
        const link = await inviteLink(company, '9842711111', 'owner', []);
        await as(DRIVER);
        expect((await one(`select public.drillrig_invite_preview($1) as c`, [link.code])).c.already_member).toBe(true);
        expect(await errorOf(() => one(`select public.drillrig_join_with_code($1)`, [link.code]))).toMatch(/already in this company/);
    });

    it('a partner (owner) cannot remove or demote the person who started the company', async () => {
        await as(OWNER);
        const link = await inviteLink(company, '9842722222', 'owner', []);
        await as(PARTNER);
        await one(`select public.drillrig_join_with_code($1)`, [link.code]);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'manager', $3::uuid[], true)`, [company, OWNER, [rig1]])))
            .toMatch(/creator cannot be removed/);
        expect(await errorOf(() => db.query(`select public.drillrig_set_member($1, $2, 'owner', '{}', false)`, [company, OWNER])))
            .toMatch(/creator cannot be removed/);
        // ...but the creator can change the partner
        await as(OWNER);
        await db.query(`select public.drillrig_set_member($1, $2, 'manager', $3::uuid[], true)`, [company, PARTNER, [rig1]]);
        const t = await team(company);
        expect(t.members[0]).toMatchObject({ user_id: OWNER, is_creator: true });
        expect(t.members.find((m) => m.user_id === PARTNER).role).toBe('manager');
    });

    it('0012: typing a mobile number shows who it is (owner only, name never email)', async () => {
        await as(DRIVER);
        await one(`select public.drillrig_set_my_phone('98765 43210')`);
        await as(OTHER_OWNER);
        await one(`select public.drillrig_set_my_phone('9123456789')`);
        await as(OWNER);
        const look = (p) => one(`select public.drillrig_phone_lookup($1, $2) as r`, [company, p]).then((x) => x.r);
        expect(await look('9876543210')).toMatchObject({ found: true, name: 'Murugan', member_role: 'driver' });
        const other = await look('+91 91234 56789');
        expect(other).toMatchObject({ found: true, name: 'Kumar', invited: false });
        expect(JSON.stringify(other)).not.toMatch(/@/);
        expect(await look('9000000001')).toMatchObject({ found: false, invited: false });
        expect(await look('12')).toMatchObject({ found: false });
        await inviteLink(company, '9000000001', 'driver', [rig1]);
        expect(await look('9000000001')).toMatchObject({ found: false, invited: true });
        await as(DRIVER); // not an owner of this company
        expect(await errorOf(() => look('9123456789'))).toBeTruthy();
    });
});
