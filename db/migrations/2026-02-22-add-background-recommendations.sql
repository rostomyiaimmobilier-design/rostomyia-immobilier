CREATE TABLE IF NOT EXISTS user_behavior_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'favorite', 'contact', 'search_click')),
  property_ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_behavior_events_user_created_idx
  ON user_behavior_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_behavior_events_user_event_idx
  ON user_behavior_events (user_id, event_type);

CREATE INDEX IF NOT EXISTS user_behavior_events_property_ref_idx
  ON user_behavior_events (property_ref);

CREATE TABLE IF NOT EXISTS user_recommendation_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  commune_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  amenity_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  deal_type_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_recommendations (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_ref text NOT NULL,
  score double precision NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  rank integer NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_ref),
  UNIQUE (user_id, rank)
);

CREATE INDEX IF NOT EXISTS user_recommendations_user_rank_idx
  ON user_recommendations (user_id, rank);

ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_behavior_events_select_own ON user_behavior_events;
CREATE POLICY user_behavior_events_select_own
  ON user_behavior_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_behavior_events_insert_own ON user_behavior_events;
CREATE POLICY user_behavior_events_insert_own
  ON user_behavior_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_recommendation_profiles_select_own ON user_recommendation_profiles;
CREATE POLICY user_recommendation_profiles_select_own
  ON user_recommendation_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_recommendations_select_own ON user_recommendations;
CREATE POLICY user_recommendations_select_own
  ON user_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON user_behavior_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_behavior_events_id_seq TO authenticated;
GRANT SELECT ON user_recommendation_profiles TO authenticated;
GRANT SELECT ON user_recommendations TO authenticated;
