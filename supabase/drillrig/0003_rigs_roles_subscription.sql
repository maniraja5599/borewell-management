-- DrillRig cloud sync — 0003: rigs, staff roles, per-rig subscription.
-- Design: docs/MULTI_RIG_ROLES_DESIGN.md
--
-- Includes 0002 (soft delete + 2 MB record limit), so 0002 does not need to be run first.
-- Touches only the `drillrig` schema and the public.drillrig_* functions — never the Flutter
-- app's tables. Safe to run more than once.
--
-- Roles:  owner   — everything, all rigs, team, rigs, subscription
--         manager — bills of assigned rigs; add/edit customers; no deletes, no settings
--         driver  — new bills on assigned rigs; sees and edits only bills they created
-- Every rule below is enforced here; the app only hides buttons.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists drillrig.rig (
    id             uuid primary key default gen_random_uuid(),
    company_id     uuid not null references drillrig.company(id) on delete cascade,
    name           text not null check (length(trim(name)) between 1 and 60),
    bill_prefix    text not null check (bill_prefix ~ '^[A-Z0-9]{1,6}$'),
    trial_ends_at  timestamptz not null default now() + interval '30 days',
    paid_until     timestamptz,
    archived_at    timestamptz,
    created_at     timestamptz not null default now(),
    created_by     uuid references auth.users(id)
);
create index if not exists rig_company_idx on drillrig.rig(company_id);
create unique index if not exists rig_prefix_uq on drillrig.rig(company_id, bill_prefix) where archived_at is null;

alter table drillrig.member add column if not exists access_rev bigint not null default 1;
alter table drillrig.member add column if not exists display_name text;

-- Which rigs a manager / driver may work on. Owners see every rig and have no rows here.
create table if not exists drillrig.member_rig (
    company_id  uuid not null,
    user_id     uuid not null,
    rig_id      uuid not null references drillrig.rig(id) on delete cascade,
    primary key (company_id, user_id, rig_id),
    foreign key (company_id, user_id) references drillrig.member(company_id, user_id) on delete cascade
);

create table if not exists drillrig.invite (
    id           uuid primary key default gen_random_uuid(),
    company_id   uuid not null references drillrig.company(id) on delete cascade,
    email        text not null check (email = lower(trim(email)) and email like '%_@_%' and length(email) <= 254),
    role         text not null check (role in ('owner', 'manager', 'driver')),
    rig_ids      uuid[] not null default '{}',
    invited_by   uuid references auth.users(id),
    created_at   timestamptz not null default now(),
    accepted_at  timestamptz,
    accepted_by  uuid references auth.users(id),
    revoked_at   timestamptz
);
create unique index if not exists invite_open_uq on drillrig.invite(company_id, email)
    where accepted_at is null and revoked_at is null;
create index if not exists invite_email_idx on drillrig.invite(email)
    where accepted_at is null and revoked_at is null;

alter table drillrig.record add column if not exists rig_id uuid references drillrig.rig(id);
alter table drillrig.record add column if not exists created_by uuid references auth.users(id);
create index if not exists record_rig_idx on drillrig.record(company_id, rig_id);

alter table drillrig.doc_counter add column if not exists rig_id uuid references drillrig.rig(id) on delete cascade;

alter table drillrig.rig        enable row level security;
alter table drillrig.member_rig enable row level security;
alter table drillrig.invite     enable row level security;
revoke all on all tables in schema drillrig from public, anon, authenticated;
revoke all on all sequences in schema drillrig from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: every existing company gets "Rig 1", carrying on its current bill prefix,
-- and all its bills, counters and records are attached to it.
-- ---------------------------------------------------------------------------
insert into drillrig.rig (company_id, name, bill_prefix, created_by)
select c.id,
       'Rig 1',
       coalesce(nullif(left(regexp_replace(upper(coalesce(s.data->>'billPrefix', '')), '[^A-Z0-9]', '', 'g'), 6), ''), 'AB'),
       c.created_by
from drillrig.company c
left join drillrig.record s on s.company_id = c.id and s.kind = 'setting' and s.id = 'brand' and not s.deleted
where not exists (select 1 from drillrig.rig r where r.company_id = c.id);

update drillrig.record r
set rig_id = (select g.id from drillrig.rig g where g.company_id = r.company_id order by g.created_at, g.id limit 1)
where r.kind = 'bill' and r.rig_id is null;

update drillrig.record r
set data = jsonb_set(r.data, '{rigId}', to_jsonb(r.rig_id::text))
where r.kind = 'bill' and not r.deleted and r.rig_id is not null
  and coalesce(r.data->>'rigId', '') is distinct from r.rig_id::text;

update drillrig.record set created_by = updated_by where created_by is null;

update drillrig.doc_counter d
set rig_id = (select g.id from drillrig.rig g where g.company_id = d.company_id order by g.created_at, g.id limit 1)
where d.rig_id is null;

alter table drillrig.doc_counter alter column rig_id set not null;
alter table drillrig.doc_counter drop constraint if exists doc_counter_pkey;
alter table drillrig.doc_counter add constraint doc_counter_pkey primary key (company_id, rig_id, doc_type);

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable from the app)
-- ---------------------------------------------------------------------------
create or replace function drillrig.my_role(p_company uuid)
returns text language sql stable security definer set search_path = '' as $$
    select m.role from drillrig.member m
    where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active';
$$;

-- May the caller work on this rig? Owners: any rig of the company. Others: assigned rigs.
create or replace function drillrig.can_rig(p_company uuid, p_rig uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select case drillrig.my_role(p_company)
        when 'owner' then exists (select 1 from drillrig.rig r where r.id = p_rig and r.company_id = p_company)
        when 'manager' then exists (select 1 from drillrig.member_rig mr where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        when 'driver' then exists (select 1 from drillrig.member_rig mr where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        else false
    end;
$$;

-- Trial or paid, and not archived.
create or replace function drillrig.rig_active(p_rig uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from drillrig.rig r
        where r.id = p_rig and r.archived_at is null
          and now() < greatest(r.trial_ends_at, coalesce(r.paid_until, '-infinity'::timestamptz))
    );
$$;

create or replace function drillrig.default_rig(p_company uuid)
returns uuid language sql stable security definer set search_path = '' as $$
    select r.id from drillrig.rig r
    where r.company_id = p_company
    order by (r.archived_at is not null), r.created_at, r.id
    limit 1;
$$;

create or replace function drillrig.as_uuid(p text)
returns uuid language sql immutable set search_path = '' as $$
    select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

create or replace function drillrig.rig_json(r drillrig.rig)
returns jsonb language sql stable set search_path = '' as $$
    select jsonb_build_object(
        'id', r.id, 'name', r.name, 'bill_prefix', r.bill_prefix,
        'trial_ends_at', r.trial_ends_at, 'paid_until', r.paid_until,
        'archived', r.archived_at is not null,
        'active', r.archived_at is null and now() < greatest(r.trial_ends_at, coalesce(r.paid_until, '-infinity'::timestamptz))
    );
$$;

-- Rigs the caller can see, as JSON.
create or replace function drillrig.my_rigs(p_company uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
    select coalesce(jsonb_agg(drillrig.rig_json(r) || jsonb_build_object('is_default', r.id = drillrig.default_rig(p_company))
                              order by r.created_at, r.id), '[]'::jsonb)
    from drillrig.rig r
    where r.company_id = p_company and drillrig.can_rig(p_company, r.id);
$$;

create or replace function drillrig.require_owner(p_company uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
    if drillrig.my_role(p_company) is distinct from 'owner' then
        raise exception 'only the owner can do this' using errcode = '42501';
    end if;
end;
$$;

create or replace function drillrig.bump_access(p_company uuid, p_user uuid)
returns void language sql security definer set search_path = '' as $$
    update drillrig.member set access_rev = access_rev + 1
    where company_id = p_company and user_id = p_user;
$$;

-- Add (or update) a membership from an invite.
create or replace function drillrig.join_from_invite(p_invite drillrig.invite, p_uid uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
    insert into drillrig.member (company_id, user_id, role, status, email, display_name)
    values (p_invite.company_id, p_uid, p_invite.role, 'active', p_email,
            (select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') from auth.users u where u.id = p_uid))
    on conflict (company_id, user_id) do update
        set role = excluded.role, status = 'active', email = excluded.email;

    delete from drillrig.member_rig where company_id = p_invite.company_id and user_id = p_uid;
    if p_invite.role <> 'owner' then
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

revoke all on function drillrig.my_role(uuid) from public, anon, authenticated;
revoke all on function drillrig.can_rig(uuid, uuid) from public, anon, authenticated;
revoke all on function drillrig.rig_active(uuid) from public, anon, authenticated;
revoke all on function drillrig.default_rig(uuid) from public, anon, authenticated;
revoke all on function drillrig.as_uuid(text) from public, anon, authenticated;
revoke all on function drillrig.rig_json(drillrig.rig) from public, anon, authenticated;
revoke all on function drillrig.my_rigs(uuid) from public, anon, authenticated;
revoke all on function drillrig.require_owner(uuid) from public, anon, authenticated;
revoke all on function drillrig.bump_access(uuid, uuid) from public, anon, authenticated;
revoke all on function drillrig.join_from_invite(drillrig.invite, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Sign-in: the caller's company, role, rigs. Joins from an invite or creates a company.
-- ---------------------------------------------------------------------------
drop function if exists public.drillrig_my_company(text);
drop function if exists public.drillrig_my_company(text, text, uuid);
create function public.drillrig_my_company(p_name text default null, p_prefix text default null, p_company uuid default null)
returns table (company_id uuid, company_name text, role text, access_rev bigint, rigs jsonb, companies jsonb, invites jsonb)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_company uuid;
    v_invite drillrig.invite;
    v_prefix text;
begin
    if v_uid is null then
        raise exception 'not signed in' using errcode = '28000';
    end if;
    select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;

    -- No company yet: an invite for this verified email wins over creating a new company.
    if not exists (select 1 from drillrig.member m where m.user_id = v_uid and m.status = 'active') and v_email is not null then
        select * into v_invite from drillrig.invite i
        where i.email = v_email and i.accepted_at is null and i.revoked_at is null
        order by i.created_at desc limit 1;
        if found then
            perform drillrig.join_from_invite(v_invite, v_uid, v_email);
        end if;
    end if;

    if p_company is not null then
        select m.company_id into v_company from drillrig.member m
        where m.user_id = v_uid and m.company_id = p_company and m.status = 'active';
    end if;
    if v_company is null then
        select m.company_id into v_company from drillrig.member m
        where m.user_id = v_uid and m.status = 'active'
        order by m.created_at limit 1;
    end if;

    if v_company is null then
        insert into drillrig.company (name, created_by)
        values (coalesce(nullif(trim(p_name), ''), 'My Borewell Company'), v_uid)
        returning id into v_company;
        insert into drillrig.member (company_id, user_id, role, email, display_name)
        values (v_company, v_uid, 'owner', v_email,
                (select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') from auth.users u where u.id = v_uid));
    end if;

    -- Every company has at least one rig.
    if not exists (select 1 from drillrig.rig r where r.company_id = v_company) then
        v_prefix := coalesce(nullif(left(regexp_replace(upper(coalesce(p_prefix, '')), '[^A-Z0-9]', '', 'g'), 6), ''), 'AB');
        insert into drillrig.rig (company_id, name, bill_prefix, created_by) values (v_company, 'Rig 1', v_prefix, v_uid);
    end if;

    return query
    select c.id, c.name, m.role, m.access_rev,
           drillrig.my_rigs(c.id),
           (select coalesce(jsonb_agg(jsonb_build_object('company_id', c2.id, 'name', c2.name, 'role', m2.role) order by m2.created_at), '[]'::jsonb)
              from drillrig.member m2 join drillrig.company c2 on c2.id = m2.company_id
             where m2.user_id = v_uid and m2.status = 'active'),
           (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'company_id', i.company_id, 'company_name', c3.name, 'role', i.role) order by i.created_at), '[]'::jsonb)
              from drillrig.invite i join drillrig.company c3 on c3.id = i.company_id
             where i.email = v_email and i.accepted_at is null and i.revoked_at is null
               and not exists (select 1 from drillrig.member m3 where m3.company_id = i.company_id and m3.user_id = v_uid and m3.status = 'active'))
    from drillrig.company c
    join drillrig.member m on m.company_id = c.id and m.user_id = v_uid
    where c.id = v_company;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Upload. Rows the caller may not write are skipped and reported, never half-applied.
--    Returns {"rev": highest rev written, "rejected": [{kind, id, reason}]}.
--    reason: role | rig | not_yours | subscription | invalid
-- ---------------------------------------------------------------------------
drop function if exists public.drillrig_push(uuid, jsonb);
create function public.drillrig_push(p_company uuid, p_rows jsonb)
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

        if v_kind not in ('customer', 'bill', 'setting') or v_id is null or length(v_id) not between 1 and 120
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
            else -- bill
                v_rig := coalesce(drillrig.as_uuid(v_data->>'rigId'), v_existing.rig_id, drillrig.default_rig(p_company));
                if v_deleted then
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
            set data = case when excluded.deleted then r.data else excluded.data end,  -- soft delete keeps the data
                deleted = excluded.deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by,
                rig_id = coalesce(excluded.rig_id, r.rig_id)
                -- created_by is never changed
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    return jsonb_build_object('rev', v_max, 'rejected', v_rejected);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Download what the caller may see, changed after p_since.
-- ---------------------------------------------------------------------------
drop function if exists public.drillrig_pull(uuid, bigint, integer);
create function public.drillrig_pull(p_company uuid, p_since bigint default 0, p_limit integer default 500)
returns table (kind text, id text, data jsonb, deleted boolean, rev bigint, updated_at timestamptz, updated_by uuid, rig_id uuid)
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
    select r.kind, r.id,
           case when r.deleted then '{}'::jsonb else r.data end,   -- deleted data stays on the server only
           r.deleted, r.rev, r.updated_at, r.updated_by, r.rig_id
    from drillrig.record r
    where r.company_id = p_company and r.rev > coalesce(p_since, 0)
      and (
            r.kind <> 'bill'
         or v_role = 'owner'
         or (exists (select 1 from drillrig.member_rig mr
                     where mr.company_id = p_company and mr.user_id = v_uid and mr.rig_id = r.rig_id)
             and (v_role = 'manager' or r.created_by = v_uid))
      )
    order by r.rev
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Next bill / quotation number for a rig. p_rig null = the company's first rig
--    (phones on the previous app version call it without p_rig).
-- ---------------------------------------------------------------------------
drop function if exists public.drillrig_claim_number(uuid, text, integer);
drop function if exists public.drillrig_claim_number(uuid, text, integer, uuid);
create function public.drillrig_claim_number(p_company uuid, p_doc_type text, p_min integer, p_rig uuid default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
    v_rig uuid := coalesce(p_rig, drillrig.default_rig(p_company));
    v_next integer;
begin
    if drillrig.my_role(p_company) is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    if p_doc_type not in ('INVOICE', 'QUOTATION') then
        raise exception 'unknown document type';
    end if;
    if not drillrig.can_rig(p_company, v_rig) then
        raise exception 'no access to this rig' using errcode = '42501';
    end if;
    if not drillrig.rig_active(v_rig) then
        raise exception 'rig subscription is not active' using errcode = 'P0402';
    end if;

    insert into drillrig.doc_counter as dc (company_id, rig_id, doc_type, last_seq)
    values (p_company, v_rig, p_doc_type, greatest(coalesce(p_min, 1), 1))
    on conflict (company_id, rig_id, doc_type) do update
        set last_seq = greatest(dc.last_seq + 1, coalesce(p_min, 1))
    returning dc.last_seq into v_next;
    return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Team & rigs (owner only, except accepting an invite)
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_team(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
    perform drillrig.require_owner(p_company);
    return jsonb_build_object(
        'rigs', (select coalesce(jsonb_agg(drillrig.rig_json(r) || jsonb_build_object('is_default', r.id = drillrig.default_rig(p_company))
                                           order by r.created_at, r.id), '[]'::jsonb)
                 from drillrig.rig r where r.company_id = p_company),
        'members', (select coalesce(jsonb_agg(jsonb_build_object(
                        'user_id', m.user_id, 'email', m.email, 'name', m.display_name, 'role', m.role,
                        'status', m.status, 'is_me', m.user_id = auth.uid(),
                        'rig_ids', (select coalesce(jsonb_agg(mr.rig_id), '[]'::jsonb) from drillrig.member_rig mr
                                    where mr.company_id = m.company_id and mr.user_id = m.user_id)
                    ) order by (m.role = 'owner') desc, m.created_at), '[]'::jsonb)
                    from drillrig.member m where m.company_id = p_company and m.status = 'active'),
        'invites', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', i.id, 'email', i.email, 'role', i.role, 'rig_ids', to_jsonb(i.rig_ids), 'created_at', i.created_at
                    ) order by i.created_at desc), '[]'::jsonb)
                    from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null)
    );
end;
$$;

-- Create (p_rig null) or rename a rig. Returns the rig.
create or replace function public.drillrig_save_rig(p_company uuid, p_rig uuid, p_name text, p_prefix text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_prefix text := upper(trim(coalesce(p_prefix, '')));
    v_rig drillrig.rig;
begin
    perform drillrig.require_owner(p_company);
    if v_prefix !~ '^[A-Z0-9]{1,6}$' then
        raise exception 'bill prefix must be 1-6 letters or numbers' using errcode = '22023';
    end if;
    if length(trim(coalesce(p_name, ''))) not between 1 and 60 then
        raise exception 'rig name must be 1-60 characters' using errcode = '22023';
    end if;
    if exists (select 1 from drillrig.rig r where r.company_id = p_company and r.bill_prefix = v_prefix
               and r.archived_at is null and r.id is distinct from p_rig) then
        raise exception 'another rig already uses prefix %', v_prefix using errcode = '23505';
    end if;

    if p_rig is null then
        if (select count(*) from drillrig.rig r where r.company_id = p_company) >= 50 then
            raise exception 'too many rigs' using errcode = '54000';
        end if;
        insert into drillrig.rig (company_id, name, bill_prefix, created_by)
        values (p_company, trim(p_name), v_prefix, auth.uid())
        returning * into v_rig;
    else
        update drillrig.rig set name = trim(p_name), bill_prefix = v_prefix
        where id = p_rig and company_id = p_company
        returning * into v_rig;
        if not found then raise exception 'rig not found' using errcode = '02000'; end if;
    end if;
    return drillrig.rig_json(v_rig);
end;
$$;

create or replace function public.drillrig_archive_rig(p_company uuid, p_rig uuid, p_archived boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_rig drillrig.rig;
begin
    perform drillrig.require_owner(p_company);
    if p_archived and (select count(*) from drillrig.rig r where r.company_id = p_company and r.archived_at is null and r.id <> p_rig) = 0 then
        raise exception 'keep at least one rig' using errcode = '22023';
    end if;
    update drillrig.rig set archived_at = case when p_archived then coalesce(archived_at, now()) end
    where id = p_rig and company_id = p_company
    returning * into v_rig;
    if not found then raise exception 'rig not found' using errcode = '02000'; end if;
    return drillrig.rig_json(v_rig);
end;
$$;

-- Invite by Google email. Re-inviting the same email replaces the open invite.
create or replace function public.drillrig_invite(p_company uuid, p_email text, p_role text, p_rig_ids uuid[])
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_rigs uuid[];
    v_id uuid;
begin
    perform drillrig.require_owner(p_company);
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
        raise exception 'enter a valid email address' using errcode = '22023';
    end if;
    if p_role not in ('owner', 'manager', 'driver') then
        raise exception 'unknown role' using errcode = '22023';
    end if;
    select coalesce(array_agg(r.id), '{}') into v_rigs
    from drillrig.rig r where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'));
    if p_role <> 'owner' and cardinality(v_rigs) = 0 then
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
    insert into drillrig.invite (company_id, email, role, rig_ids, invited_by)
    values (p_company, v_email, p_role, v_rigs, auth.uid())
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function public.drillrig_revoke_invite(p_company uuid, p_invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    perform drillrig.require_owner(p_company);
    update drillrig.invite set revoked_at = now()
    where id = p_invite and company_id = p_company and accepted_at is null and revoked_at is null;
end;
$$;

-- Change a member's role and rigs, or remove them (p_active = false).
create or replace function public.drillrig_set_member(p_company uuid, p_user uuid, p_role text, p_rig_ids uuid[], p_active boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_owners integer;
    v_is_owner boolean;
begin
    perform drillrig.require_owner(p_company);
    if p_role not in ('owner', 'manager', 'driver') then
        raise exception 'unknown role' using errcode = '22023';
    end if;
    select m.role = 'owner' into v_is_owner from drillrig.member m
    where m.company_id = p_company and m.user_id = p_user and m.status = 'active';
    if not found then raise exception 'member not found' using errcode = '02000'; end if;

    select count(*) into v_owners from drillrig.member m
    where m.company_id = p_company and m.status = 'active' and m.role = 'owner';
    if v_is_owner and v_owners <= 1 and (not p_active or p_role <> 'owner') then
        raise exception 'the company must keep at least one owner' using errcode = '22023';
    end if;

    update drillrig.member set role = p_role, status = case when p_active then 'active' else 'removed' end
    where company_id = p_company and user_id = p_user;

    delete from drillrig.member_rig where company_id = p_company and user_id = p_user;
    if p_active and p_role <> 'owner' then
        insert into drillrig.member_rig (company_id, user_id, rig_id)
        select p_company, p_user, r.id from drillrig.rig r
        where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'))
        on conflict do nothing;
    end if;
    perform drillrig.bump_access(p_company, p_user);
end;
$$;

-- A signed-in user accepts an invite to another company (when they already belong to one).
create or replace function public.drillrig_accept_invite(p_invite uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_invite drillrig.invite;
begin
    select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
    select * into v_invite from drillrig.invite i
    where i.id = p_invite and i.email = v_email and i.accepted_at is null and i.revoked_at is null;
    if not found then raise exception 'invite not found' using errcode = '02000'; end if;
    perform drillrig.join_from_invite(v_invite, v_uid, v_email);
    return v_invite.company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin only (Supabase SQL editor / service role): activate a rig after payment.
--    Not callable from the app.
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_admin_set_paid_until(p_rig uuid, p_until timestamptz)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    v_rig drillrig.rig;
begin
    update drillrig.rig set paid_until = p_until where id = p_rig returning * into v_rig;
    if not found then raise exception 'rig not found'; end if;
    return drillrig.rig_json(v_rig);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.drillrig_my_company(text, text, uuid) from public, anon;
revoke all on function public.drillrig_push(uuid, jsonb) from public, anon;
revoke all on function public.drillrig_pull(uuid, bigint, integer) from public, anon;
revoke all on function public.drillrig_claim_number(uuid, text, integer, uuid) from public, anon;
revoke all on function public.drillrig_team(uuid) from public, anon;
revoke all on function public.drillrig_save_rig(uuid, uuid, text, text) from public, anon;
revoke all on function public.drillrig_archive_rig(uuid, uuid, boolean) from public, anon;
revoke all on function public.drillrig_invite(uuid, text, text, uuid[]) from public, anon;
revoke all on function public.drillrig_revoke_invite(uuid, uuid) from public, anon;
revoke all on function public.drillrig_set_member(uuid, uuid, text, uuid[], boolean) from public, anon;
revoke all on function public.drillrig_accept_invite(uuid) from public, anon;
revoke all on function public.drillrig_admin_set_paid_until(uuid, timestamptz) from public, anon, authenticated;

grant execute on function public.drillrig_my_company(text, text, uuid) to authenticated;
grant execute on function public.drillrig_push(uuid, jsonb) to authenticated;
grant execute on function public.drillrig_pull(uuid, bigint, integer) to authenticated;
grant execute on function public.drillrig_claim_number(uuid, text, integer, uuid) to authenticated;
grant execute on function public.drillrig_team(uuid) to authenticated;
grant execute on function public.drillrig_save_rig(uuid, uuid, text, text) to authenticated;
grant execute on function public.drillrig_archive_rig(uuid, uuid, boolean) to authenticated;
grant execute on function public.drillrig_invite(uuid, text, text, uuid[]) to authenticated;
grant execute on function public.drillrig_revoke_invite(uuid, uuid) to authenticated;
grant execute on function public.drillrig_set_member(uuid, uuid, text, uuid[], boolean) to authenticated;
grant execute on function public.drillrig_accept_invite(uuid) to authenticated;

commit;
