import { isAdmin, json, readJson, requireAdmin } from "./_shared/storage.mjs";

export default async (event) => {
  try {
    requireAdmin(event);
    const [photos, stories] = await Promise.all([readJson("photos/index.json", []), readJson("stories/index.json", [])]);
    const categories = photos.reduce((result, photo) => { result[photo.category || "Uncategorized"] = (result[photo.category || "Uncategorized"] || 0) + 1; return result; }, {});
    return json(200, { stats: { photos: photos.length, publishedPhotos: photos.filter((p) => p.published).length, draftPhotos: photos.filter((p) => !p.published).length, featuredPhotos: photos.filter((p) => p.featured).length, stories: stories.length, publishedStories: stories.filter((s) => s.status === "published").length, draftStories: stories.filter((s) => s.status === "draft").length, categories } });
  } catch (error) { return json(isAdmin(event) ? 500 : 401, { error: error.message }); }
};
