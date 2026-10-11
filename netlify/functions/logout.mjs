import { json, methodOf } from "./_shared/storage.mjs";
export default async (event) => methodOf(event) === "POST" ? json(200, { ok: true }, { "set-cookie": "azmi_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" }) : json(405, { error: "Method not allowed" });
