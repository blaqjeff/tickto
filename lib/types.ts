// ===== Event Types =====
export interface Event {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    coverImage: string;
    category: EventCategory;
    tiers: TicketTier[];
    description: string;
    organizer: string;
    featured?: boolean;
    priceUsdc?: number; // USD price for the event
}

export type EventCategory =
    | 'music'
    | 'sports'
    | 'arts'
    | 'conference'
    | 'nightlife';

export interface TicketTier {
    id: string;
    name: string;
    price: number;
    currency: 'USDC';
    available: number;
    maxPerUser: number;
    perks: string[];
}

// ===== Ticket Types =====
export interface Ticket {
    id: string;
    eventId: string;
    event: Pick<Event, 'title' | 'date' | 'time' | 'venue' | 'coverImage'>;
    tier: string;
    tierName: string;
    qrCode: string;
    owner: string;
    mintedAt: string;
    tokenId: string;
    status: TicketStatus;
}

export type TicketStatus = 'valid' | 'used' | 'expired' | 'transferred';

// ===== User Types =====
export interface User {
    id: string;
    address: string;
    displayName?: string;
    avatar?: string;
    ticketCount: number;
}

// ===== Transaction Types =====
export type TransactionState =
    | 'idle'
    | 'processing'
    | 'minting'
    | 'success'
    | 'error';

export interface TransactionResult {
    success: boolean;
    ticketId?: string;
    txHash?: string;
    error?: string;
}

// ===== Navigation Types =====
export type NavItem = {
    id: string;
    label: string;
    href: string;
    icon: string;
    isCenter?: boolean;
};
