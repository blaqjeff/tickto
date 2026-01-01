import { create } from 'zustand';
import { Ticket } from './types';
import { mockTickets } from './mock-data';

interface TicketStore {
    tickets: Ticket[];
    addTicket: (ticket: Ticket) => void;
    removeTicket: (ticketId: string) => void;
    getTicketById: (ticketId: string) => Ticket | undefined;
}

/**
 * Global ticket store using Zustand
 * Manages purchased tickets across the app
 */
export const useTicketStore = create<TicketStore>((set, get) => ({
    // Initialize with mock tickets for demo
    tickets: mockTickets,

    addTicket: (ticket) =>
        set((state) => ({
            tickets: [ticket, ...state.tickets],
        })),

    removeTicket: (ticketId) =>
        set((state) => ({
            tickets: state.tickets.filter((t) => t.id !== ticketId),
        })),

    getTicketById: (ticketId) => get().tickets.find((t) => t.id === ticketId),
}));

/**
 * Helper to generate a new ticket after purchase
 */
export function createTicketFromPurchase(
    eventId: string,
    eventTitle: string,
    eventDate: string,
    eventTime: string,
    eventVenue: string,
    eventCoverImage: string,
    tierName: string,
    tierId: string,
    ownerAddress: string = '0x1234...5678'
): Ticket {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

    return {
        id: `tkt-${timestamp}`,
        eventId,
        event: {
            title: eventTitle,
            date: eventDate,
            time: eventTime,
            venue: eventVenue,
            coverImage: eventCoverImage,
        },
        tier: tierId,
        tierName,
        qrCode: `TICKTO-${eventId.slice(0, 3).toUpperCase()}-${randomSuffix}`,
        owner: ownerAddress,
        mintedAt: new Date().toISOString(),
        tokenId: String(1000 + Math.floor(Math.random() * 9000)),
        status: 'valid',
    };
}
