'use client';

import { useState, useEffect } from 'react';
import { Search, CalendarDays, Trash2, Edit, AlertCircle, Eye, Tag, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabaseClient';
import { deleteEventAdmin } from '../actions';

export default function AdminEventsPage() {
    const { user } = usePrivy();
    const [searchQuery, setSearchQuery] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            // Fetch events and their ticket counts
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    tickets(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map((e: any) => ({
                id: e.id,
                title: e.title || 'Untitled Event',
                organizer: e.owner_id || e.organizer_wallet || 'Unknown',
                date: e.date || 'TBD',
                price: e.price_usd ? `$${e.price_usd}` : 'Free',
                ticketsSold: e.tickets?.[0]?.count || 0,
                totalTickets: e.total_tickets || 100,
                status: e.status || 'active',
                image: e.image_url || 'https://images.unsplash.com/photo-1540039155732-68473678c4b7?q=80&w=2940&auto=format&fit=crop'
            }));

            setEvents(formatted);
        } catch (err) {
            console.error("Error fetching admin events:", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteEvent = async (eventId: string) => {
        if (!user?.id) {
            alert("You must be logged in to perform this action.");
            return;
        }

        if (!confirm('Are you sure you want to delete this event? This action will hide it from the platform.')) return;

        try {
            const { success, error } = await deleteEventAdmin(eventId, user.id);

            if (!success) {
                throw new Error(error || 'Failed to communicate with DB');
            }

            setEvents(events.map(e =>
                e.id === eventId ? { ...e, status: 'deleted' } : e
            ));
        } catch (err: any) {
            console.error("Error deleting event:", err);
            alert(`Failed to delete event: ${err.message}`);
        }
    };

    const activeEvents = events.filter(e => e.status !== 'deleted');
    const filteredEvents = activeEvents.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        Events Management
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Oversee and manage all ticketing events across the platform.
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full sm:w-64 rounded-xl border-0 py-2 pl-10 pr-3 bg-white/5 text-white ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 backdrop-blur-md transition-all"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => (
                            <div key={event.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-black/50">

                                {/* Event Image Banner */}
                                <div className="relative h-48 w-full overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10" />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4 z-20">
                                        {event.status === 'active' && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/80 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-emerald-950 shadow-sm">
                                                Live
                                            </span>
                                        )}
                                        {event.status === 'sold_out' && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/80 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-purple-950 shadow-sm">
                                                Sold Out
                                            </span>
                                        )}
                                        {event.status === 'flagged' && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/80 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm ring-2 ring-amber-400">
                                                <AlertCircle className="w-3 h-3" /> Flagged
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Event Details */}
                                <div className="p-5 flex-1 flex flex-col relative z-20">
                                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{event.title}</h3>
                                    <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2">
                                        By <span className="font-medium text-zinc-300">{event.organizer.slice(0, 8)}...</span>
                                    </p>

                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <CalendarDays className="w-4 h-4 text-primary" />
                                            {event.date}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                <Tag className="w-4 h-4 text-emerald-400" />
                                                <span className="font-medium">{event.price}</span>
                                            </div>
                                            <div className="text-sm text-zinc-400">
                                                {event.ticketsSold} / {event.totalTickets} tickets
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-primary to-purple-500 h-1.5 rounded-full"
                                                style={{ width: `${Math.min((event.ticketsSold / Math.max(event.totalTickets, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Actions Overlay (Reveals on hover) */}
                                <div className="absolute inset-0 z-30 flex items-center justify-center gap-4 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors">
                                        <Eye className="w-6 h-6" />
                                        <span className="text-xs font-medium">View</span>
                                    </button>
                                    <button
                                        onClick={() => deleteEvent(event.id)}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <Trash2 className="w-6 h-6" />
                                        <span className="text-xs font-medium">Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredEvents.length === 0 && (
                        <div className="text-center py-24 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                            <CalendarDays className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400 text-lg font-medium">No events found</p>
                            <p className="text-zinc-500 text-sm mt-1">Try adjusting your search filters.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
