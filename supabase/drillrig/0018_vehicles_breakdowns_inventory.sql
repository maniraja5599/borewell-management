-- DrillRig cloud sync — 0018: vehicles, breakdowns, stock & vendors. Run after 0017. Safe to run again.
--
-- Three record kinds that were kept on one phone only (app v2.4x, beta):
--   'vehicle'    own / hired vehicles, document expiry dates, hired-vehicle payouts.
--                For the whole business: never tied to a rig (rig_id is always null).
--   'breakdown'  a rig stopped: reason, start / end time, repair cost. Belongs to a rig
--                (no rig given = the company's first rig, like pipe stock).
--   'inv'        stock & vendors, one list with a type field `t`:
--                  item | move | purchase | vpay  — belong to a rig (like pipe stock)
--                  vendor                         — for the whole business (rig_id null)
--
-- Who:
--   owner    everything; only the owner deletes
--   office   vehicle / breakdown: with "bills", "stock" or "pnl"; inv: with "stock" or "pnl"
--   manager  vehicles and vendors (no rig) and the records of their own rigs
--   driver   (retired role) nothing new
-- Nothing existing changes: the old kinds keep exactly the rules of 0017.
begin;

alter table drillrig.record drop constraint if exists record_kind_check;
alter table drillrig.record add constraint record_kind_check check (kind in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool', 'cash', 'attendance', 'vehicle', 'breakdown', 'inv'));
alter table drillrig.activity drop constraint if exists activity_kind_check;
alter table drillrig.activity add constraint activity_kind_check check (kind in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool', 'cash', 'attendance', 'vehicle', 'breakdown', 'inv'));

-- What this server supports.
create or replace function public.drillrig_capabilities()
returns jsonb language sql stable set search_path = '' as $$
    select '["rigs", "roles", "activity", "stock", "office", "workers", "tools", "cash", "attendance", "vehicles", "breakdowns", "inventory"]'::jsonb;
$$;
revoke all on function public.drillrig_capabilities() from public, anon;
grant execute on function public.drillrig_capabilities() to authenticated;

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
        when 'cash' then jsonb_strip_nulls(jsonb_build_object(
            'type', left(p_data->>'type', 20), 'category', left(p_data->>'category', 40),
            'amount', round(coalesce(drillrig.num(p_data->'amount'), 0)), 'date', left(p_data->>'date', 10),
            'holder', left(p_data->>'holderName', 80), 'received', (p_data->>'receivedAt') is not null
        ))
        when 'attendance' then jsonb_strip_nulls(jsonb_build_object(
            'worker', left(p_data->>'workerName', 80), 'date', left(p_data->>'date', 10), 'status', left(p_data->>'status', 10)
        ))
        when 'vehicle' then jsonb_strip_nulls(jsonb_build_object(
            'name', left(p_data->>'name', 80), 'kind', left(p_data->>'kind', 20), 'owner', left(p_data->>'ownerName', 80)
        ))
        when 'breakdown' then jsonb_strip_nulls(jsonb_build_object(
            'reason', left(p_data->>'reason', 20), 'fixed', (p_data->>'endAt') is not null,
            'cost', round(coalesce(drillrig.num(p_data->'cost'), 0))
        ))
        when 'inv' then jsonb_strip_nulls(jsonb_build_object(
            't', left(p_data->>'t', 10), 'name', left(p_data->>'name', 80), 'date', left(p_data->>'date', 10),
            'amount', round(coalesce(drillrig.num(p_data->'total'), drillrig.num(p_data->'amount'), 0))
        ))
        else '{}'::jsonb
    end;
$$;

-- Which records may this person see? (0014 + cash)
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
            when 'cash' then drillrig.perm(p_company, 'expenses') or drillrig.perm(p_company, 'pnl')
            when 'attendance' then drillrig.perm(p_company, 'workers') or drillrig.perm(p_company, 'pnl')
            when 'vehicle' then drillrig.perm(p_company, 'bills') or drillrig.perm(p_company, 'stock') or drillrig.perm(p_company, 'pnl')
            when 'breakdown' then drillrig.perm(p_company, 'bills') or drillrig.perm(p_company, 'stock') or drillrig.perm(p_company, 'pnl')
            when 'inv' then drillrig.perm(p_company, 'stock') or drillrig.perm(p_company, 'pnl')
            else false end
        -- managers: vehicles and vendors (no rig) for the whole business
        when p_role = 'manager' and p_kind in ('vehicle', 'inv') and p_rig is null then true
        when p_role = 'manager' then p_kind in ('bill', 'stock', 'tool', 'worker', 'cash', 'attendance', 'breakdown', 'inv') and p_rig is not null and exists (
            select 1 from drillrig.member_rig mr
            where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        when p_role = 'driver' then p_kind = 'bill' and p_created_by = auth.uid() and exists (
            select 1 from drillrig.member_rig mr
            where mr.company_id = p_company and mr.user_id = auth.uid() and mr.rig_id = p_rig)
        else false
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
    v_size integer;
    v_old integer;
    v_used bigint;
    v_limit bigint;
begin
    if v_role is null then
        raise exception 'not a member of this company' using errcode = '42501';
    end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
        raise exception 'p_rows must be an array of at most 500 rows';
    end if;
    -- Storage used by this company (deleted records keep their data, so they count too).
    select coalesce(sum(pg_column_size(r.data)), 0) into v_used from drillrig.record r where r.company_id = p_company;
    select c.storage_limit_mb::bigint * 1048576 into v_limit from drillrig.company c where c.id = p_company;

    for v_row in select * from jsonb_array_elements(p_rows) loop
        v_kind := v_row->>'kind';
        v_id := v_row->>'id';
        v_deleted := coalesce((v_row->>'deleted')::boolean, false);
        v_data := coalesce(v_row->'data', '{}'::jsonb);
        v_reason := null;
        v_rig := null;

        if v_kind not in ('customer', 'bill', 'setting', 'stock', 'worker', 'tool', 'cash', 'attendance', 'vehicle', 'breakdown', 'inv') or v_id is null or length(v_id) not between 1 and 120
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
            elsif v_kind = 'attendance' then
                -- One worker, one day (0017). Same rules as workers: no rig = office staff, marked only
                -- by the owner or office staff (with "workers"); managers mark their rigs only.
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
            elsif v_kind = 'vehicle' then
                -- For the whole business (0018): never on a rig.
                v_rig := null;
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and not (drillrig.perm(p_company, 'bills') or drillrig.perm(p_company, 'stock'))) then
                    v_reason := 'role';
                end if;
            elsif v_kind = 'breakdown' or (v_kind = 'inv' and coalesce(v_data->>'t', v_existing.data->>'t', '') <> 'vendor') then
                -- Per rig, like pipe stock (0018): no rig given = the company's first rig.
                v_rig := coalesce(drillrig.as_uuid(v_data->>'rigId'), v_existing.rig_id, drillrig.default_rig(p_company));
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and v_kind = 'inv' and not drillrig.perm(p_company, 'stock'))
                   or (v_role = 'office' and v_kind = 'breakdown' and not (drillrig.perm(p_company, 'bills') or drillrig.perm(p_company, 'stock'))) then
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
            elsif v_kind = 'inv' then
                -- A vendor (0018): for the whole business, never on a rig. Managers may add and edit.
                v_rig := null;
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and not drillrig.perm(p_company, 'stock')) then
                    v_reason := 'role';
                elsif v_existing.id is not null and v_existing.rig_id is not null then
                    v_reason := 'rig'; -- a rig record cannot turn into a vendor
                end if;
            elsif v_kind = 'cash' then
                -- Money in / out (0016). No rig = office: only owners and office staff.
                -- Managers: only their own entries (holderId = themselves), on their rigs, and they can
                -- never tick or change "Received" on a hand-over (the owner / office does that).
                v_rig := case when v_deleted then v_existing.rig_id else drillrig.as_uuid(v_data->>'rigId') end;
                if v_role not in ('owner', 'manager', 'office') or (v_deleted and v_role <> 'owner')
                   or (v_role = 'office' and not drillrig.perm(p_company, 'expenses')) then
                    v_reason := 'role';
                elsif v_deleted then
                    null;
                elsif v_rig is null and v_role = 'manager' then
                    v_reason := 'rig';
                elsif v_rig is not null and not drillrig.can_rig(p_company, v_rig) then
                    v_reason := 'rig';
                elsif v_role = 'manager' and v_existing.id is not null
                      and (v_existing.rig_id is null or not drillrig.can_rig(p_company, v_existing.rig_id)) then
                    v_reason := 'rig';
                elsif v_role = 'manager' and ((v_data->>'holderId') is distinct from v_uid::text
                      or (v_existing.id is not null and v_existing.created_by is distinct from v_uid)) then
                    v_reason := 'not_yours';
                elsif v_role = 'manager' and ((v_data->>'receivedAt') is distinct from (v_existing.data->>'receivedAt')
                      or (v_existing.data->>'receivedAt') is not null) then
                    v_reason := 'role';
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

        -- Size limits: one record, and the company total.
        if v_reason is null and not v_deleted then
            v_size := pg_column_size(v_data);
            v_old := coalesce(pg_column_size(v_existing.data), 0);
            if v_size > (case when v_kind = 'setting' then 524288 else 65536 end) then
                v_reason := 'too_large';
            elsif v_size > v_old and v_used + (v_size - v_old) > coalesce(v_limit, 52428800) then
                v_reason := 'quota';
            else
                v_used := v_used + (v_size - v_old);
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
                -- a worker or cash entry can move to "no rig" (office); other kinds keep their rig on delete
                rig_id = case when r.kind in ('worker', 'cash', 'attendance', 'vehicle') and not excluded.deleted then excluded.rig_id
                              when r.kind = 'inv' and not excluded.deleted and excluded.rig_id is null then r.rig_id
                              else coalesce(excluded.rig_id, r.rig_id) end
        returning r.rev into v_rev;
        v_max := greatest(v_max, v_rev);
    end loop;

    -- Keep the activity log to the latest 20,000 entries per company.
    delete from drillrig.activity a
    where a.company_id = p_company
      and a.id < (select a2.id from drillrig.activity a2 where a2.company_id = p_company order by a2.id desc offset 20000 limit 1);

    return jsonb_build_object('rev', v_max, 'rejected', v_rejected);
end;
$$;

grant execute on function public.drillrig_push(uuid, jsonb) to authenticated;

commit;
