/** D1 / SQLite schema for cohort applications. Also used by migrations and tests. */
export const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS applications (
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
)`;

export const INDEX_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_founder1_email ON applications(founder1_email)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_ip_created ON applications(ip, created_at)`,
];

export const SCHEMA_SQL = [CREATE_TABLE_SQL, ...INDEX_SQL].join(";\n") + ";";

/**
 * Form field name → column, required?, max length.
 * Names match the `name=` attributes on apply.html.
 */
export const FIELDS = [
  ["Team name", "team_name", true, 200],
  ["Founder 1 name", "founder1_name", true, 200],
  ["Founder 1 email", "founder1_email", true, 200],
  ["Founder 1 role", "founder1_role", true, 400],
  ["Founder 1 affiliation", "founder1_affiliation", true, 200],
  ["Founder 2 name", "founder2_name", true, 200],
  ["Founder 2 email", "founder2_email", true, 200],
  ["Founder 2 role", "founder2_role", true, 400],
  ["Founder 2 affiliation", "founder2_affiliation", true, 200],
  ["Founder 3 name", "founder3_name", false, 200],
  ["Founder 3 email", "founder3_email", false, 200],
  ["Who builds it", "who_builds", true, 500],
  ["Links", "links", false, 4000],
  ["Seat", "seat", true, 200],
  ["One line", "one_line", true, 90],
  ["What it is", "what_it_is", true, 900],
  ["Why you", "why_you", true, 700],
  ["Metric", "metric", true, 400],
  ["Baseline today", "baseline_today", true, 200],
  ["Target at week 12", "target_week_12", true, 200],
  ["How it is measured", "how_measured", true, 900],
  ["Who can verify", "who_can_verify", true, 500],
  ["What would make you fail", "what_would_fail", true, 600],
  ["What exists", "what_exists", true, 900],
  ["Video link", "video_link", true, 2000],
  ["Demo or repo", "demo_or_repo", false, 4000],
  ["Hours per week", "hours_per_week", true, 80],
  ["Full commitment", "full_commitment", true, 200],
  ["Equipment needed", "equipment_needed", true, 600],
  ["Other commitments", "other_commitments", false, 2000],
  ["How you heard", "how_you_heard", false, 400],
  ["Phone", "phone", true, 80],
  ["Anything else", "anything_else", false, 4000],
];

export const INSERT_SQL = `INSERT INTO applications (
  id, created_at,
  team_name, founder1_name, founder1_email, founder1_role, founder1_affiliation,
  founder2_name, founder2_email, founder2_role, founder2_affiliation,
  founder3_name, founder3_email, who_builds, links, seat, one_line, what_it_is, why_you,
  metric, baseline_today, target_week_12, how_measured, who_can_verify, what_would_fail,
  what_exists, video_link, demo_or_repo, hours_per_week, full_commitment, equipment_needed,
  other_commitments, how_you_heard, phone, anything_else,
  answers_json, plain_text, ip, user_agent
) VALUES (
  ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?
)`;

export const RATE_LIMIT_SQL = `
  SELECT COUNT(*) AS n FROM applications
  WHERE ip = ? AND created_at > ?
`;

export const LIST_SQL = `
  SELECT id, created_at, team_name, founder1_name, founder1_email, founder2_name,
         founder2_email, seat, one_line, metric, phone
  FROM applications
  ORDER BY created_at DESC
  LIMIT 200
`;

export const GET_SQL = `SELECT * FROM applications WHERE id = ?`;
