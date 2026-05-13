# 🎯 Guía de Estructura de Detalles de Pago

## Descripción General

El nuevo componente de **Detalles de Pago** (`PaymentDetailsCard.tsx`) implementa un parser inteligente que detecta automáticamente el tipo de información y asigna etiquetas y emisarios apropiados.

---

## 📊 Formatos Soportados

### 1. **Pago Móvil** (Venezuela)

El parser detecta automáticamente números de teléfono en varios formatos:

#### Formatos Válidos:
```
0414-123-4567
0414 123 4567
+58 414 123 4567
+584141234567
04141234567
```

#### Estructura Recomendada en `account_info`:
```
0414-123-4567
V-12.345.678
Banco del Tesoro
Juan Pérez
```

**Resultado en UI:**
- 📱 Teléfono / Número de Cuenta: `0414-123-4567`
- 🆔 Cédula / RIF: `V-12.345.678`
- 🏦 Banco: `Banco del Tesoro`
- 👤 Nombre del Titular: `Juan Pérez`

---

### 2. **Transferencia Bancaria**

El parser detecta información bancaria y cédulas/RIF:

#### Estructura Recomendada en `account_info`:
```
Banco Mercantil
0102-0000-0000-0000-0001
V-25.123.456
Carlos Rodríguez
```

**Resultado en UI:**
- 🏦 Banco: `Banco Mercantil`
- 💳 Número de Cuenta: `0102-0000-0000-0000-0001`
- 🆔 Cédula / RIF: `V-25.123.456`
- 👤 Nombre del Titular: `Carlos Rodríguez`

---

### 3. **Zelle** (EE.UU.)

El parser detecta emails automáticamente:

#### Estructura Recomendada en `account_info`:
```
usuario@email.com
```

**Resultado en UI:**
- 📧 Email: `usuario@email.com`

---

### 4. **Binance**

El parser detecta direcciones de wallet y identificadores:

#### Estructura Recomendada en `account_info`:
```
BC1QAR0SRRR7XZ6VM5L3GK5G2H5FB3SDMNRMYQY8D
Binance UID: 123456789
```

**Resultado en UI:**
- 💳 Número de Cuenta: `BC1QAR0SRRR7XZ6VM5L3GK5G2H5FB3SDMNRMYQY8D`
- Datos genéricos: `Binance UID: 123456789`

---

## 🔍 Patrones de Detección

El componente usa expresiones regulares para detectar:

| Patrón | Detección | Ejemplo |
|--------|-----------|---------|
| **Teléfono** | Números con formato telefónico | `0414-123-4567` |
| **Cédula/RIF** | Formato V/E-XX.XXX.XXX | `V-12.345.678` |
| **Número de Cuenta** | 10-20 dígitos consecutivos | `0102000000000001` |
| **Email** | Formato estándar email | `user@example.com` |

---

## ✏️ Mejores Prácticas para Administradores

### 1. **Usa Saltos de Línea**
Separa cada dato con un salto de línea (`\n`). Esto permite que el parser identifique datos individuales correctamente.

```
❌ INCORRECTO:
0414-123-4567 - V-12.345.678 - Banco del Tesoro - Juan Pérez

✅ CORRECTO:
0414-123-4567
V-12.345.678
Banco del Tesoro
Juan Pérez
```

### 2. **Formatos de Cédula Consistentes**
El parser acepta varios formatos, pero es recomendable usar:
```
V-12.345.678   (con puntos)
E-9.876543.21  (para empresas)
```

### 3. **Orden Lógico**
Aunque el parser detecta cualquier orden, es recomendable mantener este orden:
1. Teléfono / Número de Cuenta
2. Cédula / RIF
3. Banco
4. Nombre del Titular

### 4. **Instrucciones Especiales**
Usa el campo `instructions` para agregar pasos adicionales que el cliente debe seguir:

```
Ejemplo:
"Transfiere exactamente el monto indicado. Utiliza tu nombre completo en la referencia. Espera 1-2 horas para confirmación."
```

---

## 📱 Optimización Móvil

El componente está optimizado para dispositivos móviles:

- ✅ Botones de copiar visibles en dispositivos táctiles
- ✅ Texto responsivo con breakpoints
- ✅ Espaciado adecuado para toques
- ✅ Fuente monoespaciada legible incluso en pantallas pequeñas

---

## 🔧 Integración con la Base de Datos

### Tabla: `payment_methods`

```sql
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY,
  method_name TEXT,        -- "Pago Móvil", "Transferencia", etc.
  method_type TEXT,        -- "Pago Móvil", "Transferencia Bancaria", etc.
  account_info TEXT,       -- Datos estructurados con saltos de línea
  instructions TEXT,       -- Instrucciones adicionales (opcional)
  is_active BOOLEAN,       -- Si el método está activo
  sort_order INTEGER       -- Orden de visualización
);
```

### Ejemplo de Registro:

```sql
INSERT INTO payment_methods (
  method_name,
  method_type,
  account_info,
  instructions,
  is_active,
  sort_order
) VALUES (
  'Pago Móvil Bancrio',
  'Pago Móvil',
  '0414-123-4567
V-12.345.678
Banco del Tesoro
Juan Pérez',
  'Transfiere exactamente el monto en Bs. Usa nuestro nombre en la referencia.',
  true,
  1
);
```

---

## 🎨 Personalización Futura

El parser es extensible. Para agregar nuevos patrones:

1. Edita `PaymentDetailsCard.tsx`
2. Agrega un nuevo patrón en el objeto `patterns`
3. Agrega la etiqueta correspondiente en `fieldLabels`

Ejemplo:
```typescript
patterns = {
  phone: /^(\+?\d{1,3}[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/,
  cedula: /^[VE][-.]?\d{1,3}\.?\d{1,3}\.?\d{3,4}$/,
  // NUEVO:
  crypto: /^(0x)?[a-fA-F0-9]{40}$/, // Dirección Ethereum
}
```

---

## 📞 Soporte Técnico

Para preguntas o para agregar nuevos patrones de detección, contacta al equipo de desarrollo.

---

**Última actualización:** Mayo 2026
**Versión:** 1.0
