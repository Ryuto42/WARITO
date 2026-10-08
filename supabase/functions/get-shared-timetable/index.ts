import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  const { id } = await req.json().catch(() => ({ id: '' }));
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return jsonResponse({ error: 'invalid_id' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient
    .from('shared_timetables')
    .select('data, expires_at')
    .eq('id', id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }

  if (!data) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  return jsonResponse({ payload: data.data });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
