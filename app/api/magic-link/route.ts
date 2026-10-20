import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPrivyUserId } from '@/lib/privy-server';

export const dynamic = 'force-dynamic';

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

async function assertEventOrganizer(req: Request, eventId: string) {
    const userId = await verifyPrivyUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: event, error } = await supabaseAdmin
        .from('events')
        .select('owner_id')
        .eq('id', eventId)
        .single();

    if (error || !event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.owner_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event_id } = body;

        if (!event_id) {
            return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
        }

        const authError = await assertEventOrganizer(req, event_id);
        if (authError) return authError;

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
    } catch (err: unknown) {
        console.error("Magic Link API Error:", err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
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
        const { data: tokenRow, error: lookupError } = await supabaseAdmin
            .from('scanner_tokens')
            .select('event_id')
            .eq('token', token)
            .single();

        if (lookupError || !tokenRow) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        const authError = await assertEventOrganizer(req, tokenRow.event_id);
        if (authError) return authError;

        const { error } = await supabaseAdmin
            .from('scanner_tokens')
            .update({ is_active: false })
            .eq('token', token);

        if (error) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Magic Link API Error:", err);
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
