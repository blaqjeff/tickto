'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Search, Ticket, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { id: 'home', label: 'Home', href: '/', icon: Home },
    { id: 'search', label: 'Search', href: '/search', icon: Search },
    { id: 'tickets', label: 'My Tickets', href: '/tickets', icon: Ticket, isCenter: true },
    { id: 'wallet', label: 'Wallet', href: '/wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', href: '/profile', icon: User },
];

/**
 * BottomNav - Mobile-first fixed bottom navigation with floating FAB
 */
export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            <div className="flex items-center justify-around h-20 px-4 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.isCenter) {
                        // Floating FAB for "My Tickets"
                        return (
                            <Link key={item.id} href={item.href} className="relative -mt-10">
                                <motion.div
                                    className={cn(
                                        'fab-button w-16 h-16 rounded-full',
                                        'flex items-center justify-center',
                                        isActive && 'animate-pulse-glow'
                                    )}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.95, y: 0 }}
                                >
                                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                                </motion.div>
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/70 whitespace-nowrap">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex flex-col items-center gap-1 py-2 px-3"
                        >
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.1 : 1,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                                <Icon
                                    className={cn(
                                        'w-6 h-6 transition-colors',
                                        isActive ? 'text-purple-400' : 'text-white/50'
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </motion.div>
                            <span
                                className={cn(
                                    'text-xs transition-colors',
                                    isActive ? 'text-purple-400' : 'text-white/40'
                                )}
                            >
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    className="absolute bottom-0 w-4 h-1 bg-purple-400 rounded-full"
                                    layoutId="navIndicator"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
