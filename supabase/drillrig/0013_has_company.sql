-- DrillRig cloud sync — 0013: "Who are you?" after the first sign-in.
-- Run after 0011. Touches only public.drillrig_* functions. Safe to run again.
--
-- drillrig_my_company creates a business for anybody who has none, so a driver who signed in
-- before the owner invited him became the "owner" of an empty business. The app now asks
-- first ("I own the rig" / "I work on a rig") and only calls drillrig_my_company for owners.
-- To ask, it needs to know whether this person already belongs to a business:
begin;

create or replace function public.drillrig_has_company()
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from drillrig.member m
        where m.user_id = auth.uid() and m.status = 'active'
    );
$$;

revoke all on function public.drillrig_has_company() from public, anon;
grant execute on function public.drillrig_has_company() to authenticated;

commit;
