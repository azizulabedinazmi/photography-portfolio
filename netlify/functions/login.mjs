import { bodyJson, createSession, hasAdminConfig, json, methodOf } from "./_shared/storage.mjs";

export default async (event) => {
  if (methodOf(event) !== "POST") return json(405, { error: "Method not allowed. Use POST from the admin form." });
  if (!hasAdminConfig()) return json(503, { error: "Admin authentication is not configured in Netlify." });
  const { username, password } = await bodyJson(event);
  if (username !== (process.env.ADMIN_USERNAME || "admin") || password !== (process.env.ADMIN_PASSWORD || "")) return json(401, { error: "Invalid username or password" });
  return json(200, { ok: true }, { "set-cookie": `azmi_admin=${createSession(username)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
};
