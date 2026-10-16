# Comic Draft

Personal comedy writing app: ideas inbox, outlines with beat-sheet templates,
scripts (film, TV/sitcom, sketch) and stand-up bits/sets. Works on phone and
laptop with the same data; installable as a PWA.

## Stack

- Vite + React SPA (`src/`)
- Vercel Functions (`api/`) for sign-in and sync
- Neon Postgres (`docs` table: one row per script/bit/set/outline/idea)

## Sync model

Each doc carries a `rev`. Writes only land if the client's `rev` matches the
server's; otherwise the server copy wins and the local edit is kept as a
"conflict copy". Clients pull changes since their last `seq` cursor on load,
on focus, and every 15s. Edits are cached in localStorage and pushed when back
online.

## Environment

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string (pooled) |
| `SESSION_SECRET` | HMAC key for the sign-in cookie |
| `APP_PASSWORD` | The one password for the app. Changing it signs out every device. |

Local dev reads them from `.env.local`.

```bash
npm install
npm run dev   # serves the app and /api on http://localhost:5173
```

## Schema

```sql
CREATE SEQUENCE docs_seq;
CREATE TABLE docs (
  id         text PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('script','bit','set','outline','idea')),
  data       jsonb NOT NULL,
  deleted    boolean NOT NULL DEFAULT false,
  rev        integer NOT NULL DEFAULT 1,
  seq        bigint NOT NULL DEFAULT nextval('docs_seq'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX docs_seq_idx ON docs (seq);
```
