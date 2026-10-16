import { neon } from "@neondatabase/serverless";

let sql;
export const db = () => (sql ??= neon(process.env.DATABASE_URL));

export const KINDS = new Set(["script", "bit", "set", "outline", "idea"]);

export const rowToDoc = r => ({
  id: r.id,
  kind: r.kind,
  data: r.data,
  deleted: r.deleted,
  rev: r.rev,
  seq: Number(r.seq),
});
