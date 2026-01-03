'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Bell,
    Shield,
    Ticket,
    LogOut,
    ChevronRight,
    Copy,
    Check,
    Loader2
} from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getUserTickets } from '@/lib/api';

function ToggleSwitch({
    enabled,
    onToggle
}: {
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-purple-500' : 'bg-white/10'
                }`}
        >
            <motion.div
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
                animate={{ left: enabled ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

function SettingsItem({
    icon: Icon,
    label,
    value,
    onClick,
    toggle,
    danger,
}: {
    icon: React.ElementType;
    label: string;
    value?: string;
    onClick?: () => void;
    toggle?: { enabled: boolean; onToggle: () => void };
    danger?: boolean;
}) {
    const handleClick = () => {
        if (!toggle && onClick) {
            onClick();
        }
    };

    return (
        <div
            onClick={handleClick}
            role={toggle ? undefined : "button"}
            tabIndex={toggle ? undefined : 0}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${danger
                ? 'bg-red-500/10 hover:bg-red-500/20'
                : 'bg-white/5 hover:bg-white/10'
                }`}
        >
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-purple-500/20'
                    }`}
            >
                <Icon className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-purple-400'}`} />
            </div>
            <div className="flex-1 text-left">
                <span className={`block text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>
                    {label}
                </span>
                {value && <span className="block text-xs text-white/40">{value}</span>}
            </div>
            {toggle ? (
                <ToggleSwitch enabled={toggle.enabled} onToggle={toggle.onToggle} />
            ) : (
                <ChevronRight className="w-5 h-5 text-white/30" />
            )}
        </div>
    );
}

export default function ProfilePage() {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { wallets } = useWallets();
    const [ticketCount, setTicketCount] = useState(0);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [copied, setCopied] = useState(false);

    // Fetch real ticket count from Supabase
    useEffect(() => {
        async function loadTicketCount() {
            if (!authenticated || !user) {
                setTicketCount(0);
                setLoadingTickets(false);
                return;
            }

            setLoadingTickets(true);
            const tickets = await getUserTickets(user.id);
            setTicketCount(tickets.length);
            setLoadingTickets(false);
        }

        if (ready) {
            loadTicketCount();
        }
    }, [ready, authenticated, user]);

    // Get Solana address with robust filtering (sync with Wallet page)
    const solanaWallet = wallets.find(w => (w as any).chainType === 'solana');
    const solanaAccount = user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && (a as any).chainType === 'solana');

    const address = solanaWallet?.address ||
        ((user?.wallet as any)?.chainType === 'solana' ? user?.wallet?.address : undefined) ||
        (solanaAccount as any)?.address;

    const walletAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : 'No Wallet Connected';

    const displayName = user?.email?.address || address?.slice(0, 8) || 'Demo User';

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Show login prompt if not authenticated
    if (ready && !authenticated) {
        return (
            <div className="px-4 py-6 max-w-lg mx-auto min-h-screen flex flex-col">
                <motion.header
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="heading text-3xl text-white mb-1">Profile</h1>
                    <p className="text-white/50">Sign in to manage your account</p>
                </motion.header>

                <motion.div
                    className="glass-card p-12 text-center flex-1 flex flex-col items-center justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="heading text-xl text-white mb-2">Welcome to Tickto</h3>
                    <p className="text-white/50 text-sm mb-8">
                        Connect your wallet or sign in with email to get started.
                    </p>
                    <button
                        onClick={login}
                        className="px-8 py-4 rounded-full bg-purple-500 hover:bg-purple-600 transition-colors text-white font-medium"
                    >
                        Sign In
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            {/* Header */}
            <motion.header
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-3xl text-white mb-1">Profile</h1>
                <p className="text-white/50">Manage your account</p>
            </motion.header>

            {/* Profile Card */}
            <motion.div
                className="glass-card p-6 mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Avatar & Name */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="heading text-xl text-white">{displayName}</h2>
                        <button
                            onClick={handleCopyAddress}
                            className="flex items-center gap-2 text-white/50 text-sm hover:text-white/70 transition-colors"
                        >
                            <span className="mono">{walletAddress}</span>
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 text-center">
                        {loadingTickets ? (
                            <Loader2 className="w-6 h-6 text-purple-400 mx-auto animate-spin" />
                        ) : (
                            <p className="mono text-2xl text-purple-400 font-bold">{ticketCount}</p>
                        )}
                        <p className="text-xs text-white/50">Tickets Owned</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 text-center">
                        <p className="mono text-2xl text-emerald-400 font-bold">0</p>
                        <p className="text-xs text-white/50">Events Attended</p>
                    </div>
                </div>
            </motion.div>

            {/* Settings */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="heading text-lg text-white mb-4">Settings</h3>
                <div className="space-y-3">
                    <SettingsItem
                        icon={Bell}
                        label="Notifications"
                        value="Event reminders & updates"
                        toggle={{
                            enabled: notifications,
                            onToggle: () => setNotifications(!notifications)
                        }}
                    />
                    <SettingsItem
                        icon={Ticket}
                        label="My Tickets"
                        value={`${ticketCount} tickets in wallet`}
                        onClick={() => window.location.href = '/tickets'}
                    />
                    <SettingsItem
                        icon={Shield}
                        label="Security"
                        value="Wallet settings"
                        onClick={() => alert('Security settings coming soon!')}
                    />
                    <SettingsItem
                        icon={User}
                        label="Account"
                        value="Profile information"
                        onClick={() => alert('Account settings coming soon!')}
                    />
                </div>
            </motion.section>

            {/* Logout */}
            <motion.div
                className="mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <SettingsItem
                    icon={LogOut}
                    label="Sign Out"
                    onClick={logout}
                    danger
                />
            </motion.div>

            {/* Version */}
            <motion.p
                className="text-center text-white/20 text-xs mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                Tickto v1.0.0 • Built with Next.js 15
            </motion.p>
        </div>
    );
}
