-- DrillRig cloud sync — test phase.
-- Lives in its own schema so the Flutter app's tables (public.*) are never touched.
-- The schema is NOT exposed through the Data API: the browser can only reach it
-- through the four public.drillrig_* functions below, and each one checks that the
-- caller belongs to the company first.

create schema if not exists drillrig;
revoke all on schema drillrig from public, anon, authenticated;

-- One rig business.
create table if not exists drillrig.company (
    id          uuid primary key default gen_random_uuid(),
    name        text not null check (length(name) between 1 and 200),
    created_by  uuid not null references auth.users(id),
    created_at  timestamptz not null default now()
);

-- Who works there. Roles are enforced from step 2 (staff); for now every member is the owner.
create table if not exists drillrig.member (
    company_id  uuid not null references drillrig.company(id) on delete cascade,
    user_id     uuid not null references auth.users(id) on delete cascade,
    role        text not null default 'owner' check (role in ('owner', 'manager', 'driver')),
    status      text not null default 'active' check (status in ('active', 'removed')),
    email       text,
    created_at  timestamptz not null default now(),
    primary key (company_id, user_id)
);
create index if not exists member_user_idx on drillrig.member(user_id);

-- Every synced thing is one row: a customer, a bill (with its payments) or a settings document.
-- `data` is the exact object the app keeps on the phone, so nothing is re-mapped.
-- `rev` comes from one sequence: a phone asks "give me everything after rev N".
create sequence if not exists drillrig.rev_seq;

create table if not exists drillrig.record (
    company_id  uuid not null references drillrig.company(id) on delete cascade,
    kind        text not null check (kind in ('customer', 'bill', 'setting')),
    id          text not null check (length(id) between 1 and 120),
    data        jsonb not null default '{}'::jsonb,
    deleted     boolean not null default false,
    rev         bigint not null default nextval('drillrig.rev_seq'),
    updated_at  timestamptz not null default now(),
    updated_by  uuid references auth.users(id),
    primary key (company_id, kind, id)
);
create index if not exists record_pull_idx on drillrig.record(company_id, rev);

-- Bill / quotation counters, so two phones never hand out the same number while online.
create table if not exists drillrig.doc_counter (
    company_id  uuid not null references drillrig.company(id) on delete cascade,
    doc_type    text not null check (doc_type in ('INVOICE', 'QUOTATION')),
    last_seq    integer not null default 0,
    primary key (company_id, doc_type)
);

-- Defence in depth: RLS on, no policies. Only the security-definer functions below get in.
alter table drillrig.company     enable row level security;
alter table drillrig.member      enable row level security;
alter table drillrig.record      enable row level security;
alter table drillrig.doc_counter enable row level security;
revoke all on all tables in schema drillrig from public, anon, authenticated;
revoke all on all sequences in schema drillrig from public, anon, authenticated;

create or replace function drillrig.is_member(p_company uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1 from drillrig.member m
        where m.company_id = p_company
          and m.user_id = auth.uid()
          and m.status = 'active'
    );
$$;
revoke all on function drillrig.is_member(uuid) from public, anon, authenticated;

-- 1. The caller's company. Creates it (with the caller as owner) on first sign-in.
create or replace function public.drillrig_my_company(p_name text default null)
returns table (company_id uuid, company_name text, role text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_company uuid;
begin
    if v_uid is null then
        raise exception 'not signed in' using errcode = '28000';
    end if;

    select m.company_id into v_company
    from drillrig.member m
    where m.user_id = v_uid and m.status = 'active'
    order by m.created_at
    limit 1;

    if v_company is null then
        insert into drillrig.company (name, created_by)
        values (coalesce(nullif(trim(p_name), ''), 'My Borewell Company'), v_uid)
        returning id into v_company;

        insert into drillrig.member (company_id, user_id, role, email)
        values (v_company, v_uid, 'owner', (select u.email from auth.users u where u.id = v_uid));
    end if;

    return query
    select c.id, c.name, m.role
    from drillrig.company c
    join drillrig.member m on m.company_id = c.id and m.user_id = v_uid
    where c.id = v_company;
end;
$$;

-- 2. Upload changed rows. p_rows = [{kind, id, data, deleted}, ...]. Returns the highest rev written.
create or replace function public.drillrig_push(p_company uuid, p_rows jsonb)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_max bigint := 0;
    v_row jsonb;
    v_rev bigint;
begin
    if not drillrig.is_member(p_company) then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
        raise exception 'p_rows must be an array of at most 500 rows';
    end if;

    for v_row in select * from jsonb_array_elements(p_rows) loop
        insert into drillrig.record as r (company_id, kind, id, data, deleted, rev, updated_at, updated_by)
        values (
            p_company,
            v_row->>'kind',
            v_row->>'id',
            coalesce(v_row->'data', '{}'::jsonb),
            coalesce((v_row->>'deleted')::boolean, false),
            nextval('drillrig.rev_seq'),
            now(),
            v_uid
        )
        on conflict (company_id, kind, id) do update
            set data = excluded.data,
                deleted = excluded.deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    return v_max;
end;
$$;

-- 3. Download everything changed after p_since.
create or replace function public.drillrig_pull(p_company uuid, p_since bigint default 0, p_limit integer default 500)
returns table (kind text, id text, data jsonb, deleted boolean, rev bigint, updated_at timestamptz, updated_by uuid)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
    if not drillrig.is_member(p_company) then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    return query
    select r.kind, r.id, r.data, r.deleted, r.rev, r.updated_at, r.updated_by
    from drillrig.record r
    where r.company_id = p_company and r.rev > coalesce(p_since, 0)
    order by r.rev
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

-- 4. Claim the next bill/quotation number. p_min is the number the phone was about to use,
--    so a company that already has bills up to AB-250 keeps counting from there.
create or replace function public.drillrig_claim_number(p_company uuid, p_doc_type text, p_min integer)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
    v_next integer;
begin
    if not drillrig.is_member(p_company) then
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

revoke all on function public.drillrig_my_company(text) from public, anon;
revoke all on function public.drillrig_push(uuid, jsonb) from public, anon;
revoke all on function public.drillrig_pull(uuid, bigint, integer) from public, anon;
revoke all on function public.drillrig_claim_number(uuid, text, integer) from public, anon;
grant execute on function public.drillrig_my_company(text) to authenticated;
grant execute on function public.drillrig_push(uuid, jsonb) to authenticated;
grant execute on function public.drillrig_pull(uuid, bigint, integer) to authenticated;
grant execute on function public.drillrig_claim_number(uuid, text, integer) to authenticated;
