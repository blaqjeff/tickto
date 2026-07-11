import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default function FanAnalytics() {
    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/55 hover:text-white transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white/40">
                    <Users className="w-8 h-8" />
                </div>
                <h1 className="heading text-3xl text-white mb-4">Loyal Fans</h1>
                <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed">
                    Full loyal fans analytics coming soon. You'll be able to see who your top supporters are, segment your audience, and reward them with airdrops.
                </p>
            </div>
        </div>
    );
}
