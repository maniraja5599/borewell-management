-- DrillRig cloud sync — 0014: Office staff role, workers (payroll list), bits & hammers.
-- Run after 0013. Touches only the `drillrig` schema and public.drillrig_* functions. Safe to run again.
--
-- Roles (people who sign in):
--   owner   — everything
--   manager — their rigs: bills, payments, customers, workers, bits/hammers, pipe stock
--   office  — NEW. All rigs, but only what the owner ticked (member.perms):
--               bills    make / edit bills and payments
--               reports  see bills and the business report
--               pnl      profit & loss (later phases)
--               team     add / change managers (never owners or office staff)
--               workers  workers list (and attendance later)
--               stock    bits, hammers, pipe stock, purchases
--               expenses expenses and cash (later phases)
--   driver  — RETIRED. Existing drivers become managers; old apps asking for 'driver' get 'manager'.
--
-- New record kinds:
--   worker — one person on the payroll (operator, driver, helper, ...). They never sign in.
--            data.rigId = current rig; no rig = office / not on a rig (owner and office only).
--   tool   — one bit or hammer bought for a rig (data.rigId), with price and status.
-- Deletes stay owner-only, like bills and stock.
begin;

-- ---------------------------------------------------------------------------
-- Roles and permissions
-- ---------------------------------------------------------------------------
alter table drillrig.member add column if not exists perms jsonb not null default '{}'::jsonb;
alter table drillrig.invite add column if not exists perms jsonb not null default '{}'::jsonb;

alter table drillrig.member drop constraint if exists member_role_check;
alter table drillrig.member add constraint member_role_check check (role in ('owner', 'manager', 'office', 'driver'));
alter table drillrig.invite drop constraint if exists invite_role_check;
alter table drillrig.invite add constraint invite_role_check check (role in ('owner', 'manager', 'office', 'driver'));

-- Drivers become managers (the owner decided: a driver who bills is a manager).
with moved as (
    update drillrig.member set role = 'manager' where role = 'driver' returning company_id, user_id
)
update drillrig.member m set access_rev = m.access_rev + 1
from moved where m.company_id = moved.company_id and m.user_id = moved.user_id;
update drillrig.invite set role = 'manager' where role = 'driver' and accepted_at is null;

-- 'driver' from an older app means manager; anything else unknown is refused.
create or replace function drillrig.norm_role(p_role text)
returns text language plpgsql immutable set search_path = '' as $$
begin
    if p_role = 'driver' then return 'manager'; end if;
    if p_role in ('owner', 'manager', 'office') then return p_role; end if;
    raise exception 'unknown role' using errcode = '22023';
end;
$$;

create or replace function drillrig.clean_perms(p_perms jsonb)
returns jsonb language sql immutable set search_path = '' as $$
    select coalesce(jsonb_object_agg(k, true), '{}'::jsonb)
    from unnest(array['bills', 'reports', 'pnl', 'team', 'workers', 'stock', 'expenses']) as k
    where jsonb_typeof(p_perms) = 'object' and coalesce(p_perms->>k, 'false') = 'true';
$$;

-- Does the caller have this permission? Owners: always. Office: only what was ticked.
create or replace function drillrig.perm(p_company uuid, p_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce((
        select m.role = 'owner' or (m.role = 'office' and coalesce(m.perms->>p_perm, 'false') = 'true')
        from drillrig.member m
        where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active'
    ), false);
$$;

-- Owners, and office staff with the "team" permission, manage the team.
create or replace function drillrig.require_team(p_company uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
    if not drillrig.perm(p_company, 'team') then
        raise exception 'only the owner can do this' using errcode = '42501';
    end if;
end;
$$;

-- Office staff (with "team") may only add or change managers, never owners or office staff.
create or replace function drillrig.check_team_role(p_company uuid, p_role text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
    if drillrig.my_role(p_company) <> 'owner' and p_role <> 'manager' then
        raise exception 'only the owner can add owners or office staff' using errcode = '42501';
    end if;
end;
$$;

-- May the caller work on this rig? Owners and office staff: any rig of the company. Others: assigned rigs.
create or replace function drillrig.can_rig(p_company uuid, p_rig uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select case drillrig.my_role(p_company)
        when 'owner' then exists (select 1 from drillrig.rig r where r.id = p_rig and r.company_id = p_company)
        when 'office' then exists (select 1 from drillrig.rig r where r.id = p_rig and r.company_id = p_company)
        when 'manager' then exists (select 1 from drillrig.member_rig mr where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        when 'driver' then exists (select 1 from drillrig.member_rig mr where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        else false
    end;
$$;

-- What this server supports.
create or replace function public.drillrig_capabilities()
returns jsonb language sql stable set search_path = '' as $$
    select '["rigs", "roles", "activity", "stock", "office", "workers", "tools"]'::jsonb;
$$;
revoke all on function public.drillrig_capabilities() from public, anon;
grant execute on function public.drillrig_capabilities() to authenticated;

-- ---------------------------------------------------------------------------
-- Records: new kinds
-- ---------------------------------------------------------------------------
alter table drillrig.record drop constraint if exists record_kind_check;
alter table drillrig.record add constraint record_kind_check check (kind in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool'));
alter table drillrig.activity drop constraint if exists activity_kind_check;
alter table drillrig.activity add constraint activity_kind_check check (kind in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool'));

create or replace function drillrig.activity_facts(p_kind text, p_data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
    select case p_kind
        when 'bill' then jsonb_strip_nulls(jsonb_build_object(
            'billNo', p_data->>'billNo',
            'custName', p_data->>'custName',
            'docType', p_data #>> '{snapshot,docType}',
            'total', round(coalesce(drillrig.num(p_data #> '{snapshot,grandTotal}'), 0)),
            'paid', round(coalesce((
                select sum(coalesce(drillrig.num(p->'amount'), 0))
                from jsonb_array_elements(case when jsonb_typeof(p_data->'payments') = 'array' then p_data->'payments' else '[]'::jsonb end) p
            ), 0))
        ))
        when 'customer' then jsonb_strip_nulls(jsonb_build_object('name', p_data->>'name', 'place', p_data->>'village'))
        when 'stock' then jsonb_strip_nulls(jsonb_build_object(
            'type', p_data->>'type',
            'casing1Ft', round(coalesce(drillrig.num(p_data->'casing1Ft'), 0)),
            'casing2Ft', round(coalesce(drillrig.num(p_data->'casing2Ft'), 0)),
            'date', p_data->>'date'
        ))
        when 'worker' then jsonb_strip_nulls(jsonb_build_object(
            'name', left(p_data->>'name', 80), 'code', left(p_data->>'code', 20),
            'type', left(p_data->>'type', 30), 'status', left(p_data->>'status', 20)
        ))
        when 'tool' then jsonb_strip_nulls(jsonb_build_object(
            'tool', left(p_data->>'tool', 10), 'size', left(p_data->>'size', 10), 'code', left(p_data->>'code', 40),
            'brand', left(p_data->>'brand', 60), 'status', left(p_data->>'status', 20),
            'price', round(coalesce(drillrig.num(p_data->'price'), 0))
        ))
        else '{}'::jsonb
    end;
$$;

create or replace function public.drillrig_push(p_company uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_role text := drillrig.my_role(p_company);
    v_max bigint := 0;
    v_rejected jsonb := '[]'::jsonb;
    v_row jsonb;
    v_kind text;
    v_id text;
    v_deleted boolean;
    v_data jsonb;
    v_existing drillrig.record;
    v_rig uuid;
    v_rev bigint;
    v_reason text;
begin
    if v_role is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
        raise exception 'p_rows must be an array of at most 500 rows';
    end if;

    for v_row in select * from jsonb_array_elements(p_rows) loop
        v_kind := v_row->>'kind';
        v_id := v_row->>'id';
        v_deleted := coalesce((v_row->>'deleted')::boolean, false);
        v_data := coalesce(v_row->'data', '{}'::jsonb);
        v_reason := null;
        v_rig := null;

        if v_kind not in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool') or v_id is null or length(v_id) not between 1 and 120
           or jsonb_typeof(v_data) not in ('object', 'array') then
            v_reason := 'invalid';
        elsif pg_column_size(v_data) > 2097152 then
            v_reason := 'too_large';
        end if;

        if v_reason is null then
            select * into v_existing from drillrig.record r
            where r.company_id = p_company and r.kind = v_kind and r.id = v_id
            for update;

            if v_kind = 'setting' then
                if v_role <> 'owner' then v_reason := 'role'; end if;
            elsif v_kind = 'customer' then
                if v_deleted and v_role <> 'owner' then v_reason := 'role'; end if;
            elsif v_kind in ('stock', 'tool') then
                v_rig := coalesce(drillrig.as_uuid(v_data->>'rigId'), v_existing.rig_id, drillrig.default_rig(p_company));
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and not drillrig.perm(p_company, 'stock')) then
                    v_reason := 'role';
                elsif v_deleted then
                    v_rig := coalesce(v_existing.rig_id, v_rig);
                elsif not drillrig.can_rig(p_company, v_rig) then
                    v_reason := 'rig';
                elsif v_existing.id is not null and v_existing.rig_id is distinct from v_rig
                      and not drillrig.can_rig(p_company, v_existing.rig_id) then
                    v_reason := 'rig';
                end if;
                if v_reason is null and not v_deleted then
                    v_data := v_data || jsonb_build_object('rigId', v_rig::text);
                end if;
            elsif v_kind = 'worker' then
                -- No rig = office / not on a rig: only owners and office staff.
                v_rig := case when v_deleted then v_existing.rig_id else drillrig.as_uuid(v_data->>'rigId') end;
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and not drillrig.perm(p_company, 'workers')) then
                    v_reason := 'role';
                elsif v_deleted then
                    null;
                elsif v_rig is null and v_role = 'manager' then
                    v_reason := 'rig';
                elsif v_rig is not null and not drillrig.can_rig(p_company, v_rig) then
                    v_reason := 'rig';
                elsif v_existing.id is not null and v_role = 'manager'
                      and (v_existing.rig_id is null or not drillrig.can_rig(p_company, v_existing.rig_id)) then
                    v_reason := 'rig';
                end if;
            else -- bill
                v_rig := coalesce(drillrig.as_uuid(v_data->>'rigId'), v_existing.rig_id, drillrig.default_rig(p_company));
                if v_role = 'office' and not drillrig.perm(p_company, 'bills') then
                    v_reason := 'role';
                elsif v_deleted then
                    if v_role <> 'owner' then v_reason := 'role'; end if;
                    v_rig := coalesce(v_existing.rig_id, v_rig);
                elsif not drillrig.can_rig(p_company, v_rig) then
                    v_reason := 'rig';
                elsif v_existing.id is not null and v_existing.rig_id is distinct from v_rig
                      and not drillrig.can_rig(p_company, v_existing.rig_id) then
                    v_reason := 'rig';
                elsif v_role = 'driver' and v_existing.id is not null and v_existing.created_by is distinct from v_uid then
                    v_reason := 'not_yours';
                elsif (v_existing.id is null or v_existing.deleted) and not drillrig.rig_active(v_rig) then
                    v_reason := 'subscription';
                end if;
                if v_reason is null and not v_deleted then
                    v_data := v_data || jsonb_build_object('rigId', v_rig::text);
                end if;
            end if;
        end if;

        if v_reason is not null then
            v_rejected := v_rejected || jsonb_build_array(jsonb_build_object('kind', v_kind, 'id', v_id, 'reason', v_reason));
            continue;
        end if;

        insert into drillrig.record as r (company_id, kind, id, data, deleted, rev, updated_at, updated_by, rig_id, created_by)
        values (p_company, v_kind, v_id, v_data, v_deleted, nextval('drillrig.rev_seq'), now(), v_uid, v_rig, v_uid)
        on conflict (company_id, kind, id) do update
            set data = case when excluded.deleted then r.data else excluded.data end,
                deleted = excluded.deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by,
                -- a worker can move to "no rig" (office); other kinds keep their rig on delete
                rig_id = case when r.kind = 'worker' and not excluded.deleted then excluded.rig_id
                              else coalesce(excluded.rig_id, r.rig_id) end
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    return jsonb_build_object('rev', v_max, 'rejected', v_rejected);
end;
$$;

-- Which records may this person see? customer + setting: everyone. Everything else is per rig
-- (managers) or per permission (office). Kinds added later stay owner-only until listed here.
create or replace function drillrig.can_see(p_company uuid, p_role text, p_kind text, p_rig uuid, p_created_by uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select case
        when p_kind in ('customer', 'setting') then true
        when p_role = 'owner' then true
        when p_role = 'office' then case p_kind
            when 'bill' then drillrig.perm(p_company, 'bills') or drillrig.perm(p_company, 'reports') or drillrig.perm(p_company, 'pnl')
            when 'stock' then drillrig.perm(p_company, 'stock') or drillrig.perm(p_company, 'pnl')
            when 'tool' then drillrig.perm(p_company, 'stock') or drillrig.perm(p_company, 'pnl')
            when 'worker' then drillrig.perm(p_company, 'workers') or drillrig.perm(p_company, 'pnl')
            else false end
        when p_role = 'manager' then p_kind in ('bill', 'stock', 'tool', 'worker') and p_rig is not null and exists (
            select 1 from drillrig.member_rig mr
            where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        when p_role = 'driver' then p_kind = 'bill' and p_created_by = auth.uid() and exists (
            select 1 from drillrig.member_rig mr
            where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        else false
    end;
$$;

create or replace function public.drillrig_pull(p_company uuid, p_since bigint default 0, p_limit integer default 500)
returns table (kind text, id text, data jsonb, deleted boolean, rev bigint, updated_at timestamptz, updated_by uuid, rig_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
    v_role text := drillrig.my_role(p_company);
begin
    if v_role is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    return query
    select r.kind, r.id,
           case when r.deleted then '{}'::jsonb else r.data end,
           r.deleted, r.rev, r.updated_at, r.updated_by, r.rig_id
    from drillrig.record r
    where r.company_id = p_company and r.rev > coalesce(p_since, 0)
      and drillrig.can_see(p_company, v_role, r.kind, r.rig_id, r.created_by)
    order by r.rev
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

create or replace function public.drillrig_activity(
    p_company uuid, p_kind text default null, p_record text default null,
    p_limit integer default 50, p_before bigint default null)
returns table (id bigint, kind text, record_id text, rig_id uuid, action text, at timestamptz,
               actor_name text, actor_is_me boolean, summary jsonb)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_role text := drillrig.my_role(p_company);
begin
    if v_role is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    return query
    select a.id, a.kind, a.record_id, a.rig_id, a.action, a.at,
           coalesce(nullif(m.display_name, ''), m.email, 'Someone'),
           a.actor = v_uid,
           a.summary
    from drillrig.activity a
    left join drillrig.member m on m.company_id = a.company_id and m.user_id = a.actor
    where a.company_id = p_company
      and (p_kind is null or a.kind = p_kind)
      and (p_record is null or a.record_id = p_record)
      and (p_before is null or a.id < p_before)
      and drillrig.can_see(p_company, v_role, a.kind, a.rig_id,
            case when v_role = 'driver' then (select r.created_by from drillrig.record r
                 where r.company_id = p_company and r.kind = a.kind and r.id = a.record_id) end)
    order by a.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- ---------------------------------------------------------------------------
-- Team: office role, permissions, office staff with "team" may manage managers
-- ---------------------------------------------------------------------------
create or replace function drillrig.join_from_invite(p_invite drillrig.invite, p_uid uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text := case when p_invite.role = 'driver' then 'manager' else p_invite.role end;
begin
    insert into drillrig.member (company_id, user_id, role, status, email, display_name, perms)
    values (p_invite.company_id, p_uid, v_role, 'active', p_email,
            (select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') from auth.users u where u.id = p_uid),
            case when v_role = 'office' then drillrig.clean_perms(p_invite.perms) else '{}'::jsonb end)
    on conflict (company_id, user_id) do update
        set role = excluded.role, status = 'active', email = excluded.email, perms = excluded.perms;

    delete from drillrig.member_rig where company_id = p_invite.company_id and user_id = p_uid;
    if v_role = 'manager' then
        insert into drillrig.member_rig (company_id, user_id, rig_id)
        select p_invite.company_id, p_uid, r.id
        from drillrig.rig r
        where r.company_id = p_invite.company_id and r.id = any(p_invite.rig_ids) and r.archived_at is null
        on conflict do nothing;
    end if;
    perform drillrig.bump_access(p_invite.company_id, p_uid);

    update drillrig.invite set accepted_at = now(), accepted_by = p_uid where id = p_invite.id;
end;
$$;

create or replace function public.drillrig_team(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_creator uuid := (select c.created_by from drillrig.company c where c.id = p_company);
begin
    perform drillrig.require_team(p_company);
    return jsonb_build_object(
        'my_role', drillrig.my_role(p_company),
        'rigs', (select coalesce(jsonb_agg(drillrig.rig_json(r) || jsonb_build_object('is_default', r.id = drillrig.default_rig(p_company))
                                           order by r.created_at, r.id), '[]'::jsonb)
                 from drillrig.rig r where r.company_id = p_company),
        'members', (select coalesce(jsonb_agg(jsonb_build_object(
                        'user_id', m.user_id, 'email', m.email, 'name', m.display_name, 'role', m.role,
                        'perms', m.perms,
                        'status', m.status, 'is_me', m.user_id = auth.uid(), 'is_creator', m.user_id = v_creator,
                        'phone', (select p.phone from drillrig.profile p where p.user_id = m.user_id),
                        'rig_ids', (select coalesce(jsonb_agg(mr.rig_id), '[]'::jsonb) from drillrig.member_rig mr
                                    where mr.company_id = m.company_id and mr.user_id = m.user_id)
                    ) order by (m.user_id = v_creator) desc, (m.role = 'owner') desc, m.created_at), '[]'::jsonb)
                    from drillrig.member m where m.company_id = p_company and m.status = 'active'),
        'invites', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', i.id, 'email', i.email, 'phone', i.phone, 'name', i.name, 'code', i.code,
                        'expires_at', i.expires_at,
                        'expired', i.declined_at is null and i.expires_at is not null and i.expires_at <= now(),
                        'declined', i.declined_at is not null, 'declined_at', i.declined_at,
                        'role', i.role, 'perms', i.perms, 'rig_ids', to_jsonb(i.rig_ids), 'created_at', i.created_at
                    ) order by i.created_at desc), '[]'::jsonb)
                    from drillrig.invite i where i.company_id = p_company and i.accepted_at is null
                      and (i.revoked_at is null or (i.declined_at is not null and i.declined_at > now() - interval '14 days')))
    );
end;
$$;

-- p_perms added (office staff); a new signature, so the old one is dropped first.
drop function if exists public.drillrig_invite(uuid, text, text, uuid[]);
create or replace function public.drillrig_invite(p_company uuid, p_email text, p_role text, p_rig_ids uuid[], p_perms jsonb default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_role text := drillrig.norm_role(p_role);
    v_rigs uuid[];
    v_id uuid;
begin
    perform drillrig.require_team(p_company);
    perform drillrig.check_team_role(p_company, v_role);
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
        raise exception 'enter a valid email address' using errcode = '22023';
    end if;
    select coalesce(array_agg(r.id), '{}') into v_rigs
    from drillrig.rig r where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'));
    if v_role = 'manager' and cardinality(v_rigs) = 0 then
        raise exception 'choose at least one rig' using errcode = '22023';
    end if;
    if exists (select 1 from drillrig.member m where m.company_id = p_company and m.status = 'active' and lower(m.email) = v_email) then
        raise exception '% is already in your team', v_email using errcode = '23505';
    end if;
    if (select count(*) from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null) >= 100 then
        raise exception 'too many open invites' using errcode = '54000';
    end if;

    update drillrig.invite set revoked_at = now()
    where company_id = p_company and email = v_email and accepted_at is null and revoked_at is null;
    insert into drillrig.invite (company_id, email, role, rig_ids, invited_by, perms)
    values (p_company, v_email, v_role, case when v_role = 'manager' then v_rigs else '{}' end, auth.uid(),
            case when v_role = 'office' then drillrig.clean_perms(p_perms) else '{}'::jsonb end)
    returning id into v_id;
    return v_id;
end;
$$;

drop function if exists public.drillrig_invite_link(uuid, text, text, text, uuid[]);
create or replace function public.drillrig_invite_link(p_company uuid, p_phone text, p_name text, p_role text, p_rig_ids uuid[], p_perms jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v_phone text := drillrig.clean_phone(p_phone);
    v_name text := nullif(left(trim(coalesce(p_name, '')), 80), '');
    v_role text := drillrig.norm_role(p_role);
    v_rigs uuid[];
    v_code text;
    v_row drillrig.invite;
begin
    perform drillrig.require_team(p_company);
    perform drillrig.check_team_role(p_company, v_role);
    if v_phone is null then raise exception 'enter their mobile number' using errcode = '22023'; end if;
    select coalesce(array_agg(r.id), '{}') into v_rigs
    from drillrig.rig r where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'));
    if v_role = 'manager' and cardinality(v_rigs) = 0 then raise exception 'choose at least one rig' using errcode = '22023'; end if;
    if (select count(*) from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null) >= 100 then
        raise exception 'too many open invites' using errcode = '54000';
    end if;

    update drillrig.invite set revoked_at = now()
    where company_id = p_company and phone = v_phone and accepted_at is null and revoked_at is null;
    -- 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L): about 2^49 codes.
    loop
        select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 31), 1), '')
        into v_code
        from (select decode(md5(gen_random_uuid()::text || clock_timestamp()::text), 'hex') as b) x, generate_series(0, 9) as i;
        exit when not exists (select 1 from drillrig.invite i where i.code = v_code);
    end loop;
    insert into drillrig.invite (company_id, email, phone, name, code, expires_at, role, rig_ids, invited_by, perms)
    values (p_company, null, v_phone, v_name, v_code, now() + interval '7 days', v_role,
            case when v_role = 'manager' then v_rigs else '{}' end, auth.uid(),
            case when v_role = 'office' then drillrig.clean_perms(p_perms) else '{}'::jsonb end)
    returning * into v_row;
    return jsonb_build_object('id', v_row.id, 'code', v_row.code, 'phone', v_row.phone, 'name', v_row.name, 'expires_at', v_row.expires_at);
end;
$$;

create or replace function public.drillrig_revoke_invite(p_company uuid, p_invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    perform drillrig.require_team(p_company);
    if drillrig.my_role(p_company) <> 'owner' and exists (
        select 1 from drillrig.invite i where i.id = p_invite and i.company_id = p_company and i.role <> 'manager') then
        raise exception 'only the owner can do this' using errcode = '42501';
    end if;
    update drillrig.invite set revoked_at = coalesce(revoked_at, now()),
                               declined_at = case when declined_at is not null then declined_at - interval '15 days' else null end
    where id = p_invite and company_id = p_company and accepted_at is null;
end;
$$;

drop function if exists public.drillrig_set_member(uuid, uuid, text, uuid[], boolean);
create or replace function public.drillrig_set_member(p_company uuid, p_user uuid, p_role text, p_rig_ids uuid[],
                                                      p_active boolean default true, p_perms jsonb default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_owners integer;
    v_old drillrig.member;
    v_role text := drillrig.norm_role(p_role);
begin
    perform drillrig.require_team(p_company);
    select * into v_old from drillrig.member m
    where m.company_id = p_company and m.user_id = p_user and m.status = 'active';
    if not found then raise exception 'member not found' using errcode = '02000'; end if;

    -- Office staff manage managers only (not owners, not other office staff, not themselves).
    if drillrig.my_role(p_company) <> 'owner' then
        if v_old.role <> 'manager' or v_role <> 'manager' then
            raise exception 'only the owner can do this' using errcode = '42501';
        end if;
    end if;
    -- The person who created the company keeps full control: a partner added as Owner
    -- cannot remove or demote them. They can still change their own access themselves.
    if p_user is distinct from auth.uid()
       and p_user = (select c.created_by from drillrig.company c where c.id = p_company)
       and (not p_active or v_role <> 'owner') then
        raise exception 'The company''s creator cannot be removed or changed by another owner' using errcode = '42501';
    end if;

    select count(*) into v_owners from drillrig.member m
    where m.company_id = p_company and m.status = 'active' and m.role = 'owner';
    if v_old.role = 'owner' and v_owners <= 1 and (not p_active or v_role <> 'owner') then
        raise exception 'the company must keep at least one owner' using errcode = '22023';
    end if;

    update drillrig.member
       set role = v_role,
           status = case when p_active then 'active' else 'removed' end,
           perms = case when v_role = 'office' then drillrig.clean_perms(coalesce(p_perms, v_old.perms)) else '{}'::jsonb end
     where company_id = p_company and user_id = p_user;

    delete from drillrig.member_rig where company_id = p_company and user_id = p_user;
    if p_active and v_role = 'manager' then
        insert into drillrig.member_rig (company_id, user_id, rig_id)
        select p_company, p_user, r.id from drillrig.rig r
        where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'))
        on conflict do nothing;
    end if;
    perform drillrig.bump_access(p_company, p_user);
end;
$$;

create or replace function public.drillrig_phone_lookup(p_company uuid, p_phone text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_phone text;
    v_uid uuid;
    v_name text;
    v_member drillrig.member;
begin
    perform drillrig.require_team(p_company);
    begin
        v_phone := drillrig.clean_phone(p_phone);
    exception when others then
        return jsonb_build_object('phone', null, 'found', false);
    end;
    if v_phone is null then return jsonb_build_object('phone', null, 'found', false); end if;

    select p.user_id into v_uid from drillrig.profile p where p.phone = v_phone order by p.updated_at desc limit 1;
    if v_uid is not null then
        select nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
          into v_name from auth.users u where u.id = v_uid;
        select * into v_member from drillrig.member m where m.company_id = p_company and m.user_id = v_uid and m.status = 'active';
    end if;

    return jsonb_build_object(
        'phone', v_phone,
        'found', v_uid is not null,
        'name', coalesce(v_member.display_name, v_name),
        'member_role', v_member.role,
        'is_me', v_uid is not null and v_uid = auth.uid(),
        'invited', exists (select 1 from drillrig.invite i where i.company_id = p_company and i.phone = v_phone
                           and i.accepted_at is null and i.revoked_at is null and i.declined_at is null
                           and (i.expires_at is null or i.expires_at > now()))
    );
end;
$$;

-- The app reads its own permissions here (drillrig_my_company's columns stay as they are).
create or replace function public.drillrig_my_perms(p_company uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
    select coalesce((select case when m.role = 'owner' then
                                 '{"bills":true,"reports":true,"pnl":true,"team":true,"workers":true,"stock":true,"expenses":true}'::jsonb
                            else m.perms end
                     from drillrig.member m
                     where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active'), '{}'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function drillrig.norm_role(text) from public, anon, authenticated;
revoke all on function drillrig.clean_perms(jsonb) from public, anon, authenticated;
revoke all on function drillrig.perm(uuid, text) from public, anon, authenticated;
revoke all on function drillrig.require_team(uuid) from public, anon, authenticated;
revoke all on function drillrig.check_team_role(uuid, text) from public, anon, authenticated;
revoke all on function drillrig.can_see(uuid, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.drillrig_invite(uuid, text, text, uuid[], jsonb) from public, anon;
revoke all on function public.drillrig_invite_link(uuid, text, text, text, uuid[], jsonb) from public, anon;
revoke all on function public.drillrig_set_member(uuid, uuid, text, uuid[], boolean, jsonb) from public, anon;
revoke all on function public.drillrig_my_perms(uuid) from public, anon;
grant execute on function public.drillrig_invite(uuid, text, text, uuid[], jsonb) to authenticated;
grant execute on function public.drillrig_invite_link(uuid, text, text, text, uuid[], jsonb) to authenticated;
grant execute on function public.drillrig_set_member(uuid, uuid, text, uuid[], boolean, jsonb) to authenticated;
grant execute on function public.drillrig_my_perms(uuid) to authenticated;
grant execute on function public.drillrig_team(uuid) to authenticated;
grant execute on function public.drillrig_revoke_invite(uuid, uuid) to authenticated;
grant execute on function public.drillrig_phone_lookup(uuid, text) to authenticated;
grant execute on function public.drillrig_push(uuid, jsonb) to authenticated;
grant execute on function public.drillrig_pull(uuid, bigint, integer) to authenticated;
grant execute on function public.drillrig_activity(uuid, text, text, integer, bigint) to authenticated;

commit;
