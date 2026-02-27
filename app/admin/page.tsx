'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AdminOverviewPage() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalEvents: 0,
        ticketsSold: 0,
        platformFeesUsd: '$0.00' // Placeholder for future integration
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardStats() {
            setLoading(true);
            try {
                // 1. Total Users
                const { count: usersCount, error: usersErr } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true });

                // 2. Total Events
                const { count: eventsCount, error: eventsErr } = await supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .neq('status', 'deleted');

                // 3. Tickets Sold
                const { count: ticketsCount, error: ticketsErr } = await supabase
                    .from('tickets')
                    .select('*', { count: 'exact', head: true });

                if (usersErr || eventsErr || ticketsErr) {
                    console.error("Dashboard calculation error", { usersErr, eventsErr, ticketsErr });
                }

                setStats({
                    totalUsers: usersCount || 0,
                    totalEvents: eventsCount || 0,
                    ticketsSold: ticketsCount || 0,
                    platformFeesUsd: '$0.00'
                });
            } catch (err) {
                console.error("Failed to fetch admin stats:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardStats();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    Dashboard Overview
                </h1>
                <p className="text-zinc-400">
                    Welcome back. Here is what is happening on your platform today.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        {/* Stat Card 1: Total Users */}
                        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-primary/30 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                                <div className="w-16 h-16 bg-blue-500 rounded-full" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Total Users</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-white">{stats.totalUsers.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Stat Card 2: Total Events */}
                        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-purple-500/30 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                                <div className="w-16 h-16 bg-purple-500 rounded-full" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Total Events</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-white">{stats.totalEvents.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Stat Card 3: Ticket Sales */}
                        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-pink-500/30 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                                <div className="w-16 h-16 bg-pink-500 rounded-full" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Tickets Issued</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-white">{stats.ticketsSold.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Stat Card 4: Platform Fees */}
                        <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-amber-500/30 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                                <div className="w-16 h-16 bg-amber-500 rounded-full" />
                            </div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">Platform Fees</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-white">{stats.platformFeesUsd}</p>
                            </div>
                        </div>

                    </div>

                    {/* Main Content Area: Charts & Activity */}
                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Chart Section */}
                        <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md min-h-[400px] flex flex-col justify-center items-center">
                            <p className="text-zinc-500 italic">Ticket Sales Chart Placeholder</p>
                            <p className="text-sm text-zinc-600 mt-2">(Recharts integration coming soon)</p>
                        </div>

                        {/* Activity Section */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                            <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
                            <div className="space-y-4 text-center">
                                <p className="text-sm text-zinc-500 mt-12 italic">Activity feed integration pending real-time listeners</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
