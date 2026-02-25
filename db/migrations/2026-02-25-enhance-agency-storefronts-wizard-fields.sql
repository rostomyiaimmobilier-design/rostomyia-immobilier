ALTER TABLE IF EXISTS public.agency_storefronts
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS about_title text,
  ADD COLUMN IF NOT EXISTS services jsonb,
  ADD COLUMN IF NOT EXISTS highlights jsonb,
  ADD COLUMN IF NOT EXISTS service_areas text,
  ADD COLUMN IF NOT EXISTS languages_spoken text,
  ADD COLUMN IF NOT EXISTS business_hours text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_address text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS marketplace_title text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text,
  ADD COLUMN IF NOT EXISTS brand_secondary_color text,
  ADD COLUMN IF NOT EXISTS brand_accent_color text;

UPDATE public.agency_storefronts
SET services = '[]'::jsonb
WHERE services IS NULL;

UPDATE public.agency_storefronts
SET highlights = '[]'::jsonb
WHERE highlights IS NULL;

ALTER TABLE public.agency_storefronts
  ALTER COLUMN services SET DEFAULT '[]'::jsonb,
  ALTER COLUMN highlights SET DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_services_array_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_services_array_check
      CHECK (services IS NULL OR jsonb_typeof(services) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_highlights_array_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_highlights_array_check
      CHECK (highlights IS NULL OR jsonb_typeof(highlights) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_brand_primary_color_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_brand_primary_color_check
      CHECK (brand_primary_color IS NULL OR brand_primary_color ~* '^#[0-9a-f]{6}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_brand_secondary_color_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_brand_secondary_color_check
      CHECK (brand_secondary_color IS NULL OR brand_secondary_color ~* '^#[0-9a-f]{6}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_brand_accent_color_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_brand_accent_color_check
      CHECK (brand_accent_color IS NULL OR brand_accent_color ~* '^#[0-9a-f]{6}$');
  END IF;
END $$;
