CREATE TABLE IF NOT EXISTS hero_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'image',
  image_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  fit TEXT NOT NULL DEFAULT 'cover',
  focus TEXT NOT NULL DEFAULT 'center',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hero_media_order ON hero_media(position ASC, id ASC);
