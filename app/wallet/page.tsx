'use client';

import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';

// Mock wallet data
const mockBalance = {
    usdc: 4250.0,
    usd: 4250.0,
};

const mockTransactions = [
    {
        id: 'tx-001',
        type: 'purchase' as const,
        title: 'Neon Dreams Festival',
        amount: -200,
        date: '2025-12-28',
        status: 'completed' as const,
    },
    {
        id: 'tx-002',
        type: 'purchase' as const,
        title: 'Digital Art Exhibition',
        amount: -150,
        date: '2025-12-30',
        status: 'completed' as const,
    },
    {
        id: 'tx-003',
        type: 'deposit' as const,
        title: 'USDC Deposit',
        amount: 5000,
        date: '2025-12-20',
        status: 'completed' as const,
    },
    {
        id: 'tx-004',
        type: 'refund' as const,
        title: 'Concert Refund',
        amount: 75,
        date: '2025-12-15',
        status: 'completed' as const,
    },
];

function TransactionItem({
    transaction,
}: {
    transaction: (typeof mockTransactions)[0];
}) {
    const isPositive = transaction.amount > 0;

    return (
        <motion.div
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 4 }}
        >
            {/* Icon */}
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-500/20' : 'bg-purple-500/20'
                    }`}
            >
                {isPositive ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                ) : (
                    <ArrowUpRight className="w-5 h-5 text-purple-400" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-medium line-clamp-1">
                    {transaction.title}
                </h4>
                <p className="text-white/40 text-xs">
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </p>
            </div>

            {/* Amount */}
            <span
                className={`mono text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-white'
                    }`}
            >
                {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
            </span>
        </motion.div>
    );
}

export default function WalletPage() {
    return (
        <div className="px-4 py-6 max-w-lg mx-auto">
            {/* Header */}
            <motion.header
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="heading text-3xl text-white mb-1">Wallet</h1>
                <p className="text-white/50">Your crypto balance</p>
            </motion.header>

            {/* Balance Card */}
            <motion.div
                className="glass-card p-6 mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-white/50 text-sm">Available Balance</p>
                            <h2 className="mono text-3xl text-white font-bold">
                                ${mockBalance.usdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* USDC Badge */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        $
                    </div>
                    <div className="flex-1">
                        <p className="text-white text-sm font-medium">USDC</p>
                        <p className="text-white/40 text-xs">USD Coin</p>
                    </div>
                    <span className="mono text-white font-medium">
                        {mockBalance.usdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Action Button */}
                <button className="w-full mt-4 py-4 rounded-2xl bg-purple-500 hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 text-white font-medium">
                    <Plus className="w-5 h-5" />
                    Add Funds
                </button>
            </motion.div>

            {/* Recent Transactions */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="heading text-lg text-white mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                    {mockTransactions.map((tx, index) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                        >
                            <TransactionItem transaction={tx} />
                        </motion.div>
                    ))}
                </div>
            </motion.section>
        </div>
    );
}
