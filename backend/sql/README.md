# Tevy2 backend migrations

Use the migration runner instead of applying `schema-hetzner.sql` directly.

## Required env
Set one of:
- `SUPABASE_DB_URL`
- `DATABASE_URL`

This must be a real Postgres connection string, for example:

```bash
export SUPABASE_DB_URL='postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require'
```

## Run migrations

```bash
npm run db:migrate
```

## Why `psql` was falling back to local socket
If `SUPABASE_DB_URL` is empty/unset, `psql "$SUPABASE_DB_URL" ...` behaves like plain `psql` and tries the local Unix socket:

```text
/var/run/postgresql/.s.PGSQL.5432
```

That means your env var was not set.
