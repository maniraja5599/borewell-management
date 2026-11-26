-- DrillRig cloud sync — 0020: money audit log (old → new values). Run after 0019. Safe to run again.
--
-- The activity log (0004) already records who created / edited / deleted every record. For money
-- it only kept a bill's total and paid amount. From now on an edit also keeps what changed:
--   bill   payments added / removed / changed (amount, mode, date, approval), discount, total,
--          bill date, customer, agent
--   cash   amount, type, category, date, paid by, litres, rate, note, received, approval
--   inv    stock & vendors: name, qty, rate, amount, total, date
--   other kinds: as before
-- as summary.changes = [{ f, from, to }] and for bills summary.payAdded / payRemoved / payChanged.
-- Reading is unchanged (drillrig_activity with the can_see rules of 0018). Entries are never
-- edited or deleted by the app. Only the trigger function changes; history starts when this is run.
begin;

-- Fields (dot paths) whose value differs: [{ f, from, to }] (empty array when nothing changed).
create or replace function drillrig.field_changes(p_old jsonb, p_new jsonb, p_fields text[])
returns jsonb language sql immutable set search_path = '' as $$
    select coalesce(jsonb_agg(jsonb_build_object(
               'f', f,
               'from', p_old #> string_to_array(f, '.'),
               'to', p_new #> string_to_array(f, '.')) order by ord), '[]'::jsonb)
    from unnest(p_fields) with ordinality as t(f, ord)
    where (p_old #> string_to_array(f, '.')) is distinct from (p_new #> string_to_array(f, '.'));
$$;

-- What happened to a bill's payments between two versions.
create or replace function drillrig.payment_changes(p_old jsonb, p_new jsonb)
returns jsonb language sql immutable set search_path = '' as $$
    with o as (
        select p->>'id' as id, p
        from jsonb_array_elements(case when jsonb_typeof(p_old->'payments') = 'array' then p_old->'payments' else '[]'::jsonb end) p
    ), n as (
        select p->>'id' as id, p
        from jsonb_array_elements(case when jsonb_typeof(p_new->'payments') = 'array' then p_new->'payments' else '[]'::jsonb end) p
    )
    select jsonb_strip_nulls(jsonb_build_object(
        'payAdded', (select jsonb_agg(jsonb_build_object('id', n.id, 'amount', n.p->'amount', 'mode', n.p->'mode', 'date', n.p->'date', 'by', n.p #> '{by,name}'))
                     from n where not exists (select 1 from o where o.id is not distinct from n.id)),
        'payRemoved', (select jsonb_agg(jsonb_build_object('id', o.id, 'amount', o.p->'amount', 'mode', o.p->'mode', 'date', o.p->'date'))
                       from o where not exists (select 1 from n where n.id is not distinct from o.id)),
        'payChanged', (select jsonb_agg(jsonb_build_object('id', n.id, 'changes', c.ch))
                       from n join o on o.id = n.id
                       cross join lateral (select drillrig.field_changes(o.p, n.p, array['amount', 'mode', 'date', 'note', 'approval.status']) as ch) c
                       where c.ch <> '[]'::jsonb)
    ));
$$;
revoke all on function drillrig.field_changes(jsonb, jsonb, text[]) from public, anon, authenticated;
revoke all on function drillrig.payment_changes(jsonb, jsonb) from public, anon, authenticated;

create or replace function drillrig.log_record_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_action text;
    v_facts jsonb;
    v_before jsonb;
    v_changes jsonb;
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
        -- 0020: which payments, and the billing fields that changed
        v_facts := v_facts || drillrig.payment_changes(old.data, new.data);
        v_changes := drillrig.field_changes(old.data, new.data,
            array['snapshot.discountAmount', 'snapshot.paymentDiscount', 'billDate', 'custName', 'agent.name', 'snapshot.docType']);
    elsif v_action = 'update' and new.kind = 'cash' then
        v_changes := drillrig.field_changes(old.data, new.data,
            array['amount', 'type', 'categoryLabel', 'date', 'paidBy', 'litres', 'rate', 'note', 'receivedAt', 'approval.status']);
    elsif v_action = 'update' and new.kind = 'inv' then
        v_changes := drillrig.field_changes(old.data, new.data, array['name', 'qty', 'rate', 'amount', 'total', 'date', 'note']);
    end if;
    if v_changes is not null and v_changes <> '[]'::jsonb then
        v_facts := v_facts || jsonb_build_object('changes', v_changes);
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

commit;
