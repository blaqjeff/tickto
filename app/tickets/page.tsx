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
                    <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-xl">
                        <Image
                            src={coverImage}
                            alt={eventTitle}
                            fill
                            className="object-cover"
                            sizes="100vw"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent" />

                        {/* Status Badge */}
                        {ticket.listing_status === 'active' ? (
                            <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-md">
                                LISTED · ${ticket.listing_price_usd} USDC
                            </div>
                        ) : (
                            <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
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
                            <div className="flex items-center gap-2 text-sm text-white/50">
                                <Calendar className="w-4 h-4 text-white/40" />
                                <span>
                                    {formatDate(eventDate)} · {formatTime(eventTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/50">
                                <MapPin className="w-4 h-4 text-white/40" />
                                <span>{eventVenue}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tier Badge */}
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/40">Tier</span>
                            <span className="text-sm font-medium text-white">{tierName}</span>
                        </div>
                    </div>

                    {/* Tap Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-2 text-xs text-white/30">
                            <QrCode className="w-3 h-3" />
                            <span>Tap to reveal QR</span>
                        </div>
                    </div>
                </div>
            }
            backContent={
                <div className="flex flex-col items-center justify-center h-full">
                    {/* Rendered QR Code */}
                    <div className="w-36 h-36 bg-white rounded-xl p-2.5 mb-3 flex items-center justify-center border border-white/10 overflow-hidden">
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
                            className="flex-1 btn-secondary py-2.5 text-sm"
                        >
                            <Send className="w-4 h-4 inline-block mr-1.5" />
                            Transfer
                        </button>
                        {ticket.listing_status === 'active' ? (
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2.5 rounded-lg bg-[#242424] hover:bg-[#2A2A2A] transition-colors text-white text-sm font-medium"
                            >
                                Cancel
                            </button>
                        ) : (
                            <button
                                onClick={handleSell}
                                className="flex-1 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-sm font-medium flex items-center justify-center gap-1.5"
                            >
                                <Banknote className="w-4 h-4" />
                                Sell
                            </button>
                        )}
                    </div>

                    {/* Tap Hint */}
                    <div className="absolute bottom-3">
                        <span className="text-xs text-white/30">
                            Tap to flip back
                        </span>
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
                <Loader2 className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-white/40 mt-4">Loading your tickets...</p>
        </div>
    );
}

function EmptyState() {
    return (
        <motion.div
            className="card p-12 text-center max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/40">
                <Ticket className="w-8 h-8" />
            </div>
            <h3 className="heading text-xl text-white mb-2">No Tickets Yet</h3>
            <p className="text-white/40 text-sm mb-6">
                Your NFT tickets will appear here after purchase.
            </p>
            <a
                href="/"
                className="btn-primary"
            >
                Browse Events
            </a>
        </motion.div>
    );
}

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
    return (
        <motion.div
            className="card p-12 text-center max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/40">
                <Ticket className="w-8 h-8" />
            </div>
            <h3 className="heading text-xl text-white mb-2">Sign In Required</h3>
            <p className="text-white/40 text-sm mb-6">
                Connect your wallet to view your tickets.
            </p>
            <button
                onClick={onSignIn}
                className="btn-primary"
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
        const multiplierBps = (sellingTicket.event as any)?.max_resale_multiplier_bps;

        // If multiplierBps is u16::MAX (65535), there is no cap.
        const hasPriceCap = multiplierBps !== undefined && multiplierBps !== 65535;
        const maxResalePrice = hasPriceCap 
            ? faceValue * (1 + (multiplierBps as number) / 10000)
            : multiplierBps === undefined 
                ? faceValue * 2 // Default legacy fallback
                : Infinity; // Unlimited

        if (price > maxResalePrice) {
            setModalError(`Price cannot exceed the organizer's cap of $${maxResalePrice.toFixed(2)}`);
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 relative overflow-hidden"
                        >
                            <button
                                onClick={() => setSellingTicket(null)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="heading text-xl text-white mb-2">Resell Ticket</h3>
                            <p className="text-sm text-neutral-400 mb-6">
                                List your ticket for sale on the secondary marketplace. Price-capped rules apply.
                            </p>

                            <div className="p-4 bg-white/5 rounded-xl mb-6 border border-white/5 space-y-2">
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
                                    <span className="text-white font-semibold">
                                        {(sellingTicket.event as any)?.max_resale_multiplier_bps === 65535
                                            ? 'Unlimited'
                                            : `$${(
                                                (sellingTicket.event?.price_usd || 0) *
                                                (1 + ((sellingTicket.event as any)?.max_resale_multiplier_bps ?? 10000) / 10000)
                                            ).toFixed(2)} USDC`}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleConfirmSell} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="price" className="text-xs text-neutral-400 font-medium ml-1">
                                        Resale Price (USDC)
                                    </label>
                                    <input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={resalePrice}
                                        onChange={(e) => setResalePrice(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/20 transition-colors"
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
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
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
