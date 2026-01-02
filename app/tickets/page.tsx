'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, MapPin, QrCode, Ticket, Send, Banknote, Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { getUserTickets } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/mock-data';

// Simple ticket type for the new API response
interface TicketData {
    id: string;
    event_id: string;
    owner_id: string;
    tier?: string;
    tier_name?: string;
    qr_code?: string;
    token_id?: string;
    status?: string;
    price_paid?: number;
    event?: {
        id: string;
        title: string;
        date?: string;
        time?: string;
        venue?: string;
        location?: string;
        cover_image?: string;
        image_url?: string;
    };
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15 },
    },
};

const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
};

function TicketCard({ ticket }: { ticket: TicketData }) {
    const handleTransfer = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Transfer ticket ${ticket.id} - Coming soon!`);
    };

    const handleSell = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Sell ticket ${ticket.id} - Coming soon!`);
    };

    // Safe access to event properties
    const eventTitle = ticket.event?.title || 'Unknown Event';
    const eventDate = ticket.event?.date || '';
    const eventTime = ticket.event?.time || '';
    const eventVenue = ticket.event?.venue || 'Venue TBA';
    // Image fallback: check multiple fields, then use Unsplash default
    const coverImage = ticket.event?.image_url
        || ticket.event?.cover_image
        || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';
    const tierName = ticket.tier_name || ticket.tier || 'Standard';
    const qrCode = ticket.qr_code || `TICKET-${ticket.id.slice(0, 8)}`;
    const tokenId = ticket.token_id || '0000';
    const status = ticket.status || 'valid';

    return (
        <GlassCard
            className="h-[360px]"
            frontContent={
                <div className="flex flex-col h-full">
                    {/* Cover Image */}
                    <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-[28px]">
                        <Image
                            src={coverImage}
                            alt={eventTitle}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent" />

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 backdrop-blur-md">
                            {status.toUpperCase()}
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1">
                        <h3 className="heading text-lg text-white mb-2 line-clamp-1">
                            {eventTitle}
                        </h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <span>
                                    {formatDate(eventDate)} · {formatTime(eventTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span>{eventVenue}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tier Badge */}
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">Tier</span>
                            <span className="text-sm font-medium text-purple-400">{tierName}</span>
                        </div>
                    </div>

                    {/* Tap Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <motion.div
                            className="flex items-center gap-2 text-xs text-white/40"
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <QrCode className="w-3 h-3" />
                            <span>Tap to reveal QR</span>
                        </motion.div>
                    </div>
                </div>
            }
            backContent={
                <div className="flex flex-col items-center justify-center h-full">
                    {/* QR Code Placeholder */}
                    <div className="w-36 h-36 bg-white rounded-2xl p-3 mb-3">
                        <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center">
                            <QrCode className="w-16 h-16 text-white" />
                        </div>
                    </div>

                    {/* Ticket Code */}
                    <p className="mono text-sm text-white/80 mb-1">{qrCode}</p>
                    <p className="text-xs text-white/40 mb-4">Token ID: #{tokenId}</p>

                    {/* Action Buttons */}
                    <div className="flex gap-3 w-full px-2">
                        <button
                            onClick={handleTransfer}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
                        >
                            <Send className="w-4 h-4" />
                            Transfer
                        </button>
                        <button
                            onClick={handleSell}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-300 text-sm font-medium"
                        >
                            <Banknote className="w-4 h-4" />
                            Sell
                        </button>
                    </div>

                    {/* Tap Hint */}
                    <div className="absolute bottom-3">
                        <motion.span
                            className="text-xs text-white/40"
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            Tap to flip back
                        </motion.span>
                    </div>
                </div>
            }
        />
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
                <Loader2 className="w-8 h-8 text-purple-400" />
            </motion.div>
            <p className="text-white/50 mt-4">Loading your tickets...</p>
        </div>
    );
}

function EmptyState() {
    return (
        <motion.div
            className="glass-card p-12 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="heading text-xl text-white mb-2">No Tickets Yet</h3>
            <p className="text-white/50 text-sm mb-6">
                Your NFT tickets will appear here after purchase.
            </p>
            <a
                href="/"
                className="inline-block px-6 py-3 rounded-full bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
            >
                Browse Events
            </a>
        </motion.div>
    );
}

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
    return (
        <motion.div
            className="glass-card p-12 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="heading text-xl text-white mb-2">Sign In Required</h3>
            <p className="text-white/50 text-sm mb-6">
                Connect your wallet to view your tickets.
            </p>
            <button
                onClick={onSignIn}
                className="inline-block px-6 py-3 rounded-full bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
            >
                Sign In
            </button>
        </motion.div>
    );
}

export default function TicketsPage() {
    const { ready, authenticated, user, login } = usePrivy();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTickets() {
            console.log('👤 FRONTEND: Privy ready:', ready, 'authenticated:', authenticated);
            console.log('👤 FRONTEND: Current Privy User ID:', user?.id);

            if (!authenticated || !user) {
                console.log('👤 FRONTEND: Not authenticated, skipping ticket fetch');
                setLoading(false);
                return;
            }

            setLoading(true);
            console.log('👤 FRONTEND: Calling getUserTickets with ID:', user.id);
            const data = await getUserTickets(user.id);
            console.log('👤 FRONTEND: Received tickets:', data);
            setTickets(data as TicketData[]);
            setLoading(false);
        }

        if (ready) {
            loadTickets();
        }
    }, [ready, authenticated, user]);

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            {/* Header */}
            <motion.header
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="heading text-3xl text-white mb-1">My Tickets</h1>
                <p className="text-white/50">
                    {tickets.length > 0 ? `${tickets.length} tickets in your wallet` : 'Your digital ticket wallet'}
                </p>
            </motion.header>

            {/* Content */}
            {!ready || loading ? (
                <LoadingState />
            ) : !authenticated ? (
                <SignInPrompt onSignIn={login} />
            ) : tickets.length > 0 ? (
                <motion.div
                    className="grid gap-6"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {tickets.map((ticket) => (
                        <motion.div key={ticket.id} variants={item}>
                            <TicketCard ticket={ticket} />
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <EmptyState />
            )}
        </div>
    );
}
