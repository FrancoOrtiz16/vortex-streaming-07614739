# 🎬 Vortex Streaming

**Plataforma de streaming con suscripciones y sistema de pagos integrado**

---

## 📚 Documentación Reciente

### 🎉 RedSeño: Componente de Detalles de Pago (Mayo 2026)

Se ha completado un rediseño profesional del componente de "Detalles de Pago" con:

✨ **Características Nuevas:**
- ✅ Parser inteligente que detecta automáticamente tipos de datos
- ✅ Interfaz profesional con tarjetas individuales
- ✅ Botones de copiar elegantes con confirmación
- ✅ Completamente responsivo para móviles
- ✅ Fuente monoespaciada para números
- ✅ Datos dinámicos desde base de datos

📖 **Documentación Disponible:**
- [`PAYMENT_DETAILS_INDEX.md`](./PAYMENT_DETAILS_INDEX.md) - Índice completo
- [`PAYMENT_DETAILS_QUICK_START.md`](./PAYMENT_DETAILS_QUICK_START.md) - Guía rápida
- [`PAYMENT_DETAILS_GUIDE.md`](./PAYMENT_DETAILS_GUIDE.md) - Para administradores
- [`PAYMENT_DETAILS_PREVIEW.md`](./PAYMENT_DETAILS_PREVIEW.md) - Visualización
- [`PAYMENT_DETAILS_REDESIGN_SUMMARY.md`](./PAYMENT_DETAILS_REDESIGN_SUMMARY.md) - Resumen técnico
- [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md) - Verificación final

📝 **Archivos Afectados:**
- ✅ Nuevo: `/src/components/shop/PaymentDetailsCard.tsx`
- ✅ Actualizado: `/src/components/shop/CheckoutDialog.tsx`

💻 **Build Status:** ✅ Sin errores | TypeScript: ✅ Válido

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Pruebas
npm run test
```

---

## 📂 Estructura del Proyecto

```
src/
├── components/
│   ├── shop/
│   │   ├── PaymentDetailsCard.tsx      ← Nuevo componente
│   │   ├── CheckoutDialog.tsx          ← Actualizado
│   │   └── PaymentMethods.tsx
│   ├── admin/
│   └── ui/
├── pages/
├── services/
├── hooks/
├── lib/
├── store/
└── types_v2.ts
```

---

## 🎯 Principales Features

### 🛍️ E-Commerce
- Catálogo de servicios (streaming)
- Carrito de compras
- Sistema de suscripciones

### 💳 Pagos
- Múltiples métodos de pago (Pago Móvil, Transferencia, Zelle, Binance)
- Interfaz profesional para detalles de pago
- Subida de comprobantes

### 👤 Autenticación
- Auth0 / Supabase
- Dashboard de usuario
- Admin panel

### 🛒 Administración
- Panel de control completo
- Gestión de métodos de pago
- Vista de suscripciones

---

## 🔧 Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui
- **Icons:** Lucide React
- **Database:** Supabase
- **Animations:** Framer Motion
- **Notifications:** Sonner

---

## 📝 Variables de Entorno

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_EXCHANGE_RATE=...
```

---

## 🤝 Contribuciones

Para cambios significativos, por favor:
1. Crea una rama nueva (`git checkout -b feature/...`)
2. Realiza tus cambios
3. Abre un Pull Request

---

## 📞 Support

Para preguntas sobre el rediseño de Pagos:
- Ver [`PAYMENT_DETAILS_INDEX.md`](./PAYMENT_DETAILS_INDEX.md)
- Consultar documentación en carpeta del componente

---

**Última actualización:** Mayo 2026  
**Versión:** 2.0  
**Status:** ✅ Producción

