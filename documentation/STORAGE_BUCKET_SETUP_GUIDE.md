# 🪣 Guía de Configuración del Bucket Storage - Vortex Streaming

## 🚨 Problema Crítico
```json
{
  "statusCode": "404",
  "error": "Bucket not found",
  "message": "Bucket not found"
}
```

**Causa**: El bucket de almacenamiento `receipts` no existe en Supabase Storage, aunque el código intenta usarlo.

---

## ✅ Solución: Paso a Paso

### **Paso 1: Verificar/Crear el Bucket en Supabase Dashboard**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre tu proyecto `vortex-streaming`
3. En el menú lateral, selecciona **Storage** (icono de carpeta)
4. **Si NO ves un bucket llamado `receipts`:**
   - Haz clic en **Create Bucket**
   - Nombre: `receipts`
   - Marcar ✅ **Public bucket**
   - Presiona **Create**

**Si el bucket ya existe pero sigue con error 404:**
   - Es posible que las políticas RLS no se hayan aplicado correctamente
   - Ve al **Paso 2** (Políticas RLS)

---

### **Paso 2: Aplicar Políticas RLS (Row Level Security)**

El bucket `receipts` necesita las siguientes políticas para funcionar correctamente:

#### **Opción A: Usando SQL Editor (Recomendado)**

1. En Supabase Dashboard, ve a **SQL Editor**
2. Crea una nueva query
3. Copia y ejecuta el siguiente SQL:

```sql
-- Create storage bucket for payment receipts (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Admins can delete receipts" ON storage.objects;
CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'::app_role));
```

#### **Opción B: Usando Interfaz Gráfica**

1. Ve a **Storage > receipts**
2. Haz clic en **Policies** (en la pestaña superior)
3. Agrega estas 3 políticas:

| Acción | Rol | Condición |
|--------|-----|-----------|
| **SELECT** | `public` | Ninguna (o `bucket_id = 'receipts'`) |
| **INSERT** | `authenticated` | `bucket_id = 'receipts'` |
| **DELETE** | `authenticated` | `bucket_id = 'receipts'` |

---

### **Paso 3: Verificar Configuración del Bucket**

1. En **Storage > receipts**, verifica:
   - ✅ Estado: **Public** (verde)
   - ✅ 3 políticas RLS aplicadas
   - ✅ Carpeta vacía o con archivos

2. **Prueba manual de descarga:**
   - Sube cualquier imagen a través de la interfaz
   - Haz clic derecho > "Copy public URL"
   - Abre la URL en una pestaña nueva
   - Si ves la imagen: ✅ El bucket funciona correctamente

---

### **Paso 4: Verificar Código Frontend**

En [src/components/shop/CheckoutDialog.tsx](../../src/components/shop/CheckoutDialog.tsx#L69), el código está correcto:

```typescript
// ✅ Correcto - Usa 'receipts'
const { error } = await supabase.storage
  .from('receipts')
  .upload(path, file);

const { data: urlData } = supabase.storage
  .from('receipts')
  .getPublicUrl(path);
```

No requiere cambios.

---

## 🛡️ Mejoras Implementadas (UI/UX)

Se agregó fallback elegante en el panel de administración:

- Si una URL de comprobante falla: Muestra estado "Sincronizando..." en lugar de error JSON
- Retry automático cada 5 segundos
- Alerta visual clara al usuario

Archivo: [src/components/admin/ReceiptImageViewer.tsx](../../src/components/admin/ReceiptImageViewer.tsx) (nuevo)

---

## 🔍 Debugging

### Si después de todo sigue con error 404:

1. **Verifica que el usuario esté autenticado:**
   ```bash
   curl -H "Authorization: Bearer $ANON_KEY" \
     https://your-project.supabase.co/storage/v1/object/public/receipts/test.jpg
   ```

2. **Revisa los logs de Supabase:**
   - Dashboard > Logs > Storage
   - Busca errores recientes

3. **Borra caché del navegador:**
   - `Ctrl+Shift+Del` (o `Cmd+Shift+Del` en Mac)
   - Selecciona "Todos los tiempos"
   - Limpia caché

4. **Reinicia el servidor local:**
   ```bash
   npm run dev
   ```

---

## 📋 Checklist Final

- [ ] Bucket `receipts` visible en Supabase Storage
- [ ] Bucket está marcado como "Public" (verde)
- [ ] 3 políticas RLS aplicadas correctamente
- [ ] Prueba manual de URL pública funciona
- [ ] Cliente puede subir comprobante en CheckoutDialog
- [ ] Imagen se muestra en panel administrativo sin error 404

---

## 🆘 Soporte

Si el error persiste después de seguir estos pasos:

1. Verifica que estés en el proyecto correcto
2. Asegúrate que la sesión de Supabase no esté expirada
3. Contacta a soporte técnico con:
   - ID del proyecto
   - Timestamp del error
   - Nombre de usuario que subió el archivo

