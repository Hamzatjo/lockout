// LOCKOUT Cleanup Expired Content - Supabase Edge Function
// Deploy with: supabase functions deploy cleanup-expired

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase admin client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const now = new Date().toISOString();

        // Find expired workouts
        const { data: expiredWorkouts, error: selectError } = await supabaseAdmin
            .from('workouts')
            .select('id, media_url, thumbnail_url, user_id')
            .lt('expires_at', now);

        if (selectError) {
            throw selectError;
        }

        if (!expiredWorkouts || expiredWorkouts.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No expired content to clean up', deleted: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Found ${expiredWorkouts.length} expired workouts to delete`);

        // Delete media files from Storage
        const filesToDelete: string[] = [];

        for (const workout of expiredWorkouts) {
            if (workout.media_url) {
                // Extract file path from URL
                // URL format: https://xxx.supabase.co/storage/v1/object/public/workouts/user_id/filename.ext
                const urlParts = workout.media_url.split('/workouts/');
                if (urlParts.length > 1) {
                    filesToDelete.push(urlParts[1]);
                }
            }
            if (workout.thumbnail_url && workout.thumbnail_url !== workout.media_url) {
                const urlParts = workout.thumbnail_url.split('/workouts/');
                if (urlParts.length > 1) {
                    filesToDelete.push(urlParts[1]);
                }
            }
        }

        // Delete files from storage bucket
        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabaseAdmin.storage
                .from('workouts')
                .remove(filesToDelete);

            if (storageError) {
                console.error('Error deleting storage files:', storageError);
                // Continue with database deletion even if storage fails
            } else {
                console.log(`Deleted ${filesToDelete.length} files from storage`);
            }
        }

        // Delete expired workout records (cascades to votes)
        const workoutIds = expiredWorkouts.map(w => w.id);
        const { error: deleteError } = await supabaseAdmin
            .from('workouts')
            .delete()
            .in('id', workoutIds);

        if (deleteError) {
            throw deleteError;
        }

        console.log(`Deleted ${workoutIds.length} expired workout records`);

        return new Response(
            JSON.stringify({
                message: 'Cleanup complete',
                deleted: workoutIds.length,
                filesRemoved: filesToDelete.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Cleanup error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

/*
DEPLOYMENT:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link project: supabase link --project-ref <your-project-ref>
4. Deploy: supabase functions deploy cleanup-expired

SCHEDULING:
Set up a cron job to call this function hourly:
- Use Supabase Dashboard > Edge Functions > Create Schedule
- Or use an external cron service like cron-job.org

Example cron call:
curl -X POST 'https://<project>.supabase.co/functions/v1/cleanup-expired' \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"
*/
