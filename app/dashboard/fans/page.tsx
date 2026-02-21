import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { GlassCardSimple } from '@/components/ui/GlassCard';

export default function FanAnalytics() {
    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            <GlassCardSimple className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-blue-400" />
                </div>
                <h1 className="heading text-3xl text-white mb-4">Loyal Fans</h1>
                <p className="text-white/60 max-w-md mx-auto">
                    Full loyal fans analytics coming soon. You'll be able to see who your top supporters are, segment your audience, and reward them with airdrops.
                </p>
            </GlassCardSimple>
        </div>
    );
}
