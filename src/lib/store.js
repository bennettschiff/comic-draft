// Document store with offline cache and server sync.
//
// Every script, bit, set, outline and idea is its own doc: { id, kind, data, rev, deleted }.
// Edits apply locally right away (and to localStorage), then get pushed in the
// background. The server only accepts a write whose `rev` matches its own; on a
// mismatch it returns its copy, which we take, saving our version as a
// "conflict copy" so nothing is lost when two devices edited the same doc.

import { useMemo, useSyncExternalStore } from "react";
import { api } from "./api";
import { uid } from "./util";

const CACHE_KEY = "comicdraft-v3";
const PUSH_DELAY = 900;
const PULL_INTERVAL = 15000;

let docs = {};            // id -> doc
let dirty = new Set();    // ids with local changes not yet acknowledged by the server
let edits = {};           // id -> local edit counter, to detect edits made while a push is in flight
let cursor = 0;           // highest server seq we've seen
let state = { auth: "checking", sync: "idle", notice: null };
let version = 0;

const listeners = new Set();
const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));

let persistTimer;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = null;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ docs, dirty: [...dirty], cursor })); }
  catch (e) { console.warn("Cache write failed", e); }
}

function emit() {
  version++;
  if (!persistTimer) persistTimer = setTimeout(persist, 250);
  listeners.forEach(fn => fn());
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c) { docs = c.docs || {}; dirty = new Set(c.dirty || []); cursor = c.cursor || 0; }
  } catch { /* corrupt cache: start empty, server copy will refill it */ }
}

// ── React hooks ─────────────────────────────────────────────

export function useStoreState() {
  return useSyncExternalStore(subscribe, () => state);
}

export function useDocs(kind) {
  const v = useSyncExternalStore(subscribe, () => version);
  return useMemo(
    () => Object.values(docs).filter(d => d.kind === kind && !d.deleted).map(d => d.data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, kind],
  );
}

// ── Mutations ───────────────────────────────────────────────

function touch(id) {
  dirty.add(id);
  edits[id] = (edits[id] || 0) + 1;
  emit();
  schedulePush();
}

export function create(kind, data = {}) {
  const id = data.id || uid();
  const now = Date.now();
  const full = { ...data, id, created: data.created ?? now, updated: now };
  docs[id] = { id, kind, data: full, rev: 0, deleted: false };
  touch(id);
  return full;
}

export function update(id, patch) {
  const d = docs[id];
  if (!d || d.deleted) return;
  const next = typeof patch === "function" ? patch(d.data) : { ...d.data, ...patch };
  docs[id] = { ...d, data: { ...next, id, updated: Date.now() } };
  touch(id);
}

export function remove(id) {
  const d = docs[id];
  if (!d) return;
  docs[id] = { ...d, deleted: true };
  touch(id);
}

export const getDoc = id => (docs[id] && !docs[id].deleted ? docs[id].data : null);

// ── Sync ────────────────────────────────────────────────────

let pushTimer, pushing = false;

function schedulePush(delay = PUSH_DELAY) {
  if (state.auth !== "in") return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, delay);
  if (state.sync !== "offline" && state.sync !== "pending") setState({ sync: "pending" });
}

function payloadFor(ids) {
  return ids.map(id => docs[id]).filter(Boolean)
    .map(({ id, kind, data, rev, deleted }) => ({ id, kind, data, rev, deleted }));
}

const titled = (data, suffix) =>
  "title" in data ? { ...data, title: `${data.title || "Untitled"} ${suffix}` }
  : "text" in data ? { ...data, text: `${suffix} ${data.text}` }
  : data;

function resolveConflict(id, server) {
  const local = docs[id];
  dirty.delete(id);
  if (server.deleted) delete docs[id];
  else docs[id] = server;
  // Keep our losing edit as a separate doc unless it was a delete or identical.
  if (local && !local.deleted && (server.deleted || JSON.stringify(local.data) !== JSON.stringify(server.data))) {
    const copyId = uid();
    docs[copyId] = { id: copyId, kind: local.kind, data: titled({ ...local.data, id: copyId }, "(conflict copy)"), rev: 0, deleted: false };
    dirty.add(copyId);
    setState({ notice: "Another device changed something you were editing. Your version was saved as a “conflict copy”." });
  }
}

export async function push(keepalive = false) {
  if (pushing || state.auth !== "in" || dirty.size === 0) return;
  pushing = true;
  const ids = [...dirty].slice(0, 100);
  const sent = Object.fromEntries(ids.map(id => [id, edits[id]]));
  setState({ sync: "saving" });
  try {
    const { results } = await api.push(payloadFor(ids), keepalive);
    for (const r of results) {
      if (r.ok) {
        const d = docs[r.id];
        if (d) docs[r.id] = { ...d, rev: r.rev };
        if (edits[r.id] === sent[r.id]) {
          dirty.delete(r.id);
          if (d?.deleted) delete docs[r.id];
        }
      } else if (r.conflict) {
        resolveConflict(r.id, r.doc);
      }
    }
    setState({ sync: dirty.size ? "pending" : "saved" });
    if (dirty.size) schedulePush(200);
  } catch (e) {
    handleError(e);
    schedulePush(10000);
  } finally {
    pushing = false;
  }
}

export async function pull() {
  if (state.auth !== "in") return;
  try {
    const res = await api.pull(cursor);
    if (cursor === 0) {
      // Full load: anything cached that the server doesn't have (and that we didn't write) is stale.
      const ids = new Set(res.docs.map(d => d.id));
      for (const id of Object.keys(docs)) if (!ids.has(id) && !dirty.has(id)) delete docs[id];
    }
    for (const s of res.docs) {
      if (dirty.has(s.id)) continue; // our pending write will reconcile via rev check
      if (s.deleted) delete docs[s.id];
      else docs[s.id] = { id: s.id, kind: s.kind, data: s.data, rev: s.rev, deleted: false };
    }
    cursor = res.cursor;
    setState({ sync: dirty.size ? "pending" : "saved" });
    if (dirty.size) schedulePush(100);
  } catch (e) {
    handleError(e);
  }
}

function handleError(e) {
  if (e.status === 401) setState({ auth: "out", sync: "idle" });
  else setState({ sync: navigator.onLine === false || !e.status ? "offline" : "error" });
}

// Push whatever is pending when the tab is hidden or closed (phone app switch).
// keepalive lets the request finish even if the page is being torn down; if we
// never see the response, the next push hits a rev conflict with identical
// data, which resolves silently to the server copy.
function flushOnHide() {
  clearTimeout(pushTimer);
  persist();
  push(true);
}

export const pendingCount = () => dirty.size;

// ── Auth / lifecycle ────────────────────────────────────────

let started = false, pullTimer;

function startSyncLoop() {
  pull().then(() => push());
  clearInterval(pullTimer);
  pullTimer = setInterval(() => { if (document.visibilityState === "visible") pull(); }, PULL_INTERVAL);
}

export async function init() {
  if (started) return;
  started = true;
  loadCache();
  emit();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { pull(); push(); } else flushOnHide();
  });
  window.addEventListener("pagehide", flushOnHide);
  window.addEventListener("online", () => { pull(); push(); });

  try {
    const s = await api.session();
    if (!s.configured) return setState({ auth: "unconfigured" });
    setState({ auth: s.authed ? "in" : "out" });
    if (s.authed) startSyncLoop();
  } catch {
    // Offline at launch: work from the cache if we've used this device before.
    const hasCache = Object.keys(docs).length > 0 || cursor > 0;
    setState({ auth: hasCache ? "in" : "out", sync: "offline" });
    if (hasCache) {
      const retry = setInterval(async () => {
        try {
          const s = await api.session();
          clearInterval(retry);
          setState({ auth: s.authed ? "in" : "out" });
          if (s.authed) startSyncLoop();
        } catch { /* still offline */ }
      }, 10000);
    }
  }
}

export async function login(password) {
  await api.login(password);
  setState({ auth: "in" });
  startSyncLoop();
}

export async function logout() {
  await push();
  await api.logout().catch(() => {});
  clearInterval(pullTimer);
  docs = {}; dirty = new Set(); edits = {}; cursor = 0;
  persist();
  setState({ auth: "out", sync: "idle" });
}

export const dismissNotice = () => setState({ notice: null });
