'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { ReactNode, useMemo } from 'react';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

interface PrivyClientProviderProps {
    children: ReactNode;
    appId: string;
}

// Use local proxy in the browser, fallback to public devnet for server-side or subscriptions
const SOLANA_DEVNET_RPC = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://api.devnet.solana.com';
// Derive WSS URL from public devnet because our proxy only supports HTTP
const SOLANA_DEVNET_WSS = 'wss://api.devnet.solana.com/';

// Create Solana wallet connectors (enables useWallets() to detect wallets)
const solanaConnectors = toSolanaWalletConnectors();

/**
 * PrivyClientProvider - Client-only Privy wrapper
 * This component only renders on the client to avoid SSR HTML validation errors
 */
export function PrivyClientProvider({ children, appId }: PrivyClientProviderProps) {
    // Create Solana RPC client objects once (Privy v3 needs { rpc, rpcSubscriptions } objects)
    const solanaRpcs = useMemo(() => ({
        'solana:devnet': {
            rpc: createSolanaRpc(SOLANA_DEVNET_RPC as Parameters<typeof createSolanaRpc>[0]),
            rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_DEVNET_WSS as Parameters<typeof createSolanaRpcSubscriptions>[0]),
        },
        // Privy's wallet UI needs mainnet to render — use the same Helius endpoint as a fallback
        'solana:mainnet': {
            rpc: createSolanaRpc(SOLANA_DEVNET_RPC as Parameters<typeof createSolanaRpc>[0]),
            rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_DEVNET_WSS as Parameters<typeof createSolanaRpcSubscriptions>[0]),
        },
    }), []);

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
                externalWallets: {
                    solana: {
                        connectors: solanaConnectors,
                    },
                },
                solana: {
                    rpcs: solanaRpcs as any,
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
}
