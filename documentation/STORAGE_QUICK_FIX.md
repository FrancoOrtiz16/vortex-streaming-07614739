# 🚨 REFERENCIA RÁPIDA - Error 404 Bucket Storage

## El Problema
```json
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

---

## La Solución en 3 Minutos

### 1️⃣ Ve a Supabase Dashboard
- **Proyecto**: Vortex Streaming
- **Sección**: Storage

### 2️⃣ Verifica/Crea Bucket `receipts`
```
Si NO existe:
├─ Click "Create Bucket"
├─ Nombre: receipts
├─ Marcar "Public bucket" ✅
└─ Click "Create"

Si existe pero error persiste:
└─ Vamos al paso 3
```

### 3️⃣ Ejecuta SQL en SQL Editor
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts') ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'receipts') ON CONFLICT DO NOTHING;

CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'::app_role)) ON CONFLICT DO NOTHING;
```

### 4️⃣ Prueba
- Storage → receipts → Sube una imagen
- Copia URL pública → Abre en navegador
- Si ves la imagen: ✅ **¡LISTO!**

---

## ¿Aún No Funciona?

| Síntoma | Solución |
|---------|----------|
| Bucket no aparece en Storage | Recarga la página (F5) |
| Error 404 persiste | SQL no ejecutó correctamente (revisa el paso 3) |
| Puedo subir pero no ver | Falta política SELECT → ejecuta SQL del paso 3 |
| Error de permisos | Usuario no está autenticado → Inicia sesión |

---

## Documentación Completa

📘 **Setup Detallado**: [STORAGE_BUCKET_SETUP_GUIDE.md](./STORAGE_BUCKET_SETUP_GUIDE.md)  
📋 **Implementación**: [STORAGE_FIX_IMPLEMENTATION.md](./STORAGE_FIX_IMPLEMENTATION.md)

---

**¡Listo! Si después de esto sigue el error, contacta soporte con la información del paso 4.**
