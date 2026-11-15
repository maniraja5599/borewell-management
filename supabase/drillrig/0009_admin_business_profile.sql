-- 0009: admin console — a business's own details (read-only). Run after 0007 / 0008.
--
-- What the owner typed into the app after signing in: company name, tagline, phones, address,
-- GSTIN, UPI, website, bill prefix and next numbers, casing pipe names, footer notes, theme; plus
-- their rate cards and the Google account that owns the business. Read from the synced
-- 'setting' records (brand, rateProfiles), never changed here.
-- Admins only; every view is written to drillrig.admin_log (disclosed in privacy.html).
-- Safe to run more than once. (volatile: it writes to admin_log, so it cannot run in a read-only call.)

create or replace function public.drillrig_admin_profile(p_company uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
    v_brand jsonb;
    v_rates jsonb;
    v_logo text;
begin
    perform drillrig.require_admin();
    perform drillrig.admin_note('view_profile', p_company, null);

    select r.data into v_brand from drillrig.record r
     where r.company_id = p_company and r.kind = 'setting' and r.id = 'brand' and not r.deleted;
    select r.data into v_rates from drillrig.record r
     where r.company_id = p_company and r.kind = 'setting' and r.id = 'rateProfiles' and not r.deleted;

    v_logo := coalesce(v_brand->>'logoDataUrl', '');

    return jsonb_build_object(
        'owner', (select jsonb_build_object('email', u.email, 'name', u.raw_user_meta_data->>'full_name',
                                            'signed_up', u.created_at, 'last_sign_in', u.last_sign_in_at)
                    from drillrig.company c join auth.users u on u.id = c.created_by where c.id = p_company),
        -- the logo is sent only when small (it is a picture stored inside the settings)
        'brand', case when v_brand is null then null else
                    (v_brand - 'logoDataUrl') || jsonb_build_object(
                        'hasLogo', length(v_logo) > 0,
                        'logoDataUrl', case when length(v_logo) between 1 and 300000 then v_logo else null end) end,
        'rateCards', coalesce((
            select jsonb_agg(jsonb_build_object(
                'name', p->>'name',
                'isDefault', coalesce((p->>'isDefault')::boolean, false),
                'base', p#>'{rates,baseDrillingRate}',
                'pvc7', p#>'{rates,pvc7Rate}',
                'pvc10', p#>'{rates,pvc10Rate}',
                'bata', p#>'{rates,boreBataRate}',
                'flush', p#>'{rates,oldBoreRate}',
                'grace', p#>'{rates,slabBufferFt}',
                'gst', p#>'{rates,gstPercentage}',
                'slabs', jsonb_array_length(coalesce(p#>'{rates,slabRates}', '[]'::jsonb)),
                'maxDepth', (select max((s->>'end')::int) from jsonb_array_elements(coalesce(p#>'{rates,slabRates}', '[]'::jsonb)) s)))
              from jsonb_array_elements(case when jsonb_typeof(v_rates) = 'array' then v_rates else '[]'::jsonb end) p), '[]'::jsonb)
    );
end;
$$;

revoke all on function public.drillrig_admin_profile(uuid) from public, anon;
grant execute on function public.drillrig_admin_profile(uuid) to authenticated;
