DO $$
BEGIN
  IF to_regclass('public.app_quartiers') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.app_quartiers
  SET commune = 'Oran'
  WHERE commune IS NULL OR btrim(commune) = '';

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_quartiers'
      AND column_name = 'commune_ci'
  ) THEN
    EXECUTE '
      ALTER TABLE public.app_quartiers
      ADD COLUMN commune_ci text GENERATED ALWAYS AS (lower(btrim(commune))) STORED
    ';
  END IF;

  ALTER TABLE public.app_quartiers
    DROP CONSTRAINT IF EXISTS app_quartiers_name_ci_unique;

  EXECUTE '
    CREATE UNIQUE INDEX IF NOT EXISTS app_quartiers_commune_name_ci_unique_idx
    ON public.app_quartiers (commune_ci, name_ci)
  ';
END;
$$;
