'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, MapPin, QrCode, Ticket, Send, Banknote } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTicketStore } from '@/lib/ticket-store';
import { formatDate, formatTime } from '@/lib/mock-data';
import { Ticket as TicketType } from '@/lib/types';

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

function TicketCard({ ticket }: { ticket: TicketType }) {
    const handleTransfer = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Transfer ticket ${ticket.id} - Coming soon!`);
    };

    const handleSell = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Sell ticket ${ticket.id} - Coming soon!`);
    };

    return (
        <GlassCard
            className="h-[360px]"
            frontContent={
                <div className="flex flex-col h-full">
                    {/* Cover Image */}
                    <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-[28px]">
                        <Image
                            src={ticket.event.coverImage}
                            alt={ticket.event.title}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent" />

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 backdrop-blur-md">
                            {ticket.status.toUpperCase()}
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1">
                        <h3 className="heading text-lg text-white mb-2 line-clamp-1">
                            {ticket.event.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <span>
                                    {formatDate(ticket.event.date)} · {formatTime(ticket.event.time)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span>{ticket.event.venue}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tier Badge */}
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">Tier</span>
                            <span className="text-sm font-medium text-purple-400">{ticket.tierName}</span>
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
                    <p className="mono text-sm text-white/80 mb-1">{ticket.qrCode}</p>
                    <p className="text-xs text-white/40 mb-4">Token ID: #{ticket.tokenId}</p>

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

export default function TicketsPage() {
    const tickets = useTicketStore((state) => state.tickets);

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

            {/* Tickets Grid */}
            {tickets.length > 0 ? (
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
