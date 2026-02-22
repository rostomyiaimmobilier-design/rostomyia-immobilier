CREATE TABLE IF NOT EXISTS public.app_quartiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune text NOT NULL DEFAULT 'Oran',
  name text NOT NULL,
  name_ci text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_quartiers_name_not_blank CHECK (char_length(btrim(name)) >= 2),
  CONSTRAINT app_quartiers_name_ci_unique UNIQUE (name_ci)
);

CREATE INDEX IF NOT EXISTS app_quartiers_active_sort_idx
  ON public.app_quartiers (is_active, sort_order, name);

CREATE OR REPLACE FUNCTION public.set_app_quartiers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_quartiers_updated_at ON public.app_quartiers;
CREATE TRIGGER trg_app_quartiers_updated_at
BEFORE UPDATE ON public.app_quartiers
FOR EACH ROW
EXECUTE FUNCTION public.set_app_quartiers_updated_at();

WITH seed(name, sort_order) AS (
  VALUES
    ('Akid Lotfi', 1),
    ('Canastel', 2),
    ('Hai Sabah', 3),
    ('USTO', 4),
    ('Maraval', 5),
    ('M''dina Jdida', 6),
    ('Es Senia Centre', 7),
    ('El Yasmine', 8),
    ('Belgaid', 9),
    ('Hai El Badr', 10),
    ('Sidi El Bachir', 11),
    ('Les Amandiers', 12),
    ('Eckmuhl', 13),
    ('Gambetta', 14),
    ('Plateau', 15),
    ('Karguentah', 16),
    ('Miramar', 17),
    ('Bouisseville', 18),
    ('Trouville', 19),
    ('Kristel', 20),
    ('Douar Belgaid', 21)
)
INSERT INTO public.app_quartiers (name, commune, sort_order)
SELECT seed.name, 'Oran', seed.sort_order
FROM seed
ON CONFLICT (name_ci) DO UPDATE
SET
  commune = EXCLUDED.commune,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
