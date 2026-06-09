-- CMS schema: site settings, announcements, gallery, biography
-- Apply once in D1 Console after the initial schema.sql

CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL DEFAULT 'general',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link_url    TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(pinned DESC, position ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  caption     TEXT,
  album       TEXT NOT NULL DEFAULT 'other',
  image_key   TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_status ON gallery_photos(status);
CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_photos(position ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_gallery_album ON gallery_photos(album);

CREATE TABLE IF NOT EXISTS bio_chapters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bio_status ON bio_chapters(status);
CREATE INDEX IF NOT EXISTS idx_bio_order ON bio_chapters(position ASC, id ASC);

CREATE TABLE IF NOT EXISTS bio_chapter_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id  INTEGER NOT NULL,
  caption     TEXT,
  image_key   TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (chapter_id) REFERENCES bio_chapters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bio_photos_chapter ON bio_chapter_photos(chapter_id, position ASC);

-- Seed defaults so the public site renders something even before any edits

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('hero_eyebrow', 'In loving memory'),
  ('hero_name', 'Dr. Vincent Magubo Nyagucha'),
  ('hero_meta', 'Ophthalmologist · [ dates to be added ]'),
  ('hero_image_url', ''),
  ('intro_heading', 'He gave us sight, warmth, and his very best self'),
  ('intro_body', 'Vincent was a devoted husband and father, a loyal friend, and an ophthalmologist who treated every patient as family.'),
  ('family_notice_heading', 'Family notice'),
  ('family_notice_body', 'Memorial service details and family announcements. Updated as information becomes available.');

INSERT OR IGNORE INTO announcements (kind, title, body, pinned, position) VALUES
  ('family-notice', 'Memorial service', '[ Date, time, venue, dress code, flowers/donations — to be added by the family. ]', 1, 0);

INSERT OR IGNORE INTO bio_chapters (slug, title, body, position) VALUES
  ('early-life', 'Early life and family',
   '[ Birth date and place — to be added. ] Vincent Magubo Nyagucha was born to [ parents'' names ] in [ town / county ]. He was raised in a home that valued [ faith, education, community — family to complete ].\n\n[ Childhood memories, schools attended, character as a boy — to be added by family. ]', 1),
  ('education', 'Education and training',
   '[ Primary and secondary schools — to be added. ]\n\nVincent studied medicine at [ university ] and specialized in ophthalmology at [ institution ]. Colleagues remember him as a diligent student who combined academic excellence with a genuine desire to serve patients.\n\n[ Fellowships, further training, certifications — to be added. ]', 2),
  ('career', 'Career as an ophthalmologist',
   'Dr. Nyagucha practised ophthalmology for [ number ] years at [ hospitals, clinics, regions — to be added ]. He was known for his patience, steady hands, and the calm way he explained every step of treatment.\n\nPatients often spoke of the relief they felt when he told them they would see again. He did not rush consultations. He made people feel seen.\n\n[ Places of work, leadership roles, mentorship — to be added. ]', 3),
  ('achievements', 'Achievements and recognition',
   '[ Awards, honours, publications, professional memberships — to be added. Items can be appended over time. ]', 4),
  ('family', 'Family',
   'Vincent married [ spouse''s name ] and was father to [ children''s names — to be added ]. At home he was Dad first — present, patient, and full of quiet joy.\n\nHe was not the doctor at the dinner table. He was husband and father, always making time for the people who mattered most.', 5),
  ('community', 'Community and faith',
   '[ Church, faith community, service — to be added. ] Vincent lived his values quietly: kindness before judgement, service before recognition.\n\n[ Community projects, mentoring, volunteering — to be added. ]', 6),
  ('legacy', 'Legacy',
   'Vincent leaves behind a wife, children, relatives, friends, patients, and colleagues who carry his memory forward. His work restored sight; his character restored hope.\n\n[ Final resting place, memorial preferences — to be added. ]', 7);
