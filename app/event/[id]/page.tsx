'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Check } from 'lucide-react';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { getEventById, formatDate, formatTime } from '@/lib/mock-data';
import { useTicketStore, createTicketFromPurchase } from '@/lib/ticket-store';
import { TicketTier, TransactionState } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventPageProps {
    params: Promise<{ id: string }>;
}

export default function EventPage({ params }: EventPageProps) {
    const { id } = use(params);
    const event = getEventById(id);
    const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
    const [txState, setTxState] = useState<TransactionState>('idle');
    const [showConfetti, setShowConfetti] = useState(false);

    const addTicket = useTicketStore((state) => state.addTicket);

    if (!event) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white/50">Event not found</p>
            </div>
        );
    }

    const handlePurchase = async () => {
        if (!selectedTier) return;

        // Create a new ticket and add it to the store
        const newTicket = createTicketFromPurchase(
            event.id,
            event.title,
            event.date,
            event.time,
            event.venue,
            event.coverImage,
            selectedTier.name,
            selectedTier.id
        );

        addTicket(newTicket);
        setShowConfetti(true);
        setTxState('success');
    };

    return (
        <>
            <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />

            <div className="max-w-lg mx-auto">
                {/* Hero Image */}
                <div className="relative h-72">
                    <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/20" />

                    {/* Back Button */}
                    <Link
                        href="/"
                        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </Link>
                </div>

                {/* Content */}
                <motion.div
                    className="px-4 -mt-20 relative z-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="glass-card p-6 mb-4">
                        <h1 className="heading text-2xl text-white mb-4">{event.title}</h1>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-white/70">
                                <Calendar className="w-5 h-5 text-purple-400" />
                                <span>
                                    {formatDate(event.date)} at {formatTime(event.time)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                                <MapPin className="w-5 h-5 text-purple-400" />
                                <div>
                                    <div>{event.venue}</div>
                                    <div className="text-sm text-white/50">{event.location}</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>
                    </div>

                    {/* Ticket Tiers */}
                    <div className="glass-card p-6 mb-6">
                        <h2 className="heading text-lg text-white mb-4">Select Ticket</h2>

                        <div className="space-y-3">
                            {event.tiers.map((tier) => (
                                <motion.button
                                    key={tier.id}
                                    className={cn(
                                        'w-full p-4 rounded-2xl border text-left transition-all',
                                        selectedTier?.id === tier.id
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                    )}
                                    onClick={() => setSelectedTier(tier)}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-medium text-white">{tier.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                                <Users className="w-3 h-3" />
                                                <span>{tier.available} available</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="mono text-lg text-purple-400 font-semibold">
                                                ${tier.price}
                                            </span>
                                            <div className="text-xs text-white/50">{tier.currency}</div>
                                        </div>
                                    </div>

                                    {/* Perks */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {tier.perks.map((perk, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/5 text-white/60"
                                            >
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                {perk}
                                            </span>
                                        ))}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Purchase Button */}
                    <AnimatePresence mode="wait">
                        {selectedTier && txState !== 'success' && (
                            <motion.div
                                className="flex flex-col items-center gap-4 mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <div className="text-center mb-2">
                                    <p className="text-sm text-white/50 mb-1">Total</p>
                                    <p className="mono text-2xl text-white font-bold">
                                        ${selectedTier.price} <span className="text-sm text-white/50">USDC</span>
                                    </p>
                                </div>
                                <SwipeButton
                                    onComplete={handlePurchase}
                                    label={`Swipe to Pay $${selectedTier.price}`}
                                />
                            </motion.div>
                        )}

                        {txState === 'success' && (
                            <motion.div
                                className="glass-card p-8 text-center mb-8"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="heading text-xl text-white mb-2">Ticket Minted!</h3>
                                <p className="text-white/60 text-sm mb-4">
                                    Your ticket has been added to your wallet.
                                </p>
                                <Link
                                    href="/tickets"
                                    className="inline-block px-6 py-3 rounded-full bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
                                >
                                    View My Tickets
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </>
    );
}
