'use client';

import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
    frontContent: ReactNode;
    backContent: ReactNode;
    className?: string;
    onClick?: () => void;
    disableFlip?: boolean;
}

/**
 * GlassCard - A premium glass-morphic card with 3D flip animation
 * Features ticket rip cutouts on the sides
 */
export function GlassCard({
    frontContent,
    backContent,
    className,
    onClick,
    disableFlip = false,
}: GlassCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleClick = () => {
        if (!disableFlip) {
            setIsFlipped(!isFlipped);
        }
        onClick?.();
    };

    return (
        <div
            className={cn('flip-card cursor-pointer', className)}
            onClick={handleClick}
        >
            <motion.div
                className="flip-card-inner w-full h-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1],
                }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                 {/* Front Face */}
                <div
                    className={cn(
                        'flip-card-front card ticket-rip w-full h-full p-6',
                        'flex flex-col'
                    )}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {frontContent}
                </div>

                {/* Back Face (QR Code) */}
                <div
                    className={cn(
                        'flip-card-back card ticket-rip w-full h-full p-6',
                        'flex flex-col items-center justify-center'
                    )}
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    {backContent}
                </div>
            </motion.div>
        </div>
    );
}

/**
 * GlassCardSimple - Non-flipping solid card for event listings
 */
export function GlassCardSimple({
    children,
    className,
    onClick,
}: {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <motion.div
            className={cn(
                'card p-6 cursor-pointer',
                className
            )}
            onClick={onClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}
