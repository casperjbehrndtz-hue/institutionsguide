-- Add structured dimension ratings to reviews
-- Stores per-dimension ratings as JSONB: {personale: 4, mad: 3, lokaler: 5, udearealer: 4, kommunikation: 3}
-- All dimensions are optional (nullable JSONB), backward compatible with existing reviews.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS dimension_ratings JSONB;

-- Validate that dimension_ratings values are 1-5 integers for known keys
ALTER TABLE reviews ADD CONSTRAINT dimension_ratings_valid CHECK (
  dimension_ratings IS NULL
  OR (
    dimension_ratings IS NOT NULL
    AND (dimension_ratings->>'personale' IS NULL OR (dimension_ratings->>'personale')::int BETWEEN 1 AND 5)
    AND (dimension_ratings->>'mad' IS NULL OR (dimension_ratings->>'mad')::int BETWEEN 1 AND 5)
    AND (dimension_ratings->>'lokaler' IS NULL OR (dimension_ratings->>'lokaler')::int BETWEEN 1 AND 5)
    AND (dimension_ratings->>'udearealer' IS NULL OR (dimension_ratings->>'udearealer')::int BETWEEN 1 AND 5)
    AND (dimension_ratings->>'kommunikation' IS NULL OR (dimension_ratings->>'kommunikation')::int BETWEEN 1 AND 5)
  )
);
