import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  title: string
  body: string
  data?: Record<string, any>
  userIds?: string[]
  squadId?: string
  excludeUserIds?: string[]
}

interface PushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const notificationRequest: NotificationRequest = await req.json()

    // Validate required fields
    if (!notificationRequest.title || !notificationRequest.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get target user IDs
    let targetUserIds: string[] = []

    if (notificationRequest.userIds) {
      targetUserIds = notificationRequest.userIds
    } else if (notificationRequest.squadId) {
      // Get all squad members
      const { data: squadMembers, error: squadError } = await supabaseClient
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', notificationRequest.squadId)

      if (squadError) throw squadError

      targetUserIds = squadMembers?.map(member => member.user_id) || []
    }

    // Exclude specified users
    if (notificationRequest.excludeUserIds) {
      targetUserIds = targetUserIds.filter(id => !notificationRequest.excludeUserIds!.includes(id))
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get push tokens for target users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, push_token')
      .in('id', targetUserIds)
      .not('push_token', 'is', null)

    if (profilesError) throw profilesError

    const pushTokens = profiles?.filter(profile => profile.push_token).map(profile => profile.push_token) || []

    if (pushTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users with push tokens found',
          sentCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Send push notifications
    const results = await sendPushNotifications({
      title: notificationRequest.title,
      body: notificationRequest.body,
      data: notificationRequest.data || {},
      pushTokens
    })

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: results.successCount,
        failedCount: results.failedCount,
        results: results.tickets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendPushNotifications({
  title,
  body,
  data,
  pushTokens
}: {
  title: string
  body: string
  data: Record<string, any>
  pushTokens: string[]
}): Promise<{ successCount: number; failedCount: number; tickets: PushTicket[] }> {

  // Prepare notification messages
  const messages = pushTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default'
  }))

  try {
    // Send to Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!response.ok) {
      throw new Error(`Push notification service responded with ${response.status}`)
    }

    const result = await response.json()
    const tickets: PushTicket[] = result.data || []

    const successCount = tickets.filter(ticket => ticket.status === 'ok').length
    const failedCount = tickets.filter(ticket => ticket.status === 'error').length

    return { successCount, failedCount, tickets }

  } catch (error) {
    console.error('Error sending push notifications:', error)

    // Return failed results for all tokens
    const failedTickets: PushTicket[] = pushTokens.map(() => ({
      status: 'error',
      message: error.message
    }))

    return {
      successCount: 0,
      failedCount: pushTokens.length,
      tickets: failedTickets
    }
  }
}