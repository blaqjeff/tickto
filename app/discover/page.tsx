'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Sparkles, Loader2, Search, Banknote, ShieldAlert, X } from 'lucide-react';
import { GlassCardSimple } from '@/components/ui/GlassCard';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEvents, getActiveListings } from '@/lib/api';
import { Event, EventCategory } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { supabase } from '@/lib/supabaseClient';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';

const categoryColors: Record<EventCategory, string> = {
  music: 'bg-white/5 text-white/80 border border-white/10',
  sports: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  arts: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  conference: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  nightlife: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

function EventCard({ event }: { event: Event }) {
  const minPrice = event.tiers && event.tiers.length > 0
    ? Math.min(...event.tiers.map((t) => t.price))
    : (event.price_usd || 0);

  const priceLabel = minPrice === 0
    ? 'Free'
    : event.tiers && event.tiers.length > 1
      ? `From $${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)}`;

  const eventAny = event as unknown as { image_url?: string };
  const imageSrc = eventAny.image_url
    || event.coverImage
    || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';

  return (
    <Link href={`/event/${event.id}`}>
      <GlassCardSimple className="overflow-hidden group h-full flex flex-col card-hover">
        <div className="relative h-44 -mx-6 -mt-6 mb-4 overflow-hidden">
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent" />

          <span
            className={`absolute top-3 left-3 px-2.5 py-0.5 rounded text-[11px] font-medium backdrop-blur-md ${categoryColors[event.category] || 'bg-white/10 text-white'}`}
          >
            {event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Event'}
          </span>

          {event.featured && (
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-black backdrop-blur-md flex items-center gap-1">
              Featured
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="heading text-lg text-white mb-2 line-clamp-1">
            {event.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">
              {formatDate(event.date)} · {formatTime(event.date || event.time)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/50">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{event.location || event.venue || 'Location TBA'}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/30">Price</span>
          <span className="mono text-white font-medium">
            {priceLabel}
          </span>
        </div>
      </GlassCardSimple>
    </Link>
  );
}

interface ResaleTicketData {
  id: string;
  event_id: string;
  owner_id: string;
  tier_name: string;
  listing_price_usd: number;
  qr_code: string;
  token_id: string;
  event: Event;
}

function ResaleCard({ 
  listing, 
  onBuy 
}: { 
  listing: ResaleTicketData; 
  onBuy: (l: ResaleTicketData) => void;
}) {
  const event = listing.event;
  const imageSrc = (event as any).image_url
    || event.coverImage
    || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';

  return (
    <GlassCardSimple className="overflow-hidden group h-full flex flex-col card-hover">
      <div className="relative h-44 -mx-6 -mt-6 mb-4 overflow-hidden">
        <Image
          src={imageSrc}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent" />
        
        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white border border-white/10 backdrop-blur-md">
          RESALE LISTING
        </span>
      </div>

      <div className="flex-1">
        <h3 className="heading text-lg text-white mb-2 line-clamp-1">
          {event.title}
        </h3>
        <p className="text-xs text-white/40 mb-3 font-medium">Tier: {listing.tier_name}</p>

        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">
            {formatDate(event.date)} · {formatTime(event.date || event.time)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/50">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{event.location || event.venue || 'Location TBA'}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Original Price</span>
          <span className="text-xs text-white/50 line-through">${(event.price_usd || 0).toFixed(2)}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Resale Price</span>
          <span className="mono text-white font-medium text-lg">
            ${Number(listing.listing_price_usd).toFixed(2)} USDC
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          onBuy(listing);
        }}
        className="w-full mt-4 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Banknote className="w-4 h-4" />
        Buy Resale Ticket
      </button>
    </GlassCardSimple>
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
      <p className="text-white/40 mt-4">Loading listings...</p>
    </div>
  );
}

function EmptyState({ message = 'No events found.' }: { message?: string }) {
  return (
    <motion.div
      className="card p-12 text-center max-w-md mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
      <h3 className="heading text-xl text-white mb-2">{message}</h3>
      <p className="text-white/40 text-sm">
        Try checking back later or adjusting your filter.
      </p>
    </motion.div>
  );
}

export default function HomePage() {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const [tab, setTab] = useState<'primary' | 'resale'>('primary');
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<ResaleTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase/Transaction feedback state
  const [purchasingListing, setPurchasingListing] = useState<ResaleTicketData | null>(null);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'processing' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [resaleError, setResaleError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const loadListings = async () => {
    const data = await getActiveListings();
    setListings(data as ResaleTicketData[]);
  };

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        if (tab === 'primary') {
          await loadEvents();
        } else {
          await loadListings();
        }
      } catch (err) {
        console.error('Error loading feed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [tab]);

  // Buy listed ticket transaction flow
  const buyResaleTicket = async (listing: ResaleTicketData) => {
    if (!authenticated || !user) {
      login();
      return;
    }

    const solanaWallet = wallets[0];
    if (!solanaWallet || !solanaWallet.address) {
      alert("No Solana wallet found. Please log out and log back in to connect one.");
      return;
    }

    if (listing.owner_id === user.id) {
      alert("You cannot purchase your own listed ticket.");
      return;
    }

    setPurchasingListing(listing);
    setPurchaseState('processing');
    setResaleError(null);

    try {
      // Step 1: Call API to build transaction
      console.log('[BUY RESALE] Building transaction...');
      const response = await fetch('/api/resell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: listing.id,
          buyerWallet: solanaWallet.address
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to build transaction');
      }

      setPurchaseState('signing');

      // Step 2: Deserialize transaction
      const txBytes = Uint8Array.from(Buffer.from(data.transaction, 'base64'));
      const transaction = VersionedTransaction.deserialize(txBytes);

      // Step 3: Sign with Privy user wallet
      console.log('[BUY RESALE] Requesting signature...');
      const signResult = await signTransaction({
        transaction: transaction.serialize(),
        wallet: solanaWallet,
        chain: 'solana:devnet'
      });

      setPurchaseState('confirming');

      // Step 4: Send raw transaction to Devnet
      console.log('[BUY RESALE] Sending transaction...');
      const sendConnection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
      const signature = await sendConnection.sendRawTransaction(signResult.signedTransaction, {
        skipPreflight: true,
        preflightCommitment: 'confirmed'
      });

      // Step 5: Confirm
      console.log('[BUY RESALE] Confirming...', signature);
      const confirmation = await sendConnection.confirmTransaction({
        signature,
        blockhash: data.blockhash,
        lastValidBlockHeight: data.lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`On-chain transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Step 6: Update database
      console.log('[BUY RESALE] Updatings database...');
      const { error: updateErr } = await supabase
        .from('tickets')
        .update({
          owner_id: user.id,
          listing_status: null,
          listing_price_usd: null,
          status: 'valid' // Make ticket valid for the new owner
        })
        .eq('id', listing.id);

      if (updateErr) {
        console.error('Error updating ticket owner in DB:', updateErr);
        throw new Error('On-chain resale succeeded, but failed to update local database.');
      }

      setPurchaseState('success');
      setShowConfetti(true);
      
      // Reload listings
      await loadListings();
      
    } catch (err: any) {
      console.error('[BUY RESALE] Error:', err);
      setResaleError(err.message || 'Failed to purchase listed ticket');
      setPurchaseState('error');
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const lowerQuery = searchQuery.toLowerCase().trim();

  // Search filter
  const displayedEvents = !isSearching
    ? events
    : events.filter(e =>
      e.title?.toLowerCase().includes(lowerQuery) ||
      e.location?.toLowerCase().includes(lowerQuery) ||
      e.venue?.toLowerCase().includes(lowerQuery)
    );

  const displayedListings = !isSearching
    ? listings
    : listings.filter(l =>
      l.event?.title?.toLowerCase().includes(lowerQuery) ||
      l.event?.location?.toLowerCase().includes(lowerQuery) ||
      l.event?.venue?.toLowerCase().includes(lowerQuery)
    );

  const featuredEvent = events.find((e) => e.featured);
  const gridEvents = isSearching
    ? displayedEvents
    : displayedEvents.filter((e) => e.id !== featuredEvent?.id);

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <ConfettiEffect isActive={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header & Search */}
      <motion.header
        className="mb-8 space-y-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="heading text-3xl md:text-4xl text-white mb-1">Discover Tickets</h1>
            <p className="text-white/40">Explore events and secondary resale listings</p>
          </div>

          {/* Feed Tab Toggles */}
          <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl max-w-xs md:max-w-md w-full">
            <button
              onClick={() => setTab('primary')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'primary' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Box Office
            </button>
            <button
              onClick={() => setTab('resale')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'resale' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Resale Market
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder={tab === 'primary' ? "Search events or venues..." : "Search secondary ticket listings..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
          />
        </div>
      </motion.header>

      {loading ? (
        <LoadingState />
      ) : tab === 'primary' ? (
        displayedEvents.length === 0 ? (
          <EmptyState message="No primary events found." />
        ) : (
          <>
            {/* Featured Event - Only show if not searching */}
            {featuredEvent && !isSearching && (
              <motion.section
                className="mb-10"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <Link href={`/event/${featuredEvent.id}`}>
                  <div className="card card-hover overflow-hidden relative group">
                    <div className="relative h-64 md:h-80 lg:h-96">
                      <Image
                        src={featuredEvent.coverImage || '/placeholder-event.jpg'}
                        alt={featuredEvent.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-102"
                        sizes="100vw"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-black backdrop-blur-md mb-3">
                          Featured Event
                        </span>
                        <h2 className="heading text-2xl md:text-3xl lg:text-4xl text-white mb-2">
                          {featuredEvent.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(featuredEvent.date)} · {formatTime(featuredEvent.date || featuredEvent.time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {featuredEvent.location || featuredEvent.venue || 'Location TBA'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.section>
            )}

            {/* Regular Grid */}
            <section>
              <h2 className="heading text-xl text-white mb-6">
                {isSearching ? 'Search Results' : 'Upcoming Events'}
              </h2>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={container}
                initial="hidden"
                animate="show"
                key="primary-grid"
              >
                {gridEvents.map((event) => (
                  <motion.div key={event.id} variants={item}>
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          </>
        )
      ) : (
        /* Resale Grid */
        displayedListings.length === 0 ? (
          <EmptyState message="No tickets listed in the resale market." />
        ) : (
          <section>
            <h2 className="heading text-xl text-white mb-6">Listed Ticket Resales</h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={container}
              initial="hidden"
              animate="show"
              key="resale-grid"
            >
              {displayedListings.map((listing) => (
                <motion.div key={listing.id} variants={item}>
                  <ResaleCard listing={listing} onBuy={buyResaleTicket} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        ))}

      {/* Transaction Checkout Status Modal */}
      <AnimatePresence>
        {purchasingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden"
            >
              {/* Header */}
              {purchaseState !== 'processing' && purchaseState !== 'signing' && purchaseState !== 'confirming' && (
                <button
                  onClick={() => setPurchasingListing(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* State Indicator */}
              <div className="flex flex-col items-center justify-center my-6">
                {(purchaseState === 'processing' || purchaseState === 'signing' || purchaseState === 'confirming') && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-white border-t-transparent flex items-center justify-center mb-4"
                  />
                )}

                {purchaseState === 'success' && (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 text-xl">
                    ✓
                  </div>
                )}

                {purchaseState === 'error' && (
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mb-4">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                )}

                <h3 className="heading text-lg text-white font-medium">
                  {purchaseState === 'processing' && 'Preparing Transaction...'}
                  {purchaseState === 'signing' && 'Confirm in Wallet...'}
                  {purchaseState === 'confirming' && 'Finalizing Resale...'}
                  {purchaseState === 'success' && 'Ticket Purchased!'}
                  {purchaseState === 'error' && 'Transaction Failed'}
                </h3>

                <p className="text-sm text-neutral-400 mt-2 px-4 leading-relaxed">
                  {purchaseState === 'processing' && 'Calculating splits, checking price caps, and calling relayer.'}
                  {purchaseState === 'signing' && 'Please approve the USDC transfers and ticket cNFT delegation in your Privy popup.'}
                  {purchaseState === 'confirming' && 'Submitting atomic transaction and verifying finality on-chain.'}
                  {purchaseState === 'success' && 'The cNFT ticket has been transferred to your wallet and ownership registered.'}
                  {purchaseState === 'error' && (resaleError || 'Failed to complete transaction.')}
                </p>
              </div>

              {purchaseState === 'success' && (
                <button
                  onClick={() => setPurchasingListing(null)}
                  className="w-full btn-primary py-3.5 font-semibold mt-4"
                >
                  Done
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
