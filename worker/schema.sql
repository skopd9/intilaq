CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications (created_at DESC);
