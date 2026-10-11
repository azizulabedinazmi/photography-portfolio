import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export const store = getStore({ name: "azmi-portfolio", consistency: "strong" });
const secret = process.env.ADMIN_SESSION_SECRET || "local-development-secret";

export function json(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function cookieValue(event, name) {
  const cookies = typeof event.headers?.get === "function" ? event.headers.get("cookie") || "" : event.headers.cookie || event.headers.Cookie || "";
  return cookies.split(";").map((item) => item.trim().split("=")).find(([key]) => key === name)?.[1];
}

function signature(value) { return crypto.createHmac("sha256", secret).update(value).digest("hex"); }

export function createSession(username) {
  const value = `${username}.${Date.now()}`;
  return `${value}.${signature(value)}`;
}

export function isAdmin(event) {
  const token = cookieValue(event, "azmi_admin");
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, issuedAt, provided] = parts;
  const expected = signature(`${username}.${issuedAt}`);
  const providedBuffer = Buffer.from(provided); const expectedBuffer = Buffer.from(expected);
  return username === (process.env.ADMIN_USERNAME || "admin") && providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer) && Date.now() - Number(issuedAt) < 1000 * 60 * 60 * 24 * 7;
}

export function requireAdmin(event) { if (!isAdmin(event)) throw new Error("Admin authentication required"); }
export function methodOf(request) { return request.method || request.httpMethod || "GET"; }
export async function bodyJson(request) { return typeof request.json === "function" ? request.json() : JSON.parse(request.body || "{}"); }

export async function readJson(key, fallback) { return (await store.get(key, { type: "json" })) || fallback; }
export async function writeJson(key, value) { await store.setJSON(key, value); }
export function publicMediaUrl(key) { return `/.netlify/functions/media?key=${encodeURIComponent(key)}`; }
