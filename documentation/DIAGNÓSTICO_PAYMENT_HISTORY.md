# 🔍 Diagnóstico: Estructura de payment_history

Ejecuta ESTAS queries en Supabase SQL Editor (una por una):

---

## Query 1️⃣ - Ver la Estructura de la Tabla

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;
```

**¿Qué ves?** Comparte los nombres de las columnas que aparecen.

---

## Query 2️⃣ - Ver Registros de Ejemplo (Sin Filtros)

```sql
SELECT *
FROM payment_history
ORDER BY created_at DESC
LIMIT 5;
```

**¿Qué ves?** Comparte:
- Los nombres de las columnas exactos
- Si hay datos en `receipt_url`
- Qué valores tiene `subscription_id` y `user_id`

---

## Query 3️⃣ - Contar Registros con Comprobante

```sql
SELECT COUNT(*) as total_con_comprobante
FROM payment_history
WHERE receipt_url IS NOT NULL;
```

**¿Qué número ves?** Esto te dice cuántos comprobantes hay guardados.

---

## 🎯 Después de ejecutar estas queries

Envíame los resultados y podré:
1. ✅ Ver la estructura exacta
2. ✅ Escribir la query correcta
3. ✅ Identificar por qué no se muestran los comprobantes
4. ✅ Crear un fix si es necesario

---

**Importante:** Copia Y PEGA cada query tal como está. No reemplaces nada.
