import { isAdmin, json, publicMediaUrl, requireAdmin, store } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    requireAdmin(event); if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    const { path, data, contentType } = JSON.parse(event.body || "{}");
    if (!path || path.includes("..") || !data) return json(400, { error: "path and base64 data are required" });
    await store.set(path, Buffer.from(data, "base64"), { metadata: { contentType: contentType || "image/jpeg" } });
    return json(200, { path, url: publicMediaUrl(path) });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
