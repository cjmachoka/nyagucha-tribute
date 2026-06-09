CREATE TABLE IF NOT EXISTS tributes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  message     TEXT NOT NULL,
  email       TEXT,
  category    TEXT NOT NULL DEFAULT 'other',
  image_key   TEXT,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tributes_status ON tributes(status);
CREATE INDEX IF NOT EXISTS idx_tributes_category ON tributes(category);
CREATE INDEX IF NOT EXISTS idx_tributes_created ON tributes(created_at DESC);
