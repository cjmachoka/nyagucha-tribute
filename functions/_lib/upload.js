const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function randomSuffix() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function uploadImage(env, file, prefix) {
  if (!file || typeof file.size !== "number" || file.size === 0) {
    throw new Error("No file provided");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image too large (max 5 MB)");
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new Error("Only JPG, PNG or WebP images are allowed");
  }
  const safePrefix = String(prefix || "uploads").replace(/[^a-z0-9/_-]/gi, "");
  const key = `${safePrefix}/${Date.now()}-${randomSuffix()}.${ext}`;
  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  return { key, url: `/images/${key}` };
}

export async function deleteImage(env, key) {
  if (!key) return;
  try {
    await env.IMAGES.delete(key);
  } catch (_) {
    // ignore — best-effort cleanup
  }
}
