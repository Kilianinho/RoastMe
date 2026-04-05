/**
 * delete-auth-user Edge Function
 *
 * Called after soft-deleting a profile to also remove the auth.users entry.
 * This ensures full GDPR "right to erasure" compliance.
 *
 * Requires a valid user JWT in the Authorization header. The JWT is verified
 * using the service-role admin client (no SUPABASE_ANON_KEY dependency), and
 * the verified user.id must match the user_id in the request body — preventing
 * one authenticated user from deleting another's account.
 *
 * Expected request body:
 * {
 *   "user_id": "<uuid>"
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check auth header before touching the body — fail fast on unauthenticated calls.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Parse request body.
    let user_id: string;
    try {
      const body = await req.json();
      user_id = body?.user_id;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Build the service-role admin client.
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the runtime.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 4. Verify the JWT using the admin client — no SUPABASE_ANON_KEY required.
    //    The service-role client can validate any project JWT.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 5. Enforce that the caller can only delete their own account.
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: JWT does not match user_id' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 6. Delete the user from auth.users.
    //    The profiles row is already soft-deleted by the client before this call.
    //    The FK (profiles.id REFERENCES auth.users ON DELETE CASCADE) means the
    //    hard delete here would also cascade, but soft-delete already hides the profile.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('[delete-auth-user] Failed to delete auth user:', deleteError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[delete-auth-user] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
