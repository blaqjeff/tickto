'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionState } from '@/lib/types';

interface SwipeButtonProps {
    onComplete: () => Promise<void>;
    label?: string;
    className?: string;
}

/**
 * SwipeButton - iOS slide-to-unlock style payment button
 * States: idle → processing → minting → success
 */
export function SwipeButton({
    onComplete,
    label = 'Swipe to Pay',
    className,
}: SwipeButtonProps) {
    const [state, setState] = useState<TransactionState>('idle');
    const constraintsRef = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const trackWidth = 280;
    const handleSize = 56;
    const threshold = trackWidth - handleSize - 16; // Padding adjustment

    // Calculate progress for visual feedback
    const progress = useTransform(x, [0, threshold], [0, 1]);
    const backgroundColor = useTransform(
        progress,
        [0, 1],
        ['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.5)']
    );

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        if (info.offset.x >= threshold * 0.9 && state === 'idle') {
            // Swipe completed
            setState('processing');

            // Simulate transaction flow
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setState('minting');

            await new Promise((resolve) => setTimeout(resolve, 1500));

            try {
                await onComplete();
                setState('success');
            } catch {
                setState('idle');
            }
        }
    };

    const getStateContent = () => {
        switch (state) {
            case 'processing':
                return (
                    <div className="flex items-center gap-3 text-purple-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Processing...</span>
                    </div>
                );
            case 'minting':
                return (
                    <div className="flex items-center gap-3 text-purple-400">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="font-medium">Minting Ticket...</span>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex items-center gap-3 text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Success!</span>
                    </div>
                );
            default:
                return (
                    <span className="text-white/50 font-medium">{label}</span>
                );
        }
    };

    return (
        <motion.div
            ref={constraintsRef}
            className={cn(
                'swipe-track relative h-16 flex items-center px-2',
                'w-[280px]',
                className
            )}
            style={{ backgroundColor }}
        >
            {/* Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {getStateContent()}
            </div>

            {/* Draggable Handle */}
            {state === 'idle' && (
                <motion.div
                    className="swipe-handle w-14 h-14 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: 0, right: threshold }}
                    dragElastic={0}
                    style={{ x }}
                    onDragEnd={handleDragEnd}
                    whileDrag={{ scale: 1.05 }}
                >
                    <motion.div
                        className="w-6 h-6 text-white"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </motion.div>
                </motion.div>
            )}

            {/* Success State - Confetti would be triggered externally */}
            {state === 'success' && (
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                >
                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-8 h-8 text-white" />
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
