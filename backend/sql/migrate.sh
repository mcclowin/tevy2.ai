#!/usr/bin/env bash
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/migrations" && pwd)"

if [[ -z "$DB_URL" ]]; then
  echo "Error: SUPABASE_DB_URL or DATABASE_URL must be set to a Postgres connection string."
  exit 1
fi

echo "Applying migrations from $MIGRATIONS_DIR"

psql "$DB_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$file")"
  already_applied=$(psql "$DB_URL" -tAc "SELECT 1 FROM public.schema_migrations WHERE version = '$version' LIMIT 1")
  if [[ "$already_applied" == "1" ]]; then
    echo "Skipping $version (already applied)"
    continue
  fi

  echo "Applying $version"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO public.schema_migrations(version) VALUES ('$version')"
done

echo "Done."
