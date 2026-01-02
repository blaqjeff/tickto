'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

// Dynamically import PrivyProvider with SSR disabled to prevent HTML validation errors
const PrivyClientProvider = dynamic(
    () => import('./PrivyClientProvider').then((mod) => mod.PrivyClientProvider),
    { ssr: false }
);

interface PrivyWrapperProps {
    children: ReactNode;
}

/**
 * PrivyWrapper - Wrapper that loads Privy only on client-side
 * This prevents Privy's styled-components from causing HTML nesting errors during SSR
 */
export function PrivyWrapper({ children }: PrivyWrapperProps) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

    // Fallback for missing app ID - just render children
    if (!appId) {
        return <>{children}</>;
    }

    return (
        <PrivyClientProvider appId={appId}>
            {children}
        </PrivyClientProvider>
    );
}

// Re-export Privy hook for use in components
export { usePrivy as useAuth } from '@privy-io/react-auth';
