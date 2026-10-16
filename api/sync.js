import { isAuthed, json } from "./_lib/auth.js";
import { db, KINDS, rowToDoc } from "./_lib/db.js";

// GET /api/sync?since=<seq>  →  every doc changed after that cursor.
// since=0 is a full load and skips tombstones.
export async function GET(request) {
  if (!isAuthed(request)) return json({ error: "unauthorized" }, 401);
  const since = Math.max(0, parseInt(new URL(request.url).searchParams.get("since") || "0", 10) || 0);
  const sql = db();
  const rows = since === 0
    ? await sql`SELECT id, kind, data, deleted, rev, seq FROM docs WHERE NOT deleted ORDER BY seq`
    : await sql`SELECT id, kind, data, deleted, rev, seq FROM docs WHERE seq > ${since} ORDER BY seq`;
  const docs = rows.map(rowToDoc);
  const [{ max }] = since === 0 ? await sql`SELECT coalesce(max(seq), 0) AS max FROM docs` : [{ max: 0 }];
  const cursor = Math.max(since, Number(max), ...docs.map(d => d.seq));
  return json({ docs, cursor });
}

// POST /api/sync  { docs: [{ id, kind, data, deleted, rev }] }
// Each write only lands if the client's rev matches the server's (optimistic
// concurrency). A mismatch comes back as a conflict with the server's copy.
export async function POST(request) {
  if (!isAuthed(request)) return json({ error: "unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  const docs = Array.isArray(body?.docs) ? body.docs : null;
  if (!docs || docs.length === 0 || docs.length > 200) return json({ error: "bad_request" }, 400);
  for (const d of docs) {
    const valid = typeof d?.id === "string" && d.id.length > 0 && d.id.length <= 64
      && KINDS.has(d.kind) && d.data && typeof d.data === "object"
      && Number.isInteger(d.rev) && d.rev >= 0;
    if (!valid) return json({ error: "bad_doc", id: d?.id }, 400);
  }

  const sql = db();
  const written = await sql.transaction(docs.map(d => sql`
    INSERT INTO docs (id, kind, data, deleted, rev)
    VALUES (${d.id}, ${d.kind}, ${JSON.stringify(d.data)}::jsonb, ${Boolean(d.deleted)}, 1)
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, deleted = EXCLUDED.deleted, kind = EXCLUDED.kind,
          rev = docs.rev + 1, seq = nextval('docs_seq'), updated_at = now()
      WHERE docs.rev = ${d.rev}
    RETURNING rev, seq`));

  const conflictIds = docs.filter((_, i) => written[i].length === 0).map(d => d.id);
  const current = conflictIds.length
    ? await sql`SELECT id, kind, data, deleted, rev, seq FROM docs WHERE id = ANY(${conflictIds})`
    : [];
  const byId = Object.fromEntries(current.map(r => [r.id, rowToDoc(r)]));

  const results = docs.map((d, i) => written[i].length
    ? { id: d.id, ok: true, rev: written[i][0].rev, seq: Number(written[i][0].seq) }
    : { id: d.id, conflict: true, doc: byId[d.id] });
  return json({ results });
}
