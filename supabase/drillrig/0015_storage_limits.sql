-- DrillRig cloud sync — 0015: storage limits (abuse protection). Run after 0014. Safe to run again.
--
-- Before this, any signed-in Google account could create a business and push 500 records of
-- 2 MB each per call, and fill the whole (shared, Free plan) database. Measured on 22 Nov 2026:
-- biggest bill 2 KB, biggest company profile (with logo) 183 KB, biggest company 197 KB.
--
--   one record (bill, customer, stock, worker, tool)   at most 64 KB stored
--   one settings document (company profile with logo)   at most 512 KB stored
--   one company in total                                 company.storage_limit_mb (default 50 MB
--                                                        ≈ 25,000 bills); the admin can raise it
--   activity log                                         latest 20,000 entries per company
-- A refused row comes back as rejected with reason 'too_large' or 'quota'; the phone keeps it.
-- Deletes are always allowed.
begin;

alter table drillrig.company add column if not exists storage_limit_mb integer not null default 50
    check (storage_limit_mb between 1 and 2000);
create index if not exists activity_company_id_idx on drillrig.activity(company_id, id);

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
                -- a worker can move to "no rig" (office); other kinds keep their rig on delete
                rig_id = case when r.kind = 'worker' and not excluded.deleted then excluded.rig_id
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

-- Admin: raise or lower one company's limit.
create or replace function public.drillrig_admin_set_storage(p_company uuid, p_mb integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_used bigint;
begin
    perform drillrig.require_admin();
    if p_mb is null or p_mb < 1 or p_mb > 2000 then raise exception 'limit must be 1-2000 MB' using errcode = '22023'; end if;
    update drillrig.company set storage_limit_mb = p_mb where id = p_company;
    if not found then raise exception 'no such business' using errcode = '02000'; end if;
    select coalesce(sum(pg_column_size(r.data)), 0) into v_used from drillrig.record r where r.company_id = p_company;
    return jsonb_build_object('limit_mb', p_mb, 'used_mb', round(v_used / 1048576.0, 2));
end;
$$;

revoke all on function public.drillrig_admin_set_storage(uuid, integer) from public, anon;
grant execute on function public.drillrig_admin_set_storage(uuid, integer) to authenticated;
grant execute on function public.drillrig_push(uuid, jsonb) to authenticated;

commit;
