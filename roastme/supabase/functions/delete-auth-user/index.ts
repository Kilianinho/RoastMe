/**
 * delete-auth-user Edge Function
 *
 * Called after soft-deleting a profile to also remove the auth.users entry.
 * This ensures full GDPR "right to erasure" compliance.
 *
 * Requires service_role key — only callable from authenticated clients
 * with a valid JWT matching the user_id being deleted.
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
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create admin client with service_role to delete from auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify the JWT belongs to the same user requesting deletion
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user || user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: JWT does not match user_id' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Delete the user from auth.users (cascades to profile via FK)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError.message);
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
    console.error('Unexpected error in delete-auth-user:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
