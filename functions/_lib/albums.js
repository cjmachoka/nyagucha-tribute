export const GALLERY_ALBUMS = [
  "childhood",
  "family",
  "career",
  "friends",
  "moments",
  "memorial",
  "other",
];

export function normalizeAlbum(value) {
  return GALLERY_ALBUMS.includes(value) ? value : "other";
}
