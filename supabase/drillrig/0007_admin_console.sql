-- 0007: developer admin console (admin.html). Run after 0003-0006.
--
-- Who is an admin: rows in drillrig.admin. Nobody is an admin until you add yourself, once, in
-- the Supabase SQL editor (replace the email):
--     insert into drillrig.admin (user_id) select id from auth.users where email = 'you@example.com';
--
-- What an admin can do (every call is checked on the server and written to drillrig.admin_log):
--   - see every business: owner, staff, rigs, subscription, counts, last activity, data size;
--   - see users (people who belong to a DrillRig business);
--   - set a rig's free / paid-until dates;
--   - pause a business (its cloud sync stops; billing on the phone keeps working) and resume it;
--   - export a business's cloud data (support, or a user's own request);
--   - delete a business and all its cloud data (a user's deletion request).
-- Bills and customers are only opened through "export", which is logged.

create table if not exists drillrig.admin (
    user_id   uuid primary key references auth.users(id) on delete cascade,
    added_at  timestamptz not null default now()
);

create table if not exists drillrig.admin_log (
    id          bigint generated always as identity primary key,
    admin_id    uuid,
    action      text not null,
    company_id  uuid,               -- no foreign key: the log outlives deleted businesses
    target      text,
    details     jsonb not null default '{}'::jsonb,
    at          timestamptz not null default now()
);
create index if not exists admin_log_at_idx on drillrig.admin_log(at desc);

alter table drillrig.company add column if not exists suspended_at timestamptz;
alter table drillrig.company add column if not exists suspended_reason text;

alter table drillrig.admin     enable row level security;
alter table drillrig.admin_log enable row level security;
revoke all on drillrig.admin, drillrig.admin_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A paused business: every member-facing function stops with a clear message.
-- (is_member and my_role are the first check in every sync / team function.)
-- ---------------------------------------------------------------------------
create or replace function drillrig.check_not_suspended(p_company uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_at timestamptz; v_reason text;
begin
    select c.suspended_at, c.suspended_reason into v_at, v_reason from drillrig.company c where c.id = p_company;
    if v_at is not null then
        raise exception 'DrillRig cloud is paused for this business: %', coalesce(nullif(v_reason, ''), 'please contact DrillRig support')
            using errcode = 'P0001', hint = 'DRILLRIG_SUSPENDED';
    end if;
end;
$$;

create or replace function drillrig.is_member(p_company uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
    if not exists (select 1 from drillrig.member m
                   where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active') then
        return false;
    end if;
    perform drillrig.check_not_suspended(p_company);
    return true;
end;
$$;

create or replace function drillrig.my_role(p_company uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
    select m.role into v_role from drillrig.member m
    where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active';
    if v_role is not null then perform drillrig.check_not_suspended(p_company); end if;
    return v_role;
end;
$$;

revoke all on function drillrig.check_not_suspended(uuid) from public, anon, authenticated;
revoke all on function drillrig.is_member(uuid) from public, anon, authenticated;
revoke all on function drillrig.my_role(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin helpers
-- ---------------------------------------------------------------------------
create or replace function drillrig.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from drillrig.admin a where a.user_id = auth.uid());
$$;

create or replace function drillrig.require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
    if not drillrig.is_admin() then
        raise exception 'not an admin' using errcode = '42501';
    end if;
end;
$$;

create or replace function drillrig.admin_note(p_action text, p_company uuid, p_target text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
    insert into drillrig.admin_log (admin_id, action, company_id, target, details)
    values (auth.uid(), p_action, p_company, p_target, coalesce(p_details, '{}'::jsonb));
$$;

revoke all on function drillrig.is_admin() from public, anon, authenticated;
revoke all on function drillrig.require_admin() from public, anon, authenticated;
revoke all on function drillrig.admin_note(text, uuid, text, jsonb) from public, anon, authenticated;

-- Rig state the way the app shows it.
create or replace function drillrig.rig_state(r drillrig.rig)
returns text language sql stable set search_path = '' as $$
    select case
        when r.archived_at is not null then 'archived'
        when r.paid_until is not null and r.paid_until > now() and r.paid_until >= r.trial_ends_at then 'paid'
        when now() < r.trial_ends_at then 'free'
        else 'ended' end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs (all return JSON; all refuse anyone who is not in drillrig.admin)
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_admin_whoami()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
    return jsonb_build_object(
        'admin', drillrig.is_admin(),
        'email', (select u.email from auth.users u where u.id = auth.uid()));
end;
$$;

create or replace function public.drillrig_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
    perform drillrig.require_admin();
    with last_change as (
        select r.company_id, max(r.updated_at) as at from drillrig.record r group by r.company_id
    )
    select jsonb_build_object(
        'businesses',        (select count(*) from drillrig.company),
        'new_7d',            (select count(*) from drillrig.company c where c.created_at > now() - interval '7 days'),
        'new_30d',           (select count(*) from drillrig.company c where c.created_at > now() - interval '30 days'),
        'active_7d',         (select count(*) from last_change l where l.at > now() - interval '7 days'),
        'active_30d',        (select count(*) from last_change l where l.at > now() - interval '30 days'),
        'paused',            (select count(*) from drillrig.company c where c.suspended_at is not null),
        'users',             (select count(distinct m.user_id) from drillrig.member m where m.status = 'active'),
        'staff',             (select count(*) from drillrig.member m where m.status = 'active' and m.role <> 'owner'),
        'bills',             (select count(*) from drillrig.record r where r.kind = 'bill' and not r.deleted),
        'customers',         (select count(*) from drillrig.record r where r.kind = 'customer' and not r.deleted),
        'changes_24h',       (select count(*) from drillrig.record r where r.updated_at > now() - interval '24 hours'),
        'rigs',              (select coalesce(jsonb_object_agg(s, n), '{}'::jsonb)
                                from (select drillrig.rig_state(g) as s, count(*) as n from drillrig.rig g group by 1) x),
        'cloud_bytes',       pg_total_relation_size('drillrig.record'),
        'database_bytes',    pg_database_size(current_database())
    ) into v;
    return v;
end;
$$;

create or replace function public.drillrig_admin_companies(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb; q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
    perform drillrig.require_admin();
    with stats as (
        select r.company_id,
               count(*) filter (where r.kind = 'bill' and not r.deleted) as bills,
               count(*) filter (where r.kind = 'customer' and not r.deleted) as customers,
               max(r.updated_at) as last_change,
               sum(pg_column_size(r.data)) as bytes
        from drillrig.record r group by r.company_id
    ), rows as (
        select c.id, c.name, c.created_at, c.suspended_at, c.suspended_reason,
               (select u.email from drillrig.member m join auth.users u on u.id = m.user_id
                 where m.company_id = c.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1) as owner_email,
               (select count(*) from drillrig.member m where m.company_id = c.id and m.status = 'active') as members,
               (select coalesce(jsonb_agg(drillrig.rig_state(g) order by g.created_at), '[]'::jsonb) from drillrig.rig g where g.company_id = c.id) as rigs,
               coalesce(s.bills, 0) as bills, coalesce(s.customers, 0) as customers, s.last_change, coalesce(s.bytes, 0) as bytes
        from drillrig.company c left join stats s on s.company_id = c.id
        where q is null
           or lower(c.name) like '%' || q || '%'
           or c.id::text = q
           or exists (select 1 from drillrig.member m join auth.users u on u.id = m.user_id
                      where m.company_id = c.id and lower(u.email) like '%' || q || '%')
    )
    select jsonb_build_object(
        'total', (select count(*) from rows),
        'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.last_change desc nulls last, x.created_at desc)
                          from (select * from rows order by last_change desc nulls last, created_at desc
                                limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) x), '[]'::jsonb)
    ) into v;
    return v;
end;
$$;

create or replace function public.drillrig_admin_company(p_company uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
    perform drillrig.require_admin();
    if not exists (select 1 from drillrig.company c where c.id = p_company) then
        raise exception 'no such business';
    end if;
    perform drillrig.admin_note('view_business', p_company, null);
    select jsonb_build_object(
        'company', (select to_jsonb(c) from drillrig.company c where c.id = p_company),
        'members', coalesce((select jsonb_agg(jsonb_build_object(
                        'user_id', m.user_id, 'email', u.email, 'name', coalesce(m.display_name, u.raw_user_meta_data->>'full_name'),
                        'role', m.role, 'status', m.status, 'joined', m.created_at, 'last_sign_in', u.last_sign_in_at,
                        'rigs', (select coalesce(jsonb_agg(mr.rig_id), '[]'::jsonb) from drillrig.member_rig mr
                                  where mr.company_id = m.company_id and mr.user_id = m.user_id)) order by m.created_at)
                    from drillrig.member m left join auth.users u on u.id = m.user_id where m.company_id = p_company), '[]'::jsonb),
        'rigs', coalesce((select jsonb_agg(jsonb_build_object(
                        'id', g.id, 'name', g.name, 'bill_prefix', g.bill_prefix, 'state', drillrig.rig_state(g),
                        'trial_ends_at', g.trial_ends_at, 'paid_until', g.paid_until, 'archived_at', g.archived_at, 'created_at', g.created_at,
                        'bills', (select count(*) from drillrig.record r where r.company_id = p_company and r.rig_id = g.id and r.kind = 'bill' and not r.deleted))
                        order by g.created_at)
                    from drillrig.rig g where g.company_id = p_company), '[]'::jsonb),
        'counts', coalesce((select jsonb_object_agg(k, n) from (
                        select r.kind || case when r.deleted then '_deleted' else '' end as k, count(*) as n
                        from drillrig.record r where r.company_id = p_company group by 1) x), '{}'::jsonb),
        'bytes', (select coalesce(sum(pg_column_size(r.data)), 0) from drillrig.record r where r.company_id = p_company),
        'last_change', (select max(r.updated_at) from drillrig.record r where r.company_id = p_company),
        'invites', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'created_at', i.created_at) order by i.created_at desc)
                    from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null), '[]'::jsonb),
        'activity', coalesce((select jsonb_agg(to_jsonb(a) order by a.at desc) from (
                        select a.at, a.kind, a.record_id, a.action, u.email as by, a.summary
                        from drillrig.activity a left join auth.users u on u.id = a.actor
                        where a.company_id = p_company order by a.at desc limit 30) a), '[]'::jsonb)
    ) into v;
    return v;
end;
$$;

create or replace function public.drillrig_admin_users(p_search text default null, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
    perform drillrig.require_admin();
    return coalesce((select jsonb_agg(x order by x->>'last_sign_in' desc nulls last) from (
        select jsonb_build_object(
            'user_id', u.id, 'email', u.email, 'name', u.raw_user_meta_data->>'full_name',
            'created_at', u.created_at, 'last_sign_in', u.last_sign_in_at,
            'businesses', (select jsonb_agg(jsonb_build_object('company_id', c.id, 'name', c.name, 'role', m.role, 'status', m.status,
                                                               'paused', c.suspended_at is not null) order by m.created_at)
                             from drillrig.member m join drillrig.company c on c.id = m.company_id where m.user_id = u.id)) as x
        from auth.users u
        where exists (select 1 from drillrig.member m where m.user_id = u.id)
          and (q is null or lower(u.email) like '%' || q || '%' or lower(coalesce(u.raw_user_meta_data->>'full_name', '')) like '%' || q || '%')
        order by u.last_sign_in_at desc nulls last
        limit least(greatest(coalesce(p_limit, 50), 1), 200)) s), '[]'::jsonb);
end;
$$;

create or replace function public.drillrig_admin_set_rig_dates(p_rig uuid, p_trial_ends_at timestamptz default null, p_paid_until timestamptz default null, p_clear_paid boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rig drillrig.rig; v_before jsonb;
begin
    perform drillrig.require_admin();
    select to_jsonb(g) into v_before from drillrig.rig g where g.id = p_rig;
    if v_before is null then raise exception 'no such rig'; end if;
    update drillrig.rig g set
        trial_ends_at = coalesce(p_trial_ends_at, g.trial_ends_at),
        paid_until = case when p_clear_paid then null else coalesce(p_paid_until, g.paid_until) end
    where g.id = p_rig returning * into v_rig;
    update drillrig.member m set access_rev = m.access_rev + 1 where m.company_id = v_rig.company_id; -- phones refresh access
    perform drillrig.admin_note('set_rig_dates', v_rig.company_id, p_rig::text, jsonb_build_object(
        'before', jsonb_build_object('trial_ends_at', v_before->'trial_ends_at', 'paid_until', v_before->'paid_until'),
        'after', jsonb_build_object('trial_ends_at', v_rig.trial_ends_at, 'paid_until', v_rig.paid_until)));
    return drillrig.rig_json(v_rig) || jsonb_build_object('state', drillrig.rig_state(v_rig));
end;
$$;

create or replace function public.drillrig_admin_pause(p_company uuid, p_pause boolean, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v drillrig.company;
begin
    perform drillrig.require_admin();
    update drillrig.company c set
        suspended_at = case when p_pause then coalesce(c.suspended_at, now()) else null end,
        suspended_reason = case when p_pause then nullif(trim(coalesce(p_reason, '')), '') else null end
    where c.id = p_company returning * into v;
    if v.id is null then raise exception 'no such business'; end if;
    perform drillrig.admin_note(case when p_pause then 'pause' else 'resume' end, p_company, null, jsonb_build_object('reason', p_reason));
    return to_jsonb(v);
end;
$$;

create or replace function public.drillrig_admin_export(p_company uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
    perform drillrig.require_admin();
    if not exists (select 1 from drillrig.company c where c.id = p_company) then raise exception 'no such business'; end if;
    perform drillrig.admin_note('export', p_company, null);
    select jsonb_build_object(
        'exported_at', now(),
        'company', (select to_jsonb(c) from drillrig.company c where c.id = p_company),
        'rigs', coalesce((select jsonb_agg(to_jsonb(g)) from drillrig.rig g where g.company_id = p_company), '[]'::jsonb),
        'records', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'id', r.id, 'deleted', r.deleted, 'updated_at', r.updated_at, 'data', r.data) order by r.kind, r.id)
                             from drillrig.record r where r.company_id = p_company), '[]'::jsonb)
    ) into v;
    return v;
end;
$$;

create or replace function public.drillrig_admin_delete_company(p_company uuid, p_confirm_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_name text; v_counts jsonb;
begin
    perform drillrig.require_admin();
    select c.name into v_name from drillrig.company c where c.id = p_company;
    if v_name is null then raise exception 'no such business'; end if;
    if p_confirm_name is distinct from v_name then
        raise exception 'type the business name exactly to delete it';
    end if;
    select jsonb_object_agg(kind, n) into v_counts from (select r.kind, count(*) as n from drillrig.record r where r.company_id = p_company group by 1) x;
    perform drillrig.admin_note('delete_business', p_company, v_name, jsonb_build_object('records', coalesce(v_counts, '{}'::jsonb)));
    delete from drillrig.activity a where a.company_id = p_company;
    delete from drillrig.record r where r.company_id = p_company;
    delete from drillrig.company c where c.id = p_company; -- members, rigs, invites, counters cascade
    return jsonb_build_object('deleted', v_name, 'records', coalesce(v_counts, '{}'::jsonb));
end;
$$;

create or replace function public.drillrig_admin_log(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
    perform drillrig.require_admin();
    return coalesce((select jsonb_agg(x order by x.at desc) from (
        select l.at, l.action, l.company_id, l.target, l.details, u.email as admin,
               (select c.name from drillrig.company c where c.id = l.company_id) as company
        from drillrig.admin_log l left join auth.users u on u.id = l.admin_id
        order by l.at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb);
end;
$$;

do $$
declare f text;
begin
    foreach f in array array[
        'drillrig_admin_whoami()', 'drillrig_admin_overview()', 'drillrig_admin_companies(text,integer,integer)',
        'drillrig_admin_company(uuid)', 'drillrig_admin_users(text,integer)',
        'drillrig_admin_set_rig_dates(uuid,timestamptz,timestamptz,boolean)', 'drillrig_admin_pause(uuid,boolean,text)',
        'drillrig_admin_export(uuid)', 'drillrig_admin_delete_company(uuid,text)', 'drillrig_admin_log(integer)']
    loop
        execute format('revoke all on function public.%s from public, anon', f);
        execute format('grant execute on function public.%s to authenticated', f);
    end loop;
end;
$$;
