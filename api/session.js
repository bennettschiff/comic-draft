import { configured, isAuthed, json } from "./_lib/auth.js";

export async function GET(request) {
  return json({ authed: isAuthed(request), configured: configured() });
}
