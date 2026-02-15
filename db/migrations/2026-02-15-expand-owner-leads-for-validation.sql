-- Extend owner leads with richer client submission data and admin validation fields.

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS whatsapp text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS preferred_contact_method text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS transaction_type text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS location_type text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS commune text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS residence_name text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS baths integer;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS floor integer;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS year_built integer;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS furnishing_type text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS property_condition text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS availability text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS legal_docs text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS payment_terms text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_parking boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_elevator boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_security boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_balcony boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_central_heating boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_air_conditioning boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS has_fiber boolean;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS photo_links text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS validation_note text;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE IF EXISTS owner_leads
  ADD COLUMN IF NOT EXISTS validated_by uuid;

CREATE INDEX IF NOT EXISTS idx_owner_leads_status_created_at
  ON owner_leads (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_leads_intent
  ON owner_leads (intent);

CREATE INDEX IF NOT EXISTS idx_owner_leads_property_type
  ON owner_leads (property_type);
