import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase Admin client to bypass RLS for scanner validation
// We use the service_role key because volunteers scanning tickets are typically not authenticated users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. Please add it to your .env.local file.");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, qr_code } = body;

        if (!token || !qr_code) {
            return NextResponse.json({ error: 'Missing token or qr_code' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Validate the scanner token
        const { data: tokenData, error: tokenError } = await supabaseAdmin
            .from('scanner_tokens')
            .select('event_id, is_active, expires_at')
            .eq('token', token)
            .single();

        if (tokenError) {
            console.error("Scanner Token Error:", tokenError, "Token:", token);
            if (tokenError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Invalid or missing scanner token' }, { status: 401 });
            }
            return NextResponse.json({
                error: `Network error verifying access: ${tokenError.message || 'Unknown error'}`
            }, { status: 502 });
        }

        if (!tokenData) {
            return NextResponse.json({ error: 'Invalid or missing scanner token' }, { status: 401 });
        }

        if (!tokenData.is_active) {
            return NextResponse.json({ error: 'This scanner link has been deactivated' }, { status: 403 });
        }

        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This scanner link has expired' }, { status: 403 });
        }

        const eventId = tokenData.event_id;

        // 2. Parse the QR code payload if it's JSON
        let queryKey = 'qr_code';
        let queryValue = qr_code;
        try {
            const parsed = JSON.parse(qr_code);
            if (parsed.id) {
                queryKey = 'id';
                queryValue = parsed.id;
            } else if (parsed.qr_code) {
                queryKey = 'qr_code';
                queryValue = parsed.qr_code;
            }
        } catch (e) {
            // Not JSON, assume it's the raw qr_code string
        }

        // 3. Lookup the ticket
        const { data: ticketData, error: ticketError } = await supabaseAdmin
            .from('tickets')
            .select('*')
            .eq(queryKey, queryValue)
            .eq('event_id', eventId)
            .single();

        if (ticketError || !ticketData) {
            console.error("Ticket Lookup Error:", ticketError, "Queried:", queryKey, "=", queryValue, "EventID:", eventId);
            return NextResponse.json({ error: 'Ticket not found for this event' }, { status: 404 });
        }

        // 3. Check ticket status
        if (ticketData.status === 'used') {
            return NextResponse.json({
                error: 'ALREADY SCANNED',
                message: 'This ticket has already been used.',
                ticket: ticketData
            }, { status: 409 }); // 409 Conflict
        }

        if (ticketData.status !== 'valid') {
            return NextResponse.json({
                error: `INVALID TICKET (${ticketData.status})`,
                message: 'This ticket is not valid for entry.',
                ticket: ticketData
            }, { status: 400 });
        }

        // 4. Mark ticket as used
        const { error: updateError } = await supabaseAdmin
            .from('tickets')
            .update({ status: 'used' })
            .eq('id', ticketData.id);

        if (updateError) {
            console.error("Ticket Update Error:", updateError);
            return NextResponse.json({ error: 'Failed to update ticket status' }, { status: 500 });
        }

        // 5. Success
        return NextResponse.json({
            success: true,
            message: 'TICKET VALID - ACCESS GRANTED',
            ticket: ticketData
        }, { status: 200 });

    } catch (err: any) {
        console.error("Scan API Exception:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
