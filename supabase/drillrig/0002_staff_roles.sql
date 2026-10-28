-- DrillRig Step 1: staff accounts & roles.
-- Every permission below is enforced HERE, on the server. The app only hides buttons.
--
--                      owner   manager   driver
--   create bills         ✓        ✓        ✓
--   see bills           all      all     own only
--   record payments      ✓        ✓        ✓ (own bills)
--   edit settings        ✓        ✓        ✗
--   delete bills         ✓        ✗        ✗
--   delete customers     ✓        ✓        ✗
--   manage staff         ✓        ✗        ✗

alter table drillrig.member add column if not exists display_name text;
alter table drillrig.member add column if not exists joined_at timestamptz not null default now();
alter table drillrig.member drop constraint if exists member_status_check;
alter table drillrig.member add constraint member_status_check check (status in ('active', 'removed'));

-- Who first created a record (bills: "made by"). Existing rows were all written by their owner.
alter table drillrig.record add column if not exists created_by uuid references auth.users(id);
update drillrig.record set created_by = updated_by where created_by is null;

create table if not exists drillrig.invite (
    company_id  uuid not null references drillrig.company(id) on delete cascade,
    email       text not null check (email = lower(email) and position('@' in email) > 1 and length(email) <= 254),
    role        text not null check (role in ('manager', 'driver')),
    invited_by  uuid not null references auth.users(id),
    created_at  timestamptz not null default now(),
    accepted_by uuid references auth.users(id),
    accepted_at timestamptz,
    primary key (company_id, email)
);
alter table drillrig.invite enable row level security;
revoke all on drillrig.invite from public, anon, authenticated;

create or replace function drillrig.my_role(p_company uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
    select m.role from drillrig.member m
    where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active';
$$;
revoke all on function drillrig.my_role(uuid) from public, anon, authenticated;

create or replace function drillrig.my_email()
returns text
language sql stable security definer
set search_path = ''
as $$
    select lower(u.email) from auth.users u where u.id = auth.uid();
$$;
revoke all on function drillrig.my_email() from public, anon, authenticated;

create or replace function drillrig.my_display_name()
returns text
language sql stable security definer
set search_path = ''
as $$
    select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    from auth.users u where u.id = auth.uid();
$$;
revoke all on function drillrig.my_display_name() from public, anon, authenticated;

-- Join a company from a pending invite (used by my_company and accept_invite).
create or replace function drillrig.join_from_invite(p_company uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := drillrig.my_email();
    v_role text;
begin
    select i.role into v_role from drillrig.invite i
    where i.company_id = p_company and i.email = v_email and i.accepted_at is null;
    if v_role is null then
        return false;
    end if;

    insert into drillrig.member as m (company_id, user_id, role, status, email, display_name, joined_at)
    values (p_company, v_uid, v_role, 'active', v_email, drillrig.my_display_name(), now())
    on conflict (company_id, user_id) do update
        set role = excluded.role, status = 'active', email = excluded.email,
            display_name = excluded.display_name, joined_at = now()
        where m.role <> 'owner';

    update drillrig.invite set accepted_by = v_uid, accepted_at = now()
    where company_id = p_company and email = v_email;
    return true;
end;
$$;
revoke all on function drillrig.join_from_invite(uuid) from public, anon, authenticated;

-- 1. The caller's current company.
--    - A brand-new user with an invite joins that company.
--    - A brand-new user without one gets their own company (as owner).
--    - Someone who already has a company is NEVER moved automatically: invites wait for
--      drillrig_accept_invite, so nobody can pull an owner into another company.
--    - A removed staff member gets no company (no new one is created for them).
drop function if exists public.drillrig_my_company(text);
create function public.drillrig_my_company(p_name text default null)
returns table (company_id uuid, company_name text, role text, removed boolean)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_company uuid;
    v_inv uuid;
begin
    if v_uid is null then
        raise exception 'not signed in' using errcode = '28000';
    end if;

    select m.company_id into v_company from drillrig.member m
    where m.user_id = v_uid and m.status = 'active'
    order by m.joined_at desc limit 1;

    if v_company is null then
        if exists (select 1 from drillrig.member m where m.user_id = v_uid) then
            -- had access before and it was removed: maybe re-invited since?
            select i.company_id into v_inv from drillrig.invite i
            where i.email = drillrig.my_email() and i.accepted_at is null
            order by i.created_at limit 1;
            if v_inv is null then
                return query select null::uuid, null::text, null::text, true;
                return;
            end if;
            perform drillrig.join_from_invite(v_inv);
            v_company := v_inv;
        else
            select i.company_id into v_inv from drillrig.invite i
            where i.email = drillrig.my_email() and i.accepted_at is null
            order by i.created_at limit 1;
            if v_inv is not null then
                perform drillrig.join_from_invite(v_inv);
                v_company := v_inv;
            else
                insert into drillrig.company (name, created_by)
                values (coalesce(nullif(trim(p_name), ''), 'My Borewell Company'), v_uid)
                returning id into v_company;
                insert into drillrig.member (company_id, user_id, role, email, display_name)
                values (v_company, v_uid, 'owner', drillrig.my_email(), drillrig.my_display_name());
            end if;
        end if;
    end if;

    -- keep the name/email shown in the staff list fresh
    update drillrig.member m set display_name = drillrig.my_display_name(), email = drillrig.my_email()
    where m.company_id = v_company and m.user_id = v_uid;

    return query
    select c.id, c.name, m.role, false
    from drillrig.company c
    join drillrig.member m on m.company_id = c.id and m.user_id = v_uid
    where c.id = v_company;
end;
$$;

-- 2. Upload, with per-row permission checks. Rows the caller may not write are skipped and
--    reported back, so one bad row never blocks the rest of the phone's changes.
drop function if exists public.drillrig_push(uuid, jsonb);
create function public.drillrig_push(p_company uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
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
    v_owner_of uuid;
    v_exists boolean;
    v_ok boolean;
    v_rev bigint;
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

        select true, r.created_by into v_exists, v_owner_of
        from drillrig.record r
        where r.company_id = p_company and r.kind = v_kind and r.id = v_id;
        v_exists := coalesce(v_exists, false);

        v_ok := case
            when v_kind = 'setting' then v_role in ('owner', 'manager')
            when v_kind = 'customer' then (not v_deleted) or v_role in ('owner', 'manager')
            when v_kind = 'bill' then
                case
                    when v_deleted then v_role = 'owner'
                    when not v_exists then true
                    when v_role in ('owner', 'manager') then true
                    else v_owner_of = v_uid
                end
            else false
        end;

        if not coalesce(v_ok, false) then
            v_rejected := v_rejected || jsonb_build_object('kind', v_kind, 'id', v_id);
            continue;
        end if;

        insert into drillrig.record as r (company_id, kind, id, data, deleted, rev, updated_at, updated_by, created_by)
        values (p_company, v_kind, v_id, coalesce(v_row->'data', '{}'::jsonb), v_deleted,
                nextval('drillrig.rev_seq'), now(), v_uid, v_uid)
        on conflict (company_id, kind, id) do update
            set data = excluded.data,
                deleted = excluded.deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    return jsonb_build_object('max_rev', v_max, 'rejected', v_rejected);
end;
$$;

-- 3. Download. Drivers receive only the bills they created.
drop function if exists public.drillrig_pull(uuid, bigint, integer);
create function public.drillrig_pull(p_company uuid, p_since bigint default 0, p_limit integer default 500)
returns table (kind text, id text, data jsonb, deleted boolean, rev bigint, updated_at timestamptz, updated_by uuid, created_by uuid)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
    v_role text := drillrig.my_role(p_company);
begin
    if v_role is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    return query
    select r.kind, r.id, r.data, r.deleted, r.rev, r.updated_at, r.updated_by, r.created_by
    from drillrig.record r
    where r.company_id = p_company
      and r.rev > coalesce(p_since, 0)
      and (v_role in ('owner', 'manager') or r.kind <> 'bill' or r.created_by = auth.uid())
    order by r.rev
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

-- 4. claim_number: any member (unchanged body, now via my_role).
create or replace function public.drillrig_claim_number(p_company uuid, p_doc_type text, p_min integer)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
    v_next integer;
begin
    if drillrig.my_role(p_company) is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    insert into drillrig.doc_counter as dc (company_id, doc_type, last_seq)
    values (p_company, p_doc_type, greatest(coalesce(p_min, 1), 1))
    on conflict (company_id, doc_type) do update
        set last_seq = greatest(dc.last_seq + 1, coalesce(p_min, 1))
    returning dc.last_seq into v_next;
    return v_next;
end;
$$;

-- 5. Staff list (owner & manager can view; only the owner can change it).
create or replace function public.drillrig_staff(p_company uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
    v_role text := drillrig.my_role(p_company);
begin
    if v_role is null or v_role not in ('owner', 'manager') then
        raise exception 'only the owner or a manager can see the staff list' using errcode = '42501';
    end if;
    return jsonb_build_object(
        'members', coalesce((
            select jsonb_agg(jsonb_build_object(
                'user_id', m.user_id, 'email', m.email, 'name', m.display_name, 'role', m.role,
                'joined_at', m.joined_at, 'is_me', m.user_id = auth.uid())
                order by (m.role = 'owner') desc, m.joined_at)
            from drillrig.member m where m.company_id = p_company and m.status = 'active'), '[]'::jsonb),
        'invites', coalesce((
            select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'created_at', i.created_at)
                order by i.created_at)
            from drillrig.invite i where i.company_id = p_company and i.accepted_at is null), '[]'::jsonb)
    );
end;
$$;

create or replace function public.drillrig_invite(p_company uuid, p_email text, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
    v_email text := lower(trim(p_email));
begin
    if drillrig.my_role(p_company) is distinct from 'owner' then
        raise exception 'only the owner can invite staff' using errcode = '42501';
    end if;
    if p_role not in ('manager', 'driver') then
        raise exception 'role must be manager or driver';
    end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'enter a valid email address';
    end if;
    if exists (select 1 from drillrig.member m
               where m.company_id = p_company and m.status = 'active' and lower(m.email) = v_email) then
        raise exception 'this person is already in your team';
    end if;
    insert into drillrig.invite (company_id, email, role, invited_by)
    values (p_company, v_email, p_role, auth.uid())
    on conflict (company_id, email) do update
        set role = excluded.role, invited_by = excluded.invited_by, created_at = now(),
            accepted_by = null, accepted_at = null;
end;
$$;

create or replace function public.drillrig_cancel_invite(p_company uuid, p_email text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
    if drillrig.my_role(p_company) is distinct from 'owner' then
        raise exception 'only the owner can cancel invites' using errcode = '42501';
    end if;
    delete from drillrig.invite where company_id = p_company and email = lower(trim(p_email)) and accepted_at is null;
end;
$$;

create or replace function public.drillrig_set_role(p_company uuid, p_user uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
    if drillrig.my_role(p_company) is distinct from 'owner' then
        raise exception 'only the owner can change roles' using errcode = '42501';
    end if;
    if p_role not in ('manager', 'driver') then
        raise exception 'role must be manager or driver';
    end if;
    update drillrig.member set role = p_role
    where company_id = p_company and user_id = p_user and role <> 'owner' and status = 'active';
    if not found then
        raise exception 'staff member not found';
    end if;
end;
$$;

create or replace function public.drillrig_remove_member(p_company uuid, p_user uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
    if drillrig.my_role(p_company) is distinct from 'owner' then
        raise exception 'only the owner can remove staff' using errcode = '42501';
    end if;
    update drillrig.member set status = 'removed'
    where company_id = p_company and user_id = p_user and role <> 'owner' and status = 'active';
    if not found then
        raise exception 'staff member not found';
    end if;
end;
$$;

-- 6. Invites waiting for someone who already has a company.
create or replace function public.drillrig_my_invites()
returns table (company_id uuid, company_name text, role text, invited_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
    select i.company_id, c.name, i.role, i.created_at
    from drillrig.invite i
    join drillrig.company c on c.id = i.company_id
    where i.email = drillrig.my_email() and i.accepted_at is null
      and not exists (select 1 from drillrig.member m
                      where m.company_id = i.company_id and m.user_id = auth.uid() and m.status = 'active')
    order by i.created_at;
$$;

create or replace function public.drillrig_accept_invite(p_company uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
    if not drillrig.join_from_invite(p_company) then
        raise exception 'no pending invite for this company';
    end if;
end;
$$;

-- Grants: signed-in users only.
do $$
declare f text;
begin
    foreach f in array array[
        'public.drillrig_my_company(text)',
        'public.drillrig_push(uuid, jsonb)',
        'public.drillrig_pull(uuid, bigint, integer)',
        'public.drillrig_claim_number(uuid, text, integer)',
        'public.drillrig_staff(uuid)',
        'public.drillrig_invite(uuid, text, text)',
        'public.drillrig_cancel_invite(uuid, text)',
        'public.drillrig_set_role(uuid, uuid, text)',
        'public.drillrig_remove_member(uuid, uuid)',
        'public.drillrig_my_invites()',
        'public.drillrig_accept_invite(uuid)'
    ] loop
        execute format('revoke all on function %s from public, anon', f);
        execute format('grant execute on function %s to authenticated', f);
    end loop;
end;
$$;
