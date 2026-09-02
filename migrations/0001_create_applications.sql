-- Cohort one applications. Applied locally with:
--   npx wrangler d1 migrations apply intilaq --local
-- and in production after `npx wrangler d1 create intilaq`.
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  team_name TEXT NOT NULL,
  founder1_name TEXT NOT NULL,
  founder1_email TEXT NOT NULL,
  founder1_role TEXT NOT NULL,
  founder1_affiliation TEXT NOT NULL,
  founder2_name TEXT NOT NULL,
  founder2_email TEXT NOT NULL,
  founder2_role TEXT NOT NULL,
  founder2_affiliation TEXT NOT NULL,
  founder3_name TEXT,
  founder3_email TEXT,
  who_builds TEXT NOT NULL,
  links TEXT,
  seat TEXT NOT NULL,
  one_line TEXT NOT NULL,
  what_it_is TEXT NOT NULL,
  why_you TEXT NOT NULL,
  metric TEXT NOT NULL,
  baseline_today TEXT NOT NULL,
  target_week_12 TEXT NOT NULL,
  how_measured TEXT NOT NULL,
  who_can_verify TEXT NOT NULL,
  what_would_fail TEXT NOT NULL,
  what_exists TEXT NOT NULL,
  video_link TEXT NOT NULL,
  demo_or_repo TEXT,
  hours_per_week TEXT NOT NULL,
  full_commitment TEXT NOT NULL,
  equipment_needed TEXT NOT NULL,
  other_commitments TEXT,
  how_you_heard TEXT,
  phone TEXT NOT NULL,
  anything_else TEXT,
  answers_json TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_founder1_email ON applications(founder1_email);
CREATE INDEX IF NOT EXISTS idx_applications_ip_created ON applications(ip, created_at);
