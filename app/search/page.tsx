'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar, MapPin, Loader2, Sparkles } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/mock-data';
import { getEvents } from '@/lib/api';
import { Event, EventCategory } from '@/lib/types';

const categoryFilters: { label: string; value: EventCategory | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Music', value: 'music' },
    { label: 'Arts', value: 'arts' },
    { label: 'Sports', value: 'sports' },
    { label: 'Conference', value: 'conference' },
    { label: 'Nightlife', value: 'nightlife' },
];

const categoryColors: Record<EventCategory, string> = {
    music: 'bg-purple-500/20 text-purple-400',
    sports: 'bg-emerald-500/20 text-emerald-400',
    arts: 'bg-pink-500/20 text-pink-400',
    conference: 'bg-blue-500/20 text-blue-400',
    nightlife: 'bg-orange-500/20 text-orange-400',
};

function EventResultCard({ event }: { event: Event }) {
    // Get price - support tiers
    const minPrice = event.tiers && event.tiers.length > 0
        ? Math.min(...event.tiers.map((t) => t.price))
        : (event.priceUsdc || event.price_sol || 0);

    const priceLabel = minPrice === 0
        ? 'Free'
        : `${minPrice} SOL`;

    // Image fallback
    const eventAny = event as any;
    const imageSrc = eventAny.image_url
        || event.coverImage
        || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422?q=80&w=1000&auto=format&fit=crop';

    return (
        <Link href={`/event/${event.id}`}>
            <motion.div
                className="glass-card glass-card-hover overflow-hidden group h-full flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Cover Image */}
                <div className="relative h-44 overflow-hidden">
                    <Image
                        src={imageSrc}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />

                    {/* Category Badge */}
                    <span
                        className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${categoryColors[event.category] || 'bg-white/20 text-white'
                            }`}
                    >
                        {event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : 'Event'}
                    </span>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="heading text-white text-lg mb-2 line-clamp-1">
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">{formatDate(event.date)} · {formatTime(event.date || event.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">{event.location || event.venue || 'Location TBA'}</span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/40">Price</span>
                        <span className="mono text-purple-400 text-sm font-semibold">
                            {priceLabel}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

export default function SearchPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');

    useEffect(() => {
        async function loadEvents() {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
            setLoading(false);
        }
        loadEvents();
    }, []);

    const filteredEvents = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();
        return events.filter((event) => {
            const matchesQuery =
                trimmedQuery === '' ||
                event.title?.toLowerCase().includes(trimmedQuery) ||
                event.venue?.toLowerCase().includes(trimmedQuery) ||
                event.location?.toLowerCase().includes(trimmedQuery) ||
                event.description?.toLowerCase().includes(trimmedQuery);

            const matchesCategory =
                selectedCategory === 'all' || event.category === selectedCategory;

            return matchesQuery && matchesCategory;
        });
    }, [events, query, selectedCategory]);

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto min-h-screen">
            {/* Search Header */}
            <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-3xl md:text-4xl text-white mb-4">Search</h1>

                {/* Search Input */}
                <div className="relative max-w-2xl">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Search className="w-5 h-5 text-white/40" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search events, venues, locations..."
                        className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Category Filters */}
            <motion.div
                className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {categoryFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setSelectedCategory(filter.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === filter.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </motion.div>

            {/* Results - Responsive Grid */}
            <div>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <p className="text-white/50 mt-4 text-sm">Loading events...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map((event) => (
                                    <EventResultCard key={event.id} event={event} />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                className="glass-card p-12 text-center max-w-md mx-auto"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <h3 className="heading text-lg text-white mb-2">No Results Found</h3>
                                <p className="text-white/50 text-sm">
                                    Try adjusting your search or filters
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
