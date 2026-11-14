-- 0006: download without re-reading the last 50 changes every minute.
--
-- Phones pull "everything after rev N". Because a slow save can commit after a faster one that
-- got a higher rev, the app used to re-read the last 50 revs on every sync (once a minute per
-- open phone). With few companies those 50 revs are mostly the company's own recent records, so
-- every phone downloaded the same ~15-50 records every minute even when nothing changed.
--
-- drillrig_pull_v2 returns the same rows as drillrig_pull plus the server's clock. The app then
-- only moves its "seen up to" mark past rows older than two minutes (no save can still be in
-- progress that long), so only the last two minutes of changes are ever read twice.
--
-- Safe to run before or after 0003-0005: it wraps whichever drillrig_pull is installed and
-- returns its rows as JSON, so it does not depend on that function's columns.
-- Apps without this function keep working (they fall back to drillrig_pull).

create or replace function public.drillrig_pull_v2(p_company uuid, p_since bigint default 0, p_limit integer default 500)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
    select jsonb_build_object(
        'now', now(),
        'rows', coalesce((select jsonb_agg(to_jsonb(p) order by p.rev)
                          from public.drillrig_pull(p_company, p_since, p_limit) p), '[]'::jsonb)
    );
$$;

revoke all on function public.drillrig_pull_v2(uuid, bigint, integer) from public, anon;
grant execute on function public.drillrig_pull_v2(uuid, bigint, integer) to authenticated;
