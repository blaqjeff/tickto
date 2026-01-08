'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Check, Loader2, Plus, Minus, Ticket } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEventById, buyTicket } from '@/lib/api';
import { Event, TransactionState } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventPageProps {
    params: Promise<{ id: string }>;
}

// Tier options
interface TierOption {
    id: string;
    name: string;
    price: number;
    description: string;
}

/**
 * Format price for display - always USD
 */
function formatPrice(price: number | undefined | null): string {
    if (price === undefined || price === null || price === 0) {
        return 'Free';
    }
    return `$${price.toFixed(0)}`;
}

export default function EventPage({ params }: EventPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { ready, authenticated, user, login } = usePrivy();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [txState, setTxState] = useState<TransactionState>('idle');
    const [showConfetti, setShowConfetti] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch event from Supabase
    useEffect(() => {
        async function loadEvent() {
            setLoading(true);
            const data = await getEventById(id);
            setEvent(data);

            // Auto-select first tier if available
            if (data) {
                const tiers = getTiers(data);
                if (tiers.length > 0) {
                    setSelectedTier(tiers[0]);
                }
            }

            setLoading(false);
        }
        if (id) {
            loadEvent();
        }
    }, [id]);

    // Build tier options from event data
    function getTiers(eventData: Event): TierOption[] {
        const basePrice = eventData.priceUsdc || 0;

        // If event has tiers, use them
        if (eventData.tiers && eventData.tiers.length > 0) {
            return eventData.tiers.map(tier => ({
                id: tier.id,
                name: tier.name,
                price: tier.price,
                description: tier.perks?.join(', ') || ''
            }));
        }

        // Otherwise create default tiers
        return [
            {
                id: 'general',
                name: 'General Admission',
                price: basePrice,
                description: 'Standard entry to the event'
            },
            {
                id: 'vip',
                name: 'VIP Experience',
                price: basePrice * 2 || 100,
                description: 'Premium seating, early entry, exclusive merch'
            }
        ];
    }

    // Calculate total price
    const totalPrice = selectedTier ? selectedTier.price * quantity : 0;

    // Quantity controls
    const increaseQuantity = () => {
        if (quantity < 5) setQuantity(q => q + 1);
    };

    const decreaseQuantity = () => {
        if (quantity > 1) setQuantity(q => q - 1);
    };

    // Handle purchase
    const handlePurchase = async () => {
        if (!event || !selectedTier) return;
        setErrorMessage(null);

        // Check if user is authenticated
        if (!authenticated || !user) {
            login();
            return;
        }

        setPurchasing(true);

        try {
            // Call the buyTicket API with quantity
            const result = await buyTicket(
                event.id,
                user.id,
                selectedTier.id,
                selectedTier.name,
                quantity,
                selectedTier.price
            );

            if (result.success && result.tickets && result.tickets.length > 0) {
                // Only show success after confirmed purchase
                setShowConfetti(true);
                setTxState('success');
            } else {
                setErrorMessage(result.error || 'Purchase failed. Please try again.');
                setTxState('error');
            }
        } catch (err) {
            console.error('Purchase error:', err);
            setErrorMessage('An unexpected error occurred. Please try again.');
            setTxState('error');
        } finally {
            setPurchasing(false);
        }
    };

    // Get tiers for the event
    const tiers = event ? getTiers(event) : [];

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader2 className="w-8 h-8 text-purple-400" />
                </motion.div>
                <p className="text-white/50 mt-4">Loading event...</p>
            </div>
        );
    }

    // Not found state
    if (!event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <div className="glass-card p-12 text-center max-w-md">
                    <h2 className="heading text-2xl text-white mb-2">Event Not Found</h2>
                    <p className="text-white/50 mb-6">
                        The event you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 rounded-full bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
                    >
                        Browse Events
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Confetti Animation */}
            <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />

            <div className="max-w-lg mx-auto pb-8">
                {/* Hero Image */}
                <div className="relative h-72">
                    <Image
                        src={event.coverImage || '/placeholder-event.jpg'}
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
                    {/* Main Info Card */}
                    <div className="glass-card p-6 mb-4">
                        <h1 className="heading text-2xl text-white mb-4">{event.title}</h1>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-white/70">
                                <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                <span>
                                    {formatDate(event.date)} at {formatTime(event.date || event.time)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                                <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-white">{event.location || event.venue || 'Location TBA'}</div>
                                    {event.location && event.venue && event.location !== event.venue && (
                                        <div className="text-sm text-white/50">{event.venue}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {event.description && (
                            <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>
                        )}
                    </div>

                    {/* Ticket Tier Selection */}
                    <div className="glass-card p-6 mb-4">
                        <h2 className="heading text-lg text-white mb-4">Select Ticket</h2>

                        <div className="space-y-3">
                            {tiers.map((tier) => (
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
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-medium text-white">{tier.name}</h3>
                                        <span className="mono text-lg text-purple-400 font-semibold">
                                            {formatPrice(tier.price)}
                                        </span>
                                    </div>
                                    {tier.description && (
                                        <p className="text-xs text-white/50">{tier.description}</p>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="glass-card p-6 mb-6">
                        <h2 className="heading text-lg text-white mb-4">Quantity</h2>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={decreaseQuantity}
                                    disabled={quantity <= 1}
                                    className={cn(
                                        'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                                        quantity <= 1
                                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    )}
                                >
                                    <Minus className="w-5 h-5" />
                                </button>

                                <span className="mono text-3xl text-white font-bold w-12 text-center">
                                    {quantity}
                                </span>

                                <button
                                    onClick={increaseQuantity}
                                    disabled={quantity >= 5}
                                    className={cn(
                                        'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                                        quantity >= 5
                                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    )}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="text-right">
                                <p className="text-xs text-white/50 mb-1">Total</p>
                                <p className="mono text-2xl text-purple-400 font-bold">
                                    {formatPrice(totalPrice)}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-white/40 mt-3 text-center">
                            Maximum 5 tickets per transaction
                        </p>
                    </div>

                    {/* Purchase Section */}
                    <AnimatePresence mode="wait">
                        {txState !== 'success' && (
                            <motion.div
                                className="flex flex-col items-center gap-4 mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {/* Error Message */}
                                {errorMessage && (
                                    <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </div>
                                )}

                                {!authenticated ? (
                                    <button
                                        onClick={login}
                                        className="w-full max-w-sm py-4 rounded-full bg-purple-500 hover:bg-purple-600 transition-colors text-white font-medium"
                                    >
                                        Sign In to Purchase
                                    </button>
                                ) : (
                                    <SwipeButton
                                        onComplete={handlePurchase}
                                        label={purchasing ? 'Processing...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''} - ${formatPrice(totalPrice)}`}
                                    />
                                )}
                            </motion.div>
                        )}

                        {txState === 'success' && (
                            <motion.div
                                className="glass-card p-8 text-center mb-8"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h3 className="heading text-xl text-white mb-2">
                                    {quantity > 1 ? `${quantity} Tickets Purchased!` : 'Ticket Purchased!'}
                                </h3>
                                <p className="text-white/60 text-sm mb-6">
                                    Your {quantity > 1 ? 'tickets have' : 'ticket has'} been added to your wallet.
                                </p>
                                <Link
                                    href="/tickets"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
                                >
                                    <Ticket className="w-5 h-5" />
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
