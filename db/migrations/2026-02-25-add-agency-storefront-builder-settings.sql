ALTER TABLE IF EXISTS public.agency_storefronts
  ADD COLUMN IF NOT EXISTS theme_preset text,
  ADD COLUMN IF NOT EXISTS show_services_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_highlights_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_contact_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_marketplace_section boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_theme_preset_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_theme_preset_check
      CHECK (theme_preset IS NULL OR theme_preset IN ('premium', 'sunset', 'emerald'));
  END IF;
END $$;
