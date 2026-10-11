import { bodyJson, isAdmin, json, methodOf, publicMediaUrl, requireAdmin, store } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    requireAdmin(event); if (methodOf(event) !== "POST") return json(405, { error: "Method not allowed" });
    const { path, data, contentType } = await bodyJson(event);
    if (!path || !/^photos\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(path) || !data) return json(400, { error: "Use a generated photos/<name>.jpg, .jpeg, .png, or .webp path" });
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json(400, { error: "Unsupported image type" });
    const bytes = Buffer.from(data, "base64");
    if (bytes.length > 8 * 1024 * 1024) return json(413, { error: "Image must be 8 MB or smaller" });
    await store.set(path, bytes, { metadata: { contentType } });
    return json(200, { path, url: publicMediaUrl(path) });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
