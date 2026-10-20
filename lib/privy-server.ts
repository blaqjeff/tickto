import { PrivyClient } from '@privy-io/node';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
        throw new Error('Missing NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET');
    }
    if (!privyClient) {
        privyClient = new PrivyClient({ appId, appSecret });
    }
    return privyClient;
}

/**
 * Verifies the Privy Bearer access token on the request.
 * Returns the authenticated Privy user id, or null if missing/invalid.
 */
export async function verifyPrivyUserId(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();
    if (!accessToken) {
        return null;
    }

    try {
        const claims = await getPrivyClient().utils().auth().verifyAccessToken(accessToken);
        return claims.user_id ?? null;
    } catch {
        return null;
    }
}
