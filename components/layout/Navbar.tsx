'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Ticket, PlusCircle, Compass, Wallet, User, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

const navLinks = [
    { label: 'Discover', href: '/', icon: Compass },
    { label: 'Create', href: '/create', icon: PlusCircle, authRequired: true },
    { label: 'My Tickets', href: '/tickets', icon: Ticket },
];

export function Navbar() {
    const pathname = usePathname();
    const { authenticated, login, user } = usePrivy();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const visibleLinks = navLinks.filter(
        (link) => !link.authRequired || authenticated
    );

    // Prefer Solana wallet address for display
    const solanaWallet = user?.linkedAccounts?.find(
        (a: any) => a.type === 'wallet' && a.chainType === 'solana'
    ) as any;
    const walletAddress = solanaWallet?.address || user?.wallet?.address;
    const displayName = walletAddress
        ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
        : user?.email?.address
            ? user.email.address.split('@')[0]
            : 'Account';

    return (
        <nav className="top-navbar">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
                        <Ticket className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="heading text-lg text-white">
                        Tick<span className="text-purple-400">to</span>
                    </span>
                </Link>

                {/* Desktop Navigation - centered */}
                <div className="hidden md:flex items-center gap-0.5">
                    {visibleLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    'relative px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5',
                                    isActive
                                        ? 'text-white'
                                        : 'text-white/50 hover:text-white/80'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {link.label}
                                {isActive && (
                                    <motion.div
                                        className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-6 h-[2px] bg-purple-400 rounded-full"
                                        layoutId="desktopNavIndicator"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right side - Wallet/Profile */}
                <div className="hidden md:flex items-center gap-2">
                    {authenticated ? (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/wallet"
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all',
                                    pathname === '/wallet'
                                        ? 'text-white bg-white/8'
                                        : 'text-white/50 hover:text-white/80'
                                )}
                            >
                                <Wallet className="w-3.5 h-3.5" />
                                Wallet
                            </Link>
                            <Link
                                href="/profile"
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
                                    pathname === '/profile'
                                        ? 'border-purple-500/40 bg-purple-500/8 text-white'
                                        : 'border-white/8 text-white/60 hover:border-white/15 hover:text-white'
                                )}
                            >
                                <div className="w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center">
                                    <User className="w-3 h-3 text-white" />
                                </div>
                                <span className="mono text-xs">{displayName}</span>
                            </Link>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-[13px] font-medium hover:bg-purple-400 transition-all active:scale-95"
                        >
                            Sign In
                        </button>
                    )}
                </div>

                {/* Mobile menu button */}
                <button
                    className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
                    <div className="px-3 py-3 flex flex-col gap-0.5">
                        {visibleLinks.map((link) => {
                            const isActive = pathname === link.href;
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : 'text-white/50 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {link.label}
                                </Link>
                            );
                        })}

                        <div className="border-t border-white/5 mt-1 pt-1">
                            {authenticated ? (
                                <>
                                    <Link
                                        href="/wallet"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Wallet
                                    </Link>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        <User className="w-4 h-4" />
                                        Profile
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => { login(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium"
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
