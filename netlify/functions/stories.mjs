import crypto from "node:crypto";
import { isAdmin, json, readJson, requireAdmin, writeJson } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    if (event.httpMethod === "GET") return json(200, { stories: (await readJson("stories/index.json", [])).filter((story) => story.status === "published") });
    requireAdmin(event); if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    const stories = await readJson("stories/index.json", []); const payload = JSON.parse(event.body || "{}");
    const story = { ...payload, id: crypto.randomUUID(), status: "published", published_at: new Date().toISOString() };
    stories.push(story); await writeJson("stories/index.json", stories); return json(201, { story });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
