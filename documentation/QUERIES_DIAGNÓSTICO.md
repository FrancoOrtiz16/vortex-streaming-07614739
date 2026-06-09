# 🔍 Queries de Diagnóstico - Copiar y Ejecutar Tal Como Están

## ⚠️ IMPORTANTE: Copiar exactamente, sin modificaciones

---

## Query 1️⃣ - Ver TODOS los Comprobantes (Rápido Diagnosis)

```sql
SELECT 
  COUNT(*) FILTER (WHERE receipt_url IS NOT NULL) as comprobantes_guardados,
  COUNT(*) as total_registros,
  COUNT(DISTINCT user_id) as usuarios_únicos,
  COUNT(DISTINCT subscription_id) as suscripciones_únicas
FROM payment_history;
```

**Esto te dirá:**
- ✅ Cuántos comprobantes hay guardados
- ✅ Cuántos registros totales existen
- ✅ Cuántos usuarios diferentes

---

## Query 2️⃣ - Ver Ejemplo de Comprobantes

```sql
SELECT 
  id,
  subscription_id,
  user_id,
  receipt_url,
  created_at,
  CHAR_LENGTH(receipt_url) as url_length
FROM payment_history
WHERE receipt_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Esto te mostrará:**
- ✅ Los primeros 5 comprobantes guardados
- ✅ El user_id y subscription_id de cada uno
- ✅ La URL del comprobante
- ✅ Cuándo se guardaron

---

## Query 3️⃣ - Ver Comprobantes POR USUARIO (Sin Filtro)

```sql
SELECT 
  user_id,
  COUNT(*) as total_pagos,
  COUNT(*) FILTER (WHERE receipt_url IS NOT NULL) as con_comprobante,
  MAX(created_at) as último_pago
FROM payment_history
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE receipt_url IS NOT NULL) > 0
ORDER BY MAX(created_at) DESC
LIMIT 10;
```

**Esto te mostrará:**
- ✅ Usuarios que han subido comprobantes
- ✅ Cuántos pagos tiene cada usuario
- ✅ Cuántos con comprobante
- ✅ La fecha del último

---

## 📋 Instrucciones Paso a Paso

1. **Abre Supabase:** https://app.supabase.com/project/tu-proyecto/sql
2. **Haz clic en "SQL Editor"**
3. **Copia la Query 1️⃣** completa
4. **Pégala en el editor** (todo exactamente como está)
5. **Haz clic en "Run"** (o Ctrl+Enter)
6. **Comparte el resultado conmigo**

Luego repite con Query 2️⃣ y Query 3️⃣

---

## 🎯 ¿Qué Resultados Espero?

### Mejor Caso ✅
```
Query 1 Result:
comprobantes_guardados: 5
total_registros: 20
usuarios_únicos: 3
suscripciones_únicas: 8
```
→ Significa que SÍ hay comprobantes guardados

### Peor Caso ❌
```
Query 1 Result:
comprobantes_guardados: 0
total_registros: 15
usuarios_únicos: 3
suscripciones_únicas: 8
```
→ Significa que NO hay comprobantes en payment_history (están guardados en otro lugar)

---

**Copia estas queries EXACTAMENTE COMO ESTÁN y ejecuta. Después comparte los resultados. 📸**
