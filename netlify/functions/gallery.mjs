import crypto from "node:crypto";
import { bodyJson, isAdmin, json, methodOf, readJson, requireAdmin, writeJson } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    if (methodOf(event) === "GET") return json(200, { photos: await readJson("photos/index.json", []) });
    requireAdmin(event);
    const photos = await readJson("photos/index.json", []);
    const payload = await bodyJson(event);
    if (methodOf(event) === "POST") {
      const photo = { ...payload, id: crypto.randomUUID(), published: payload.published !== false, created_at: new Date().toISOString() };
      photos.push(photo); await writeJson("photos/index.json", photos); return json(201, { photo });
    }
    if (methodOf(event) === "DELETE") { await writeJson("photos/index.json", photos.filter((photo) => photo.id !== payload.id)); return json(200, { deleted: true }); }
    return json(405, { error: "Method not allowed" });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
