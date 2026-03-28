-- Email alerts
CREATE TABLE IF NOT EXISTS email_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  municipality TEXT,
  category TEXT,
  alert_type TEXT NOT NULL DEFAULT 'price_change',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, municipality, category, alert_type)
);
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON email_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own alerts" ON email_alerts FOR SELECT USING (true);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  pros TEXT,
  cons TEXT,
  child_age_group TEXT,
  verified BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_institution ON reviews (institution_id, approved, created_at DESC);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Read approved" ON reviews FOR SELECT USING (approved = true);
