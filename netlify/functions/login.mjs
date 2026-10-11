import { createSession, json } from "./_shared/storage.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const { username, password } = JSON.parse(event.body || "{}");
  if (username !== (process.env.ADMIN_USERNAME || "admin") || password !== (process.env.ADMIN_PASSWORD || "")) return json(401, { error: "Invalid username or password" });
  return json(200, { ok: true }, { "set-cookie": `azmi_admin=${createSession(username)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
};
