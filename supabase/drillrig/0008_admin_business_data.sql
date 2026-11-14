-- 0008: admin console — a business's report, bills and customers (read-only). Run after 0007.
--
-- Decided 14 Nov 2026: the DrillRig team can see every signed-in business's totals, bills and
-- customers in admin.html (disclosed in privacy.html "What the DrillRig team can see").
-- Every function refuses non-admins and writes what was opened to drillrig.admin_log.
-- Money follows the app exactly (src/features/report/reportMath.js):
--   total = round(snapshot.grandTotal); paid = sum of payments[].amount (old bills: snapshot.advancePaidAmount);
--   due = max(0, total - paid) for final bills (INVOICE); quotations have no due.

-- ---------------------------------------------------------------------------
-- Bill helpers (pure: bill JSON in, value out)
-- ---------------------------------------------------------------------------
-- A JSON number, or a numeric string ("5000"); anything else is 0 (same as Number(x) || 0 in the app).
create or replace function drillrig.json_num(v jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select case when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric
                when jsonb_typeof(v) = 'string' and trim(v #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then trim(v #>> '{}')::numeric
                else 0 end;
$$;

create or replace function drillrig.bill_total(d jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select round(drillrig.json_num(d->'snapshot'->'grandTotal'));
$$;

create or replace function drillrig.bill_paid(d jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select case
        when jsonb_typeof(d->'payments') = 'array' then coalesce((
            select sum(round(drillrig.json_num(p->'amount'))) from jsonb_array_elements(d->'payments') p), 0)
        else round(drillrig.json_num(d->'snapshot'->'advancePaidAmount'))
    end;
$$;

create or replace function drillrig.bill_is_invoice(d jsonb)
returns boolean language sql immutable set search_path = '' as $$
    select coalesce(d->'snapshot'->>'docType', 'QUOTATION') = 'INVOICE';
$$;

create or replace function drillrig.bill_due(d jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select case when drillrig.bill_is_invoice(d) then greatest(0, drillrig.bill_total(d) - drillrig.bill_paid(d)) else 0 end;
$$;

-- The day a bill belongs to (billDate, else the day it was made, India time).
create or replace function drillrig.bill_day(d jsonb)
returns date language plpgsql immutable set search_path = '' as $$
begin
    if (d->>'billDate') ~ '^\d{4}-\d{2}-\d{2}' then return left(d->>'billDate', 10)::date; end if;
    if (d->>'createdAt') is not null then
        begin
            return ((d->>'createdAt')::timestamptz at time zone 'Asia/Kolkata')::date;
        exception when others then return null;
        end;
    end if;
    return null;
end;
$$;

create or replace function drillrig.bill_depth(d jsonb)
returns numeric language sql immutable set search_path = '' as $$
    select drillrig.json_num(d->'snapshot'->'totalDepth');
$$;

create or replace function drillrig.phone_key(p text)
returns text language sql immutable set search_path = '' as $$
    select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10), '');
$$;

-- ---------------------------------------------------------------------------
-- Report: totals (all time, this month, last month), 12-month trend, top dues, per rig
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_admin_report(p_company uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v jsonb;
    v_today date := (now() at time zone 'Asia/Kolkata')::date;
    v_m0 date := date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date;
begin
    perform drillrig.require_admin();
    if not exists (select 1 from drillrig.company c where c.id = p_company) then
        raise exception 'business not found' using errcode = 'P0002';
    end if;
    perform drillrig.admin_note('view_report', p_company, null);

    with b as (
        select r.id, r.rig_id, r.data, drillrig.bill_day(r.data) as day, drillrig.bill_is_invoice(r.data) as inv,
               drillrig.bill_total(r.data) as total, drillrig.bill_paid(r.data) as paid, drillrig.bill_due(r.data) as due,
               drillrig.bill_depth(r.data) as depth
        from drillrig.record r
        where r.company_id = p_company and r.kind = 'bill' and not r.deleted
    ), inv as (select * from b where inv),
    -- Money in by the day it was received (payments[].date), like the app's report.
    pay as (
        select coalesce(case when (p->>'date') ~ '^\d{4}-\d{2}-\d{2}' then left(p->>'date', 10)::date end, inv.day) as day,
               round(drillrig.json_num(p->'amount')) as amount
        from inv cross join lateral jsonb_array_elements(case when jsonb_typeof(inv.data->'payments') = 'array' then inv.data->'payments' else '[]'::jsonb end) p
        union all
        select inv.day, inv.paid from inv where jsonb_typeof(inv.data->'payments') is distinct from 'array' and inv.paid > 0
    ),
    months as (
        select generate_series(v_m0 - interval '11 months', v_m0, interval '1 month')::date as m
    )
    select jsonb_build_object(
        'today', v_today,
        'all', (select jsonb_build_object('bills', count(*), 'feet', coalesce(sum(depth), 0), 'billed', coalesce(sum(total), 0),
                                          'received', coalesce(sum(paid), 0), 'due', coalesce(sum(due), 0),
                                          'unpaid_bills', count(*) filter (where due > 0)) from inv),
        'quotes', (select count(*) from b where not inv),
        'this_month', (select jsonb_build_object('bills', count(*), 'feet', coalesce(sum(depth), 0), 'billed', coalesce(sum(total), 0),
                                                 'received', (select coalesce(sum(amount), 0) from pay where pay.day >= v_m0))
                       from inv where day >= v_m0),
        'last_month', (select jsonb_build_object('bills', count(*), 'feet', coalesce(sum(depth), 0), 'billed', coalesce(sum(total), 0),
                                                 'received', (select coalesce(sum(amount), 0) from pay
                                                              where pay.day >= (v_m0 - interval '1 month')::date and pay.day < v_m0))
                       from inv where day >= (v_m0 - interval '1 month')::date and day < v_m0),
        'months', (select coalesce(jsonb_agg(jsonb_build_object(
                        'month', to_char(months.m, 'YYYY-MM'),
                        'bills', (select count(*) from inv where date_trunc('month', inv.day) = months.m),
                        'feet', (select coalesce(sum(depth), 0) from inv where date_trunc('month', inv.day) = months.m),
                        'billed', (select coalesce(sum(total), 0) from inv where date_trunc('month', inv.day) = months.m),
                        'received', (select coalesce(sum(amount), 0) from pay where date_trunc('month', pay.day) = months.m)
                    ) order by months.m), '[]'::jsonb) from months),
        'top_dues', (select coalesce(jsonb_agg(x order by x.due desc), '[]'::jsonb) from (
                        select coalesce(nullif(trim(data->>'custName'), ''), 'Direct bill') as customer, data->>'custPhone' as phone,
                               sum(due) as due, count(*) as bills, min(day) as oldest
                        from inv where due > 0
                        group by 1, 2 order by sum(due) desc limit 10) x),
        'rigs', (select coalesce(jsonb_agg(jsonb_build_object('rig', coalesce(g.name, 'No rig'), 'bills', s.bills, 'billed', s.billed, 'due', s.due)
                                           order by s.billed desc), '[]'::jsonb)
                 from (select rig_id, count(*) as bills, sum(total) as billed, sum(due) as due from inv group by rig_id) s
                 left join drillrig.rig g on g.id = s.rig_id)
    ) into v;
    return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bills: newest first; search bill no / customer / phone / place; filter all | due | paid | quote
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_admin_bills(p_company uuid, p_search text default null, p_status text default 'all',
                                                       p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb; q text := nullif(lower(trim(coalesce(p_search, ''))), ''); st text := coalesce(nullif(p_status, ''), 'all');
begin
    perform drillrig.require_admin();
    if coalesce(p_offset, 0) = 0 then
        perform drillrig.admin_note('view_bills', p_company, null, jsonb_build_object('search', q, 'status', st));
    end if;
    with b as (
        select r.id, r.rig_id, r.created_by, r.updated_at, r.data,
               drillrig.bill_day(r.data) as day, drillrig.bill_is_invoice(r.data) as inv,
               drillrig.bill_total(r.data) as total, drillrig.bill_paid(r.data) as paid, drillrig.bill_due(r.data) as due
        from drillrig.record r
        where r.company_id = p_company and r.kind = 'bill' and not r.deleted
    ), f as (
        select * from b
        where (st = 'all' and inv) or (st = 'quote' and not inv) or (st = 'due' and inv and due > 0) or (st = 'paid' and inv and due = 0)
    ), s as (
        select * from f
        where q is null
           or lower(coalesce(data->>'billNo', '')) like '%' || q || '%'
           or lower(coalesce(data->>'custName', '')) like '%' || q || '%'
           or lower(coalesce(data->>'custLocation', '')) like '%' || q || '%'
           or regexp_replace(coalesce(data->>'custPhone', ''), '\D', '', 'g') like '%' || regexp_replace(q, '\D', '', 'g') || '%' and regexp_replace(q, '\D', '', 'g') <> ''
    )
    select jsonb_build_object(
        'total', (select count(*) from s),
        'sum', (select jsonb_build_object('billed', coalesce(sum(total), 0), 'received', coalesce(sum(paid), 0), 'due', coalesce(sum(due), 0)) from s),
        'rows', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', x.id, 'bill_no', x.data->>'billNo', 'doc', case when x.inv then 'bill' else 'quote' end, 'day', x.day,
                    'customer', x.data->>'custName', 'phone', x.data->>'custPhone', 'place', x.data->>'custLocation',
                    'depth', drillrig.bill_depth(x.data), 'type', x.data->'snapshot'->>'drillingType',
                    'total', x.total, 'paid', x.paid, 'due', x.due, 'payments', jsonb_array_length(case when jsonb_typeof(x.data->'payments') = 'array' then x.data->'payments' else '[]'::jsonb end),
                    'rig', (select g.name from drillrig.rig g where g.id = x.rig_id),
                    'made_by', (select u.email from auth.users u where u.id = x.created_by),
                    'updated_at', x.updated_at) order by x.day desc nulls last, x.updated_at desc)
                 from (select * from s order by day desc nulls last, updated_at desc
                       limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) x), '[]'::jsonb)
    ) into v;
    return v;
end;
$$;

-- One bill in full (the JSON the app stores), for support.
create or replace function public.drillrig_admin_bill(p_company uuid, p_bill text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
    perform drillrig.require_admin();
    select r.data into v from drillrig.record r where r.company_id = p_company and r.kind = 'bill' and r.id = p_bill;
    if v is null then raise exception 'bill not found' using errcode = 'P0002'; end if;
    perform drillrig.admin_note('view_bill', p_company, p_bill);
    return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers: with their bill count, billed and due (bills matched by customerId, else phone)
-- ---------------------------------------------------------------------------
create or replace function public.drillrig_admin_customers(p_company uuid, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb; q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
    perform drillrig.require_admin();
    if coalesce(p_offset, 0) = 0 then
        perform drillrig.admin_note('view_customers', p_company, null, jsonb_build_object('search', q));
    end if;
    with c as (
        select r.id, r.data, r.updated_at, drillrig.phone_key(r.data->>'phone') as pk
        from drillrig.record r where r.company_id = p_company and r.kind = 'customer' and not r.deleted
    ), b as (
        select r.data->>'customerId' as cid, drillrig.phone_key(r.data->>'custPhone') as pk,
               drillrig.bill_total(r.data) as total, drillrig.bill_due(r.data) as due, drillrig.bill_day(r.data) as day
        from drillrig.record r
        where r.company_id = p_company and r.kind = 'bill' and not r.deleted and drillrig.bill_is_invoice(r.data)
    ), s as (
        select c.*, agg.bills, agg.billed, agg.due, agg.last_day
        from c
        left join lateral (
            select count(*) as bills, coalesce(sum(b.total), 0) as billed, coalesce(sum(b.due), 0) as due, max(b.day) as last_day
            from b where b.cid = c.id or (b.cid is null and c.pk is not null and b.pk = c.pk)
        ) agg on true
        where q is null
           or lower(coalesce(c.data->>'name', '')) like '%' || q || '%'
           or lower(coalesce(c.data->>'village', '')) like '%' || q || '%'
           or (regexp_replace(q, '\D', '', 'g') <> '' and coalesce(c.pk, '') like '%' || regexp_replace(q, '\D', '', 'g') || '%')
    )
    select jsonb_build_object(
        'total', (select count(*) from s),
        'rows', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', x.id, 'name', x.data->>'name', 'phone', x.data->>'phone', 'village', x.data->>'village',
                    'bills', x.bills, 'billed', x.billed, 'due', x.due, 'last_day', x.last_day) order by x.due desc, x.last_day desc nulls last)
                 from (select * from s order by due desc, last_day desc nulls last
                       limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)) x), '[]'::jsonb)
    ) into v;
    return v;
end;
$$;

-- Newest businesses first, for "who joined recently" (the 0007 list is ordered by last activity).
create or replace function public.drillrig_admin_new_businesses(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
    perform drillrig.require_admin();
    return coalesce((select jsonb_agg(jsonb_build_object(
                'id', c.id, 'name', c.name, 'created_at', c.created_at,
                'owner_email', (select u.email from drillrig.member m join auth.users u on u.id = m.user_id
                                 where m.company_id = c.id and m.role = 'owner' order by m.created_at limit 1),
                'bills', (select count(*) from drillrig.record r where r.company_id = c.id and r.kind = 'bill' and not r.deleted)
            ) order by c.created_at desc)
        from drillrig.company c
        where c.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366))), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: signed-in callers only (each function still refuses non-admins)
-- ---------------------------------------------------------------------------
revoke all on function drillrig.json_num(jsonb), drillrig.bill_total(jsonb), drillrig.bill_paid(jsonb), drillrig.bill_is_invoice(jsonb), drillrig.bill_due(jsonb),
                       drillrig.bill_day(jsonb), drillrig.bill_depth(jsonb), drillrig.phone_key(text) from public, anon, authenticated;
do $$
declare f text;
begin
    foreach f in array array[
        'drillrig_admin_report(uuid)', 'drillrig_admin_bills(uuid,text,text,integer,integer)', 'drillrig_admin_bill(uuid,text)',
        'drillrig_admin_customers(uuid,text,integer,integer)', 'drillrig_admin_new_businesses(integer)'
    ] loop
        execute format('revoke all on function public.%s from public, anon', f);
        execute format('grant execute on function public.%s to authenticated', f);
    end loop;
end;
$$;
