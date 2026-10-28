-- Permission test for 0002_staff_roles.sql.
-- SAFE TO RUN ON THE REAL DATABASE: it creates two temporary test users and test rows, checks
-- every rule, then deliberately raises an error so the whole thing is rolled back.
-- The result appears as the error message:  "TEST RESULT: 18/18 passed ..."
do $$
declare
    v_owner uuid;
    v_company uuid;
    v_driver uuid := gen_random_uuid();
    v_manager uuid := gen_random_uuid();
    v_res jsonb;
    v_txt text;
    v_n int;
    v_pass int := 0;
    v_total int := 0;
    v_log text := '';

begin
    select m.user_id, m.company_id into v_owner, v_company
    from drillrig.member m where m.role = 'owner' and m.status = 'active'
    order by m.joined_at limit 1;
    if v_owner is null then
        raise exception 'TEST SETUP: no owner found — sign in on the app once first';
    end if;

    insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (v_driver, 'zz.driver.test@example.com', '{"full_name":"Test Driver"}', 'authenticated', 'authenticated'),
           (v_manager, 'zz.manager.test@example.com', '{"full_name":"Test Manager"}', 'authenticated', 'authenticated');

    -- helper: act as a user
    -- (inline: set role + JWT claims for auth.uid())

    ------------------------------------------------------------------ owner invites
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    perform public.drillrig_invite(v_company, 'ZZ.Driver.Test@example.com ', 'driver');
    perform public.drillrig_invite(v_company, 'zz.manager.test@example.com', 'manager');
    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_owner_bill","data":{"billNo":"ZZ-OWN"}}]'::jsonb);

    ------------------------------------------------------------------ driver joins
    perform set_config('request.jwt.claims', json_build_object('sub', v_driver, 'role', 'authenticated')::text, true);
    select role into v_txt from public.drillrig_my_company(null);
    v_total := v_total + 1; if v_txt = 'driver' then v_pass := v_pass + 1; else v_log := v_log || ' | driver joins as driver: got ' || coalesce(v_txt, 'null'); end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_driver_bill","data":{"billNo":"ZZ-DRV"}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 0 then v_pass := v_pass + 1; else v_log := v_log || ' | driver can create a bill'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_driver_bill","data":{"billNo":"ZZ-DRV","payments":[{"amount":500}]}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 0 then v_pass := v_pass + 1; else v_log := v_log || ' | driver can record payment on own bill'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_owner_bill","data":{"billNo":"HACKED"}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 1 then v_pass := v_pass + 1; else v_log := v_log || ' | driver must NOT edit owner bill'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_driver_bill","deleted":true}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 1 then v_pass := v_pass + 1; else v_log := v_log || ' | driver must NOT delete bills'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"setting","id":"rates","data":{"baseDrillingRate":1}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 1 then v_pass := v_pass + 1; else v_log := v_log || ' | driver must NOT change rates'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"customer","id":"zz_cust","data":{"name":"ZZ"}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 0 then v_pass := v_pass + 1; else v_log := v_log || ' | driver can add a customer'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"customer","id":"zz_cust","deleted":true}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 1 then v_pass := v_pass + 1; else v_log := v_log || ' | driver must NOT delete customers'; end if;

    select count(*) into v_n from public.drillrig_pull(v_company, 0, 1000) p where p.kind = 'bill' and p.id <> 'zz_driver_bill';
    v_total := v_total + 1; if v_n = 0 then v_pass := v_pass + 1; else v_log := v_log || ' | driver must see ONLY own bills, saw ' || v_n || ' others'; end if;

    select count(*) into v_n from public.drillrig_pull(v_company, 0, 1000) p where p.kind = 'setting';
    v_total := v_total + 1; if v_n > 0 then v_pass := v_pass + 1; else v_log := v_log || ' | driver gets company settings (rates) to bill with'; end if;

    v_total := v_total + 1;
    begin
        perform public.drillrig_staff(v_company);
        v_log := v_log || ' | driver must NOT see staff list';
    exception when others then v_pass := v_pass + 1;
    end;

    v_total := v_total + 1;
    begin
        perform public.drillrig_invite(v_company, 'someone@example.com', 'manager');
        v_log := v_log || ' | driver must NOT invite';
    exception when others then v_pass := v_pass + 1;
    end;

    ------------------------------------------------------------------ manager
    perform set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
    select role into v_txt from public.drillrig_my_company(null);
    v_total := v_total + 1; if v_txt = 'manager' then v_pass := v_pass + 1; else v_log := v_log || ' | manager joins as manager'; end if;

    select count(*) into v_n from public.drillrig_pull(v_company, 0, 1000) p where p.kind = 'bill' and p.id in ('zz_owner_bill', 'zz_driver_bill');
    v_total := v_total + 1; if v_n = 2 then v_pass := v_pass + 1; else v_log := v_log || ' | manager sees all bills, saw ' || v_n; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_owner_bill","deleted":true}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 1 then v_pass := v_pass + 1; else v_log := v_log || ' | manager must NOT delete bills'; end if;

    v_res := public.drillrig_push(v_company, '[{"kind":"bill","id":"zz_driver_bill","data":{"billNo":"ZZ-DRV","payments":[{"amount":900}]}}]'::jsonb);
    v_total := v_total + 1; if jsonb_array_length(v_res->'rejected') = 0 then v_pass := v_pass + 1; else v_log := v_log || ' | manager can edit any bill'; end if;

    ------------------------------------------------------------------ owner removes the driver
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    select (public.drillrig_staff(v_company)->'members') into v_res;
    v_total := v_total + 1; if jsonb_array_length(v_res) >= 3 then v_pass := v_pass + 1; else v_log := v_log || ' | owner sees staff list'; end if;
    perform public.drillrig_remove_member(v_company, v_driver);

    perform set_config('request.jwt.claims', json_build_object('sub', v_driver, 'role', 'authenticated')::text, true);
    select removed into v_txt from public.drillrig_my_company(null);
    v_total := v_total + 1; if v_txt = 'true' then v_pass := v_pass + 1; else v_log := v_log || ' | removed driver gets no company'; end if;

    v_total := v_total + 1;
    begin
        perform * from public.drillrig_pull(v_company, 0, 10);
        v_log := v_log || ' | removed driver must NOT download';
    exception when others then v_pass := v_pass + 1;
    end;

    execute 'reset role';
    raise exception 'TEST RESULT: %/% passed%  (all test data rolled back)', v_pass, v_total,
        case when v_log = '' then '' else ' — FAILED:' || v_log end;
end;
$$;
