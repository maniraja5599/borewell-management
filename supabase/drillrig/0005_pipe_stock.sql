-- DrillRig cloud sync — 0005: casing pipe stock per rig.
-- Run AFTER 0003 and 0004. Touches only the `drillrig` schema and public.drillrig_* functions.
--
-- A new record kind, 'stock' = one stock movement on one rig: opening stock, a purchase,
-- or an adjustment, in feet for the two casing sizes. Usage is NOT stored: the app works it
-- out from final bills, so editing or deleting a bill changes the stock by itself.
--
-- Who:  owner — all rigs, can delete entries
--       manager — read/add/edit entries of their rigs
--       driver — none (they only see their own bills, so they cannot see the true balance)

begin;

alter table drillrig.record drop constraint if exists record_kind_check;
alter table drillrig.record add constraint record_kind_check check (kind in ('customer', 'bill', 'setting', 'stock'));

alter table drillrig.activity drop constraint if exists activity_kind_check;
alter table drillrig.activity add constraint activity_kind_check check (kind in ('customer', 'bill', 'setting', 'stock'));

-- What this server supports, so phones on a newer app never send records an older server
-- would refuse (the app keeps them on the phone until then).
create or replace function public.drillrig_capabilities()
returns jsonb language sql stable set search_path = '' as $$
    select '["rigs", "roles", "activity", "stock"]'::jsonb;
$$;
revoke all on function public.drillrig_capabilities() from public, anon;
grant execute on function public.drillrig_capabilities() to authenticated;

-- Activity log facts for stock entries.
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
        else '{}'::jsonb
    end;
$$;
revoke all on function drillrig.activity_facts(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Upload: same rules as 0003, plus 'stock'.
-- ---------------------------------------------------------------------------
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

        if v_kind not in ('customer', 'bill', 'setting', 'stock') or v_id is null or length(v_id) not between 1 and 120
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
            elsif v_kind = 'stock' then
                v_rig := coalesce(drillrig.as_uuid(v_data->>'rigId'), v_existing.rig_id, drillrig.default_rig(p_company));
                if v_role not in ('owner', 'manager') or (v_deleted and v_role <> 'owner') then
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
            set data = case when excluded.deleted then r.data else excluded.data end,
                deleted = excluded.deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by,
                rig_id = coalesce(excluded.rig_id, r.rig_id)
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    return jsonb_build_object('rev', v_max, 'rejected', v_rejected);
end;
$$;

-- ---------------------------------------------------------------------------
-- Download: same as 0003, plus stock for owners and the rigs' managers.
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_pull(p_company uuid, p_since bigint default 0, p_limit integer default 500)
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
           case when r.deleted then '{}'::jsonb else r.data end,
           r.deleted, r.rev, r.updated_at, r.updated_by, r.rig_id
    from drillrig.record r
    where r.company_id = p_company and r.rev > coalesce(p_since, 0)
      and (
            r.kind not in ('bill', 'stock')
         or v_role = 'owner'
         or (r.kind = 'bill'
             and exists (select 1 from drillrig.member_rig mr
                         where mr.company_id = p_company and mr.user_id = v_uid and mr.rig_id = r.rig_id)
             and (v_role = 'manager' or r.created_by = v_uid))
         or (r.kind = 'stock' and v_role = 'manager'
             and exists (select 1 from drillrig.member_rig mr
                         where mr.company_id = p_company and mr.user_id = v_uid and mr.rig_id = r.rig_id))
      )
    order by r.rev
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity log reader: stock entries follow the same rig rule as bills for managers.
-- ---------------------------------------------------------------------------
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
         or (v_role = 'manager' and (a.kind not in ('bill', 'stock') or exists (
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

commit;
