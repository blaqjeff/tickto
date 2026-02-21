'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Users, Activity, Ticket, Loader2, Calendar, MapPin } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabaseClient';
import { getEventById } from '@/lib/api';
import { Event } from '@/lib/types';
import { GlassCardSimple } from '@/components/ui/GlassCard';
import { formatDate, formatTime } from '@/lib/mock-data';

interface EventAnalyticsPageProps {
    params: Promise<{ id: string }>;
}

export default function EventAnalyticsPage({ params }: EventAnalyticsPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { ready, user } = usePrivy();

    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [ticketsSold, setTicketsSold] = useState(0);
    const [loyalFans, setLoyalFans] = useState(0);

    useEffect(() => {
        if (!ready || !user) return;

        const loadEventAnalytics = async () => {
            try {
                // 1. Fetch Event Details
                const eventData = await getEventById(id);
                if (!eventData) {
                    setIsLoading(false);
                    return; // Not found
                }

                // Security check: Only the owner should see analytics
                if (eventData.owner_id !== user.id) {
                    router.push('/dashboard');
                    return;
                }

                setEvent(eventData);

                // 2. Fetch Tickets for this event
                const { data: ticketsData, error: ticketsError } = await supabase
                    .from('tickets')
                    .select('price_paid, owner_id')
                    .eq('event_id', id);

                if (ticketsError) throw ticketsError;

                const tickets = ticketsData || [];

                // 3. Calculate metrics
                let revenue = 0;
                const uniqueFans = new Set<string>();

                tickets.forEach(ticket => {
                    revenue += (ticket.price_paid || 0);
                    if (ticket.owner_id) uniqueFans.add(ticket.owner_id);
                });

                setTotalRevenue(revenue);
                setTicketsSold(tickets.length);
                setLoyalFans(uniqueFans.size);

            } catch (err) {
                console.error("Failed to load event analytics", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadEventAnalytics();
    }, [id, ready, user, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 className="w-8 h-8 text-purple-400" />
                </motion.div>
                <p className="text-white/50 mt-4">Loading event analytics...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-20 px-4">
                <h2 className="heading text-2xl text-white mb-2">Event Not Found</h2>
                <p className="text-white/50 mb-6">This event does not exist or you don't have access to it.</p>
                <Link href="/dashboard" className="px-6 py-3 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors inline-block">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pb-20">
            {/* Header / Back */}
            <div className="mb-6 flex items-center justify-between">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            {/* Event Summary Card */}
            <GlassCardSimple className="p-6 mb-8 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-48 h-32 relative rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                        src={event.coverImage || '/placeholder-event.jpg'}
                        alt={event.title}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-grow">
                    <h1 className="heading text-2xl text-white mb-2">{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            {formatDate(event.date)}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            {event.location || event.venue || 'TBA'}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <Link href={`/event/${event.id}`} target="_blank" className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors inline-flex items-center gap-2">
                        View Public Page
                    </Link>
                </div>
            </GlassCardSimple>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link href="/dashboard/revenue" className="block transition-transform hover:scale-[1.02]">
                    <GlassCardSimple className="p-6 h-full border border-white/5 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Event Revenue</p>
                                <h3 className="text-2xl font-bold text-white mono">${totalRevenue.toFixed(2)}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            From {ticketsSold} sales
                        </p>
                    </GlassCardSimple>
                </Link>

                <Link href="/dashboard/fans" className="block transition-transform hover:scale-[1.02]">
                    <GlassCardSimple className="p-6 h-full border border-white/5 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Event Fans</p>
                                <h3 className="text-2xl font-bold text-white">{loyalFans}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-blue-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Unique buyers
                        </p>
                    </GlassCardSimple>
                </Link>

                <GlassCardSimple className="p-6 h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Ticket className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="w-full pr-4">
                            <p className="text-sm text-neutral-400">Capacity Sold</p>
                            <h3 className="text-2xl font-bold text-white mono">{ticketsSold} <span className="text-sm text-neutral-500">/ {event.total_tickets}</span></h3>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, (ticketsSold / Math.max(1, event.total_tickets || 1)) * 100)}%` }}
                        />
                    </div>
                </GlassCardSimple>
            </div>

            {/* Deep Analytics Coming Soon */}
            <GlassCardSimple className="p-12 text-center flex flex-col items-center justify-center">
                <Activity className="w-10 h-10 text-white/20 mb-4" />
                <h3 className="heading text-xl text-white mb-2">Deep Event Analytics Coming Soon</h3>
                <p className="text-white/50 max-w-lg mx-auto text-sm">
                    Soon you'll be able to see hour-by-hour sales velocity, scan-in rates at the door, geographic distribution of your buyers, and direct messaging channels for your attendees.
                </p>
            </GlassCardSimple>
        </div>
    );
}
