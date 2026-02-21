'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';

export default function RootRedirect() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();

    useEffect(() => {
        if (!ready) return;

        // If the user is authenticated, OnboardingProvider handles the redirect 
        // to either /dashboard or /discover depending on their role.
        // We only need to catch unauthenticated users and push them to /discover manually.
        if (!authenticated) {
            router.replace('/discover');
        }
    }, [ready, authenticated, router]);

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
    );
}
