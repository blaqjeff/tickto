import { supabase } from './supabaseClient';
import { Event, TicketTier } from './types';

/**
 * Database row type for events table
 */
interface EventRow {
    id: string;
    title: string;
    description: string;
    cover_image: string;
    image_url: string | null;
    date: string;
    time: string;
    venue: string;
    location: string;
    organizer: string;
    category: string;
    featured: boolean;
    tiers: TicketTier[] | null;
    price_usdc: number | null;
    created_at: string;
}

/**
 * Transform database row to Event type
 * Preserves image_url for frontend access
 */
function transformEvent(row: EventRow): Event & { image_url?: string } {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        coverImage: row.image_url || row.cover_image,
        date: row.date,
        time: row.time,
        venue: row.venue,
        location: row.location,
        organizer: row.organizer,
        category: row.category as Event['category'],
        featured: row.featured,
        tiers: row.tiers || [],
        priceUsdc: row.price_usdc || 0,
        image_url: row.image_url || undefined,
    };
}

/**
 * Fetch all events from Supabase
 */
export async function getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }

    return (data as EventRow[]).map(transformEvent);
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(id: string): Promise<Event | null> {
    // Guard against empty/null id
    if (!id) {
        console.error('getEventById: No id provided');
        return null;
    }

    console.log('getEventById: Fetching event with id:', id);

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching event:', error.message, 'for id:', id);
        return null;
    }

    if (!data) {
        console.error('getEventById: No data returned for id:', id);
        return null;
    }

    console.log('getEventById: Successfully fetched event:', data.title);
    return transformEvent(data as EventRow);
}

/**
 * Fetch featured events
 */
export async function getFeaturedEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('featured', true)
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching featured events:', error);
        return [];
    }

    return (data as EventRow[]).map(transformEvent);
}

/**
 * Search events by title or venue
 */
export async function searchEvents(query: string): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,venue.ilike.%${query}%,location.ilike.%${query}%`)
        .order('date', { ascending: true });

    if (error) {
        console.error('Error searching events:', error);
        return [];
    }

    return (data as EventRow[]).map(transformEvent);
}

// ===== TICKET TYPES =====

/**
 * Database row type for tickets table
 */
interface TicketRow {
    id: string;
    event_id: string;
    owner_id: string;
    tier_id: string;
    tier_name: string;
    qr_code: string;
    token_id: string;
    status: 'valid' | 'used' | 'transferred';
    minted_at: string;
    created_at: string;
}

/**
 * Ticket with event data for display
 */
export interface TicketWithEvent {
    id: string;
    eventId: string;
    event: {
        title: string;
        date: string;
        time: string;
        venue: string;
        coverImage: string;
    };
    tierId: string;
    tierName: string;
    qrCode: string;
    tokenId: string;
    status: 'valid' | 'used' | 'transferred';
    mintedAt: string;
}

// ===== TICKET API FUNCTIONS =====
/**
 * Fetch all tickets for a specific user
 * Uses Supabase's built-in join to fetch event data in one query
 */
export async function getUserTickets(userId: string) {
    if (!userId) return [];

    console.log("🔍 Fetching tickets for:", userId);

    // Fetch tickets AND the related event data in one single query
    const { data, error } = await supabase
        .from('tickets')
        .select(`
            *,
            events ( * )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ API Error:", error);
        return [];
    }

    console.log("✅ API: Got tickets:", data);

    // Map the nested 'events' array/object to a single 'event' property
    return (data || []).map((ticket: Record<string, unknown>) => ({
        ...ticket,
        event: ticket.events // flatten the structure for the UI
    }));
}

/**
 * Purchase ticket(s) for an event
 * Supports buying multiple tickets at once
 */
export async function buyTicket(
    eventId: string,
    userId: string,
    tier: string,
    tierName: string,
    quantity: number = 1,
    pricePerTicket: number = 0
): Promise<{ success: boolean; tickets?: TicketWithEvent[]; error?: string }> {
    // Validate inputs
    if (!eventId || !userId) {
        return { success: false, error: 'Missing eventId or userId' };
    }

    if (quantity < 1 || quantity > 5) {
        return { success: false, error: 'Quantity must be between 1 and 5' };
    }

    try {
        // Create ticket records for each quantity
        const ticketRecords = [];
        const now = new Date().toISOString();

        for (let i = 0; i < quantity; i++) {
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const qrCode = `TICKTO-${eventId.slice(0, 8).toUpperCase()}-${randomSuffix}`;
            const tokenId = String(1000 + Math.floor(Math.random() * 9000));

            ticketRecords.push({
                event_id: eventId,
                owner_id: userId,
                tier: tier,
                tier_name: tierName,
                qr_code: qrCode,
                token_id: tokenId,
                status: 'valid',
                minted_at: now,
                price_paid: pricePerTicket,
            });
        }

        // Insert all tickets at once
        const { data, error } = await supabase
            .from('tickets')
            .insert(ticketRecords)
            .select();

        if (error) {
            console.error('Error buying tickets:', error);
            return { success: false, error: error.message };
        }

        if (!data || data.length === 0) {
            return { success: false, error: 'No tickets created' };
        }

        // Fetch the event data for tickets
        const { data: event } = await supabase
            .from('events')
            .select('title, date, time, venue, cover_image')
            .eq('id', eventId)
            .single();

        // Transform to TicketWithEvent array
        const tickets: TicketWithEvent[] = data.map((ticket: {
            id: string;
            event_id: string;
            tier: string;
            tier_name: string;
            qr_code: string;
            token_id: string;
            status: 'valid' | 'used' | 'transferred';
            minted_at: string;
        }) => ({
            id: ticket.id,
            eventId: ticket.event_id,
            event: {
                title: event?.title || 'Unknown Event',
                date: event?.date || '',
                time: event?.time || '',
                venue: event?.venue || '',
                coverImage: event?.cover_image || '',
            },
            tierId: ticket.tier,
            tierName: ticket.tier_name,
            qrCode: ticket.qr_code,
            tokenId: ticket.token_id,
            status: ticket.status,
            mintedAt: ticket.minted_at,
        }));

        console.log(`Successfully purchased ${tickets.length} ticket(s)`);
        return { success: true, tickets };
    } catch (err) {
        console.error('Unexpected error in buyTicket:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
