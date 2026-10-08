import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BODY_LENGTH = 50000;
const MAX_SHARE_CLASSES = 200;
const SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  const body = await req.text().catch(() => '');
  if (body.length > MAX_BODY_LENGTH) {
    return jsonResponse({ error: 'payload_too_large' }, 413);
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(body)?.payload ?? null;
  } catch {
    payload = null;
  }

  const sanitized = sanitizePayload(payload);
  if (!sanitized) {
    return jsonResponse({ error: 'invalid_payload' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient
    .from('shared_timetables')
    .insert({
      user_id: userData.user.id,
      data: sanitized,
      expires_at: new Date(Date.now() + SHARE_TTL_MS).toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error(error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }

  return jsonResponse({ id: data.id });
});

function sanitizePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { y, sm, cs } = payload as Record<string, unknown>;
  if (!Array.isArray(cs) || cs.length === 0 || cs.length > MAX_SHARE_CLASSES) return null;
  if (!cs.every((c) => c && typeof c === 'object' && !Array.isArray(c))) return null;

  // メモは個人情報を含みうるので共有しない
  const classes = cs.map((c) => {
    const { m: _memo, ...rest } = c as Record<string, unknown>;
    return rest;
  });
  return { y, sm, cs: classes, v: 2 };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
