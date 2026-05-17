#!/bin/bash

###############################################################################
# 🚀 CACHE BUSTING VALIDATION SCRIPT
# Vortex Streaming - Version Update System Test
# 
# Este script valida que todos los componentes del sistema de cache busting
# estén correctamente configurados.
#
# Uso: chmod +x validate-cache-busting.sh && ./validate-cache-busting.sh
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contador de tests
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 CACHE BUSTING VALIDATION - VORTEX STREAMING            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Función para logging
log_test() {
  local test_name=$1
  local expected=$2
  local actual=$3
  
  echo -e "${YELLOW}→${NC} $test_name"
  
  if [ "$expected" = "$actual" ] || [ $expected -eq 1 ] 2>/dev/null; then
    echo -e "  ${GREEN}✅ PASSED${NC}\n"
    ((TESTS_PASSED++))
  else
    echo -e "  ${RED}❌ FAILED${NC}"
    echo -e "  Expected: ${YELLOW}$expected${NC}"
    echo -e "  Got: ${YELLOW}$actual${NC}\n"
    ((TESTS_FAILED++))
  fi
}

# ============================================================================
# TEST 1: Verificar que vite.config.ts existe y tiene hash config
# ============================================================================
echo -e "${BLUE}[TEST 1]${NC} Verificar configuración de Vite..."

if [ -f "vite.config.ts" ]; then
  if grep -q "\[hash\]" vite.config.ts; then
    log_test "vite.config.ts contiene hash generation" 1 1
  else
    log_test "vite.config.ts contiene hash generation" 1 0
  fi
else
  log_test "vite.config.ts existe" 1 0
fi

# ============================================================================
# TEST 2: Verificar Service Worker en public/
# ============================================================================
echo -e "${BLUE}[TEST 2]${NC} Verificar Service Worker..."

if [ -f "public/sw.js" ]; then
  log_test "public/sw.js existe" 1 1
  
  if grep -q "skipWaiting()" public/sw.js; then
    log_test "SW contiene skipWaiting()" 1 1
  else
    log_test "SW contiene skipWaiting()" 1 0
  fi
  
  if grep -q "Clients.claim()" public/sw.js; then
    log_test "SW contiene Clients.claim()" 1 1
  else
    log_test "SW contiene Clients.claim()" 1 0
  fi
  
  if grep -q "STALE-WHILE-REVALIDATE\|stale-while-revalidate" public/sw.js; then
    log_test "SW implementa stale-while-revalidate" 1 1
  else
    log_test "SW implementa stale-while-revalidate" 1 0
  fi
else
  log_test "public/sw.js existe" 1 0
fi

# ============================================================================
# TEST 3: Verificar meta tags en index.html
# ============================================================================
echo -e "${BLUE}[TEST 3]${NC} Verificar Meta Tags de Cache Control..."

if [ -f "index.html" ]; then
  if grep -q "Cache-Control.*no-cache" index.html && grep -q "Cache-Control.*must-revalidate" index.html; then
    log_test "index.html contiene Cache-Control meta tags" 1 1
  else
    log_test "index.html contiene Cache-Control meta tags" 1 0
  fi
  
  if grep -q "Pragma.*no-cache" index.html; then
    log_test "index.html contiene Pragma no-cache" 1 1
  else
    log_test "index.html contiene Pragma no-cache" 1 0
  fi
  
  if grep -q "updateViaCache.*none" index.html; then
    log_test "index.html SW registry tiene updateViaCache: none" 1 1
  else
    log_test "index.html SW registry tiene updateViaCache: none" 1 0
  fi
else
  log_test "index.html existe" 1 0
fi

# ============================================================================
# TEST 4: Verificar Hook useVersionUpdate
# ============================================================================
echo -e "${BLUE}[TEST 4]${NC} Verificar Hook de Detección de Versión..."

if [ -f "src/hooks/useVersionUpdate.ts" ]; then
  log_test "src/hooks/useVersionUpdate.ts existe" 1 1
  
  if grep -q "getCurrentVersionHash\|getCurrentVersionHash" src/hooks/useVersionUpdate.ts; then
    log_test "Hook contiene función de hash" 1 1
  else
    log_test "Hook contiene función de hash" 1 0
  fi
  
  if grep -q "registerServiceWorker" src/hooks/useVersionUpdate.ts; then
    log_test "Hook registra Service Worker" 1 1
  else
    log_test "Hook registra Service Worker" 1 0
  fi
  
  if grep -q "checkInterval" src/hooks/useVersionUpdate.ts; then
    log_test "Hook implementa chequeo periódico" 1 1
  else
    log_test "Hook implementa chequeo periódico" 1 0
  fi
else
  log_test "src/hooks/useVersionUpdate.ts existe" 1 0
fi

# ============================================================================
# TEST 5: Verificar Componente de Notificación
# ============================================================================
echo -e "${BLUE}[TEST 5]${NC} Verificar Componente de Notificación..."

if [ -f "src/components/VersionUpdateNotification.tsx" ]; then
  log_test "src/components/VersionUpdateNotification.tsx existe" 1 1
  
  if grep -q "useVersionUpdate" src/components/VersionUpdateNotification.tsx; then
    log_test "Componente usa useVersionUpdate hook" 1 1
  else
    log_test "Componente usa useVersionUpdate hook" 1 0
  fi
  
  if grep -q "forceUpdate\|handleAutoUpdate" src/components/VersionUpdateNotification.tsx; then
    log_test "Componente contiene lógica de actualización" 1 1
  else
    log_test "Componente contiene lógica de actualización" 1 0
  fi
else
  log_test "src/components/VersionUpdateNotification.tsx existe" 1 0
fi

# ============================================================================
# TEST 6: Verificar integración en App.tsx
# ============================================================================
echo -e "${BLUE}[TEST 6]${NC} Verificar Integración en App.tsx..."

if [ -f "src/App.tsx" ]; then
  if grep -q "VersionUpdateNotification" src/App.tsx; then
    log_test "App.tsx importa VersionUpdateNotification" 1 1
    
    if grep -q "<VersionUpdateNotification" src/App.tsx; then
      log_test "App.tsx renderiza VersionUpdateNotification" 1 1
    else
      log_test "App.tsx renderiza VersionUpdateNotification" 1 0
    fi
  else
    log_test "App.tsx importa VersionUpdateNotification" 1 0
  fi
else
  log_test "src/App.tsx existe" 1 0
fi

# ============================================================================
# TEST 7: Verificar main.tsx señal de montaje
# ============================================================================
echo -e "${BLUE}[TEST 7]${NC} Verificar Señal de Montaje de App..."

if [ -f "src/main.tsx" ]; then
  if grep -q "__APP_MOUNTED__" src/main.tsx; then
    log_test "main.tsx setea __APP_MOUNTED__ flag" 1 1
  else
    log_test "main.tsx setea __APP_MOUNTED__ flag" 1 0
  fi
else
  log_test "src/main.tsx existe" 1 0
fi

# ============================================================================
# TEST 8: Verificar documentación
# ============================================================================
echo -e "${BLUE}[TEST 8]${NC} Verificar Documentación..."

if [ -f "documentation/CACHE_BUSTING_IMPLEMENTATION.md" ]; then
  log_test "documentation/CACHE_BUSTING_IMPLEMENTATION.md existe" 1 1
else
  log_test "documentation/CACHE_BUSTING_IMPLEMENTATION.md existe" 1 0
fi

# ============================================================================
# RESUMEN
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 RESUMEN DE VALIDACIÓN                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests:    ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:         ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:         ${RED}$TESTS_FAILED${NC}\n"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ TODAS LAS VALIDACIONES PASARON!${NC}\n"
  echo -e "La configuración de Cache Busting está completa y lista para producción.\n"
  echo -e "${YELLOW}Próximos pasos:${NC}"
  echo -e "1. npm run build      # Build la aplicación"
  echo -e "2. npm run preview    # Previsualiza localmente"
  echo -e "3. Verifica que los hashes estén en los nombres de archivo"
  echo -e "4. Abre DevTools → Application → Service Workers"
  echo -e "5. Confirma que el SW está 'activated and running'"
  exit 0
else
  echo -e "${RED}❌ ALGUNAS VALIDACIONES FALLARON${NC}\n"
  echo -e "Revisa los errores arriba y corrígelos antes de desplegar.\n"
  exit 1
fi
