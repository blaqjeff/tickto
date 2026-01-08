import { Event, Ticket } from './types';

// ===== Mock Events =====
export const mockEvents: Event[] = [
    {
        id: 'evt-001',
        title: 'Neon Dreams Festival',
        date: '2026-02-14',
        time: '20:00',
        venue: 'The Glass Arena',
        location: 'Los Angeles, CA',
        coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        category: 'music',
        description: 'An immersive electronic music experience featuring world-renowned DJs and stunning visual productions.',
        organizer: 'Pulse Events',
        featured: true,
        tiers: [
            {
                id: 'tier-ga',
                name: 'General Admission',
                price: 75,
                currency: 'USDC',
                available: 250,
                maxPerUser: 4,
                perks: ['Festival access', 'Commemorative NFT'],
            },
            {
                id: 'tier-vip',
                name: 'VIP Experience',
                price: 200,
                currency: 'USDC',
                available: 50,
                maxPerUser: 2,
                perks: ['Priority entry', 'VIP lounge access', 'Exclusive merch', 'Meet & greet'],
            },
        ],
    },
    {
        id: 'evt-002',
        title: 'Digital Art Exhibition',
        date: '2026-01-28',
        time: '18:00',
        venue: 'Crypto Gallery',
        location: 'Miami, FL',
        coverImage: 'https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=800&q=80',
        category: 'arts',
        description: 'Explore the intersection of blockchain and creativity with works from pioneering digital artists.',
        organizer: 'ArtChain Collective',
        tiers: [
            {
                id: 'tier-standard',
                name: 'Standard Entry',
                price: 35,
                currency: 'USDC',
                available: 100,
                maxPerUser: 2,
                perks: ['Exhibition access', 'Digital catalog'],
            },
            {
                id: 'tier-collector',
                name: 'Collector Pass',
                price: 150,
                currency: 'USDC',
                available: 20,
                maxPerUser: 1,
                perks: ['Private viewing', 'Artist reception', 'Limited edition print'],
            },
        ],
    },
    {
        id: 'evt-003',
        title: 'Web3 Builders Summit',
        date: '2026-03-05',
        time: '09:00',
        venue: 'Tech Hub Center',
        location: 'San Francisco, CA',
        coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
        category: 'conference',
        description: 'Connect with the brightest minds building the decentralized future. Two days of talks, workshops, and networking.',
        organizer: 'DeFi Alliance',
        tiers: [
            {
                id: 'tier-builder',
                name: 'Builder Pass',
                price: 250,
                currency: 'USDC',
                available: 300,
                maxPerUser: 1,
                perks: ['Full conference access', 'Workshop sessions', 'Networking events'],
            },
            {
                id: 'tier-sponsor',
                name: 'Sponsor Badge',
                price: 1000,
                currency: 'USDC',
                available: 25,
                maxPerUser: 1,
                perks: ['Everything in Builder', 'Speaking slot', 'Recruiting booth', 'VIP dinner'],
            },
        ],
    },
    {
        id: 'evt-004',
        title: 'Midnight Rooftop Sessions',
        date: '2026-01-18',
        time: '22:00',
        venue: 'Sky Lounge',
        location: 'New York, NY',
        coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        category: 'nightlife',
        description: 'An exclusive rooftop party with panoramic city views and underground house music.',
        organizer: 'After Dark NYC',
        tiers: [
            {
                id: 'tier-entry',
                name: 'Entry',
                price: 50,
                currency: 'USDC',
                available: 150,
                maxPerUser: 2,
                perks: ['Rooftop access', 'Welcome drink'],
            },
            {
                id: 'tier-table',
                name: 'Table Service',
                price: 500,
                currency: 'USDC',
                available: 10,
                maxPerUser: 1,
                perks: ['Reserved table for 6', 'Bottle service', 'Personal host'],
            },
        ],
    },
];

// ===== Mock User Tickets =====
export const mockTickets: Ticket[] = [
    {
        id: 'tkt-001',
        eventId: 'evt-001',
        event: {
            title: 'Neon Dreams Festival',
            date: '2026-02-14',
            time: '20:00',
            venue: 'The Glass Arena',
            coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        },
        tier: 'tier-vip',
        tierName: 'VIP Experience',
        qrCode: 'TICKTO-NDR-VIP-001-A7X9K2',
        owner: '0x1234...5678',
        mintedAt: '2025-12-28T14:30:00Z',
        tokenId: '1001',
        status: 'valid',
    },
    {
        id: 'tkt-002',
        eventId: 'evt-002',
        event: {
            title: 'Digital Art Exhibition',
            date: '2026-01-28',
            time: '18:00',
            venue: 'Crypto Gallery',
            coverImage: 'https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=800&q=80',
        },
        tier: 'tier-collector',
        tierName: 'Collector Pass',
        qrCode: 'TICKTO-DAE-COL-002-B3M8P5',
        owner: '0x1234...5678',
        mintedAt: '2025-12-30T09:15:00Z',
        tokenId: '2001',
        status: 'valid',
    },
];

// ===== Helper Functions =====
export function getEventById(id: string): Event | undefined {
    return mockEvents.find((event) => event.id === id);
}

export function getTicketsByOwner(address: string): Ticket[] {
    return mockTickets.filter((ticket) => ticket.owner === address);
}

export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Date TBA';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    } catch {
        return dateString;
    }
}

export function formatTime(timeInput: string | null | undefined): string {
    if (!timeInput) return 'Time TBA';

    // If it's a full ISO string or similar, extract the time
    try {
        const date = new Date(timeInput);
        if (!isNaN(date.getTime()) && timeInput.includes('T')) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    } catch (e) {
        // Fallback to string manipulation
    }

    // If it's just a time string like "20:00"
    if (timeInput.includes(':')) {
        const parts = timeInput.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1].substring(0, 2);
        
        if (!isNaN(hours)) {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        }
    }

    return timeInput;
}

