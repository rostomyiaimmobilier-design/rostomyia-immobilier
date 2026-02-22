CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS property_semantic_index (
  property_id uuid PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  property_ref text NOT NULL,
  text_content text NOT NULL,
  embedding vector(1536) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_semantic_index_property_ref_idx
  ON property_semantic_index (property_ref);

CREATE INDEX IF NOT EXISTS property_semantic_index_embedding_ivfflat_idx
  ON property_semantic_index
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_property_semantic(
  query_embedding_text text,
  match_count integer DEFAULT 40,
  min_similarity double precision DEFAULT 0.43
)
RETURNS TABLE (
  property_id uuid,
  ref text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    psi.property_id,
    p.ref,
    1 - (psi.embedding <=> (query_embedding_text)::vector) AS similarity
  FROM property_semantic_index psi
  JOIN properties p ON p.id = psi.property_id
  WHERE 1 - (psi.embedding <=> (query_embedding_text)::vector) >= min_similarity
  ORDER BY psi.embedding <=> (query_embedding_text)::vector
  LIMIT GREATEST(match_count, 1);
$$;

GRANT EXECUTE ON FUNCTION match_property_semantic(text, integer, double precision)
  TO anon, authenticated, service_role; 
