'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

export async function deleteEventAdmin(eventId: string, adminUserId: string) {
    if (!eventId || !adminUserId) {
        return { success: false, error: 'Missing parameters' };
    }

    try {
        // 1. Verify the user is actually an admin
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('is_admin')
            .eq('id', adminUserId)
            .single();

        if (userError || !userData?.is_admin) {
            return { success: false, error: 'Unauthorized: User is not an admin' };
        }

        // 2. Perform the soft delete (bypasses RLS due to service role key)
        const { error: updateError } = await supabaseAdmin
            .from('events')
            .update({ status: 'deleted' })
            .eq('id', eventId);

        if (updateError) {
            console.error('Error soft-deleting event:', updateError);
            return { success: false, error: 'Failed to delete event in database' };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Unexpected error in deleteEventAdmin:', err);
        return { success: false, error: err.message || 'An unexpected error occurred' };
    }
}
