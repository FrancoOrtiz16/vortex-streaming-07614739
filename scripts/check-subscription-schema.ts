import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qxmecegqnapcjlchjqld.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.error('❌ No hay SUPABASE_ANON_KEY disponible');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSubscriptionSchema() {
  console.log('🔍 Intentando arreglar el esquema de subscripciones...');
  console.log('   URL:', SUPABASE_URL);
  
  try {
    // Primero, vamos a ver si podemos leer la tabla para confirmar que existe
    console.log('\n📊 Verificando tabla subscriptions...');
    const { data, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, status, next_renewal')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error verificando tabla:', checkError.message);
      process.exit(1);
    }
    
    console.log('✅ Tabla verificada. Registros:', data?.length || 0);
    
    // Intentar ver si la columna permite NULL
    if (data && data.length > 0 && data[0].next_renewal === null) {
      console.log('✅ La columna next_renewal YA permite NULL');
      console.log('   La migración probablemente ya se ejecutó!');
      process.exit(0);
    }
    
    console.log('\n⚠️  Parece que la columna next_renewal NO permite NULL aún');
    console.log('   Se requiere ejecutar la migración manualmente en Supabase Dashboard');
    console.log('\n📝 Instrucciones:');
    console.log('   1. Ve a: https://app.supabase.com/project/qxmecegqnapcjlchjqld/sql/new');
    console.log('   2. Copia este SQL:');
    console.log('\n---');
    
    const sql = `BEGIN;
ALTER TABLE public.subscriptions ALTER COLUMN next_renewal DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN next_renewal DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN last_renewal DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN last_renewal DROP DEFAULT;

UPDATE public.subscriptions
SET next_renewal = NULL
WHERE status = 'pending_approval'
  AND next_renewal IS NOT NULL;

UPDATE public.subscriptions
SET last_renewal = NULL
WHERE status = 'pending_approval'
  AND last_renewal IS NOT NULL;
COMMIT;`;
    
    console.log(sql);
    console.log('---\n');
    console.log('   3. Click "Execute"');
    console.log('   4. Luego ejecuta este script nuevamente para verificar');
    
    process.exit(1);
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixSubscriptionSchema();
