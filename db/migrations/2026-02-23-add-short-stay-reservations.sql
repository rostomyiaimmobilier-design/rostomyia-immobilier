CREATE TABLE IF NOT EXISTS short_stay_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'property_details',
  lang text,
  property_ref text NOT NULL,
  property_title text,
  property_location text,
  property_price text,
  location_type text,
  reservation_option text,
  reservation_option_label text,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  nights integer GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  customer_user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  message text,
  admin_note text,
  CONSTRAINT short_stay_reservations_status_check
    CHECK (status IN ('new', 'contacted', 'confirmed', 'cancelled', 'closed')),
  CONSTRAINT short_stay_reservations_dates_check
    CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS short_stay_reservations_created_at_idx
  ON short_stay_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS short_stay_reservations_status_idx
  ON short_stay_reservations (status);

CREATE INDEX IF NOT EXISTS short_stay_reservations_property_ref_idx
  ON short_stay_reservations (property_ref);

CREATE INDEX IF NOT EXISTS short_stay_reservations_check_in_idx
  ON short_stay_reservations (check_in_date);

ALTER TABLE IF EXISTS short_stay_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS short_stay_reservations_insert_public ON short_stay_reservations;
CREATE POLICY short_stay_reservations_insert_public
  ON short_stay_reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

DROP POLICY IF EXISTS short_stay_reservations_select_authenticated ON short_stay_reservations;
CREATE POLICY short_stay_reservations_select_authenticated
  ON short_stay_reservations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS short_stay_reservations_update_authenticated ON short_stay_reservations;
CREATE POLICY short_stay_reservations_update_authenticated
  ON short_stay_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
