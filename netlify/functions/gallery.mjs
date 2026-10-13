import crypto from "node:crypto";
import { bodyJson, cleanText, deleteBlob, isAdmin, json, methodOf, queryOf, readJson, requireAdmin, slugify, writeJson } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    if (methodOf(event) === "GET") {
      const admin = isAdmin(event);
      let photos = await readJson("photos/index.json", []);
      const query = queryOf(event);
      if (!admin) photos = photos.filter((photo) => photo.published === true);
      if (query.get("category")) photos = photos.filter((photo) => photo.category === query.get("category"));
      if (query.get("published") === "true") photos = photos.filter((photo) => photo.published === true);
      if (query.get("published") === "false") photos = photos.filter((photo) => photo.published === false);
      photos.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(b.created_at).localeCompare(String(a.created_at)));
      return json(200, { photos, admin });
    }
    requireAdmin(event);
    const photos = await readJson("photos/index.json", []);
    const payload = await bodyJson(event);
    if (methodOf(event) === "POST") {
      const now = new Date().toISOString();
      const photo = { id: crypto.randomUUID(), title: cleanText(payload.title, 160), slug: slugify(payload.slug || payload.title), alt_text: cleanText(payload.alt_text, 300), description: cleanText(payload.description), category: cleanText(payload.category, 60) || "Photography", image_path: cleanText(payload.image_path, 1000), storage_path: cleanText(payload.storage_path, 300), published: payload.published !== false, featured: payload.featured === true, sort_order: Number(payload.sort_order) || photos.length, created_at: now, updated_at: now };
      if (!photo.title || !photo.alt_text || !photo.image_path) return json(400, { error: "title, alt_text, and image_path are required" });
      photos.push(photo); await writeJson("photos/index.json", photos); return json(201, { photo });
    }
    if (methodOf(event) === "PATCH" || methodOf(event) === "PUT") {
      const index = photos.findIndex((photo) => photo.id === payload.id);
      if (index < 0) return json(404, { error: "Photo not found" });
      const current = photos[index];
      photos[index] = { ...current, title: cleanText(payload.title ?? current.title, 160), slug: slugify(payload.slug ?? current.slug), alt_text: cleanText(payload.alt_text ?? current.alt_text, 300), description: cleanText(payload.description ?? current.description), category: cleanText(payload.category ?? current.category, 60) || "Photography", image_path: cleanText(payload.image_path ?? current.image_path, 1000), storage_path: cleanText(payload.storage_path ?? current.storage_path, 300), published: typeof payload.published === "boolean" ? payload.published : current.published, featured: typeof payload.featured === "boolean" ? payload.featured : current.featured, sort_order: Number.isFinite(Number(payload.sort_order)) ? Number(payload.sort_order) : current.sort_order, updated_at: new Date().toISOString() };
      await writeJson("photos/index.json", photos); return json(200, { photo: photos[index] });
    }
    if (methodOf(event) === "DELETE") { const remaining = photos.filter((photo) => photo.id !== payload.id); const removed = photos.find((photo) => photo.id === payload.id); await writeJson("photos/index.json", remaining); await deleteBlob(removed?.storage_path); return json(200, { deleted: true }); }
    return json(405, { error: "Method not allowed" });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
