import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "cd_session";
const MAX_AGE = 60 * 60 * 24 * 365; // stay signed in for a year per device

export const configured = () => Boolean(process.env.APP_PASSWORD && process.env.SESSION_SECRET);

// Signing includes the password, so changing APP_PASSWORD signs every device out.
const sign = value =>
  createHmac("sha256", process.env.SESSION_SECRET)
    .update(`${value}:${process.env.APP_PASSWORD}`)
    .digest("base64url");

const safeEqual = (a, b) => {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export const checkPassword = input =>
  configured() && typeof input === "string" && safeEqual(input, process.env.APP_PASSWORD);

const isHttps = request =>
  request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";

export function sessionCookie(request) {
  const payload = String(Date.now());
  const secure = isHttps(request) ? "; Secure" : "";
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie(request) {
  const secure = isHttps(request) ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function isAuthed(request) {
  if (!configured()) return false;
  const header = request.headers.get("cookie") || "";
  const match = header.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const [payload, sig] = match.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return false;
  return safeEqual(sig, sign(payload));
}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
