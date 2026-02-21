'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Ticket, PlusCircle, Compass, Wallet, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { Activity } from 'lucide-react';

const allNavLinks = [
    { label: 'Discover', href: '/discover', icon: Compass, roles: ['fan', 'organizer', 'public'] },
    { label: 'Dashboard', href: '/dashboard', icon: Activity, roles: ['organizer'] },
    { label: 'Create', href: '/create', icon: PlusCircle, roles: ['organizer'] },
    { label: 'My Tickets', href: '/tickets', icon: Ticket, roles: ['fan'] },
];

export function Navbar() {
    const pathname = usePathname();
    const { authenticated, login, user } = usePrivy();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        if (!authenticated || !user) {
            setRole(null);
            setUsername(null);
            return;
        }
        const fetchRole = async () => {
            try {
                const { data } = await supabase
                    .from('users')
                    .select('primary_role, username')
                    .eq('id', user.id)
                    .single();
                if (data) {
                    setRole(data.primary_role);
                    if (data.username) setUsername(data.username);
                }
            } catch (err) {
                console.error("Failed to fetch user data for navbar", err);
            }
        };
        fetchRole();
    }, [authenticated, user]);

    // Determine which links to show based on Auth status and Role
    const visibleLinks = allNavLinks.filter((link) => {
        if (!authenticated) {
            // Unauthenticated users only see public links
            return link.roles.includes('public');
        }

        // If authenticated but role hasn't loaded yet, show nothing or just public
        if (!role) {
            return link.roles.includes('public');
        }

        // Return links matching their specific role
        return link.roles.includes(role);
    });

    // Prefer Solana wallet address for display
    const solanaWallet = user?.linkedAccounts?.find(
        (a: any) => a.type === 'wallet' && a.chainType === 'solana'
    ) as any;
    const walletAddress = solanaWallet?.address || user?.wallet?.address;

    const displayName = username
        ? `@${username}`
        : walletAddress
            ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
            : user?.email?.address
                ? user.email.address.split('@')[0]
                : 'Account';

    return (
        <nav className="top-navbar">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-white" />
                    </div>
                    <span className="heading text-xl text-white">
                        Tick<span className="text-purple-400">to</span>
                    </span>
                </Link>

                {/* Desktop Navigation - centered */}
                <div className="hidden md:flex items-center gap-1">
                    {visibleLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    'relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2',
                                    isActive
                                        ? 'text-white bg-white/10'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {link.label}
                                {isActive && (
                                    <motion.div
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full"
                                        layoutId="desktopNavIndicator"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right side - Wallet/Profile */}
                <div className="hidden md:flex items-center gap-3">
                    {authenticated ? (
                        <div className="flex items-center gap-3">
                            <Link
                                href="/wallet"
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                                    pathname === '/wallet'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                )}
                            >
                                <Wallet className="w-4 h-4" />
                                Wallet
                            </Link>
                            <Link
                                href="/profile"
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-full border transition-all',
                                    pathname === '/profile'
                                        ? 'border-purple-500 bg-purple-500/10 text-white'
                                        : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                                )}
                            >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                    <User className="w-3 h-3 text-white" />
                                </div>
                                <span className="mono text-xs">{displayName}</span>
                            </Link>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105 active:scale-95"
                        >
                            Sign In
                        </button>
                    )}
                </div>

                {/* Mobile menu button */}
                <button
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <motion.div
                    className="md:hidden border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                >
                    <div className="px-4 py-4 space-y-1">
                        {visibleLinks.map((link) => {
                            const isActive = pathname === link.href;
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            );
                        })}

                        <div className="border-t border-white/5 mt-2 pt-2">
                            {authenticated ? (
                                <>
                                    <Link
                                        href="/wallet"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <Wallet className="w-5 h-5" />
                                        Wallet
                                    </Link>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <User className="w-5 h-5" />
                                        Profile
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => { login(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </nav>
    );
}
