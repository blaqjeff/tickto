'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { ready, authenticated, user } = usePrivy();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        async function checkAdminStatus() {
            // Wait for Privy to finish initializing
            if (!ready) return;

            // If not authenticated, redirect to home
            if (!authenticated || !user) {
                router.push('/');
                return;
            }

            try {
                // Query Supabase to check if the user is an admin
                // Use maybeSingle() so missing rows don't throw an error status
                const { data, error } = await supabase
                    .from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching admin status:', error);
                    setIsAdmin(false);
                } else if (data && data.is_admin) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error('Unexpected error checking admin status:', err);
                setIsAdmin(false);
            } finally {
                setIsChecking(false);
            }
        }

        checkAdminStatus();
    }, [ready, authenticated, user, router]);

    // Show loading state while Privy or Supabase is resolving
    if (!ready || isChecking) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    // If fully loaded and not an admin, show 404 to obscure the route
    if (isAdmin === false) {
        return notFound();
    }

    // If loaded and is an admin, render the protected children
    return <>{children}</>;
}
