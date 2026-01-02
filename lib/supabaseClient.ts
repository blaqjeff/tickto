import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '❌ Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
}

/**
 * Supabase client singleton
 * Use this client for all database operations
 */
export const supabase: SupabaseClient = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);

/**
 * Test Supabase connection
 * Call this function to verify the client is configured correctly
 */
export async function testSupabaseConnection(): Promise<boolean> {
    try {
        // Attempt a simple query to verify connection
        const { error } = await supabase.from('_test_connection').select('*').limit(1);

        // If the error is "relation does not exist", the connection is still valid
        // (the table just doesn't exist, which is expected)
        if (error && !error.message.includes('does not exist')) {
            console.error('❌ Supabase connection failed:', error.message);
            return false;
        }

        console.log('✅ Supabase Connected');
        return true;
    } catch (err) {
        console.error('❌ Supabase connection error:', err);
        return false;
    }
}

// Log connection status on import (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    testSupabaseConnection();
}
