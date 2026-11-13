-- DrillRig cloud sync — 0002.
-- 1. Soft delete: a deleted record keeps its last data. Before this, a delete (or restoring an
--    old backup) replaced the bill with {} in the cloud, so it could never be recovered.
--    Phones still treat the row as deleted (they only look at the `deleted` flag).
-- 2. Size limit: one record may be at most 2 MB (a company logo is the biggest thing stored),
--    so a single account cannot fill the database.
-- Only the drillrig_push function changes; signature and grants stay the same.

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
        if pg_column_size(v_row->'data') > 2097152 then
            raise exception 'record %:% is larger than 2 MB', v_row->>'kind', v_row->>'id'
                using errcode = '54000';
        end if;

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
            set data = case when excluded.deleted then r.data else excluded.data end,
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
