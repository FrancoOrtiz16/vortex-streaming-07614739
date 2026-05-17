#!/bin/bash
echo "=== VERIFICACIÓN DE ARCHIVOS Y CONTENIDO ==="
echo ""

# 1. Verificar vite.config.ts
echo "1. vite.config.ts - búsqueda de [hash]:"
if [ -f vite.config.ts ]; then
  if grep -q "\[hash\]" vite.config.ts; then
    echo "   ✓ Archivo existe y contiene [hash]"
  else
    echo "   ✗ Archivo existe pero NO contiene [hash]"
  fi
else
  echo "   ✗ Archivo NO existe"
fi
echo ""

# 2. Verificar public/sw.js
echo "2. public/sw.js - búsqueda de skipWaiting() y Clients.claim():"
if [ -f public/sw.js ]; then
  skip=$(grep -c "skipWaiting()" public/sw.js || echo "0")
  clients=$(grep -c "Clients.claim()" public/sw.js || echo "0")
  echo "   - skipWaiting(): $skip ocurrencias"
  echo "   - Clients.claim(): $clients ocurrencias"
  if [ "$skip" -gt 0 ] && [ "$clients" -gt 0 ]; then
    echo "   ✓ Contiene ambas funciones"
  else
    echo "   ✗ Falta contenido requerido"
  fi
else
  echo "   ✗ Archivo NO existe"
fi
echo ""

# 3. Verificar index.html
echo "3. index.html - búsqueda de updateViaCache: 'none':"
if [ -f index.html ]; then
  if grep -q "updateViaCache.*none" index.html; then
    echo "   ✓ Archivo existe y contiene updateViaCache: 'none'"
  else
    echo "   ✗ Archivo existe pero NO contiene updateViaCache: 'none'"
  fi
else
  echo "   ✗ Archivo NO existe"
fi
echo ""

# 4. Verificar src/hooks/useVersionUpdate.ts
echo "4. src/hooks/useVersionUpdate.ts - verificación de existencia:"
if [ -f src/hooks/useVersionUpdate.ts ]; then
  echo "   ✓ Archivo existe"
else
  echo "   ✗ Archivo NO existe"
fi
echo ""

# 5. Verificar src/components/VersionUpdateNotification.tsx
echo "5. src/components/VersionUpdateNotification.tsx - verificación de existencia:"
if [ -f src/components/VersionUpdateNotification.tsx ]; then
  echo "   ✓ Archivo existe"
else
  echo "   ✗ Archivo NO existe"
fi
echo ""

# 6. Verificar src/App.tsx
echo "6. src/App.tsx - búsqueda de importación de VersionUpdateNotification:"
if [ -f src/App.tsx ]; then
  if grep -q "VersionUpdateNotification" src/App.tsx; then
    echo "   ✓ Contiene importación de VersionUpdateNotification"
    echo "   Líneas encontradas:"
    grep "VersionUpdateNotification" src/App.tsx | sed 's/^/     /'
  else
    echo "   ✗ NO contiene VersionUpdateNotification"
  fi
else
  echo "   ✗ Archivo NO existe"
fi
echo ""
echo "=== FIN DE VERIFICACIÓN ==="
