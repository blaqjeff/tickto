'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownLeft, Copy, Check, ExternalLink, Loader2, Plus } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/lib/supabaseClient';

interface Transaction {
    id: string;
    type: 'purchase';
    title: string;
    amount: number;
    date: string;
    status: 'completed';
    hash?: string;
}

const SOL_PRICE_USD = 145; // Mock price for devnet

function TransactionItem({ transaction }: { transaction: Transaction }) {
    return (
        <motion.div
            className="flex items-center gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/6 transition-colors"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
        >
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/12">
                <ArrowDownLeft className="w-4 h-4 text-purple-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-white text-[13px] font-medium line-clamp-1">
                    {transaction.title}
                </h4>
                <p className="text-white/30 text-[11px]">
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </p>
            </div>

            {/* Amount */}
            <span className="mono text-[13px] font-semibold text-white/80">
                -{Math.abs(transaction.amount).toFixed(3)} SOL
            </span>
        </motion.div>
    );
}

export default function WalletPage() {
    const { ready, authenticated, user, createWallet } = usePrivy();
    const { wallets } = useWallets();
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(false);

    // Source of Truth: Deep search for SOLANA wallet address
    // 1. Wallets array (Browser Extension / Active) - Filter for Solana
    // 2. User User object (Primary Wallet) - Check chain type if available
    // 3. Linked Accounts (Embedded Wallet for Email Users) - Filter for Solana

    // Helper to check if a wallet is Solana
    const isSolana = (w: any) => w.chainType === 'solana' || w.address?.length > 40; // Base58 addresses are usually longer than EVM's 42 chars

    const solanaWallet = wallets.find(w => (w as any).chainType === 'solana');
    const solanaAccount = user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana');

    const address =
        solanaWallet?.address ||
        ((user?.wallet as any)?.chainType === 'solana' ? user?.wallet?.address : undefined) ||
        (solanaAccount as any)?.address;
    // Fallback for mock/dev if needed, but strict is better

    console.log("🔍 Debug - Found Solana Address:", address);
    console.log("👤 Debug - User Object:", user);

    useEffect(() => {
        // Wait for Privy to initialize
        if (!ready) return;

        // If authenticated but no user/wallet data yet, keep loading or decide to stop
        // For email users, user.wallet.address should be available if authenticated
        // Use a flag to avoid running multiple times? useEffect dependencies handle that.

        async function loadWalletData() {
            setLoading(true);

            try {
                // 1. GET ADDRESS
                // If not authenticated, we stop loading
                if (!authenticated) {
                    setLoading(false);
                    return;
                }

                // If authenticated but no address found yet (rare if everything aligns)
                if (!address) {
                    console.log("Wallet: Authenticated but no address found.");
                    setLoading(false);
                    return;
                }

                // 2. FETCH BALANCE (Directly from Solana Devnet)
                // This works for Privy embedded wallets too
                const connection = new Connection("https://api.devnet.solana.com");
                const pubKey = new PublicKey(address);
                const bal = await connection.getBalance(pubKey);
                setBalance(bal / LAMPORTS_PER_SOL);

                // 3. FETCH HISTORY (Supabase)
                if (user?.id) {
                    const { data, error } = await supabase
                        .from('tickets')
                        .select(`
                            *,
                            events ( title, price_usdc, price_sol )
                        `)
                        .eq('owner_id', user.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        const history: Transaction[] = data.map((ticket: any) => ({
                            id: ticket.id,
                            type: 'purchase',
                            title: `Ticket: ${ticket.events?.title || 'Event'}`,
                            amount: ticket.price_paid || ticket.events?.price_sol || 0,
                            date: ticket.created_at || ticket.minted_at,
                            status: 'completed',
                        }));
                        setTransactions(history);
                    }
                }
            } catch (error) {
                console.error("Error loading wallet data:", error);
            } finally {
                // STOP THE SPINNER NO MATTER WHAT
                setLoading(false);
            }
        }

        loadWalletData();
        // Removed 'wallets' from dependency to prevent infinite loops if wallets array changes reference often
        // 'address' is derived from user/wallets and is stable enough primitive or changes when actual address changes
    }, [ready, authenticated, user?.id, address]);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopying(true);
            setTimeout(() => setCopying(false), 2000);
        }
    };

    const handleAddFunds = () => {
        alert("Funding Flow: Integrate Stripe Ramp or Coinbase Pay here.");
    };

    if (!ready || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-white/50 mt-4 text-sm">Loading wallet data...</p>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
                <Wallet className="w-12 h-12 text-purple-400 mb-4" />
                <h2 className="text-xl text-white font-bold mb-2">Wallet Locked</h2>
                <p className="text-white/50 mb-6">Please sign in to view your wallet.</p>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-6">
                    <Wallet className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl text-white font-bold mb-2">Wallet Locked</h2>
                <p className="text-white/50 mb-6">Please sign in to view your wallet.</p>
            </div>
        );
    }

    // Handle authenticated but no address case (Manual Creation)
    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-6">
                    <Wallet className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-2xl text-white font-bold mb-3">Setup Your Wallet</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                    To hold tickets and funds, you need a secure wallet. It only takes one click.
                </p>
                <button
                    onClick={createWallet}
                    className="w-full py-4 rounded-xl bg-purple-500 hover:bg-purple-600 transition-all font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-95"
                >
                    Create Secure Wallet
                </button>
            </div>
        );
    }

    // Calculate USD Balance
    const usdBalance = balance * SOL_PRICE_USD;

    return (
        <div className="px-4 py-6 max-w-lg mx-auto mb-20">
            {/* Header */}
            <motion.header
                className="mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-2xl text-white mb-1">Wallet</h1>
                <p className="text-white/40 text-sm">Your crypto balance & history</p>
            </motion.header>

            {/* Balance Card */}
            <motion.div
                className="glass-card p-5 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-white/40 text-xs">Total Balance (USD)</p>
                        <h2 className="mono text-2xl text-white font-bold">
                            ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-white/25 text-[11px] mt-0.5">
                            {balance.toLocaleString('en-US', { minimumFractionDigits: 4 })} SOL
                        </p>
                    </div>
                </div>

                {/* Address Card */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/4 border border-white/6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-purple-500" />
                        <div>
                            <p className="text-[11px] text-white/30">Your Address</p>
                            <p className="mono text-[13px] text-white font-medium">
                                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={copyAddress}
                        className="p-1.5 rounded-md hover:bg-white/8 transition-colors text-white/40 hover:text-white"
                        title="Copy Address"
                    >
                        {copying ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Add Funds Button */}
                <button
                    onClick={handleAddFunds}
                    className="w-full mt-3 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 text-white text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Funds
                </button>

                <div className="mt-2 flex gap-2">
                    <a
                        href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-lg bg-white/4 hover:bg-white/8 transition-colors flex items-center justify-center gap-2 text-white/60 text-[13px] font-medium"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Explorer
                    </a>
                </div>
            </motion.div>

            {/* Recent Transactions */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="heading text-base text-white mb-3">Transaction History</h3>
                <div className="flex flex-col gap-2">
                    {transactions.length > 0 ? (
                        transactions.map((tx, index) => (
                            <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <TransactionItem transaction={tx} />
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-white/30 text-sm">
                            <p>No transactions yet.</p>
                        </div>
                    )}
                </div>
            </motion.section>
        </div>
    );
}
