CREATE TABLE IF NOT EXISTS public.app_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ci text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  name_ar text,
  daira_id integer,
  daira_name text,
  wilaya_id integer,
  wilaya_code text,
  wilaya_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_communes_name_not_blank CHECK (char_length(btrim(name)) >= 2)
);
A
CREATE INDEX IF NOT EXISTS app_communes_active_name_idx
  ON public.app_communes (is_active, name);

CREATE INDEX IF NOT EXISTS app_communes_wilaya_idx
  ON public.app_communes (wilaya_code, wilaya_name, is_active);

CREATE OR REPLACE FUNCTION public.set_app_communes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_communes_updated_at ON public.app_communes;
CREATE TRIGGER trg_app_communes_updated_at
BEFORE UPDATE ON public.app_communes
FOR EACH ROW
EXECUTE FUNCTION public.set_app_communes_updated_at();
