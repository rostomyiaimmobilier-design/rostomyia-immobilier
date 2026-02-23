-- Block agency/admin accounts from consumer actions (visit requests, short-stay reservations).

CREATE OR REPLACE FUNCTION public.is_backoffice_actor()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH claims AS (
    SELECT auth.jwt() AS j
  ),
  normalized AS (
    SELECT
      lower(trim(coalesce(j -> 'user_metadata' ->> 'account_type', ''))) AS user_account_type,
      lower(trim(coalesce(j -> 'app_metadata' ->> 'account_type', ''))) AS app_account_type,
      lower(trim(coalesce(j -> 'user_metadata' ->> 'role', ''))) AS user_role,
      lower(trim(coalesce(j -> 'app_metadata' ->> 'role', ''))) AS app_role,
      lower(trim(coalesce(j -> 'user_metadata' ->> 'is_admin', ''))) AS user_is_admin,
      lower(trim(coalesce(j -> 'app_metadata' ->> 'is_admin', ''))) AS app_is_admin,
      coalesce(j -> 'app_metadata' -> 'roles', '[]'::jsonb) AS app_roles
    FROM claims
  )
  SELECT
    user_account_type IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR app_account_type IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR user_role IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR app_role IN ('agency', 'admin', 'super_admin', 'superadmin')
    OR user_is_admin IN ('true', '1')
    OR app_is_admin IN ('true', '1')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(app_roles) AS role(value)
      WHERE lower(trim(role.value)) IN ('agency', 'admin', 'super_admin', 'superadmin')
    )
  FROM normalized;
$$;

DROP POLICY IF EXISTS viewing_requests_insert_public ON viewing_requests;
CREATE POLICY viewing_requests_insert_public
  ON viewing_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    COALESCE(status, 'new') = 'new'
    AND (
      auth.role() = 'anon'
      OR (auth.role() = 'authenticated' AND NOT public.is_backoffice_actor())
    )
  );

DROP POLICY IF EXISTS short_stay_reservations_insert_public ON short_stay_reservations;
CREATE POLICY short_stay_reservations_insert_public
  ON short_stay_reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND (
      auth.role() = 'anon'
      OR (auth.role() = 'authenticated' AND NOT public.is_backoffice_actor())
    )
  );
