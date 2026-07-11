import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Solana RPC Proxy
 * 
 * Forwards JSON-RPC requests to the configured Solana RPC endpoint (e.g. Helius)
 * so the API key is never exposed to the browser. Client-side code should
 * create a Connection pointing to `/api/rpc` instead of the raw RPC URL.
 */

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const rpcResponse = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await rpcResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('RPC proxy error:', error);
        return NextResponse.json(
            { jsonrpc: '2.0', error: { code: -32603, message: 'Internal RPC proxy error' } },
            { status: 500 }
        );
    }
}
