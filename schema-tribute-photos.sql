-- Adds support for a second visitor photo on tributes.
-- Run once in the D1 Console. If you get "duplicate column name", you already have it.

ALTER TABLE tributes ADD COLUMN image_key2 TEXT;
ALTER TABLE tributes ADD COLUMN image_url2 TEXT;
