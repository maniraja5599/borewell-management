-- DrillRig 0011: invites are accepted or rejected by the invited person (never joined automatically),
-- the company's creator is protected from other owners, and declined invites are shown to the owner.
-- Run after 0003-0010. Safe to run again.
--
-- Flow
--   Owner invites by mobile (link with code) or by Gmail.
--   The invited person signs in (or is already signed in) and sees an invitation card:
--   company, who invited them, role, rigs, what the role can do -> [Accept] [Reject].
--     Accept  -> drillrig_join_with_code(code) / drillrig_accept_invite(id): they become a member.
--     Reject  -> drillrig_decline_invite(...): the owner sees "Declined".
--   Someone who already owns their own company keeps it; this phone then shows one company at a
--   time and they can switch from Settings.

alter table drillrig.invite add column if not exists declined_at timestamptz;
alter table drillrig.invite add column if not exists declined_by uuid references auth.users(id);

-- What an invited person may see about an invite (before accepting).
create or replace function drillrig.invite_card(p_invite drillrig.invite, p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
    select jsonb_build_object(
        'id', p_invite.id,
        'code', p_invite.code,
        'company_id', p_invite.company_id,
        'company_name', c.name,
        'invited_by', coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
        'role', p_invite.role,
        'name', p_invite.name,
        'rig_names', (select coalesce(jsonb_agg(r.name order by r.created_at), '[]'::jsonb)
                      from drillrig.rig r where r.company_id = p_invite.company_id and r.id = any(p_invite.rig_ids) and r.archived_at is null),
        'expires_at', p_invite.expires_at,
        'status', case
            when p_invite.accepted_at is not null then 'used'
            when p_invite.declined_at is not null then 'declined'
            when p_invite.revoked_at is not null then 'cancelled'
            when p_invite.expires_at is not null and p_invite.expires_at <= now() then 'expired'
            else 'open' end,
        'already_member', exists (select 1 from drillrig.member m where m.company_id = p_invite.company_id
                                  and m.user_id = p_uid and m.status = 'active')
    )
    from drillrig.company c
    left join auth.users u on u.id = p_invite.invited_by
    where c.id = p_invite.company_id;
$$;
revoke all on function drillrig.invite_card(drillrig.invite, uuid) from public, anon, authenticated;

-- Invitation behind a link code (nothing is joined).
create or replace function public.drillrig_invite_preview(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
    v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
    v_invite drillrig.invite;
begin
    if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
    select * into v_invite from drillrig.invite i where i.code = v_code;
    if not found then return jsonb_build_object('status', 'missing'); end if;
    return drillrig.invite_card(v_invite, auth.uid());
end;
$$;

-- Open invitations for the signed-in Google email (Gmail invites).
create or replace function public.drillrig_my_invites()
returns jsonb language sql stable security definer set search_path = '' as $$
    select coalesce(jsonb_agg(drillrig.invite_card(i, auth.uid()) order by i.created_at desc), '[]'::jsonb)
    from drillrig.invite i
    where i.email = (select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
      and i.accepted_at is null and i.revoked_at is null
      and not exists (select 1 from drillrig.member m where m.company_id = i.company_id and m.user_id = auth.uid() and m.status = 'active');
$$;

-- Reject an invitation (by link code, or a Gmail invite by id). The owner sees "Declined".
create or replace function public.drillrig_decline_invite(p_invite uuid default null, p_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
    v_invite drillrig.invite;
begin
    if v_uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
    select lower(u.email) into v_email from auth.users u where u.id = v_uid;
    if v_code <> '' then
        select * into v_invite from drillrig.invite i where i.code = v_code and i.accepted_at is null and i.revoked_at is null for update;
    else
        select * into v_invite from drillrig.invite i where i.id = p_invite and i.email = v_email and i.accepted_at is null and i.revoked_at is null for update;
    end if;
    if not found then raise exception 'This invitation is no longer open.' using errcode = '02000'; end if;
    update drillrig.invite set declined_at = now(), declined_by = v_uid, revoked_at = now() where id = v_invite.id;
    return jsonb_build_object('company_name', (select c.name from drillrig.company c where c.id = v_invite.company_id));
end;
$$;

-- Accept by link code (single use, 7 days). Clear messages for every case.
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
    select * into v_invite from drillrig.invite i where i.code = v_code for update;
    if not found then raise exception 'This invite link is not valid. Ask the owner for a new one.' using errcode = '02000'; end if;
    if v_invite.accepted_at is not null then raise exception 'This invite link was already used. Ask the owner for a new one.' using errcode = '02000'; end if;
    if v_invite.revoked_at is not null then raise exception 'This invitation was cancelled or rejected.' using errcode = '02000'; end if;
    if v_invite.expires_at is not null and v_invite.expires_at <= now() then raise exception 'This invite link has expired. Ask the owner for a new one.' using errcode = '02000'; end if;
    if exists (select 1 from drillrig.member m where m.company_id = v_invite.company_id and m.user_id = v_uid and m.status = 'active') then
        raise exception 'You are already in this company.' using errcode = '23505';
    end if;
    perform drillrig.join_from_invite(v_invite, v_uid, v_email);
    insert into drillrig.profile (user_id, phone) values (v_uid, v_invite.phone) on conflict (user_id) do nothing;
    select c.name into v_name from drillrig.company c where c.id = v_invite.company_id;
    return jsonb_build_object('company_id', v_invite.company_id, 'company_name', v_name, 'role', v_invite.role);
end;
$$;

-- Accept a Gmail invite (existing function, now also refuses when already a member).
create or replace function public.drillrig_accept_invite(p_invite uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_invite drillrig.invite;
begin
    select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
    select * into v_invite from drillrig.invite i
    where i.id = p_invite and i.email = v_email and i.accepted_at is null and i.revoked_at is null;
    if not found then raise exception 'This invitation is no longer open.' using errcode = '02000'; end if;
    if exists (select 1 from drillrig.member m where m.company_id = v_invite.company_id and m.user_id = v_uid and m.status = 'active') then
        raise exception 'You are already in this company.' using errcode = '23505';
    end if;
    perform drillrig.join_from_invite(v_invite, v_uid, v_email);
    return v_invite.company_id;
end;
$$;

-- Team screen: + creator flag, + recently declined invites (14 days).
create or replace function public.drillrig_team(p_company uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_creator uuid := (select c.created_by from drillrig.company c where c.id = p_company);
begin
    perform drillrig.require_owner(p_company);
    return jsonb_build_object(
        'rigs', (select coalesce(jsonb_agg(drillrig.rig_json(r) || jsonb_build_object('is_default', r.id = drillrig.default_rig(p_company))
                                           order by r.created_at, r.id), '[]'::jsonb)
                 from drillrig.rig r where r.company_id = p_company),
        'members', (select coalesce(jsonb_agg(jsonb_build_object(
                        'user_id', m.user_id, 'email', m.email, 'name', m.display_name, 'role', m.role,
                        'status', m.status, 'is_me', m.user_id = auth.uid(), 'is_creator', m.user_id = v_creator,
                        'phone', (select p.phone from drillrig.profile p where p.user_id = m.user_id),
                        'rig_ids', (select coalesce(jsonb_agg(mr.rig_id), '[]'::jsonb) from drillrig.member_rig mr
                                    where mr.company_id = m.company_id and mr.user_id = m.user_id)
                    ) order by (m.user_id = v_creator) desc, (m.role = 'owner') desc, m.created_at), '[]'::jsonb)
                    from drillrig.member m where m.company_id = p_company and m.status = 'active'),
        'invites', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', i.id, 'email', i.email, 'phone', i.phone, 'name', i.name, 'code', i.code,
                        'expires_at', i.expires_at,
                        'expired', i.declined_at is null and i.expires_at is not null and i.expires_at <= now(),
                        'declined', i.declined_at is not null, 'declined_at', i.declined_at,
                        'role', i.role, 'rig_ids', to_jsonb(i.rig_ids), 'created_at', i.created_at
                    ) order by i.created_at desc), '[]'::jsonb)
                    from drillrig.invite i where i.company_id = p_company and i.accepted_at is null
                      and (i.revoked_at is null or (i.declined_at is not null and i.declined_at > now() - interval '14 days')))
    );
end;
$$;

-- Owner clears a declined invite from the list (or cancels an open one).
create or replace function public.drillrig_revoke_invite(p_company uuid, p_invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    perform drillrig.require_owner(p_company);
    update drillrig.invite set revoked_at = coalesce(revoked_at, now()),
                               declined_at = case when declined_at is not null then declined_at - interval '15 days' else null end
    where id = p_invite and company_id = p_company and accepted_at is null;
end;
$$;

-- ===== sign-in company (copied from 0003 without the automatic invite join) and member changes =====
create or replace function public.drillrig_my_company(p_name text default null, p_prefix text default null, p_company uuid default null)
returns table (company_id uuid, company_name text, role text, access_rev bigint, rigs jsonb, companies jsonb, invites jsonb)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_email text;
    v_company uuid;
    v_prefix text;
begin
    if v_uid is null then
        raise exception 'not signed in' using errcode = '28000';
    end if;
    select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;

    -- Invites are never joined automatically any more: the person accepts or rejects them
    -- first (drillrig_my_invites / drillrig_accept_invite / drillrig_join_with_code / drillrig_decline_invite).

    if p_company is not null then
        select m.company_id into v_company from drillrig.member m
        where m.user_id = v_uid and m.company_id = p_company and m.status = 'active';
    end if;
    if v_company is null then
        select m.company_id into v_company from drillrig.member m
        where m.user_id = v_uid and m.status = 'active'
        order by m.created_at limit 1;
    end if;

    if v_company is null then
        insert into drillrig.company (name, created_by)
        values (coalesce(nullif(trim(p_name), ''), 'My Borewell Company'), v_uid)
        returning id into v_company;
        insert into drillrig.member (company_id, user_id, role, email, display_name)
        values (v_company, v_uid, 'owner', v_email,
                (select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') from auth.users u where u.id = v_uid));
    end if;

    -- The company name follows the owner's Settings (it was only set once, at first sign-in,
    -- often to the app's placeholder). Staff see this name on invites.
    if nullif(trim(p_name), '') is not null
       and trim(p_name) not in ('Your Borewell Company', 'My Borewell Company')
       and length(trim(p_name)) <= 200
       and drillrig.my_role(v_company) = 'owner' then
        update drillrig.company c set name = trim(p_name)
        where c.id = v_company and c.name is distinct from trim(p_name);
    end if;

    -- Every company has at least one rig.
    if not exists (select 1 from drillrig.rig r where r.company_id = v_company) then
        v_prefix := coalesce(nullif(left(regexp_replace(upper(coalesce(p_prefix, '')), '[^A-Z0-9]', '', 'g'), 6), ''), 'AB');
        insert into drillrig.rig (company_id, name, bill_prefix, created_by) values (v_company, 'Rig 1', v_prefix, v_uid);
    end if;

    return query
    select c.id, c.name, m.role, m.access_rev,
           drillrig.my_rigs(c.id),
           (select coalesce(jsonb_agg(jsonb_build_object('company_id', c2.id, 'name', c2.name, 'role', m2.role) order by m2.created_at), '[]'::jsonb)
              from drillrig.member m2 join drillrig.company c2 on c2.id = m2.company_id
             where m2.user_id = v_uid and m2.status = 'active'),
           (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'company_id', i.company_id, 'company_name', c3.name, 'role', i.role) order by i.created_at), '[]'::jsonb)
              from drillrig.invite i join drillrig.company c3 on c3.id = i.company_id
             where i.email = v_email and i.accepted_at is null and i.revoked_at is null
               and not exists (select 1 from drillrig.member m3 where m3.company_id = i.company_id and m3.user_id = v_uid and m3.status = 'active'))
    from drillrig.company c
    join drillrig.member m on m.company_id = c.id and m.user_id = v_uid
    where c.id = v_company;
end;
$$;

create or replace function public.drillrig_set_member(p_company uuid, p_user uuid, p_role text, p_rig_ids uuid[], p_active boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_owners integer;
    v_is_owner boolean;
begin
    perform drillrig.require_owner(p_company);
    -- The person who created the company keeps full control: a partner added as Owner
    -- cannot remove or demote them. They can still change their own access themselves.
    if p_user is distinct from auth.uid()
       and p_user = (select c.created_by from drillrig.company c where c.id = p_company)
       and (not p_active or p_role <> 'owner') then
        raise exception 'The company''s creator cannot be removed or changed by another owner' using errcode = '42501';
    end if;
    if p_role not in ('owner', 'manager', 'driver') then
        raise exception 'unknown role' using errcode = '22023';
    end if;
    select m.role = 'owner' into v_is_owner from drillrig.member m
    where m.company_id = p_company and m.user_id = p_user and m.status = 'active';
    if not found then raise exception 'member not found' using errcode = '02000'; end if;

    select count(*) into v_owners from drillrig.member m
    where m.company_id = p_company and m.status = 'active' and m.role = 'owner';
    if v_is_owner and v_owners <= 1 and (not p_active or p_role <> 'owner') then
        raise exception 'the company must keep at least one owner' using errcode = '22023';
    end if;

    update drillrig.member set role = p_role, status = case when p_active then 'active' else 'removed' end
    where company_id = p_company and user_id = p_user;

    delete from drillrig.member_rig where company_id = p_company and user_id = p_user;
    if p_active and p_role <> 'owner' then
        insert into drillrig.member_rig (company_id, user_id, rig_id)
        select p_company, p_user, r.id from drillrig.rig r
        where r.company_id = p_company and r.archived_at is null and r.id = any(coalesce(p_rig_ids, '{}'))
        on conflict do nothing;
    end if;
    perform drillrig.bump_access(p_company, p_user);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.drillrig_invite_preview(text) from public, anon;
revoke all on function public.drillrig_my_invites() from public, anon;
revoke all on function public.drillrig_decline_invite(uuid, text) from public, anon;
grant execute on function public.drillrig_invite_preview(text) to authenticated;
grant execute on function public.drillrig_my_invites() to authenticated;
grant execute on function public.drillrig_decline_invite(uuid, text) to authenticated;
grant execute on function public.drillrig_join_with_code(text) to authenticated;
grant execute on function public.drillrig_accept_invite(uuid) to authenticated;
grant execute on function public.drillrig_team(uuid) to authenticated;
grant execute on function public.drillrig_revoke_invite(uuid, uuid) to authenticated;
grant execute on function public.drillrig_my_company(text, text, uuid) to authenticated;
grant execute on function public.drillrig_set_member(uuid, uuid, text, uuid[], boolean) to authenticated;
