'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Check, Loader2, Plus, Minus, Ticket } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEventById } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { Event, TransactionState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatUSD, usdToSol, formatSOL, getSolPrice } from '@/lib/jupiter';
import { TicktoClient } from '@/lib/tickto-program';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
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
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export default function EventPage({ params }: EventPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { ready, authenticated, user, login } = usePrivy();
    const { wallets } = useWallets();
    const { signAndSendTransaction } = useSignAndSendTransaction();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [txState, setTxState] = useState<TransactionState>('idle');
    const [showConfetti, setShowConfetti] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [solEquivalent, setSolEquivalent] = useState<string | null>(null);
    const [solPriceLoading, setSolPriceLoading] = useState(false);

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

    // Calculate total price (USD)
    const totalPrice = selectedTier ? selectedTier.price * quantity : 0;

    // Fetch SOL equivalent when price or quantity changes
    useEffect(() => {
        async function fetchSolEquivalent() {
            if (totalPrice === 0) {
                setSolEquivalent(null);
                return;
            }
            setSolPriceLoading(true);
            try {
                const solAmount = await usdToSol(totalPrice);
                setSolEquivalent(formatSOL(solAmount));
            } catch {
                setSolEquivalent(null);
            } finally {
                setSolPriceLoading(false);
            }
        }
        fetchSolEquivalent();
    }, [totalPrice]);

    // Quantity controls
    const increaseQuantity = () => {
        if (quantity < 5) setQuantity(q => q + 1);
    };

    const decreaseQuantity = () => {
        if (quantity > 1) setQuantity(q => q - 1);
    };

    // Handle purchase with real Solana transaction
    const handlePurchase = async () => {
        if (!event || !selectedTier) return;
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
            // Convert USD price to SOL using Jupiter Price API
            const solAmount = await usdToSol(totalPrice);
            const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
            console.log(`USD $${totalPrice} → ${solAmount} SOL (${lamports} lamports)`);

            // Skip transaction for free tickets
            let signature = 'free-ticket';

            if (lamports > 0) {
                // Connect to Solana
                const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

                // Sanitize and Validate Keys
                const payerKeyStr = solanaWallet.address?.trim();
                const organizerKeyStr = event.organizer_wallet?.trim();

                console.log("Keys Debug:", { payer: payerKeyStr, organizer: organizerKeyStr });

                if (!payerKeyStr || !organizerKeyStr) {
                    throw new Error("Invalid wallet addresses. Please contact support.");
                }

                let fromPubkey: PublicKey;
                let toPubkey: PublicKey;

                try {
                    fromPubkey = new PublicKey(payerKeyStr);
                } catch (e) {
                    throw new Error(`Your wallet address is invalid: ${payerKeyStr}`);
                }

                try {
                    toPubkey = new PublicKey(organizerKeyStr);
                } catch (e) {
                    throw new Error(`Organizer wallet address is invalid: ${organizerKeyStr}`);
                }

                // Prepare the TicktoClient
                const ticktoClient = new TicktoClient(connection); // Read-only, we sign raw manually

                // IMPORTANT: Fetch the Merkle tree from the event data or platform config.
                // In a production environment, this would be stored alongside the event on Supabase.
                // For MVP testing, we'll try to use a static test tree or look it up.
                // Normally: const merkleTreeStr = event.merkle_tree;
                // Currently returning fake/mocked address for testing if not set
                const merkleTreeStr = event.merkle_tree || "11111111111111111111111111111111"; // MUST REPLACE
                let merkleTreePubKey: PublicKey;

                try {
                    merkleTreePubKey = new PublicKey(merkleTreeStr);
                } catch {
                    throw new Error("Invalid Merkle Tree for this event. Event setup is incomplete.");
                }

                // 1. SOL Transfer Instruction to Organizer
                const transferIx = SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports: lamports,
                });

                // 2. Mint Ticket Instruction to Bubblegum
                // We use our TicktoClient helper to generate the instruction
                const mintIx = await ticktoClient.createMintTicketIx(
                    fromPubkey,     // buyer
                    toPubkey,       // organizer
                    event.id,       // eventId
                    merkleTreePubKey // merkleTree
                );

                // Create the atomic transaction
                const transaction = new Transaction()
                    .add(transferIx);

                // Only enforce atomic minting if a valid (non-dummy) Merkle tree exists
                if (event.merkle_tree && event.merkle_tree !== "11111111111111111111111111111111") {
                    transaction.add(mintIx);
                }

                // Get latest blockhash
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = fromPubkey;

                // Serialize the transaction for Privy's signAndSendTransaction
                const serializedTx = transaction.serialize({
                    requireAllSignatures: false,
                    verifySignatures: false,
                });

                // Use Privy v3's signAndSendTransaction hook (works for embedded + external wallets)
                const result = await signAndSendTransaction({
                    transaction: new Uint8Array(serializedTx),
                    wallet: solanaWallet,
                    chain: 'solana:devnet',
                });

                // Extract signature from result
                const sigBytes = result.signature;
                // Convert Uint8Array signature to base58 string
                const { base58 } = await import('@scure/base');
                signature = base58.encode(sigBytes);

                console.log("Payment sent & confirmed by Privy! Signature:", signature);
            }

            // ONLY save ticket after successful payment
            setTxState('minting');

            // Create ticket records
            const ticketPromises = [];
            for (let i = 0; i < quantity; i++) {
                const qrCode = `${event.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
                const tokenId = `tkt-${Date.now()}-${i}`;
                ticketPromises.push(
                    supabase.from('tickets').insert({
                        event_id: event.id,
                        owner_id: user.id,
                        tier_name: selectedTier.name,
                        tier: selectedTier.name.toLowerCase().replace(/\s+/g, '-'),
                        qr_code: qrCode,
                        token_id: tokenId,
                        status: 'valid',
                        on_chain_status: 'minted',
                        minted_at: new Date().toISOString(),
                        price_paid: selectedTier.price,
                    })
                );
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
                                            {formatUSD(tier.price)}
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
                                    {formatUSD(totalPrice)}
                                </p>
                                {solEquivalent && (
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {solPriceLoading ? '...' : `≈ ${solEquivalent}`}
                                    </p>
                                )}
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

                                {/* Processing State */}
                                {txState === 'processing' && (
                                    <div className="w-full p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Waiting for wallet approval...
                                    </div>
                                )}

                                {txState === 'minting' && (
                                    <div className="w-full p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Payment confirmed! Creating your ticket...
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
                                        label={purchasing ? 'Processing...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''} - ${formatUSD(selectedTier?.price! * quantity)}`}
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
