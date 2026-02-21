import { NextResponse } from 'next/server';
import { getSolPrice } from '@/lib/jupiter';

// Revalidate this endpoint every 30 seconds since we cache the price
export const revalidate = 30;

export async function GET() {
    try {
        // Because this runs on the server, `getSolPrice` will use `fetchPriceFromServerContext`
        // which securely accesses `process.env.JUPITER_API_KEY`.
        const price = await getSolPrice();
        return NextResponse.json({ price });
    } catch (err: any) {
        console.error("Price Proxy API Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
