'use client';

import { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch all users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // Fetch all tickets to aggregate counts manually
            const { data: ticketsData, error: ticketsError } = await supabase
                .from('tickets')
                .select('owner_id');

            if (ticketsError) throw ticketsError;

            // Create ticket count map
            const ticketCounts: Record<string, number> = {};
            ticketsData?.forEach(ticket => {
                if (ticket.owner_id) {
                    ticketCounts[ticket.owner_id] = (ticketCounts[ticket.owner_id] || 0) + 1;
                }
            });

            const formatted = usersData?.map(u => ({
                id: u.id,
                address: u.id, // Privy DID or wallet address
                name: u.username || 'Anon User',
                ticketCount: ticketCounts[u.id] || 0,
                isBanned: u.is_banned || false,
                joinedAt: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'
            })) || [];

            setUsers(formatted);
        } catch (err) {
            console.error("Error fetching admin users data:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_banned: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === userId ? { ...u, isBanned: !currentStatus } : u
            ));
        } catch (err) {
            console.error("Error toggling ban status:", err);
            alert("Failed to update user status.");
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        Users Management
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        View and manage all users on the Tickto platform.
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
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-white/5">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Tickets Owned
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Joined
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-transparent">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-gradient-to-tr from-primary/80 to-purple-500/80 text-white'}`}>
                                                    {user.isBanned ? <ShieldAlert className="w-4 h-4" /> : user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{user.name}</div>
                                                    <div className="text-zinc-500 text-xs font-mono">{user.address.slice(0, 10)}...{user.address.slice(-4)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-300">
                                            <span className="inline-flex items-center justify-center bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                                                {user.ticketCount}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
                                            {user.joinedAt}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            {user.isBanned ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                                                    <Ban className="w-3 h-3" /> Banned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                            <button
                                                onClick={() => toggleBanStatus(user.id, user.isBanned)}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${user.isBanned
                                                    ? 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/10'
                                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                                    }`}
                                            >
                                                {user.isBanned ? 'Unban User' : 'Ban User'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {!loading && filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-zinc-500 text-sm">No users found matching your search.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
