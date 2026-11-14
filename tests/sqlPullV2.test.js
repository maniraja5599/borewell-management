// drillrig_pull_v2 (supabase/drillrig/0006_pull_with_server_time.sql) on real Postgres (PGlite),
// both on an old server (0001 only) and on the current one (0001 + 0003-0005).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL(`../supabase/drillrig/${f}`, import.meta.url), 'utf8');
const OWNER = '00000000-0000-4000-8000-0000000000c1';
const STRANGER = '00000000-0000-4000-8000-0000000000c2';

async function server(files) {
    const db = new PGlite();
    await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        insert into auth.users (id, email) values ('${OWNER}', 'o@x.com'), ('${STRANGER}', 's@x.com');
    `);
    for (const f of files) await db.exec(sql(f));
    await db.exec(sql('0006_pull_with_server_time.sql'));
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [OWNER]);
    const twoArgs = files.includes('0003_rigs_roles_subscription.sql');
    const me = (await db.query(twoArgs ? `select * from public.drillrig_my_company('Co', 'SM')` : `select * from public.drillrig_my_company('Co')`)).rows[0];
    return { db, company: me.company_id };
}

for (const [label, files] of [['old server (0001 + 0002, as live today)', ['0001_drillrig_sync.sql', '0002_soft_delete_and_size_limit.sql']], ['current server (0001 + 0003-0005)', ['0001_drillrig_sync.sql', '0003_rigs_roles_subscription.sql', '0004_activity_log.sql', '0005_pipe_stock.sql']]]) {
    describe(`drillrig_pull_v2 on ${label}`, () => {
        it('returns the same rows as drillrig_pull, plus the server time', async () => {
            const { db, company } = await server(files);
            const rows = [1, 2, 3].map((i) => ({ kind: 'customer', id: `c${i}`, data: { id: `c${i}`, name: `C ${i}` } }));
            await db.query(`select public.drillrig_push($1, $2::jsonb)`, [company, JSON.stringify(rows)]);
            const old = (await db.query(`select * from public.drillrig_pull($1, 0, 500)`, [company])).rows;
            const v2 = (await db.query(`select public.drillrig_pull_v2($1, 0, 500) as r`, [company])).rows[0].r;
            expect(Number.isFinite(Date.parse(v2.now))).toBe(true);
            expect(v2.rows.map((r) => [r.kind, r.id, Number(r.rev)])).toEqual(old.map((r) => [r.kind, r.id, Number(r.rev)]));
            expect(v2.rows[0].data).toEqual(old[0].data);
            const after = (await db.query(`select public.drillrig_pull_v2($1, $2, 500) as r`, [company, Number(old[1].rev)])).rows[0].r;
            expect(after.rows.map((r) => r.id)).toEqual(['c3']);
        }, 30000);

        it('someone outside the company gets nothing; anon cannot call it', async () => {
            const { db, company } = await server(files);
            await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [STRANGER]);
            await expect(db.query(`select public.drillrig_pull_v2($1, 0, 500)`, [company])).rejects.toThrow(/not a member/);
            const grants = (await db.query(`select has_function_privilege('anon', 'public.drillrig_pull_v2(uuid,bigint,integer)', 'execute') as anon,
                                                   has_function_privilege('authenticated', 'public.drillrig_pull_v2(uuid,bigint,integer)', 'execute') as auth`)).rows[0];
            expect(grants).toEqual({ anon: false, auth: true });
        }, 30000);
    });
}
