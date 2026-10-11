import { store } from "./_shared/storage.mjs";

export default async (event) => {
  const key = event.queryStringParameters?.key;
  if (!key || key.includes("..")) return { statusCode: 400, body: "Invalid media key" };
  const blob = await store.get(key, { type: "arrayBuffer" });
  if (!blob) return { statusCode: 404, body: "Not found" };
  const type = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { statusCode: 200, headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" }, isBase64Encoded: true, body: Buffer.from(blob).toString("base64") };
};
