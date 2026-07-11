'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Calendar, MapPin, QrCode, Ticket, Send, Banknote, Loader2, X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { getUserTickets, listTicketForSale, cancelTicketListing } from '@/lib/api';
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
    listing_price_usd?: number;
    listing_status?: string;
    event?: {
        id: string;
        title: string;
        date?: string;
        time?: string;
        venue?: string;
        location?: string;
        cover_image?: string;
        image_url?: string;
        price_usd?: number;
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

function TicketCard({ 
    ticket, 
    onSell, 
    onCancel 
}: { 
    ticket: TicketData; 
    onSell: (t: TicketData) => void;
    onCancel: (t: TicketData) => void;
}) {
    const handleTransfer = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Transfer ticket ${ticket.id} - Coming soon!`);
    };

    const handleSell = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSell(ticket);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel(ticket);
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
                        {ticket.listing_status === 'active' ? (
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-md">
                                LISTED · ${ticket.listing_price_usd} USDC
                            </div>
                        ) : (
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 backdrop-blur-md">
                                {status.toUpperCase()}
                            </div>
                        )}
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
                    {/* Rendered QR Code */}
                    <div className="w-36 h-36 bg-white rounded-xl p-2 mb-3 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-white/10 overflow-hidden">
                        <QRCode
                            value={JSON.stringify({
                                id: ticket.id,
                                event: eventTitle,
                                tier: tierName,
                                token: tokenId
                            })}
                            size={128}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </div>

                    {/* Ticket Code */}
                    <p className="mono text-xs text-white/80 mb-1 px-4 text-center break-all line-clamp-2">
                        {qrCode.length > 20 ? `${qrCode.substring(0, 16)}...` : qrCode}
                    </p>
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
                        {ticket.listing_status === 'active' ? (
                            <button
                                onClick={handleCancel}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        ) : (
                            <button
                                onClick={handleSell}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-300 text-sm font-medium"
                            >
                                <Banknote className="w-4 h-4" />
                                Sell
                            </button>
                        )}
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
    const [sellingTicket, setSellingTicket] = useState<TicketData | null>(null);
    const [resalePrice, setResalePrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    async function loadTickets() {
        if (!authenticated || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const data = await getUserTickets(user.id);
        setTickets(data as TicketData[]);
        setLoading(false);
    }

    useEffect(() => {
        if (ready) {
            loadTickets();
        }
    }, [ready, authenticated, user]);

    const handleOpenSell = (ticket: TicketData) => {
        setSellingTicket(ticket);
        setResalePrice('');
        setModalError(null);
    };

    const handleCancelListing = async (ticket: TicketData) => {
        if (!confirm('Are you sure you want to cancel this listing?')) return;
        setLoading(true);
        try {
            await cancelTicketListing(ticket.id);
            await loadTickets();
        } catch (err: any) {
            console.error('Error cancelling listing:', err);
            alert('Failed to cancel listing');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sellingTicket) return;
        setModalError(null);

        const price = parseFloat(resalePrice);
        if (isNaN(price) || price <= 0) {
            setModalError('Please enter a valid price');
            return;
        }

        const faceValue = sellingTicket.event?.price_usd || 0;
        const maxResalePrice = faceValue * 2;
        if (price > maxResalePrice) {
            setModalError(`Price cannot exceed the cap of $${maxResalePrice.toFixed(2)} (+100% of face value)`);
            return;
        }

        setIsSubmitting(true);
        try {
            await listTicketForSale(sellingTicket.id, price);
            setSellingTicket(null);
            await loadTickets();
        } catch (err: any) {
            console.error('Error listing ticket:', err);
            setModalError('Failed to list ticket for sale');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
            {/* Header */}
            <motion.header
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="heading text-3xl md:text-4xl text-white mb-1">My Tickets</h1>
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
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={container}
                    initial="hidden"
                    animate="show"
                >
                    {tickets.map((ticket) => (
                        <motion.div key={ticket.id} variants={item}>
                            <TicketCard 
                                ticket={ticket} 
                                onSell={handleOpenSell}
                                onCancel={handleCancelListing}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <EmptyState />
            )}

            {/* Resale Listing Modal */}
            <AnimatePresence>
                {sellingTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSellingTicket(null)}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="heading text-xl text-white mb-2">Resell Ticket</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                List your ticket for sale on the secondary marketplace. Price-capped rules apply.
                            </p>

                            <div className="p-4 bg-white/5 rounded-2xl mb-6 border border-white/5 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-400">Event</span>
                                    <span className="text-white font-medium line-clamp-1 max-w-[200px]">
                                        {sellingTicket.event?.title}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-400">Face Value</span>
                                    <span className="text-white font-medium">
                                        ${(sellingTicket.event?.price_usd || 0).toFixed(2)} USDC
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-400">Max Resale Price</span>
                                    <span className="text-purple-400 font-semibold">
                                        ${((sellingTicket.event?.price_usd || 0) * 2).toFixed(2)} USDC
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleConfirmSell} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="price" className="text-xs text-neutral-400 font-medium">
                                        Resale Price (USDC)
                                    </label>
                                    <input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={resalePrice}
                                        onChange={(e) => setResalePrice(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-colors"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>

                                {modalError && (
                                    <p className="text-sm text-red-400">{modalError}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Listing...
                                        </>
                                    ) : (
                                        'List Ticket'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
