'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyWrapperProps {
    children: ReactNode;
}

/**
 * PrivyWrapper - Full Privy authentication provider
 * Requires NEXT_PUBLIC_PRIVY_APP_ID in .env.local
 */
export function PrivyWrapper({ children }: PrivyWrapperProps) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

    // Fallback for missing app ID
    if (!appId) {
        console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Running without authentication.');
        return <>{children}</>;
    }

    return (
        <PrivyProvider
            appId={appId}
            config={{
                appearance: {
                    theme: 'dark',
                    accentColor: '#a855f7', // purple-500
                    showWalletLoginFirst: true,
                    logo: undefined, // Add your logo URL here
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },
                loginMethods: ['wallet', 'email', 'google'],
            }}
        >
            {children}
        </PrivyProvider>
    );
}

// ===== Privy Hook Wrapper =====
export { usePrivy as useAuth } from '@privy-io/react-auth';
