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
    { label: 'My Tickets', href: '/tickets', icon: Ticket, roles: ['fan', 'organizer'] },
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
                    <span className="heading text-xl text-white tracking-tight">
                        Tickto
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
                                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-2',
                                    isActive
                                        ? 'text-white'
                                        : 'text-white/40 hover:text-white/80'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {link.label}
                                {isActive && (
                                    <motion.div
                                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-white"
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
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                                    pathname === '/wallet'
                                        ? 'text-white bg-white/5'
                                        : 'text-white/40 hover:text-white/80'
                                )}
                            >
                                <Wallet className="w-4 h-4" />
                                Wallet
                            </Link>
                            <Link
                                href="/profile"
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150',
                                    pathname === '/profile'
                                        ? 'border-white bg-white/5 text-white'
                                        : 'border-white/5 text-white/60 hover:border-white/25 hover:text-white'
                                )}
                            >
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                    <User className="w-3 h-3 text-white/80" />
                                </div>
                                <span className="mono text-xs">{displayName}</span>
                            </Link>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="btn-primary py-1.5 px-4 text-sm font-medium"
                        >
                            Sign In
                        </button>
                    )}
                </div>

                {/* Mobile menu button */}
                <button
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <motion.div
                    className="md:hidden border-t border-white/5 bg-[#121212]"
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
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-white/5 text-white'
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
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <Wallet className="w-5 h-5" />
                                        Wallet
                                    </Link>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <User className="w-5 h-5" />
                                        Profile
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => { login(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-black text-sm font-medium"
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
