# Instrucciones para Eliminar la Restricción de Unicidad en Supabase

## Problema
El error `23505 - duplicate key value violates unique constraint "subscriptions_user_service_unique"` impide que un usuario tenga múltiples suscripciones del mismo servicio (ej: múltiples perfiles de Netflix).

## Solución (EJECUTAR EN SUPABASE)

### Opción 1: SQL Editor de Supabase (Recomendado)

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Navega a **SQL Editor**
3. Copia y pega el siguiente SQL:

```sql
-- Eliminar definitivamente la restricción de unicidad
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_service_unique;

-- Eliminar el índice único si existe
DROP INDEX IF EXISTS subscriptions_user_service_unique;

-- Confirmar que la restricción está eliminada
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name='subscriptions' AND constraint_type='UNIQUE';
```

4. Haz clic en **Run** / **Ejecutar**
5. Verifica que el último SELECT devuelva 0 resultados (sin restricciones UNIQUE para user_id, service_name)

### Opción 2: Usando supabase-cli

```bash
supabase migration new remove_subscriptions_unique_constraint
# Edita el archivo SQL generado con el código anterior
supabase migration up
```

## Verificación

Después de ejecutar, prueba insertando dos suscripciones del mismo servicio para el mismo usuario:

```sql
-- Inserta dos suscripciones Netflix para el usuario mismo
INSERT INTO public.subscriptions (user_id, service_name, status, last_renewal, next_renewal, credential_email, credential_password)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Netflix', 'active', now(), now() + interval '30 days', 'email1@test.com', 'pass1'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Netflix', 'active', now(), now() + interval '30 days', 'email2@test.com', 'pass2');
```

Si no tienes error, ¡la restricción fue eliminada correctamente!

## Cambios en el Código

El repositorio incluye:

1. **Nueva Migración**: `supabase/migrations/20260408_remove_unique_constraint_permanent.sql`
   - Elimina la restricción
   - Agrega columnas para credenciales e IDs de combo

2. **Lógica de Combos**: 
   - Cuando compras múltiples servicios, se les asigna un `combo_id` compartido
   - Cada servicio dentro del combo puede tener credenciales diferentes
   - En el historial del cliente, los servicios se agrupan visualmente bajo "Combo"

3. **Columnas Usadas** (confirmadas en DB):
   - `id`, `user_id`, `service_name`, `status`
   - `last_renewal`, `next_renewal`
   - `credential_email`, `credential_password`
   - `profile_name`, `profile_pin`
   - `combo_id` (nuevo, para agrupar)

## Notas Importantes

- **NO** uses `subscription_code`, `fecha_inicio`, o `proxima_fecha` (no existen realmente)
- El sistema ahora soporta combos donde:
  - Netflix con email1@... y Disney+ con email2@...
  - Se visualizan juntos en el historial del cliente
  - Se renuevan como una sola transacción
- Los errores `PGRST204` desaparecerán una vez la migración se ejecute

## Si algo sale mal

Si recibis error al ejecutar el SQL:
1. Verifica que Supabase esté actualizado
2. Confirma que nadie más está editando la tabla en este momento
3. Si persiste, contacta al soporte de Supabase con el error completo
