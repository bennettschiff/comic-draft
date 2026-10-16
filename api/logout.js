import { clearCookie, json } from "./_lib/auth.js";

export async function POST(request) {
  return json({ ok: true }, 200, { "set-cookie": clearCookie(request) });
}
