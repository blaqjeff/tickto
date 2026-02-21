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
    transition: { staggerChildren: 0.08 },
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
    : (event.price_usd || 0);

  const priceLabel = minPrice === 0
    ? 'Free'
    : event.tiers && event.tiers.length > 1
      ? `From $${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)}`;

  // Image fallback
  const eventAny = event as unknown as { image_url?: string };
  const imageSrc = eventAny.image_url
    || event.coverImage
    || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';

  return (
    <Link href={`/event/${event.id}`}>
      <GlassCardSimple className="overflow-hidden group h-full flex flex-col glass-card-hover p-0">
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden">
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

          {/* Category Badge */}
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-medium backdrop-blur-md ${categoryColors[event.category] || 'bg-white/20 text-white'
              }`}
          >
            {event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Event'}
          </span>

          {/* Featured Badge */}
          {event.featured && (
            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-500/25 text-purple-300 backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Event Info */}
        <div className="flex-1 px-4 pt-3 pb-4">
          <h3 className="heading text-[15px] text-white mb-2 line-clamp-1">
            {event.title}
          </h3>

          <div className="flex items-center gap-2 text-[13px] text-white/50 mb-1">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-white/30" />
            <span className="line-clamp-1">
              {formatDate(event.date)} · {formatTime(event.date || event.time)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-white/50">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-white/30" />
            <span className="line-clamp-1">{event.location || event.venue || 'Location TBA'}</span>
          </div>

          {/* Price */}
          <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between">
            <span className="text-[11px] text-white/30 uppercase tracking-wide">Price</span>
            <span className="mono text-sm text-purple-400 font-semibold">
              {priceLabel}
            </span>
          </div>
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
      className="glass-card p-10 text-center max-w-sm mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Sparkles className="w-10 h-10 text-purple-400/60 mx-auto mb-3" />
      <h3 className="heading text-lg text-white mb-1">No Events Found</h3>
      <p className="text-white/40 text-sm">
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
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header & Search */}
      <motion.header
        className="mb-8 flex flex-col gap-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="heading text-3xl md:text-5xl text-white mb-1 text-balance">Discover Events</h1>
          <p className="text-white/40 text-sm">Find your next experience</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search events, artists, or venues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/4 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/40 focus:bg-white/6 transition-all"
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
              className="mb-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Link href={`/event/${featuredEvent.id}`}>
                <div className="glass-card glass-card-hover overflow-hidden relative group">
                  <div className="relative h-56 md:h-72 lg:h-80">
                    <Image
                      src={featuredEvent.coverImage || '/placeholder-event.jpg'}
                      alt={featuredEvent.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="100vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-500/25 text-purple-300 backdrop-blur-md mb-3">
                        <Sparkles className="w-3 h-3" />
                        Featured Event
                      </span>
                      <h2 className="heading text-xl md:text-2xl lg:text-3xl text-white mb-2 text-balance">
                        {featuredEvent.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(featuredEvent.date)} · {formatTime(featuredEvent.date || featuredEvent.time)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {featuredEvent.location || featuredEvent.venue || 'Location TBA'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.section>
          )}

          {/* All Events - Responsive Grid */}
          <section>
            <h2 className="heading text-lg text-white mb-5">
              {isSearching ? 'Search Results' : 'Upcoming Events'}
            </h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
