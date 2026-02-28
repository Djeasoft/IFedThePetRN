// claim-invite/index.ts
// Supabase Edge Function - Claims a pending household invitation
// Called when an invited user signs up with email/password for the first time.
// Sets a password (and confirms email) on the ghost auth user that was created
// by inviteUserByEmail() when the admin sent the invite.
// Version: 1.0.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client using service role key (server-side only)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Security check: verify this email has a pending invitation with a known ghost auth user ID
    const { data: pendingUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('auth_user_id, invitation_status')
      .eq('email_address', email.toLowerCase())
      .maybeSingle()

    if (dbError || !pendingUser) {
      return new Response(
        JSON.stringify({ error: 'No invitation found for this email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pendingUser.invitation_status !== 'Pending') {
      return new Response(
        JSON.stringify({ error: 'No pending invitation for this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingUser.auth_user_id) {
      return new Response(
        JSON.stringify({ error: 'Invitation was not properly set up. Please contact your household admin to resend the invite.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set the user's chosen password and confirm their email in one call
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      pendingUser.auth_user_id,
      { password, email_confirm: true }
    )

    if (updateError) {
      console.error('Error claiming invite:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
