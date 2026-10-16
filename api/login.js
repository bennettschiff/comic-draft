import { checkPassword, configured, json, sessionCookie } from "./_lib/auth.js";

export async function POST(request) {
  if (!configured()) return json({ error: "not_configured" }, 503);
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await new Promise(r => setTimeout(r, 700)); // slow down guessing
    return json({ error: "wrong_password" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(request) });
}
