-- DrillRig 0012: when an owner types a mobile number to invite someone, show who it is.
-- Run after 0011. Safe to run again.
--
-- drillrig_phone_lookup(company, phone) -> for the OWNER of that company only:
--   { phone, found, name, member_role, member_name, invited }
--   found        - a DrillRig user saved this mobile number (Settings asks it once after sign-in)
--   name         - their Google name (never their email)
--   member_role  - they are already in this company (owner / manager / driver)
--   invited      - an invitation to this number is already waiting
-- Nothing is joined or sent; the app only shows the name above the Send button.

create or replace function public.drillrig_phone_lookup(p_company uuid, p_phone text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
    v_phone text;
    v_uid uuid;
    v_name text;
    v_member drillrig.member;
begin
    perform drillrig.require_owner(p_company);
    begin
        v_phone := drillrig.clean_phone(p_phone);
    exception when others then
        return jsonb_build_object('phone', null, 'found', false);
    end;
    if v_phone is null then return jsonb_build_object('phone', null, 'found', false); end if;

    select p.user_id into v_uid from drillrig.profile p where p.phone = v_phone order by p.updated_at desc limit 1;
    if v_uid is not null then
        select nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
          into v_name from auth.users u where u.id = v_uid;
        select * into v_member from drillrig.member m where m.company_id = p_company and m.user_id = v_uid and m.status = 'active';
    end if;

    return jsonb_build_object(
        'phone', v_phone,
        'found', v_uid is not null,
        'name', coalesce(v_member.display_name, v_name),
        'member_role', v_member.role,
        'is_me', v_uid is not null and v_uid = auth.uid(),
        'invited', exists (select 1 from drillrig.invite i where i.company_id = p_company and i.phone = v_phone
                           and i.accepted_at is null and i.revoked_at is null and i.declined_at is null
                           and (i.expires_at is null or i.expires_at > now()))
    );
end;
$$;

revoke all on function public.drillrig_phone_lookup(uuid, text) from public, anon;
grant execute on function public.drillrig_phone_lookup(uuid, text) to authenticated;
