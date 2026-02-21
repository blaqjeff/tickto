'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const { ready, authenticated, user } = usePrivy();
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Only run when Privy is ready
        if (!ready) return;

        // If not authenticated, we don't block anything. 
        // Public pages (landing, login) are accessible.
        if (!authenticated || !user) {
            setIsChecking(false);
            return;
        }

        const checkOnboardingStatus = async () => {
            try {
                // Fetch user from our Supabase table
                const { data, error } = await supabase
                    .from('users')
                    .select('onboarded, primary_role')
                    .eq('id', user.id)
                    .single();

                const isOnboarded = data?.onboarded === true;
                const role = data?.primary_role;

                // 1. If not onboarded and trying to access a protected app route
                if (!isOnboarded && pathname !== '/onboarding') {
                    // Redirect to onboarding
                    router.replace('/onboarding');
                    return;
                }

                // 2. If onboarded but visiting /onboarding or the root landing page while logged in
                if (isOnboarded) {
                    if (pathname === '/onboarding' || pathname === '/') {
                        // Route them to their proper home
                        if (role === 'fan') {
                            router.replace('/discover');
                        } else if (role === 'organizer') {
                            router.replace('/dashboard');
                        } else {
                            // Fallback if role somehow isn't set but onboarded is true
                            router.replace('/discover');
                        }
                        return;
                    }
                }

                // Normal access granted
                setIsChecking(false);

            } catch (err) {
                console.error("Error checking onboarding status:", err);
                setIsChecking(false); // Failsafe: let them through if DB is down rather than infinite load
            }
        };

        checkOnboardingStatus();
    }, [ready, authenticated, user, pathname, router]);

    // Show a blank loading screen or spinner while checking heavily protected routes
    // But don't block render if we're just on the landing page logged out
    if (isChecking && authenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
