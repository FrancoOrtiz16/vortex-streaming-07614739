#!/bin/bash

# Script para ejecutar la migración SQL en Supabase
# Lee el .env para obtener las credenciales

source .env

PROJECT_ID="$VITE_SUPABASE_PROJECT_ID"
ANON_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"
URL="$VITE_SUPABASE_URL"

echo "🔍 Ejecutando migración en Supabase..."
echo "Project ID: $PROJECT_ID"
echo "URL: $URL"

# Leer la migración SQL
MIGRATION_SQL=$(cat supabase/migrations/20260512_fix_subscriptions_next_renewal_nullable.sql)

# Intentar ejecutar usando la API REST de Supabase
# Nota: esto require que haya una RPC function disponible
# Si no existe, intentaremos alternativas

echo "📝 SQL a ejecutar:"
echo "$MIGRATION_SQL"

echo ""
echo "⚠️  Necesitas ejecutar esto manualmente en el SQL Editor de Supabase:"
echo "   1. Ve a https://app.supabase.com/project/$PROJECT_ID/sql/new"
echo "   2. Copia y pega el SQL de supabase/migrations/20260512_fix_subscriptions_next_renewal_nullable.sql"
echo "   3. Click en 'Execute'"
