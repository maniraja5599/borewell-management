-- DrillRig cloud sync — 0004: activity log ("who changed this bill?").
-- Run AFTER 0003. Touches only the `drillrig` schema and public.drillrig_* functions.
--
-- Every change to a bill, customer or setting that reaches the cloud is recorded by a trigger
-- on drillrig.record, so it does not matter which app version or function wrote it.
-- Entries are never edited or deleted by the app. History starts when this is run.
--
-- Who can read it:  owner — everything
--                   manager — customers, settings, and bills of their rigs
--                   driver — only the bills they created

begin;

create table if not exists drillrig.activity (
    id          bigint generated always as identity primary key,
    company_id  uuid not null references drillrig.company(id) on delete cascade,
    kind        text not null check (kind in ('customer', 'bill', 'setting')),
    record_id   text not null,
    rig_id      uuid,
    action      text not null check (action in ('create', 'update', 'delete', 'restore')),
    actor       uuid,
    at          timestamptz not null default now(),
    summary     jsonb not null default '{}'::jsonb
);
create index if not exists activity_company_at_idx on drillrig.activity(company_id, at desc, id desc);
create index if not exists activity_record_idx on drillrig.activity(company_id, kind, record_id, at desc);

alter table drillrig.activity enable row level security;
revoke all on drillrig.activity from public, anon, authenticated;

-- Numbers inside app JSON may be missing or text; never let the log break a save.
create or replace function drillrig.num(p jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select case
        when jsonb_typeof(p) = 'number' then p::text::numeric
        when jsonb_typeof(p) = 'string' and (p #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then (p #>> '{}')::numeric
    end;
$$;

-- The few facts worth showing for a record (not the whole document).
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
        else '{}'::jsonb
    end;
$$;

create or replace function drillrig.log_record_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_action text;
    v_facts jsonb;
    v_before jsonb;
begin
    if tg_op = 'INSERT' then
        v_action := case when new.deleted then null else 'create' end;
    elsif old.deleted = false and new.deleted = true then
        v_action := 'delete';
    elsif old.deleted = true and new.deleted = false then
        v_action := 'restore';
    elsif old.data is distinct from new.data then
        v_action := 'update';
    end if;
    if v_action is null then
        return null;
    end if;

    v_facts := drillrig.activity_facts(new.kind, new.data);
    if v_action = 'update' and new.kind = 'bill' then
        v_before := drillrig.activity_facts('bill', old.data);
        if v_before->'total' is distinct from v_facts->'total' then
            v_facts := v_facts || jsonb_build_object('prevTotal', v_before->'total');
        end if;
        if v_before->'paid' is distinct from v_facts->'paid' then
            v_facts := v_facts || jsonb_build_object('prevPaid', v_before->'paid');
        end if;
    end if;
    if new.kind = 'setting' then
        v_facts := jsonb_build_object('setting', new.id);
    end if;

    insert into drillrig.activity (company_id, kind, record_id, rig_id, action, actor, summary)
    values (new.company_id, new.kind, new.id, new.rig_id, v_action, new.updated_by, v_facts);
    return null;
end;
$$;
revoke all on function drillrig.log_record_change() from public, anon, authenticated;
revoke all on function drillrig.num(jsonb) from public, anon, authenticated;
revoke all on function drillrig.activity_facts(text, jsonb) from public, anon, authenticated;

drop trigger if exists record_activity on drillrig.record;
create trigger record_activity
    after insert or update on drillrig.record
    for each row execute function drillrig.log_record_change();

-- Read the log: whole company (p_kind/p_record null) or one record. Newest first.
-- p_before = an id from the previous page, to load older entries.
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
      and (
            v_role = 'owner'
         or (v_role = 'manager' and (a.kind <> 'bill' or exists (
                select 1 from drillrig.member_rig mr
                where mr.company_id = p_company and mr.user_id = v_uid and mr.rig_id = a.rig_id)))
         or (v_role = 'driver' and a.kind = 'bill' and exists (
                select 1 from drillrig.record r
                where r.company_id = p_company and r.kind = 'bill' and r.id = a.record_id and r.created_by = v_uid))
      )
    order by a.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke all on function public.drillrig_activity(uuid, text, text, integer, bigint) from public, anon;
grant execute on function public.drillrig_activity(uuid, text, text, integer, bigint) to authenticated;

commit;
