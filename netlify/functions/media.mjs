import { store } from "./_shared/storage.mjs";

export default async (event) => {
  const key = event.queryStringParameters?.key;
  if (!key || key.includes("..")) return new Response("Invalid media key", { status: 400 });
  const blob = await store.get(key, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });
  const type = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(blob, { status: 200, headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
};
