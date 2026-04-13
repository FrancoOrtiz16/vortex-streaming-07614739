# 🔧 Guía de Debugging Rápido - Vortex Streaming Repairs

## Si Admin Access no funciona:
```
✅ Verificar en console (F12):
- [Auth] ✓ Admin user verified: [user_id]
  → Si ves este log: admin está verificado

❌ Si no aparece:
1. Franco no logueado → login first
2. Tabla profiles sin rol admin → DB check needed
3. useAuth.ts está refrescando rol → esperar 2-3s

🔍 Debugging:
- Chrome DevTools > Console
- Buscar "[Auth]" logs
- Verificar en Supabase: roles > profiles > Franco's role
```

## Si Catálogo está en blanco:
```
✅ Verificar en console (F12):
- [useProducts] Loaded X products successfully
  → Éxito: catálogo cargó

❌ Si ves:
- [useProducts] Supabase error: ...
  → Error de BD, revisar permisos
  
❌ Si solo ves "[useProducts] No products found..."
  → Tabla services vacía, añadir datos

✅ ProductGrid mostrará:
- Loading spinner mientras carga
- Error panel con "Reintentar" si falla
- "No hay productos disponibles" si está vacía
```

## Si CredentialService (Llave) falla:
```
✅ El componente está en:
/src/components/services/CredentialService.tsx
/src/hooks/useCredentialData.ts

❌ Checklist:
□ subscriptionId existe
□ Suscripción tiene status === 'confirmed'
□ Campos en BD: email_cuenta, password_cuenta, perfil, pin
□ Sin combo_id o subscription_code en select()

✅ Mensaje expected si no hay creds:
"Credenciales en preparación"
(significa que admin no las ha puesto aún)
```

## Campos de Consulta Seguros:
```
✅ PERMITIDOS:
- id, name, description, price, category, image_url
- badge, plan_type, sort_order, is_available, group_name
- image_scale, service_name, email_cuenta, password_cuenta
- perfil, pin, status, proxima_fecha, created_at

❌ PROHIBIDOS (causa PGRST204):
- combo_id, subscription_code, fecha_inicio
- Cualquier campo que no existe en tabla
```

## Logs Importantes para Debugging:

### En useAuth.ts:
```
[Auth] Initializing auth state...
[Auth] Fetching profile for userId: [partial_id]...
[Auth] ✓ Admin user verified: [partial_id]  ← Franco es admin
[Auth] No profile data found...             ← Crear profile
```

### En useProducts.ts:
```
[useProducts] Fetching products from Supabase...
[useProducts] Loaded X products successfully  ← OK
[useProducts] No products found in Supabase  ← BD vacía
[useProducts] Supabase error: ...            ← Error consulta
```

### En useCredentialData.ts:
```
[useCredentialData] Fetching credentials for: [partial_id]...
[useCredentialData] Credentials loaded successfully ← OK
[useCredentialData] No credentials found...        ← Pendiente
```

## Acceso de Franco (Admin):
```
✅ Franco debe:
1. Estar registrado en Supabase auth
2. Tener profile.role === 'admin'
3. Ir a /admin-access para acceder

⚠️ Si le dice "Acceso Denegado":
→ Verificar en Supabase profiles tabla
→ Franco's row debe tener: role: 'admin', is_active: true
```

## Quick Restart Checklist:
```
□ Clear browser cache (Ctrl+Shift+Del)
□ Refresh page (F5 o Cmd+R)
□ Check console for [Auth] logs
□ Check console for [useProducts] logs
□ Verify Supabase conectado (no errors)
□ Si aún falla: revisar Supabase permisos RLS
```

---
📝 Última actualización: 2026-04-13  
🔒 Anti-PGRST204: Activo
✅ CredentialService: Preservado
