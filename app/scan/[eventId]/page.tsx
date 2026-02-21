'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [scanResult, setScanResult] = useState<{
        status: 'success' | 'error' | 'already_scanned';
        message: string;
        ticketDetails?: any;
    } | null>(null);

    const [isPending, setIsPending] = useState(false);
    const isProcessingRef = useRef(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (!token) return;

        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );
        scannerRef.current = scanner;

        scanner.render(onScanSuccess, onScanFailure);

        async function onScanSuccess(decodedText: string) {
            if (isProcessingRef.current) return; // Prevent double scans

            isProcessingRef.current = true;
            setIsPending(true);

            try {
                if (scanner.getState && scanner.getState() === 2) {
                    scanner.pause(true); // Pause scanning while verifying
                }
                const res = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token,
                        qr_code: decodedText
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    setScanResult({
                        status: 'success',
                        message: 'TICKET VALID',
                        ticketDetails: data.ticket
                    });
                } else if (res.status === 409) {
                    setScanResult({
                        status: 'already_scanned',
                        message: 'ALREADY SCANNED',
                        ticketDetails: data.ticket
                    });
                } else {
                    setScanResult({
                        status: 'error',
                        message: data.error || 'INVALID TICKET'
                    });
                }
            } catch (err) {
                setScanResult({
                    status: 'error',
                    message: 'Network Error: Could not verify ticket'
                });
            } finally {
                setIsPending(false);
                // We keep isProcessingRef.current = true until they explicitly click "Scan Next Ticket"
                // which prevents background scans while reading the result screen.
            }
        }

        function onScanFailure(error: any) {
            // handle scan failure, usually better to ignore and keep scanning
        }

        return () => {
            scanner.clear().catch(console.error);
        };
    }, [token, eventId]);

    const resetScanner = () => {
        setScanResult(null);
        isProcessingRef.current = false;

        // Resume the camera if we paused it
        if (scannerRef.current && scannerRef.current.getState && scannerRef.current.getState() === 3) {
            try {
                scannerRef.current.resume();
            } catch (e) {
                console.warn('Failed to resume scanner gracefully:', e);
            }
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="glass-card p-8 text-center border-red-500/50">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-white/60">Missing or invalid scanner token.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <h1 className="font-medium text-white text-center">Ticket Scanner</h1>
                <p className="text-xs text-white/50 text-center font-mono mt-1">Event: {eventId}</p>
            </header>

            {/* Scanner Viewport */}
            <main className="flex-1 flex flex-col relative">
                {/* Always render the reader so html5-qrcode doesn't crash from missing DOM elements */}
                <div className={`flex-1 flex flex-col items-center justify-center p-4 ${scanResult ? 'hidden' : ''}`}>
                    <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden glass-card border-none" />
                    <p className="text-white/50 text-sm mt-6 animate-pulse">
                        Point camera at ticket QR code
                    </p>
                </div>

                {/* Loading indicator overlay */}
                {isPending && (
                    <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        <h3 className="text-xl font-bold text-white tracking-widest uppercase animate-pulse">Verifying</h3>
                        <p className="text-white/60 text-sm mt-2">Checking ticket authenticity...</p>
                    </div>
                )}

                {scanResult && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200"
                        style={{
                            backgroundColor: scanResult.status === 'success' ? '#0f3d0f' : '#3d0f0f' // Dark green or dark red
                        }}>

                        {scanResult.status === 'success' && (
                            <CheckCircle2 className="w-32 h-32 text-green-500 mb-6" />
                        )}
                        {scanResult.status === 'already_scanned' && (
                            <AlertTriangle className="w-32 h-32 text-yellow-500 mb-6" />
                        )}
                        {scanResult.status === 'error' && (
                            <XCircle className="w-32 h-32 text-red-500 mb-6" />
                        )}

                        <h2 className="text-4xl font-extrabold text-white text-center mb-2 tracking-tight">
                            {scanResult.message}
                        </h2>

                        {scanResult.ticketDetails && (
                            <div className="bg-black/40 rounded-xl p-4 mt-6 w-full max-w-sm backdrop-blur-sm border border-white/10 text-center">
                                <p className="text-white/60 text-sm uppercase tracking-wider mb-1">Tier</p>
                                <p className="text-xl font-bold text-white mb-4">{scanResult.ticketDetails.tier_name}</p>

                                <p className="text-white/60 text-sm uppercase tracking-wider mb-1">Status</p>
                                <p className="text-lg font-mono text-white mb-2">{scanResult.ticketDetails.status}</p>
                            </div>
                        )}

                        <button
                            onClick={resetScanner}
                            className="mt-12 w-full max-w-xs bg-white text-black font-semibold py-4 rounded-full text-lg hover:bg-white/90 active:scale-95 transition-all"
                        >
                            Scan Next Ticket
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
