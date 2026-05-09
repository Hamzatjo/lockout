import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SquadActivity {
  squadId: string;
  squadName: string;
  memberCount: number;
  recentCheckIns: number;
  avgStreak: number;
  topStreak: number;
  recentPRs: number;
  lastChallengeDate: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active squads
    const { data: squads, error: squadsError } = await supabaseClient
      .from('squads')
      .select('id, name')

    if (squadsError) throw squadsError

    const generatedChallenges = []

    // Process each squad
    for (const squad of squads || []) {
      try {
        const activity = await analyzeSquadActivity(supabaseClient, squad.id, squad.name)

        // Skip if squad had a challenge created in the last 2 days
        if (activity.lastChallengeDate) {
          const lastChallenge = new Date(activity.lastChallengeDate)
          const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          if (lastChallenge > twoDaysAgo) {
            continue
          }
        }

        // Generate challenge using AI
        const challenge = await generateChallenge(activity)

        if (challenge) {
          // Insert challenge into database
          const { data: insertedChallenge, error: insertError } = await supabaseClient
            .from('challenges')
            .insert({
              squad_id: squad.id,
              title: challenge.title,
              description: challenge.description,
              challenge_type: challenge.type,
              target_value: challenge.targetValue,
              point_reward: challenge.pointReward,
              starts_at: challenge.startsAt,
              ends_at: challenge.endsAt,
            })
            .select()
            .single()

          if (insertError) {
            console.error(`Error inserting challenge for squad ${squad.id}:`, insertError)
          } else {
            generatedChallenges.push({
              squadId: squad.id,
              squadName: squad.name,
              challenge: insertedChallenge
            })
          }
        }
      } catch (error) {
        console.error(`Error processing squad ${squad.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generatedChallenges: generatedChallenges.length,
        challenges: generatedChallenges
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in generate-challenges function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function analyzeSquadActivity(supabaseClient: any, squadId: string, squadName: string): Promise<SquadActivity> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get member count
  const { count: memberCount } = await supabaseClient
    .from('squad_members')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squadId)

  // Get recent check-ins (last 7 days)
  const { count: recentCheckIns } = await supabaseClient
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squadId)
    .eq('verification_level', 'check_in')
    .gte('created_at', oneWeekAgo)

  // Get recent PRs (workouts with weight/reps data)
  const { count: recentPRs } = await supabaseClient
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squadId)
    .not('weight_kg', 'is', null)
    .gte('created_at', oneWeekAgo)

  // Get streak data for squad members
  const { data: memberStreaks } = await supabaseClient
    .from('squad_members')
    .select('profiles(current_streak, longest_streak)')
    .eq('squad_id', squadId)

  let totalCurrentStreak = 0
  let topStreak = 0
  let memberWithStreaks = 0

  memberStreaks?.forEach((member: any) => {
    if (member.profiles) {
      const currentStreak = member.profiles.current_streak || 0
      const longestStreak = member.profiles.longest_streak || 0

      if (currentStreak > 0) {
        totalCurrentStreak += currentStreak
        memberWithStreaks++
      }

      if (longestStreak > topStreak) {
        topStreak = longestStreak
      }
    }
  })

  const avgStreak = memberWithStreaks > 0 ? totalCurrentStreak / memberWithStreaks : 0

  // Get last challenge date
  const { data: lastChallenge } = await supabaseClient
    .from('challenges')
    .select('created_at')
    .eq('squad_id', squadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    squadId,
    squadName,
    memberCount: memberCount || 0,
    recentCheckIns: recentCheckIns || 0,
    avgStreak: Math.round(avgStreak),
    topStreak,
    recentPRs: recentPRs || 0,
    lastChallengeDate: lastChallenge?.created_at || null
  }
}

async function generateChallenge(activity: SquadActivity) {
  // Simple rule-based challenge generation (can be enhanced with actual AI later)
  const challenges = []

  // Low activity squad - encourage basic check-ins
  if (activity.recentCheckIns < activity.memberCount * 2) {
    challenges.push({
      title: "Squad Wake-Up Call",
      description: `Squad's been quiet lately! Everyone check in 3 times this week for bonus points.`,
      type: "individual" as const,
      targetValue: 3,
      pointReward: 75,
      priority: 3
    })
  }

  // High activity squad - competitive challenges
  if (activity.recentCheckIns > activity.memberCount * 4) {
    challenges.push({
      title: "Consistency Champions",
      description: "Squad's on fire! Check in every day this week to prove you're unstoppable.",
      type: "individual" as const,
      targetValue: 7,
      pointReward: 150,
      priority: 2
    })
  }

  // Group challenges for team building
  if (activity.memberCount >= 3) {
    const groupTarget = Math.max(activity.memberCount * 3, 10)
    challenges.push({
      title: "Squad Power Hour",
      description: `Team effort! Squad needs ${groupTarget} total check-ins this week. Everyone contributes!`,
      type: "group" as const,
      targetValue: groupTarget,
      pointReward: 100,
      priority: 2
    })
  }

  // PR-focused challenges
  if (activity.recentPRs > 0) {
    challenges.push({
      title: "PR Pursuit",
      description: "Someone's been hitting PRs! First person to log a new personal record gets double points.",
      type: "individual" as const,
      targetValue: 1,
      pointReward: 200,
      priority: 1
    })
  }

  // Streak-based challenges
  if (activity.avgStreak > 3) {
    challenges.push({
      title: "Streak Legends",
      description: "Squad's got momentum! Maintain your streak for 5 more days to join the legends.",
      type: "individual" as const,
      targetValue: 5,
      pointReward: 125,
      priority: 2
    })
  }

  // Default fallback challenge
  if (challenges.length === 0) {
    challenges.push({
      title: "Weekly Grind",
      description: "New week, new gains! Check in 4 times this week to stay sharp.",
      type: "individual" as const,
      targetValue: 4,
      pointReward: 80,
      priority: 1
    })
  }

  // Select challenge with highest priority
  const selectedChallenge = challenges.sort((a, b) => b.priority - a.priority)[0]

  // Set challenge timeframe (start now, end in 7 days)
  const now = new Date()
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return {
    title: selectedChallenge.title,
    description: selectedChallenge.description,
    type: selectedChallenge.type,
    targetValue: selectedChallenge.targetValue,
    pointReward: selectedChallenge.pointReward,
    startsAt: now.toISOString(),
    endsAt: endDate.toISOString()
  }
}