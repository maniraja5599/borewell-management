-- DrillRig 0010: users' mobile numbers + invite staff by mobile number (WhatsApp link with a code).
-- Run after 0003-0009. Safe to run again.
--
-- 1. Every signed-in user can save their own mobile number (asked once after sign-in).
--    Owners see their staff's numbers in Team & Rigs; the admin console shows it too.
-- 2. Invite by mobile: the owner enters a mobile number, the app opens WhatsApp to that number
--    with a link like https://drillrig.in/?join=K7Q2M9XW4P. Whoever opens the link and signs in
--    with Google joins, once. The code is random, single use, and expires after 7 days.
--    (We sign in with Google, not phone OTP, so a typed phone number alone is never trusted.)

-- ---------------------------------------------------------------------------
-- 1. Profile (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists drillrig.profile (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    phone      text check (phone is null or phone ~ '^\+[0-9]{8,15}$'),
    updated_at timestamptz not null default now()
);
alter table drillrig.profile enable row level security;
revoke all on drillrig.profile from public, anon, authenticated;

-- Phone as "+<country><number>". p_phone may be "98427 12345" (India assumed) or "+9198427...".
create or replace function drillrig.clean_phone(p_phone text)
returns text language plpgsql immutable set search_path = '' as $$
declare d text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
    if d = '' then return null; end if;
    if left(d, 1) = '+' then d := '+' || regexp_replace(d, '[^0-9]', '', 'g');
    elsif length(d) = 10 then d := '+91' || d;
    elsif length(d) = 12 and left(d, 2) = '91' then d := '+' || d;
    else d := '+' || d;
    end if;
    if d !~ '^\+[0-9]{8,15}$' then raise exception 'enter a valid mobile number' using errcode = '22023'; end if;
    if left(d, 3) = '+91' and d !~ '^\+91[6-9][0-9]{9}$' then raise exception 'enter a valid 10-digit mobile number' using errcode = '22023'; end if;
    return d;
end;
$$;
revoke all on function drillrig.clean_phone(text) from public, anon, authenticated;

create or replace function public.drillrig_set_my_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_phone text;
begin
    if v_uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
    v_phone := drillrig.clean_phone(p_phone);
    if v_phone is null then raise exception 'enter your mobile number' using errcode = '22023'; end if;
    insert into drillrig.profile (user_id, phone, updated_at) values (v_uid, v_phone, now())
    on conflict (user_id) do update set phone = excluded.phone, updated_at = now();
    return jsonb_build_object('phone', v_phone);
end;
$$;

create or replace function public.drillrig_my_profile()
returns jsonb language sql stable security definer set search_path = '' as $$
    select jsonb_build_object('phone', (select p.phone from drillrig.profile p where p.user_id = auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- 2. Invite links (by mobile number)
-- ---------------------------------------------------------------------------
alter table drillrig.invite alter column email drop not null;
alter table drillrig.invite add column if not exists phone text;
alter table drillrig.invite add column if not exists name text check (name is null or length(name) <= 80);
alter table drillrig.invite add column if not exists code text;
alter table drillrig.invite add column if not exists expires_at timestamptz;
create unique index if not exists invite_code_uq on drillrig.invite(code) where code is not null;
do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'invite_email_or_code') then
        alter table drillrig.invite add constraint invite_email_or_code check (email is not null or code is not null);
    end if;
end $$;

-- Owner: make an invite link for a mobile number. Re-inviting the same number replaces the open link.
create or replace function public.drillrig_invite_link(p_company uuid, p_phone text, p_name text, p_role text, p_rig_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v_phone text := drillrig.clean_phone(p_phone);
    v_name text := nullif(left(trim(coalesce(p_name, '')), 80), '');
    v_rigs uuid[];
    v_code text;
    v_row drillrig.invite;
begin
    perform drillrig.require_owner(p_company);
    if v_phone is null then raise exception 'enter their mobile number' using errcode = '22023'; end if;
    if p_role not in ('owner', 'manager', 'driver') then raise exception 'unknown role' using errcode = '22023'; end if;
    select coalesce(array_agg(r.id), '{}') into v_rigs
    from drillrig.rig r where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'));
    if p_role <> 'owner' and cardinality(v_rigs) = 0 then raise exception 'choose at least one rig' using errcode = '22023'; end if;
    if (select count(*) from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null) >= 100 then
        raise exception 'too many open invites' using errcode = '54000';
    end if;

    update drillrig.invite set revoked_at = now()
    where company_id = p_company and phone = v_phone and accepted_at is null and revoked_at is null;
    -- 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L): about 2^49 codes.
    loop
        select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 31), 1), '')
        into v_code
        from (select decode(md5(gen_random_uuid()::text || clock_timestamp()::text), 'hex') as b) x, generate_series(0, 9) as i;
        exit when not exists (select 1 from drillrig.invite i where i.code = v_code);
    end loop;
    insert into drillrig.invite (company_id, email, phone, name, code, expires_at, role, rig_ids, invited_by)
    values (p_company, null, v_phone, v_name, v_code, now() + interval '7 days', p_role, v_rigs, auth.uid())
    returning * into v_row;
    return jsonb_build_object('id', v_row.id, 'code', v_row.code, 'phone', v_row.phone, 'name', v_row.name, 'expires_at', v_row.expires_at);
end;
$$;

-- Signed-in user: join with a code from an invite link. Single use.
create or replace function public.drillrig_join_with_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
    v_invite drillrig.invite;
    v_name text;
begin
    if v_uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
    select lower(u.email) into v_email from auth.users u where u.id = v_uid;
    select * into v_invite from drillrig.invite i
    where i.code = v_code and i.accepted_at is null and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
    for update;
    if not found then
        raise exception 'This invite link has expired or was already used. Ask the owner for a new one.' using errcode = '02000';
    end if;
    perform drillrig.join_from_invite(v_invite, v_uid, v_email);
    -- remember the number the owner used, if this person has not saved one yet
    insert into drillrig.profile (user_id, phone) values (v_uid, v_invite.phone) on conflict (user_id) do nothing;
    select c.name into v_name from drillrig.company c where c.id = v_invite.company_id;
    return jsonb_build_object('company_id', v_invite.company_id, 'company_name', v_name, 'role', v_invite.role);
end;
$$;

-- Team screen: invites now carry phone / name / code; members carry their saved phone.
create or replace function public.drillrig_team(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
    perform drillrig.require_owner(p_company);
    return jsonb_build_object(
        'rigs', (select coalesce(jsonb_agg(drillrig.rig_json(r) || jsonb_build_object('is_default', r.id = drillrig.default_rig(p_company))
                                           order by r.created_at, r.id), '[]'::jsonb)
                 from drillrig.rig r where r.company_id = p_company),
        'members', (select coalesce(jsonb_agg(jsonb_build_object(
                        'user_id', m.user_id, 'email', m.email, 'name', m.display_name, 'role', m.role,
                        'status', m.status, 'is_me', m.user_id = auth.uid(),
                        'phone', (select p.phone from drillrig.profile p where p.user_id = m.user_id),
                        'rig_ids', (select coalesce(jsonb_agg(mr.rig_id), '[]'::jsonb) from drillrig.member_rig mr
                                    where mr.company_id = m.company_id and mr.user_id = m.user_id)
                    ) order by (m.role = 'owner') desc, m.created_at), '[]'::jsonb)
                    from drillrig.member m where m.company_id = p_company and m.status = 'active'),
        'invites', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', i.id, 'email', i.email, 'phone', i.phone, 'name', i.name, 'code', i.code,
                        'expires_at', i.expires_at, 'expired', i.expires_at is not null and i.expires_at <= now(),
                        'role', i.role, 'rig_ids', to_jsonb(i.rig_ids), 'created_at', i.created_at
                    ) order by i.created_at desc), '[]'::jsonb)
                    from drillrig.invite i where i.company_id = p_company and i.accepted_at is null and i.revoked_at is null)
    );
end;
$$;

-- Admin console: users list shows the saved mobile number.
create or replace function public.drillrig_admin_users(p_search text default null, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
    perform drillrig.require_admin();
    return coalesce((select jsonb_agg(x order by x->>'last_sign_in' desc nulls last) from (
        select jsonb_build_object(
            'user_id', u.id, 'email', u.email, 'name', u.raw_user_meta_data->>'full_name',
            'phone', (select p.phone from drillrig.profile p where p.user_id = u.id),
            'created_at', u.created_at, 'last_sign_in', u.last_sign_in_at,
            'businesses', (select jsonb_agg(jsonb_build_object('company_id', c.id, 'name', c.name, 'role', m.role, 'status', m.status,
                                                               'paused', c.suspended_at is not null) order by m.created_at)
                             from drillrig.member m join drillrig.company c on c.id = m.company_id where m.user_id = u.id)) as x
        from auth.users u
        where exists (select 1 from drillrig.member m where m.user_id = u.id)
          and (q is null or lower(u.email) like '%' || q || '%' or lower(coalesce(u.raw_user_meta_data->>'full_name', '')) like '%' || q || '%'
               or exists (select 1 from drillrig.profile p where p.user_id = u.id and p.phone like '%' || regexp_replace(q, '[^0-9]', '', 'g') || '%' and regexp_replace(q, '[^0-9]', '', 'g') <> ''))
        order by u.last_sign_in_at desc nulls last
        limit least(greatest(coalesce(p_limit, 50), 1), 200)) s), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.drillrig_set_my_phone(text) from public, anon;
revoke all on function public.drillrig_my_profile() from public, anon;
revoke all on function public.drillrig_invite_link(uuid, text, text, text, uuid[]) from public, anon;
revoke all on function public.drillrig_join_with_code(text) from public, anon;
grant execute on function public.drillrig_set_my_phone(text) to authenticated;
grant execute on function public.drillrig_my_profile() to authenticated;
grant execute on function public.drillrig_invite_link(uuid, text, text, text, uuid[]) to authenticated;
grant execute on function public.drillrig_join_with_code(text) to authenticated;
revoke all on function public.drillrig_team(uuid) from public, anon;
grant execute on function public.drillrig_team(uuid) to authenticated;
revoke all on function public.drillrig_admin_users(text, integer) from public, anon;
grant execute on function public.drillrig_admin_users(text, integer) to authenticated;
