'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Sparkles, Loader2, Search } from 'lucide-react';
import { GlassCardSimple } from '@/components/ui/GlassCard';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEvents } from '@/lib/api';
import { Event, EventCategory } from '@/lib/types';

const categoryColors: Record<EventCategory, string> = {
  music: 'bg-purple-500/20 text-purple-400',
  sports: 'bg-emerald-500/20 text-emerald-400',
  arts: 'bg-pink-500/20 text-pink-400',
  conference: 'bg-blue-500/20 text-blue-400',
  nightlife: 'bg-orange-500/20 text-orange-400',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function EventCard({ event }: { event: Event }) {
  // Get price - support tiers
  const minPrice = event.tiers && event.tiers.length > 0
    ? Math.min(...event.tiers.map((t) => t.price))
    : (event.priceUsdc || event.price_sol || 0);

  const priceLabel = minPrice === 0
    ? 'Free'
    : event.tiers && event.tiers.length > 1
      ? `From ${minPrice} SOL`
      : `${minPrice} SOL`;

  // Image fallback
  const eventAny = event as unknown as { image_url?: string };
  const imageSrc = eventAny.image_url
    || event.coverImage
    || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';

  return (
    <Link href={`/event/${event.id}`}>
      <GlassCardSimple className="overflow-hidden group h-full flex flex-col">
        {/* Cover Image */}
        <div className="relative h-40 -mx-6 -mt-6 mb-4 overflow-hidden">
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />

          {/* Category Badge */}
          <span
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${categoryColors[event.category] || 'bg-white/20 text-white'
              }`}
          >
            {event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Event'}
          </span>

          {/* Featured Badge */}
          {event.featured && (
            <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/30 text-purple-300 backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Event Info */}
        <div className="flex-1">
          <h3 className="heading text-lg text-white mb-2 line-clamp-1">
            {event.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(event.date)} · {formatTime(event.date || event.time)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{event.location || event.venue || 'Location TBA'}</span>
          </div>
        </div>

        {/* Price */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">Price</span>
          <span className="mono text-purple-400 font-semibold">
            {priceLabel}
          </span>
        </div>
      </GlassCardSimple>
    </Link>
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
      <p className="text-white/50 mt-4">Loading events...</p>
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
      <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
      <h3 className="heading text-xl text-white mb-2">No Events Found</h3>
      <p className="text-white/50 text-sm">
        Try adjusting your search terms.
      </p>
    </motion.div>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, []);

  // Derived state for filtering
  const isSearching = searchQuery.trim().length > 0;
  const lowerQuery = searchQuery.toLowerCase().trim();

  const displayedEvents = !isSearching
    ? events
    : events.filter(e =>
      e.title?.toLowerCase().includes(lowerQuery) ||
      e.location?.toLowerCase().includes(lowerQuery) ||
      e.venue?.toLowerCase().includes(lowerQuery)
    );

  const featuredEvent = events.find((e) => e.featured);

  // Logic fix: Show all events in the grid EXCEPT the one being shown as the Hero event.
  // If searching, show everything that matches.
  const gridEvents = isSearching
    ? displayedEvents
    : displayedEvents.filter((e) => e.id !== featuredEvent?.id);

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header & Search */}
      <motion.header
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="heading text-3xl text-white mb-1">Discover Events</h1>
          <p className="text-white/50">Find your next experience</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search events, artists, or venues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all shadow-xl"
          />
        </div>
      </motion.header>

      {displayedEvents.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Featured Event - Only show if not searching */}
          {featuredEvent && !isSearching && (
            <motion.section
              className="mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link href={`/event/${featuredEvent.id}`}>
                <div className="glass-card overflow-hidden relative group">
                  <div className="relative h-64">
                    <Image
                      src={featuredEvent.coverImage || '/placeholder-event.jpg'}
                      alt={featuredEvent.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="100vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/30 text-purple-300 backdrop-blur-md mb-3">
                        <Sparkles className="w-3 h-3" />
                        Featured Event
                      </span>
                      <h2 className="heading text-2xl text-white mb-2">
                        {featuredEvent.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-white/60">
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

          {/* All Events */}
          <section>
            <h2 className="heading text-xl text-white mb-4">
              {isSearching ? 'Search Results' : 'Upcoming Events'}
            </h2>
            <motion.div
              className="grid gap-4"
              variants={container}
              initial="hidden"
              animate="show"
              key={isSearching ? 'search-results' : 'feed'}
            >
              {gridEvents.map((event) => (
                <motion.div key={event.id} variants={item}>
                  <EventCard event={event} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        </>
      )}
    </div>
  );
}
