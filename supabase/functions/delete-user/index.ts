// Supabase Edge Function: delete-user
//
// Deletes a user from Supabase Auth. This cannot be done from the browser,
// because deleting auth users requires the service-role key — and anything
// shipped to a browser is readable by whoever is using it. A service-role
// key in frontend code would let any visitor do anything to your database.
//
// So the key lives here instead. This function runs on Supabase's servers,
// checks that whoever called it is actually an admin, and only then deletes.
//
// Runs on Deno, not Node. That's why imports are URLs and the server is
// started with Deno.serve() instead of express or similar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Browsers send a preflight OPTIONS request before a cross-origin POST.
// Without these headers the browser blocks the real request.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase injects these three automatically. You don't set them yourself.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Not signed in.' }, 401)
    }

    // A client acting as whoever called this function, so we can identify them.
    // Never trust a user id sent in the request body — read it from the token.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return json({ error: 'Your session is invalid. Sign in again.' }, 401)
    }

    // A privileged client, used to check the caller's role and do the delete.
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can delete accounts.' }, 403)
    }

    const { user_id: targetId } = await req.json()

    if (!targetId) {
      return json({ error: 'No user_id given.' }, 400)
    }

    if (targetId === caller.id) {
      return json({ error: "You can't delete your own account." }, 400)
    }

    // Deleting the auth user cascades: profiles.id has ON DELETE CASCADE,
    // which in turn clears that person's teacher_students rows and nulls
    // the teacher_id on any grades they entered.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId)

    if (deleteError) {
      return json({ error: deleteError.message }, 400)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
