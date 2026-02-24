-- Ensure admin notification visibility for profile-based admins and re-bind owner lead trigger.

CREATE OR REPLACE FUNCTION public.is_backoffice_actor()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  j jsonb := auth.jwt();
  user_account_type text := lower(trim(coalesce(j -> 'user_metadata' ->> 'account_type', '')));
  app_account_type text := lower(trim(coalesce(j -> 'app_metadata' ->> 'account_type', '')));
  user_role text := lower(trim(coalesce(j -> 'user_metadata' ->> 'role', '')));
  app_role text := lower(trim(coalesce(j -> 'app_metadata' ->> 'role', '')));
  user_is_admin text := lower(trim(coalesce(j -> 'user_metadata' ->> 'is_admin', '')));
  app_is_admin text := lower(trim(coalesce(j -> 'app_metadata' ->> 'is_admin', '')));
  app_roles jsonb := coalesce(j -> 'app_metadata' -> 'roles', '[]'::jsonb);
  profile_is_admin boolean := false;
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    BEGIN
      SELECT coalesce(p.is_admin, false)
      INTO profile_is_admin
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        profile_is_admin := false;
    END;
  END IF;

  RETURN
    profile_is_admin
    OR user_account_type IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR app_account_type IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR user_role IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR app_role IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR user_is_admin IN ('true', '1')
    OR app_is_admin IN ('true', '1')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(app_roles) AS role(value)
      WHERE lower(trim(role.value)) IN ('agency', 'admin', 'super_admin', 'superadmin')
    );
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.owner_leads') IS NOT NULL
     AND to_regprocedure('public.trg_admin_notify_owner_lead_insert()') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_admin_notify_owner_lead_insert ON public.owner_leads';
    EXECUTE 'CREATE TRIGGER trg_admin_notify_owner_lead_insert
      AFTER INSERT ON public.owner_leads
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_admin_notify_owner_lead_insert()';
  END IF;
END
$$;
