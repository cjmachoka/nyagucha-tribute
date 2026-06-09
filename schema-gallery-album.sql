-- Run this ONLY if you created gallery_photos before the album feature.
-- If you get "duplicate column name: album", you already have it — ignore.

ALTER TABLE gallery_photos ADD COLUMN album TEXT NOT NULL DEFAULT 'other';
CREATE INDEX IF NOT EXISTS idx_gallery_album ON gallery_photos(album);
