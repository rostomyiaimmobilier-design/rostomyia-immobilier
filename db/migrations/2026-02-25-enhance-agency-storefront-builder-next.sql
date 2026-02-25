CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.agency_storefronts
  ADD COLUMN IF NOT EXISTS section_order jsonb NOT NULL DEFAULT '["about","services","contact","marketplace"]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_section_order_array_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_section_order_array_check
      CHECK (section_order IS NULL OR jsonb_typeof(section_order) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_custom_domain_format_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_custom_domain_format_check
      CHECK (
        custom_domain IS NULL
        OR lower(custom_domain) ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefronts_custom_domain_status_check'
      AND conrelid = 'public.agency_storefronts'::regclass
  ) THEN
    ALTER TABLE public.agency_storefronts
      ADD CONSTRAINT agency_storefronts_custom_domain_status_check
      CHECK (custom_domain_status IN ('unverified', 'pending_dns', 'verified', 'error'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS agency_storefronts_custom_domain_unique_idx
  ON public.agency_storefronts (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.agency_storefront_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storefront_slug text NOT NULL,
  source_path text,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_storefront_leads_status_check'
      AND conrelid = 'public.agency_storefront_leads'::regclass
  ) THEN
    ALTER TABLE public.agency_storefront_leads
      ADD CONSTRAINT agency_storefront_leads_status_check
      CHECK (status IN ('new', 'contacted', 'qualified', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agency_storefront_leads_agency_created_idx
  ON public.agency_storefront_leads (agency_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agency_storefront_leads_status_created_idx
  ON public.agency_storefront_leads (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_agency_storefront_leads_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_storefront_leads_set_updated_at ON public.agency_storefront_leads;
CREATE TRIGGER trg_agency_storefront_leads_set_updated_at
  BEFORE UPDATE ON public.agency_storefront_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_agency_storefront_leads_set_updated_at();
