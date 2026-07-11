'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Check, Loader2, Plus, Minus, Ticket } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEventById } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { Event, TransactionState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatUSD } from '@/lib/jupiter';
import {
    Connection,
    PublicKey,
    VersionedTransaction,
} from '@solana/web3.js';

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

// formatUSD is imported from '@/lib/jupiter'

// Solana RPC endpoint (use environment variable with devnet fallback)
// Use local proxy in the browser, fallback to public devnet
const SOLANA_RPC_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://api.devnet.solana.com';

export default function EventPage({ params }: EventPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { ready, authenticated, user, login } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [tierQuantities, setTierQuantities] = useState<Record<string, number>>({});
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

            // No default selection anymore, users pick their quantities

            setLoading(false);
        }
        if (id) {
            loadEvent();
        }
    }, [id]);

    // Build tier options from event data
    function getTiers(eventData: Event): TierOption[] {
        const basePrice = eventData.price_usd || 0;

        // If event has tiers, use them
        if (eventData.tiers && eventData.tiers.length > 0) {
            return eventData.tiers.map(tier => ({
                id: tier.id || tier.name,
                name: tier.name,
                price: tier.price,
                description: tier.perks?.join(', ') || ''
            }));
        }

        // Otherwise create default tier
        return [
            {
                id: 'general',
                name: 'General Admission',
                price: basePrice,
                description: 'Standard entry to the event'
            }
        ];
    }

    const tiers = event ? getTiers(event) : [];

    // Calculate total quantity & price
    const totalQuantity = Object.values(tierQuantities).reduce((sum, q) => sum + q, 0);
    const totalPrice = tiers.reduce((sum, tier) => sum + (tierQuantities[tier.id] || 0) * tier.price, 0);



    // Quantity controls
    const increaseQuantity = (tierId: string) => {
        if (totalQuantity >= 5) return;
        setTierQuantities(prev => ({ ...prev, [tierId]: (prev[tierId] || 0) + 1 }));
    };

    const decreaseQuantity = (tierId: string) => {
        setTierQuantities(prev => {
            const current = (prev[tierId] || 0);
            if (current <= 0) return prev;
            return { ...prev, [tierId]: current - 1 };
        });
    };

    // Handle purchase with real Solana transaction
    const handlePurchase = async () => {
        if (!event || totalQuantity === 0) return;
        setErrorMessage(null);

        // Check if user is authenticated
        if (!authenticated || !user) {
            login();
            return;
        }

        // Validate organizer wallet exists
        if (!event.organizer_wallet) {
            setErrorMessage("This event cannot accept payments. The organizer has no connected wallet.");
            return;
        }

        // Privy v3: wallets from @privy-io/react-auth/solana contains Solana wallets
        console.log("Solana wallets:", wallets.length, wallets.map(w => ({ addr: w.address?.slice(0, 8), type: (w as any).walletClientType })));
        console.log("User linked accounts:", user?.linkedAccounts?.map((a: any) => ({ type: a.type, chain: a.chainType, addr: a.address?.slice(0, 8) })));

        // Try to find wallet from useWallets() hook
        const solanaWallet = wallets[0];

        if (!solanaWallet?.address) {
            console.error("Critical: No signing wallet found in 'wallets' array.");
            setErrorMessage("No Solana wallet found. Please log out and log back in to create one.");
            return;
        }

        console.log("Using Solana wallet:", solanaWallet.address);

        setPurchasing(true);
        setTxState('processing');

        try {
            // Step 1: Call relay to build + sign the transaction server-side
            console.log('[PURCHASE] Calling relay...');
            const relayRes = await fetch('/api/relay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    tierQuantities,
                    buyerWallet: solanaWallet.address,
                }),
            });

            const relayData = await relayRes.json();

            if (!relayRes.ok) {
                throw new Error(relayData.error || 'Relay request failed');
            }

            console.log('[PURCHASE] Relay response:', relayData.summary);

            // Step 2: Deserialize the partially-signed transaction
            const connection = new Connection(SOLANA_RPC_URL, { commitment: 'confirmed' });
            const txBytes = Uint8Array.from(Buffer.from(relayData.transaction, 'base64'));
            const transaction = VersionedTransaction.deserialize(txBytes);

            // Step 3: Sign with user's Privy wallet (adds buyer signature)
            console.log('[PURCHASE] Requesting user signature...');
            const signResult = await signTransaction({
                transaction: transaction.serialize(),
                wallet: solanaWallet,
                chain: 'solana:devnet',
            });

            // Step 4: Send the fully-signed transaction to the network
            // Use direct Helius RPC for send+confirm (local proxy doesn't support WebSockets)
            const sendConnection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });

            console.log('[PURCHASE] Sending signed transaction...');
            const signature = await sendConnection.sendRawTransaction(signResult.signedTransaction, {
                skipPreflight: true, // relay already simulated
                preflightCommitment: 'confirmed',
            });
            console.log('[PURCHASE] Tx sent! Signature:', signature);

            // Step 5: Confirm the transaction with fallback
            try {
                const confirmation = await sendConnection.confirmTransaction({
                    signature,
                    blockhash: relayData.blockhash,
                    lastValidBlockHeight: relayData.lastValidBlockHeight,
                }, 'confirmed');

                if (confirmation.value.err) {
                    throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
                }
            } catch (confirmErr: any) {
                // If block height exceeded, the tx may STILL have landed — check it
                if (confirmErr.name === 'TransactionExpiredBlockheightExceededError') {
                    console.warn('[PURCHASE] Block height exceeded, checking if tx landed...');
                    const status = await sendConnection.getSignatureStatus(signature);
                    if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
                        console.log('[PURCHASE] Tx actually confirmed despite timeout!');
                    } else if (status.value?.err) {
                        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                    } else {
                        throw new Error('Transaction timed out. It may still confirm — check your wallet in a few minutes.');
                    }
                } else {
                    throw confirmErr;
                }
            }

            console.log('[PURCHASE] Payment + cNFT mint confirmed! Signature:', signature);

            // ONLY save ticket after successful payment
            setTxState('minting');

            // Create ticket records
            const ticketPromises = [];
            let i = 0;
            for (const tier of tiers) {
                const qty = tierQuantities[tier.id] || 0;
                for (let j = 0; j < qty; j++) {
                    const qrCode = `${event.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
                    const tokenId = `tkt-${Date.now()}-${i}`;
                    ticketPromises.push(
                        supabase.from('tickets').insert({
                            event_id: event.id,
                            owner_id: user.id,
                            tier_name: tier.name,
                            tier: tier.name.toLowerCase().replace(/\s+/g, '-'),
                            qr_code: qrCode,
                            token_id: tokenId,
                            status: 'valid',
                            on_chain_status: 'minted',
                            minted_at: new Date().toISOString(),
                            price_paid: tier.price,
                            mint_tx: signature,
                        })
                    );
                    i++;
                }
            }

            const results = await Promise.all(ticketPromises);
            const hasError = results.some((r: any) => r.error);

            if (hasError) {
                const errors = results.filter((r: any) => r.error).map((r: any) => r.error);
                console.error("Ticket save errors:", JSON.stringify(errors, null, 2));
                throw new Error(`Payment successful but failed to save ticket: ${errors[0]?.message || 'Unknown error'}`);
            }

            // Success!
            setShowConfetti(true);
            setTxState('success');

        } catch (err: any) {
            console.error('Purchase error:', err);
            setErrorMessage(err.message || 'Transaction failed. You were not charged.');
            setTxState('error');
        } finally {
            setPurchasing(false);
        }
    };

    // Get tiers for the event (already handled at top of component)

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
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Main Info Card */}
                    <div className="card p-6 mb-4">
                        <h1 className="heading text-2xl text-white mb-4">{event.title}</h1>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-white/60">
                                <Calendar className="w-5 h-5 text-white/40 flex-shrink-0" />
                                <span>
                                    {formatDate(event.date)} at {formatTime(event.date || event.time)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-white/60">
                                <MapPin className="w-5 h-5 text-white/40 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-white">{event.location || event.venue || 'Location TBA'}</div>
                                    {event.location && event.venue && event.location !== event.venue && (
                                        <div className="text-sm text-white/40">{event.venue}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {event.description && (
                            <p className="text-white/50 text-sm leading-relaxed">{event.description}</p>
                        )}
                    </div>

                    {/* Ticket Tier Selection */}
                    <div className="card p-6 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="heading text-lg text-white">Select Tickets</h2>
                            <span className="text-xs text-white/40">{totalQuantity}/5 Max</span>
                        </div>

                        <div className="space-y-4">
                            {tiers.map((tier) => (
                                <div
                                    key={tier.id}
                                    className={cn(
                                        "w-full p-4 rounded-xl border transition-all flex flex-col gap-3",
                                        (tierQuantities[tier.id] || 0) > 0
                                            ? "border-white bg-white/5"
                                            : "border-white/5 bg-[#161616]/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-white">{tier.name}</h3>
                                            {tier.description && (
                                                <p className="text-xs text-white/40 mt-1">{tier.description}</p>
                                            )}
                                        </div>
                                        <span className="mono text-lg text-white font-medium shrink-0 ml-4">
                                            {formatUSD(tier.price)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-3">
                                        <button
                                            onClick={() => decreaseQuantity(tier.id)}
                                            disabled={!(tierQuantities[tier.id] > 0)}
                                            className={cn(
                                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                                !(tierQuantities[tier.id] > 0)
                                                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                            )}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>

                                        <span className="mono text-lg text-white font-bold w-6 text-center">
                                            {tierQuantities[tier.id] || 0}
                                        </span>

                                        <button
                                            onClick={() => increaseQuantity(tier.id)}
                                            disabled={totalQuantity >= 5}
                                            className={cn(
                                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                                totalQuantity >= 5
                                                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                            )}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    {totalQuantity > 0 && (
                        <div className="card p-6 mb-6">
                            <h2 className="heading text-lg text-white mb-4">Order Summary</h2>
                            <div className="space-y-2 mb-4">
                                {tiers.filter(t => tierQuantities[t.id] > 0).map(tier => (
                                    <div key={tier.id} className="flex justify-between text-sm">
                                        <span className="text-white/60">{tierQuantities[tier.id]}x {tier.name}</span>
                                        <span className="mono text-white/80">{formatUSD(tier.price * tierQuantities[tier.id])}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                <span className="text-white font-medium">Total</span>
                                <div className="text-right">
                                    <p className="mono text-2xl text-white font-medium">
                                        {formatUSD(totalPrice)}
                                    </p>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        Paid in USDC
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Purchase Section */}
                    <AnimatePresence mode="wait">
                        {txState !== 'success' && (
                            <motion.div
                                className="flex flex-col items-center gap-4 mb-8"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                            >
                                {/* Error Message */}
                                {errorMessage && (
                                    <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Processing State */}
                                {txState === 'processing' && (
                                    <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Waiting for wallet approval...
                                    </div>
                                )}

                                {txState === 'minting' && (
                                    <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Payment confirmed! Creating your ticket...
                                    </div>
                                )}

                                {!authenticated ? (
                                    <button
                                        onClick={login}
                                        className="w-full max-w-sm btn-primary py-3.5 text-sm"
                                    >
                                        Sign In to Purchase
                                    </button>
                                ) : (
                                    <SwipeButton
                                        onComplete={totalQuantity > 0 ? handlePurchase : async () => { }}
                                        label={purchasing ? 'Processing...' : (totalQuantity === 0 ? 'Select Tickets to Buy' : `Buy ${totalQuantity} Ticket${totalQuantity > 1 ? 's' : ''} - ${formatUSD(totalPrice)}`)}
                                    />
                                )}
                            </motion.div>
                        )}

                        {txState === 'success' && (
                            <motion.div
                                className="card p-8 text-center mb-8"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="heading text-xl text-white mb-2">
                                    {totalQuantity > 1 ? `${totalQuantity} Tickets Purchased!` : 'Ticket Purchased!'}
                                </h3>
                                <p className="text-white/50 text-sm mb-6">
                                    Your {totalQuantity > 1 ? 'tickets have' : 'ticket has'} been added to your wallet.
                                </p>
                                <Link
                                    href="/tickets"
                                    className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm font-semibold"
                                >
                                    <Ticket className="w-4 h-4" />
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
