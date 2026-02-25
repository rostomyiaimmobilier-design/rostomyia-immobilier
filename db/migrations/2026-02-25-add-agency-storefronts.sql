CREATE TABLE IF NOT EXISTS public.agency_storefronts (
  agency_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  tagline text,
  description text,
  cover_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  whatsapp text,
  is_enabled boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_storefronts_slug_format_check
    CHECK (
      slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'
      AND slug = lower(slug)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_storefronts_slug_unique_idx
  ON public.agency_storefronts (slug);

CREATE INDEX IF NOT EXISTS agency_storefronts_enabled_slug_idx
  ON public.agency_storefronts (is_enabled, slug);

CREATE OR REPLACE FUNCTION public.tg_agency_storefronts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_storefronts_set_updated_at ON public.agency_storefronts;
CREATE TRIGGER trg_agency_storefronts_set_updated_at
  BEFORE UPDATE ON public.agency_storefronts
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_agency_storefronts_set_updated_at();

ALTER TABLE public.agency_storefronts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_storefronts_public_read_enabled ON public.agency_storefronts;
CREATE POLICY agency_storefronts_public_read_enabled
  ON public.agency_storefronts
  FOR SELECT
  TO anon, authenticated
  USING (is_enabled = true);

GRANT SELECT ON public.agency_storefronts TO anon, authenticated;

INSERT INTO public.agency_storefronts (
  agency_user_id,
  slug,
  tagline,
  description,
  cover_url,
  facebook_url,
  instagram_url,
  tiktok_url,
  whatsapp,
  is_enabled,
  completed_at
)
WITH raw_agencies AS (
  SELECT
    u.id AS agency_user_id,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_tagline', '')), '') AS tagline,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_description', '')), '') AS description,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_cover_url', '')), '') AS cover_url,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_facebook_url', '')), '') AS facebook_url,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_instagram_url', '')), '') AS instagram_url,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_tiktok_url', '')), '') AS tiktok_url,
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'agency_whatsapp', u.raw_user_meta_data ->> 'agency_phone', '')), '') AS whatsapp,
    CASE
      WHEN lower(trim(coalesce(u.raw_user_meta_data ->> 'agency_storefront_enabled', ''))) IN ('false', '0', 'no')
        THEN false
      ELSE true
    END AS is_enabled,
    regexp_replace(
      regexp_replace(
        lower(trim(coalesce(
          u.raw_user_meta_data ->> 'agency_storefront_slug',
          u.raw_user_meta_data ->> 'agency_name',
          u.email,
          ''
        ))),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '(^-+|-+$)',
      '',
      'g'
    ) AS base_slug
  FROM auth.users u
  WHERE lower(trim(coalesce(u.raw_user_meta_data ->> 'account_type', ''))) = 'agency'
),
normalized AS (
  SELECT
    agency_user_id,
    CASE
      WHEN length(base_slug) >= 3 THEN regexp_replace(left(base_slug, 80), '(^-+|-+$)', '', 'g')
      ELSE 'agency-' || substr(agency_user_id::text, 1, 8)
    END AS pre_slug,
    tagline,
    description,
    cover_url,
    facebook_url,
    instagram_url,
    tiktok_url,
    whatsapp,
    is_enabled
  FROM raw_agencies
),
prepared AS (
  SELECT
    agency_user_id,
    CASE
      WHEN length(pre_slug) >= 3 THEN pre_slug
      ELSE 'agency-' || substr(agency_user_id::text, 1, 8)
    END AS initial_slug,
    tagline,
    description,
    cover_url,
    facebook_url,
    instagram_url,
    tiktok_url,
    whatsapp,
    is_enabled
  FROM normalized
),
ranked AS (
  SELECT
    p.*,
    row_number() OVER (PARTITION BY p.initial_slug ORDER BY p.agency_user_id) AS slug_rank
  FROM prepared p
),
resolved AS (
  SELECT
    r.agency_user_id,
    CASE
      WHEN r.slug_rank = 1
        AND NOT EXISTS (
          SELECT 1
          FROM public.agency_storefronts s
          WHERE s.slug = r.initial_slug
            AND s.agency_user_id <> r.agency_user_id
        )
      THEN r.initial_slug
      ELSE left(r.initial_slug, 73) || '-' || substr(md5(r.agency_user_id::text), 1, 6)
    END AS slug,
    r.tagline,
    r.description,
    r.cover_url,
    r.facebook_url,
    r.instagram_url,
    r.tiktok_url,
    r.whatsapp,
    r.is_enabled
  FROM ranked r
)
SELECT
  agency_user_id,
  slug,
  tagline,
  description,
  cover_url,
  facebook_url,
  instagram_url,
  tiktok_url,
  whatsapp,
  is_enabled,
  NULL::timestamptz AS completed_at
FROM resolved
ON CONFLICT (agency_user_id) DO NOTHING;
