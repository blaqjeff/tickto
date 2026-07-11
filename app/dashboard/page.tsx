'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { PlusCircle, Calendar, Users, DollarSign, Activity, MapPin, Loader2 } from 'lucide-react';
import { GlassCardSimple } from '@/components/ui/GlassCard';
import { formatDate } from '@/lib/mock-data';

interface DashboardEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    image_url: string;
    total_tickets: number;
    tickets_sold: number;
    revenue: number;
}

export default function OrganizerDashboard() {
    const { user, ready } = usePrivy();
    const [events, setEvents] = useState<DashboardEvent[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loyalFans, setLoyalFans] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!ready || !user) return;

        const fetchMyEvents = async () => {
            try {
                // Fetch events owned by this user
                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('id, title, date, location, image_url, total_tickets')
                    .eq('owner_id', user.id)
                    .neq('status', 'deleted')
                    .order('created_at', { ascending: false });

                if (eventsError) throw eventsError;

                const fetchedEvents = eventsData || [];

                // If the organizer has events, fetch all tickets for these events to calculate analytics
                if (fetchedEvents.length > 0) {
                    const eventIds = fetchedEvents.map(e => e.id);

                    const { data: ticketsData, error: ticketsError } = await supabase
                        .from('tickets')
                        .select('event_id, price_paid, owner_id')
                        .in('event_id', eventIds);

                    if (ticketsError) throw ticketsError;

                    const tickets = ticketsData || [];

                    // Analytics calculations
                    let revenue = 0;
                    const uniqueFans = new Set<string>();

                    // Map to track tickets sold per event
                    const eventStats: Record<string, { sold: number, rev: number }> = {};
                    fetchedEvents.forEach(e => {
                        eventStats[e.id] = { sold: 0, rev: 0 };
                    });

                    tickets.forEach(ticket => {
                        const price = ticket.price_paid || 0;
                        revenue += price;

                        if (ticket.owner_id) {
                            uniqueFans.add(ticket.owner_id);
                        }

                        if (eventStats[ticket.event_id]) {
                            eventStats[ticket.event_id].sold += 1;
                            eventStats[ticket.event_id].rev += price;
                        }
                    });

                    setTotalRevenue(revenue);
                    setLoyalFans(uniqueFans.size);

                    // Merge stats into events
                    const eventsWithStats = fetchedEvents.map(e => ({
                        ...e,
                        tickets_sold: eventStats[e.id].sold,
                        revenue: eventStats[e.id].rev
                    }));

                    setEvents(eventsWithStats);
                } else {
                    // No events
                    setEvents(fetchedEvents.map(e => ({ ...e, tickets_sold: 0, revenue: 0 })));
                }

            } catch (err) {
                console.error("Error fetching organizer events & analytics:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyEvents();
    }, [ready, user]);

    if (isLoading || !ready) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto min-h-screen">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight">Organizer Dashboard</h1>
                    <p className="text-neutral-400">Manage your events, track sales, and engage your fans.</p>
                </div>
                <Link
                    href="/create"
                    className="btn-primary flex items-center gap-2 shrink-0"
                >
                    <PlusCircle className="w-5 h-5" />
                    Create New Event
                </Link>
            </header>

            {/* Quick Stats overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <GlassCardSimple className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-wider">Active Events</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{events.length}</h3>
                        </div>
                    </div>
                </GlassCardSimple>

                <Link href="/dashboard/revenue" className="block">
                    <GlassCardSimple className="p-6 h-full border border-white/5 card-hover">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Revenue</p>
                                <h3 className="text-2xl font-bold text-white mt-1 mono">${totalRevenue.toFixed(2)}</h3>
                            </div>
                        </div>
                        <p className="text-[11px] text-white/50 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            All-time sales
                        </p>
                    </GlassCardSimple>
                </Link>

                <Link href="/dashboard/fans" className="block">
                    <GlassCardSimple className="p-6 h-full border border-white/5 card-hover">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Loyal Fans</p>
                                <h3 className="text-2xl font-bold text-white mt-1">{loyalFans}</h3>
                            </div>
                        </div>
                        <p className="text-[11px] text-white/50 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            Unique ticket buyers
                        </p>
                    </GlassCardSimple>
                </Link>
            </div>

            {/* Event List */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-6">Your Events</h2>

                {events.length === 0 ? (
                    <div className="text-center py-16 px-4 border border-white/5 rounded-2xl bg-white/5 border-dashed">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-white/40">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
                        <p className="text-neutral-400 max-w-sm mx-auto mb-6 text-sm">
                            You haven&apos;t created any events. Host your first experience and start selling tickets.
                        </p>
                        <Link
                            href="/create"
                            className="btn-secondary"
                        >
                            <PlusCircle className="w-4 h-4 inline-block mr-1.5" />
                            Create Event
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link href={`/dashboard/event/${event.id}`}>
                                    <GlassCardSimple className="overflow-hidden group h-full flex flex-col card-hover">
                                        <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
                                            <Image
                                                src={event.image_url || 'https://images.unsplash.com/photo-1545167622-3a6ac156f422'}
                                                alt={event.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-102"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent" />

                                            <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-medium bg-black/60 backdrop-blur-md text-white border border-white/10">
                                                Manage
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium text-white mb-2 line-clamp-1">{event.title}</h3>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-neutral-400">
                                                    <Calendar className="w-4 h-4 shrink-0" />
                                                    <span className="line-clamp-1">{formatDate(event.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-neutral-400">
                                                    <MapPin className="w-4 h-4 shrink-0" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-neutral-400">Sold / Capacity</span>
                                                <span className="text-white font-medium mono">{event.tickets_sold} / {event.total_tickets}</span>
                                            </div>
                                            {/* Progress bar for capacity */}
                                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white rounded-full"
                                                    style={{ width: `${Math.min(100, (event.tickets_sold / Math.max(1, event.total_tickets)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </GlassCardSimple>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
