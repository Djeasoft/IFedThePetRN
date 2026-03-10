// process-reminders/index.ts
// Supabase Edge Function — Processes scheduled feed reminders
// Called by pg_cron every minute via net.http_post with service role Bearer token.
// Finds reminders matching current HH:mm UTC, inserts a 'reminder' notification
// per household member where receives_reminders = true.
// Version: 1.0.0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const now = new Date()
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('reminders')
      .select('id, household_id, label')
      .eq('time', currentTime)

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, time: currentTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalInserted = 0

    for (const reminder of reminders) {
      const { data: members, error: membersError } = await supabaseAdmin
        .from('user_households')
        .select('user_id')
        .eq('household_id', reminder.household_id)
        .eq('receives_reminders', true)

      if (membersError) {
        console.error(`Error fetching members for household ${reminder.household_id}:`, membersError)
        continue
      }

      if (!members || members.length === 0) continue

      const notifications = members.map((member) => ({
        household_id: reminder.household_id,
        type: 'reminder',
        message: reminder.label,
        target_user_id: member.user_id,
      }))

      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)

      if (insertError) {
        console.error(`Error inserting notifications for reminder ${reminder.id}:`, insertError)
        continue
      }

      totalInserted += notifications.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        time: currentTime,
        remindersMatched: reminders.length,
        notificationsInserted: totalInserted,
      }),
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
