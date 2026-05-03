# 👨‍💼 Guía de Uso: Previsualización de Tienda para Admin Franco

## 🎯 Objetivo
Ver exactamente cómo la tienda se ve para los clientes, con todos los cambios de precios y productos reflejados en tiempo real, sin interferencias del panel administrativo.

---

## 📖 Pasos para Usar

### Paso 1: Acceder al Panel de Administración
```
URL: https://tu-dominio.com/admin-access
```
- Inicia sesión con tu cuenta admin
- Verás el sidebar izquierdo con opciones de gestión

---

### Paso 2: Localizar el Botón "Ver Tienda"
En el **Sidebar izquierdo**, en la parte inferior, encontrarás:

```
┌─────────────────────────────┐
│ [👁️ Ver Tienda]            │
│   (Botón prominente azul)   │
└─────────────────────────────┘
```

**Ubicación exacta:**
- Por encima del botón "Cerrar Sesión"
- Con icono de ojo 👁️
- Color azul/morado

---

### Paso 3: Hacer Clic en "Ver Tienda"
```
✓ Se abrirá una NUEVA PESTAÑA
✓ La tienda se ve como lo hace un cliente normal
✓ Verás la barra superior púrpura con:
   "🟢 Modo Previsualización Admin | Cambios en tiempo real"
```

---

### Paso 4: Revisar la Tienda
En la nueva pestaña, verás:
- ✅ Todos los productos disponibles
- ✅ Precios actuales (SIN CACHE)
- ✅ Descripciones completas
- ✅ Categorías: Streaming y Gaming
- ✅ Filtros funcionales
- ✅ Medallas/Badges (Popular, Oferta, Rápido, etc.)

---

### Paso 5: Probar Cambios en Tiempo Real

**En la pestaña del Panel:**
1. Ve a "Inventario" o "Suscripciones"
2. Modifica un precio, por ejemplo:
   - Netflix: $15.99 → $16.99
   - Spotify: $9.99 → $10.99

**En la pestaña de Tienda:**
- El precio se actualiza **automáticamente**
- Sin necesidad de refrescar
- En segundos, ve el cambio reflejado

---

### Paso 6: Volver al Panel
En la barra púrpura superior de la tienda, encontrarás:

```
[👁️ Modo Previsualización Admin | Cambios en tiempo real]
                    [← Volver al Panel]
```

Haz clic en **"Volver al Panel"** para:
- Regresar a la pestaña anterior
- Continuar editando productos
- Volver a revisar cuando quieras

---

## 🔄 Flujo Completo (Ejemplo)

```
1. Panel Abierto (Pestaña 1)
   └─ Click "Ver Tienda" 
      └─ Tienda Abierta (Pestaña 2) - Modo Previsualización

2. Modificar Precio en Panel (Pestaña 1)
   └─ Netflix: $15.99 → $20.00

3. Ver Cambio en Tienda (Pestaña 2)
   └─ Automáticamente: $20.00 (Realtime)

4. Si quiero más cambios, vuelvo al Panel (Click botón)
   └─ Back a Pestaña 1
   └─ Sigo editando...
```

---

## ⚙️ Características Técnicas

### Zero Cache Policy
- **Antes**: Podías ver precios viejos en cache
- **Ahora**: Cada vez que abres "Ver Tienda", se limpia el cache anterior
- **Resultado**: Siempre ves datos frescos de la base de datos

### Realtime Updates
- Usa tecnología Supabase Realtime
- Cuando cambias un producto en el Panel, la Tienda se actualiza automáticamente
- No necesitas refrescar manualmente

### Solo Visible para Admin
- Si alguien intenta acceder con `?preview=admin` sin ser admin, NO ve la barra
- Es seguro y verificado con autenticación

---

## 🚀 Casos de Uso

### Caso 1: Revisar Apariencia Nueva
```
Franco quiere ver si la tienda se ve bien después de agregar nuevos productos
→ Click "Ver Tienda"
→ Abre en nueva pestaña
→ Revisa el catálogo completo
→ Vuelve al Panel si necesita ajustar algo
```

### Caso 2: Verificar Precios
```
Franco realiza cambios de precios en el Panel
→ Abre "Ver Tienda" en otra pestaña
→ Los precios aparecen actualizados inmediatamente
→ Si hay error, vuelve y corrije
```

### Caso 3: Probar Filtros
```
Franco quiere ver cómo se ven los filtros
→ Abre "Ver Tienda"
→ Click en "Streaming" o "Gaming"
→ Verifica que solo aparezcan los productos correctos
```

---

## ❓ Preguntas Frecuentes

### P: ¿La barra púrpura es visible para clientes?
**R:** No. Solo aparece cuando estás logueado como admin y accedes con `?preview=admin`

### P: ¿Qué pasa si cambio el nombre de un producto en Panel y lo veo en Tienda?
**R:** Se actualiza automáticamente en segundos (Realtime). Sin que hagas nada.

### P: ¿Puedo agregar al carrito en modo previsualización?
**R:** Sí, es la tienda normal. Funciona exactamente igual que para clientes.

### P: ¿Qué significa "Cambios en tiempo real"?
**R:** Significa que si modificas precio/stock en el Panel, la Tienda se actualiza instantáneamente sin refrescar.

### P: ¿Precio del cache viejo?
**R:** No, porque cada vez que haces click "Ver Tienda", se borra el cache anterior e carga datos frescos.

### P: ¿Puedo usar esto en móvil?
**R:** Sí, la barra y todo es responsive. También funciona en tablet.

### P: Si cierro la pestaña de Tienda y la vuelvo a abrir...
**R:** Volverá a limpiar el cache y cargar datos actualizados. Siempre verás lo más reciente.

---

## 🎓 Ventajas para Ti

| Ventaja | Explicación |
|---------|-----------|
| **Sin Cache Viejo** | Olvídate de ver precios viejos |
| **Tiempo Real** | Los cambios aparecen al instante |
| **Fácil de Usar** | Un botón, una pestaña |
| **No Interfiere** | Puedes tener ambas pestañas abiertas |
| **Verificación Rápida** | Revisa todo antes de que el cliente lo vea |
| **Realtime Feedback** | Ve exactamente lo que ven tus clientes |

---

## 🔒 Seguridad

- ✅ Solo accesible para cuentas admin
- ✅ URL contiene token de validación
- ✅ No interfiere con datos de clientes
- ✅ Cache se limpia automáticamente
- ✅ Realtime verifica permisos en servidor

---

## 📞 Soporte

Si tienes problemas:
1. Verifica estar logueado como admin
2. Abre la consola (F12) y busca mensajes de error
3. Intenta refrescar la tienda manualmente (F5)
4. Contacta al equipo de desarrollo

---

**Última actualización**: 2026-05-03  
**Versión**: 1.0  
**Soporte**: Implementación UX/UI Expert
