import Link from 'next/link';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { GlassCardSimple } from '@/components/ui/GlassCard';

export default function RevenueAnalytics() {
    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            <GlassCardSimple className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                    <DollarSign className="w-10 h-10 text-emerald-400" />
                </div>
                <h1 className="heading text-3xl text-white mb-4">Revenue Analytics</h1>
                <p className="text-white/60 max-w-md mx-auto">
                    Full revenue analytics coming soon. You'll be able to view detailed payout histories, ticket sales breakdowns by tier, and export your financials.
                </p>
            </GlassCardSimple>
        </div>
    );
}
