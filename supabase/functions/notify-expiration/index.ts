// Edge function notify-expiration: deprecated
// This function previously sent WhatsApp messages via the WhatsApp API.
// That logic has been removed. Generación de enlaces wa.me ahora se realiza desde el cliente.

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(() => new Response(JSON.stringify({ error: 'notify-expiration edge function removed; use client-side wa.me link generation' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }));
