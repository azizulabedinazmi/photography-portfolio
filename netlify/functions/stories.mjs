import crypto from "node:crypto";
import { bodyJson, cleanText, isAdmin, json, methodOf, queryOf, readJson, requireAdmin, slugify, writeJson } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    if (methodOf(event) === "GET") { const admin = isAdmin(event); let stories = await readJson("stories/index.json", []); if (!admin) stories = stories.filter((story) => story.status === "published"); const query = queryOf(event); if (query.get("status")) stories = stories.filter((story) => story.status === query.get("status")); stories.sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))); return json(200, { stories, admin }); }
    requireAdmin(event); if (!["POST", "PATCH", "PUT", "DELETE"].includes(methodOf(event))) return json(405, { error: "Method not allowed" });
    const stories = await readJson("stories/index.json", []); const payload = await bodyJson(event); const now = new Date().toISOString();
    if (methodOf(event) === "POST") { const story = { id: crypto.randomUUID(), title: cleanText(payload.title, 180), slug: slugify(payload.slug || payload.title), excerpt: cleanText(payload.excerpt, 500), body_markdown: cleanText(payload.body_markdown, 50000), cover_image_path: cleanText(payload.cover_image_path, 1000), status: payload.status === "published" ? "published" : "draft", published_at: payload.status === "published" ? now : null, created_at: now, updated_at: now }; if (!story.title || !story.body_markdown) return json(400, { error: "title and story content are required" }); stories.push(story); await writeJson("stories/index.json", stories); return json(201, { story }); }
    const index = stories.findIndex((story) => story.id === payload.id); if (index < 0) return json(404, { error: "Story not found" });
    if (methodOf(event) === "DELETE") { stories.splice(index, 1); await writeJson("stories/index.json", stories); return json(200, { deleted: true }); }
    const current = stories[index]; const status = payload.status === "published" || payload.status === "draft" ? payload.status : current.status; stories[index] = { ...current, title: cleanText(payload.title ?? current.title, 180), slug: slugify(payload.slug ?? current.slug), excerpt: cleanText(payload.excerpt ?? current.excerpt, 500), body_markdown: cleanText(payload.body_markdown ?? current.body_markdown, 50000), cover_image_path: cleanText(payload.cover_image_path ?? current.cover_image_path, 1000), status, published_at: status === "published" ? (current.published_at || now) : null, updated_at: now }; await writeJson("stories/index.json", stories); return json(200, { story: stories[index] });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
