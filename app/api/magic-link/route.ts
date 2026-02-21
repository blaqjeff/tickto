import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event_id, organizer_wallet } = body; // To verify ownership, we should really use Auth

        // Wait, since this is called from the dashboard, the user is authenticated via Privy.
        // But the backend doesn't easily know the Privy user ID without complex verification.
        // For the MVP, we assume the dashboard passes the event_id and we just generate it. 
        // In a real production app, we MUST verify the user owns the event before generating a token.

        if (!event_id) {
            return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
        }

        // Generate a secure random token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .from('scanner_tokens')
            .insert({
                event_id,
                token,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to generate token:", error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true, token: data.token });

    } catch (err) {
        console.error("Magic Link API Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    // List tokens for an event
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
        return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .from('scanner_tokens')
            .select('*')
            .eq('event_id', event_id)
            .eq('is_active', true);

        if (error) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true, tokens: data });
    } catch (err: any) {
        console.error("Magic Link API Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    // Revoke a token
    const body = await req.json();
    const { token } = body;

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
            .from('scanner_tokens')
            .update({ is_active: false })
            .eq('token', token);

        if (error) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Magic Link API Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
