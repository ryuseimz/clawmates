#!/bin/bash
# Setup Clawmates DB schema on Supabase
# Usage: SUPABASE_DB_URL="postgresql://..." ./scripts/setup-db.sh
# Or: npx supabase db push (if using Supabase CLI with linked project)

set -e

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "SUPABASE_DB_URL not set. Trying supabase CLI..."
  npx supabase db push
else
  echo "Applying schema via psql..."
  psql "$SUPABASE_DB_URL" < supabase-schema.sql
  echo "Done!"
fi
