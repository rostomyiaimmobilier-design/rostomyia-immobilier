-- Reservation system enhancements:
-- - hold status lifecycle
-- - overlap-safe booking enforcement
-- - maintenance routine (expire holds / auto-close confirmed stays)

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE IF EXISTS short_stay_reservations
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'short_stay_reservations_status_check'
      AND conrelid = 'public.short_stay_reservations'::regclass
  ) THEN
    ALTER TABLE public.short_stay_reservations
      DROP CONSTRAINT short_stay_reservations_status_check;
  END IF;
END $$;

ALTER TABLE IF EXISTS short_stay_reservations
  ADD CONSTRAINT short_stay_reservations_status_check
  CHECK (status IN ('hold', 'new', 'contacted', 'confirmed', 'cancelled', 'closed'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'short_stay_reservations_no_overlap_active'
      AND conrelid = 'public.short_stay_reservations'::regclass
  ) THEN
    ALTER TABLE public.short_stay_reservations
      ADD CONSTRAINT short_stay_reservations_no_overlap_active
      EXCLUDE USING gist (
        property_ref WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
      )
      WHERE (status IN ('hold', 'new', 'contacted', 'confirmed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS short_stay_reservations_hold_expires_idx
  ON short_stay_reservations (hold_expires_at)
  WHERE status = 'hold';

CREATE INDEX IF NOT EXISTS short_stay_reservations_property_dates_idx
  ON short_stay_reservations (property_ref, check_in_date, check_out_date);

CREATE TABLE IF NOT EXISTS property_reservation_availability_cache (
  property_ref text PRIMARY KEY,
  is_reserved_now boolean NOT NULL DEFAULT false,
  reserved_until date,
  next_available_check_in date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.tg_short_stay_reservations_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_short_stay_reservations_set_updated_at ON public.short_stay_reservations;
CREATE TRIGGER trg_short_stay_reservations_set_updated_at
  BEFORE UPDATE ON public.short_stay_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_short_stay_reservations_set_updated_at();

CREATE OR REPLACE FUNCTION public.maintain_short_stay_reservations(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_cancelled_count integer := 0;
  closed_count integer := 0;
BEGIN
  UPDATE public.short_stay_reservations
  SET
    status = 'cancelled',
    cancellation_reason = COALESCE(cancellation_reason, 'hold_expired_auto'),
    cancelled_at = COALESCE(cancelled_at, p_now)
  WHERE status = 'hold'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= p_now;
  GET DIAGNOSTICS hold_cancelled_count = ROW_COUNT;

  UPDATE public.short_stay_reservations
  SET
    status = 'closed',
    closed_at = COALESCE(closed_at, p_now)
  WHERE status = 'confirmed'
    AND check_out_date <= p_now::date;
  GET DIAGNOSTICS closed_count = ROW_COUNT;

  DELETE FROM public.property_reservation_availability_cache;

  INSERT INTO public.property_reservation_availability_cache (
    property_ref,
    is_reserved_now,
    reserved_until,
    next_available_check_in,
    updated_at
  )
  SELECT
    x.property_ref,
    true,
    x.reserved_until,
    x.reserved_until + 1,
    p_now
  FROM (
    SELECT
      property_ref,
      max(check_out_date) AS reserved_until
    FROM public.short_stay_reservations
    WHERE status IN ('hold', 'new', 'contacted', 'confirmed')
      AND (
        status <> 'hold'
        OR hold_expires_at IS NULL
        OR hold_expires_at > p_now
      )
      AND check_in_date <= p_now::date
      AND check_out_date >= p_now::date
    GROUP BY property_ref
  ) x;

  RETURN jsonb_build_object(
    'hold_cancelled', hold_cancelled_count,
    'closed_confirmed', closed_count,
    'availability_cache_rows', (SELECT count(*) FROM public.property_reservation_availability_cache)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_short_stay_reservation(
  p_source text,
  p_lang text,
  p_property_ref text,
  p_property_title text,
  p_property_location text,
  p_property_price text,
  p_location_type text,
  p_reservation_option text,
  p_reservation_option_label text,
  p_check_in_date date,
  p_check_out_date date,
  p_customer_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_message text,
  p_hold_minutes integer DEFAULT 15,
  p_auto_confirm boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  status text,
  check_in_date date,
  check_out_date date,
  nights integer,
  hold_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_status text := CASE WHEN p_auto_confirm THEN 'confirmed' ELSE 'hold' END;
  v_hold_expires_at timestamptz := NULL;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(p_property_ref, ''), 0));

  -- Cleanup expired hold rows for this property inside the same transaction.
  UPDATE public.short_stay_reservations AS ssr
  SET
    status = 'cancelled',
    cancellation_reason = COALESCE(ssr.cancellation_reason, 'hold_expired_auto'),
    cancelled_at = COALESCE(ssr.cancelled_at, v_now)
  WHERE ssr.property_ref = p_property_ref
    AND ssr.status = 'hold'
    AND ssr.hold_expires_at IS NOT NULL
    AND ssr.hold_expires_at <= v_now;

  IF v_status = 'hold' THEN
    v_hold_expires_at := v_now + make_interval(mins => GREATEST(1, COALESCE(p_hold_minutes, 15)));
  END IF;

  BEGIN
    INSERT INTO public.short_stay_reservations (
      status,
      source,
      lang,
      property_ref,
      property_title,
      property_location,
      property_price,
      location_type,
      reservation_option,
      reservation_option_label,
      check_in_date,
      check_out_date,
      customer_user_id,
      customer_name,
      customer_phone,
      customer_email,
      message,
      hold_expires_at,
      confirmed_at
    )
    VALUES (
      v_status,
      COALESCE(NULLIF(trim(COALESCE(p_source, '')), ''), 'property_details'),
      p_lang,
      p_property_ref,
      p_property_title,
      p_property_location,
      p_property_price,
      p_location_type,
      p_reservation_option,
      p_reservation_option_label,
      p_check_in_date,
      p_check_out_date,
      p_customer_user_id,
      p_customer_name,
      p_customer_phone,
      p_customer_email,
      p_message,
      v_hold_expires_at,
      CASE WHEN v_status = 'confirmed' THEN v_now ELSE NULL END
    )
    RETURNING
      short_stay_reservations.id,
      short_stay_reservations.status,
      short_stay_reservations.check_in_date,
      short_stay_reservations.check_out_date,
      short_stay_reservations.nights,
      short_stay_reservations.hold_expires_at
    INTO id, status, check_in_date, check_out_date, nights, hold_expires_at;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'reservation_overlap'
        USING ERRCODE = 'P0001';
  END;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.maintain_short_stay_reservations(timestamptz) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_short_stay_reservation(
  text, text, text, text, text, text, text, text, text, date, date, uuid, text, text, text, text, integer, boolean
) TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'short_stay_reservations_maintenance_nightly';
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;

    PERFORM cron.schedule(
      'short_stay_reservations_maintenance_nightly',
      '15 1 * * *',
      'SELECT public.maintain_short_stay_reservations(now());'
    );
  END IF;
EXCEPTION
  WHEN undefined_function OR undefined_table OR invalid_schema_name THEN
    -- pg_cron may be unavailable depending on deployment.
    NULL;
END $$;

