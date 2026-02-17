'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyClientProviderProps {
    children: ReactNode;
    appId: string;
}

/**
 * PrivyClientProvider - Client-only Privy wrapper
 * This component only renders on the client to avoid SSR HTML validation errors
 */
export function PrivyClientProvider({ children, appId }: PrivyClientProviderProps) {
    return (
        <PrivyProvider
            appId={appId}
            config={{
                appearance: {
                    theme: 'dark',
                    accentColor: '#a855f7',
                    showWalletLoginFirst: true,
                    logo: undefined,
                    walletChainType: 'solana-only',
                },
                embeddedWallets: {
                    solana: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                loginMethods: ['wallet', 'email', 'google'],
                solana: {
                    rpcs: {
                        devnet: 'https://api.devnet.solana.com',
                    },
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
}
