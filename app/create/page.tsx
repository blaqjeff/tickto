'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Upload, Calendar, MapPin, Plus, Trash2, Ticket, Copy, Check, ExternalLink, Share2, PartyPopper } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { TicktoClient } from '@/lib/tickto-program';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Use local proxy in the browser, fallback to public devnet
const SOLANA_RPC_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://api.devnet.solana.com';

interface TicketTier {
    name: string;
    price: string;
    quantity: string;
}

export default function CreateEventPage() {
    const { ready, authenticated, user } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [createdEvent, setCreatedEvent] = useState<{ id: string; title: string; txSignature?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
    });

    const [tiers, setTiers] = useState<TicketTier[]>([
        { name: 'General', price: '', quantity: '' }
    ]);

    const [royaltyPercent, setRoyaltyPercent] = useState(''); // Empty = no royalties (0%)
    const [maxResaleMultiplier, setMaxResaleMultiplier] = useState(''); // Empty = no limit (unlimited)

    // Access Control
    useEffect(() => {
        if (ready && !authenticated) {
            router.push('/');
        }
    }, [ready, authenticated, router]);

    if (!ready || !authenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addTier = () => {
        setTiers([...tiers, { name: '', price: '', quantity: '' }]);
    };

    const removeTier = (index: number) => {
        if (tiers.length > 1) {
            const newTiers = [...tiers];
            newTiers.splice(index, 1);
            setTiers(newTiers);
        }
    };

    const updateTier = (index: number, field: keyof TicketTier, value: string) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { alert("Please sign in."); return; }

        // 1. Validation: Prevent Crash if Date is empty
        if (!formData.date) {
            alert("Please select a date and time.");
            return;
        }

        setIsLoading(true);

        try {
            // 2. Use Solana wallet address (from @privy-io/react-auth/solana hook)
            const organizerWallet = wallets[0]?.address;

            if (!organizerWallet) {
                alert("Error: No wallet address found on your account. Please sign in again.");
                setIsLoading(false);
                return;
            }
            console.log("Saving Organizer Wallet:", organizerWallet);

            // 3. Safe Date Conversion
            const eventDate = new Date(formData.date);
            if (isNaN(eventDate.getTime())) {
                throw new Error("Invalid date selected. Please try again.");
            }

            if (!imageFile) throw new Error("Image required");

            // Step A: Upload Image
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('event-images')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event-images')
                .getPublicUrl(filePath);

            // 4. Prepare Payload (Paranoid Type Safety)
            const numericTiers = tiers.map(t => ({
                name: t.name,
                price: Number(t.price),
                quantity: Number(t.quantity)
            }));

            // Validate numeric tiers
            if (numericTiers.some(t => isNaN(t.price) || isNaN(t.quantity) || t.quantity < 1 || !t.name)) {
                throw new Error("Invalid price or quantity in tiers.");
            }

            const totalTickets = numericTiers.reduce((sum, t) => sum + t.quantity, 0);
            const lowestPrice = Math.min(...numericTiers.map(t => t.price));

            const royaltyBps = Math.round(parseFloat(royaltyPercent) * 100);
            const maxResaleMultiplierBps = Math.round((parseFloat(maxResaleMultiplier) - 1) * 10000);

            const payload = {
                title: formData.title,
                description: formData.description,
                date: eventDate.toISOString(), // Safe now because we checked it above
                location: formData.location,
                price_usd: lowestPrice,
                total_tickets: totalTickets,
                image_url: publicUrl,
                owner_id: user.id,
                organizer_wallet: organizerWallet,
                ticket_tiers: numericTiers,
                merkle_tree: "11111111111111111111111111111111",
                max_resale_multiplier_bps: maxResaleMultiplierBps >= 0 ? maxResaleMultiplierBps : 10000,
                royalty_bps: royaltyBps >= 0 ? royaltyBps : 500
            };

            console.log("Submitting:", payload);

            // 5. Insert -> also .select() to get the ID back
            const { data, error: insertError } = await supabase.from('events').insert([payload]).select();
            if (insertError) throw insertError;

            // 6. On-Chain Anchor Setup via TicktoClient
            try {
                console.log("Setting up Event on Solana via Shared Merkle Tree...");

                const solanaWallet = wallets[0];
                if (!solanaWallet?.address) throw new Error("No connected Solana wallet.");

                // Debug: log wallet state to help diagnose connectivity issues
                console.log("Wallet state:", {
                    address: solanaWallet.address,
                    walletsCount: wallets.length,
                });

                const connection = new Connection(SOLANA_RPC_URL, {
                    commitment: 'confirmed',
                    wsEndpoint: 'wss://api.devnet.solana.com'
                });
                const ticktoClient = new TicktoClient(connection);

                // Load Shared Tree Pubkey from environment
                const sharedTreeStr = process.env.NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY;
                if (!sharedTreeStr) throw new Error("System Error: No shared Merkle tree configured.");
                const merkleTreePubKey = new PublicKey(sharedTreeStr);

                // Use the returned UUID as the definitive ID
                const eventId = data?.[0]?.id || payload.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

                const createEventIx = await ticktoClient.createCreateEventIx(
                    new PublicKey(organizerWallet), // organizer
                    eventId, // String length limits apply in production
                    payload.title.substring(0, 32), // eventName
                    payload.image_url, // uri
                    new BN(Math.floor(lowestPrice * 1_000_000)), // ticketPriceUsdc
                    payload.max_resale_multiplier_bps, // maxResaleMultiplierBps
                    payload.royalty_bps, // royaltyBps
                    totalTickets, // maxSupply
                    merkleTreePubKey // shared/event merkle tree
                );

                const transaction = new Transaction().add(createEventIx);
                const latestBlockhash = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = latestBlockhash.blockhash;
                transaction.feePayer = new PublicKey(organizerWallet);

                const serializedTx = transaction.serialize({
                    requireAllSignatures: false,
                    verifySignatures: false,
                });

                console.log("Requesting signature for createEvent tx (devnet)...");
                console.log("User linked accounts:", JSON.stringify(user?.linkedAccounts?.filter((a: any) => a.chainType === 'solana'), null, 2));

                // Step 1: Sign the transaction via Privy (user approves in popup)
                const signResult = await signTransaction({
                    transaction: new Uint8Array(serializedTx),
                    wallet: solanaWallet,
                    chain: 'solana:devnet',
                });
                console.log("Transaction signed! Sending to network...");

                // Step 2: Send the signed transaction directly via our RPC
                const signedTxBytes = signResult.signedTransaction;
                const txSignature = await connection.sendRawTransaction(signedTxBytes, {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                });

                // Step 3: Confirm the transaction
                const confirmation = await connection.confirmTransaction({
                    signature: txSignature,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                }, 'confirmed');
                if (confirmation.value.err) {
                    throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                console.log("On-chain event created! Signature:", txSignature);

                // Show success screen instead of redirecting
                setCreatedEvent({
                    id: eventId,
                    title: payload.title,
                    txSignature,
                });

            } catch (chainErr) {
                console.error("Failed to setup event on-chain:", chainErr);
                alert("Blockchain setup failed, but your event data was saved to the database. Check console details.");
            }
        } catch (err: any) {
            console.error("Create Failed:", err);
            alert(`Error: ${err.message || "Check console"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const eventUrl = createdEvent ? `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${createdEvent.id}` : '';

    const copyLink = () => {
        navigator.clipboard.writeText(eventUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareEvent = async () => {
        if (navigator.share) {
            await navigator.share({
                title: createdEvent?.title,
                text: `Check out ${createdEvent?.title} on Tickto!`,
                url: eventUrl,
            });
        } else {
            copyLink();
        }
    };

    // ─── Success Screen ───────────────────────────────────────
    if (createdEvent) {
        return (
            <div className="px-4 py-8 max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center safe-bottom">
                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                background: ['#D4AF37', '#F3E5AB', '#EFEEED', '#BEA98E', '#10B981'][i % 5],
                                left: `${10 + Math.random() * 80}%`,
                                top: `${10 + Math.random() * 40}%`,
                            }}
                            initial={{ opacity: 0, scale: 0, y: 0 }}
                            animate={{
                                opacity: [0, 1, 1, 0],
                                scale: [0, 1.5, 1, 0.5],
                                y: [0, -60, -120, -200],
                                x: [0, (Math.random() - 0.5) * 100],
                            }}
                            transition={{
                                duration: 2.5,
                                delay: i * 0.12,
                                ease: 'easeOut',
                            }}
                        />
                    ))}
                </div>

                {/* Success Icon */}
                <motion.div
                    className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                    >
                        <Check className="w-8 h-8 text-emerald-400" strokeWidth={3} />
                    </motion.div>
                </motion.div>

                {/* Congrats Text */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <PartyPopper className="w-5 h-5 text-yellow-450" />
                        <h1 className="heading text-3xl text-white">Congratulations!</h1>
                        <PartyPopper className="w-5 h-5 text-yellow-450" style={{ transform: 'scaleX(-1)' }} />
                    </div>
                    <p className="text-white/50 text-base leading-relaxed">
                        <span className="text-white font-medium">{createdEvent.title}</span> is now live on Tickto!
                        Share it with the world!
                    </p>
                </motion.div>

                {/* Share Link Card */}
                <motion.div
                    className="w-full card p-5 mb-6"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <p className="text-white/30 text-xs uppercase tracking-wider mb-3 font-medium">Event Link</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 overflow-hidden">
                            <p className="text-white/80 text-sm mono truncate">{eventUrl}</p>
                        </div>
                        <button
                            onClick={copyLink}
                            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                            title="Copy link"
                        >
                            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                    {copied && (
                        <motion.p
                            className="text-emerald-400 text-xs mt-2 text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Link copied to clipboard!
                        </motion.p>
                    )}
                </motion.div>

                {/* On-chain confirmation */}
                {createdEvent.txSignature && (
                    <motion.a
                        href={`https://explorer.solana.com/tx/${createdEvent.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/35 text-xs flex items-center gap-1 hover:text-white/60 transition-colors mb-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <ExternalLink className="w-3 h-3" />
                        View on Solana Explorer
                    </motion.a>
                )}

                {/* Action Buttons */}
                <motion.div
                    className="w-full space-y-3"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <button
                        onClick={shareEvent}
                        className="w-full btn-primary py-3.5 flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-5 h-5" />
                        Share Your Event
                    </button>

                    <button
                        onClick={() => router.push(`/event/${createdEvent.id}`)}
                        className="w-full btn-secondary py-3.5 flex items-center justify-center gap-2"
                    >
                        <Ticket className="w-5 h-5" />
                        View Event Page
                    </button>

                    <button
                        onClick={() => {
                            setCreatedEvent(null);
                            setFormData({ title: '', description: '', date: '', location: '' });
                            setTiers([{ name: 'General', price: '', quantity: '' }]);
                            setImageFile(null);
                            setImagePreview(null);
                        }}
                        className="w-full py-3 text-white/40 hover:text-white/60 transition-colors text-sm font-medium"
                    >
                        Create Another Event
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8 max-w-2xl mx-auto min-h-screen safe-bottom">
            <motion.header
                className="mb-8 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-3xl text-white mb-2">Create New Event</h1>
                <p className="text-white/40">Details, tickets, and artwork.</p>
            </motion.header>

            <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Image Upload */}
                <div className="relative group">
                    <label className="block w-full aspect-video rounded-xl border border-dashed border-white/20 hover:border-white/45 transition-colors cursor-pointer overflow-hidden bg-white/5">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            required
                        />
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-white/30 group-hover:text-white/60 transition-colors">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="text-sm font-medium">Upload Poster</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium">Change Image</span>
                        </div>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-white/50 font-medium ml-1">Event Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                            placeholder="e.g. Neon Nights 2026"
                            required
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/50 font-medium ml-1">Date & Time</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/50 font-medium ml-1">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                placeholder="Start typing..."
                                required
                            />
                        </div>
                    </div>

                    {/* Ticket Tiers Section */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-white/50 font-medium ml-1 flex items-center gap-2">
                                <Ticket className="w-4 h-4 text-white/40" />
                                Ticket Tiers
                            </label>
                            <button
                                type="button"
                                onClick={addTier}
                                className="text-xs flex items-center gap-1 text-white/50 hover:text-white hover:underline font-medium"
                            >
                                <Plus className="w-3 h-3" />
                                Add Tier
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {tiers.map((tier, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="relative grid grid-cols-12 gap-3 bg-white/3 p-3 rounded-xl border border-white/5 group"
                                    >
                                        <div className="col-span-12 md:col-span-5">
                                            <input
                                                type="text"
                                                placeholder="Tier Name (e.g. VIP)"
                                                value={tier.name}
                                                onChange={e => updateTier(index, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 focus:border-white/30 pb-1 text-sm text-white focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <div className="relative">
                                                <span className="absolute left-0 bottom-1 text-white/30 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    placeholder="Price (USD)"
                                                    step="0.01"
                                                    min="0"
                                                    value={tier.price}
                                                    onChange={e => updateTier(index, 'price', e.target.value)}
                                                    className="w-full bg-transparent border-b border-white/10 focus:border-white/30 pb-1 pl-8 text-sm text-white focus:outline-none text-right"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                min="1"
                                                value={tier.quantity}
                                                onChange={e => updateTier(index, 'quantity', e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 focus:border-white/30 pb-1 text-sm text-white focus:outline-none text-right"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeTier(index)}
                                                disabled={tiers.length === 1}
                                                className="text-white/20 hover:text-red-400 disabled:opacity-0 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Secondary Market Config */}
                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-white/5">
                        <label className="text-sm text-white/50 font-medium ml-1 flex items-center gap-2">
                            Secondary Market Settings
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 font-medium ml-1">Creator Royalties (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={royaltyPercent}
                                    onChange={e => setRoyaltyPercent(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors bg-transparent"
                                    placeholder="No royalties (0%)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 font-medium ml-1">Max Resale Cap (multiplier, e.g. 2.0x)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    value={maxResaleMultiplier}
                                    onChange={e => setMaxResaleMultiplier(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors bg-transparent"
                                    placeholder="No resale limit (unlimited)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-white/50 font-medium ml-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors bg-transparent"
                            rows={4}
                            placeholder="Tell people what makes this event special..."
                            required
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-4 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Event...
                            </>
                        ) : (
                            'Launch Event'
                        )}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}
