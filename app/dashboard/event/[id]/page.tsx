'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Users, Activity, Ticket, Loader2, Calendar, MapPin, QrCode, Link as LinkIcon, Copy, Trash2 } from 'lucide-react';
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

    // Scanner Links
    const [scannerTokens, setScannerTokens] = useState<any[]>([]);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const fetchScannerTokens = async () => {
        try {
            const res = await fetch(`/api/magic-link?event_id=${id}`);
            const data = await res.json();
            if (data.success) {
                setScannerTokens(data.tokens || []);
            }
        } catch (err) {
            console.error("Failed to fetch scanner tokens", err);
        }
    };

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
        fetchScannerTokens();
    }, [id, ready, user, router]);

    const generateScannerLink = async () => {
        if (isGeneratingLink) return;
        setIsGeneratingLink(true);
        try {
            const res = await fetch('/api/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: id })
            });
            const data = await res.json();
            if (data.success) {
                await fetchScannerTokens();
            }
        } catch (err) {
            console.error("Failed to generate token", err);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const revokeToken = async (token: string) => {
        if (!confirm("Are you sure you want to revoke this link? Anyone using it will immediately lose scanner access.")) return;
        try {
            await fetch('/api/magic-link', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            await fetchScannerTokens();
        } catch (err) {
            console.error("Failed to revoke token", err);
        }
    };

    const copyToClipboard = (token: string) => {
        const link = `${window.location.origin}/scan/${id}?token=${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

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

            {/* Scanner Link Management */}
            <div className="mb-8">
                <GlassCardSimple className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative">
                        <div>
                            <h2 className="heading text-xl text-white mb-2 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-purple-400" />
                                Door Management & Scanning
                            </h2>
                            <p className="text-sm text-neutral-400 max-w-xl">
                                Generate secure "Magic Links" for your staff. Staff open the link on their phone and can scan tickets immediately. No login required.
                            </p>
                        </div>
                        <button
                            onClick={generateScannerLink}
                            disabled={isGeneratingLink}
                            className="shrink-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95"
                        >
                            {isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                            Generate Scanner Link
                        </button>
                    </div>

                    {scannerTokens.length > 0 ? (
                        <div className="space-y-3">
                            {scannerTokens.map((tokenObj) => (
                                <div key={tokenObj.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-black/40">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                            <QrCode className="w-5 h-5 text-neutral-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-medium truncate">...{tokenObj.token.slice(-8)}</p>
                                            <p className="text-xs text-neutral-500 mt-0.5">Created {formatDate(tokenObj.created_at)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => copyToClipboard(tokenObj.token)}
                                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors flex items-center gap-2 border border-white/5"
                                        >
                                            {copiedToken === tokenObj.token ? (
                                                <span className="text-green-400 flex items-center gap-1">Copied!</span>
                                            ) : (
                                                <><Copy className="w-4 h-4" /> Copy Link</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => revokeToken(tokenObj.token)}
                                            className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors border border-red-500/10"
                                            title="Revoke access"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border border-white/5 border-dashed rounded-xl bg-white/5">
                            <p className="text-neutral-400 text-sm">No active scanner links.</p>
                        </div>
                    )}
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
