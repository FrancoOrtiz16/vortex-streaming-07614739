import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendWhatsAppMessage(phoneId: string, token: string, toPhone: string, bodyText: string) {
  const url = `https://graph.facebook.com/v15.0/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: toPhone,
    type: 'text',
    text: { body: bodyText },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceKey) {
      const missing = [
        !supabaseUrl ? 'SUPABASE_URL' : null,
        !anonKey ? 'SUPABASE_PUBLISHABLE_KEY' : null,
        !serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
      ].filter(Boolean)
      return new Response(JSON.stringify({ error: `Server environment not configured for notify-expiration (missing: ${missing.join(', ')})` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const userResponse = await callerClient.auth.getUser()
    const caller = userResponse.data?.user ?? null
    if (!caller) {
      const message = userResponse.error?.message || 'Invalid token'
      return new Response(JSON.stringify({ error: message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // check admin role
    const { data: isAdmin, error: roleError } = await callerClient.rpc('has_role', { _user_id: caller.id, _role: 'admin' })
    if (roleError) {
      console.error('[notify-expiration] has_role rpc error', roleError)
      return new Response(JSON.stringify({ error: 'Authorization check failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { user_id, subscription_id, service_name, message, phone } = body || {}
    if (!user_id || !subscription_id || !service_name) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Determine phone: prefer provided phone, otherwise try to read from profiles table using service role
    let targetPhone = phone || null
    if (!targetPhone) {
      const adminClient = createClient(supabaseUrl, serviceKey)
      const { data: profile, error } = await adminClient.from('profiles').select('phone, profile_phone').eq('user_id', user_id).limit(1).single()
      if (error) {
        console.warn('[notify-expiration] Error fetching profile phone', error)
      } else if (profile) {
        targetPhone = profile.phone ?? profile.profile_phone ?? null
      }
    }

    if (!targetPhone) {
      return new Response(JSON.stringify({ error: 'No phone available for user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    if (!whatsappPhoneId || !whatsappToken) {
      return new Response(JSON.stringify({ error: 'WhatsApp not configured on server' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const text = message || `Hola. Tu servicio ${service_name} está por vencer. Renueva para no perder acceso.`

    // Send message
    const result = await sendWhatsAppMessage(whatsappPhoneId, whatsappToken, targetPhone, text)

    // Optionally: record a notification row using service role (if table exists)
    try {
      const adminClient = createClient(supabaseUrl, serviceKey)
      await adminClient.from('notifications').insert([{ user_id, subscription_id, message: text }])
    } catch (e) {
      // ignore if notifications table doesn't exist
    }

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
