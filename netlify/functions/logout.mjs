import { json } from "./_shared/storage.mjs";
export default async () => json(200, { ok: true }, { "set-cookie": "azmi_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
