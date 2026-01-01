'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    rotation: number;
}

interface ConfettiEffectProps {
    isActive: boolean;
    onComplete?: () => void;
}

const COLORS = ['#c084fc', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

/**
 * ConfettiEffect - Celebration animation for successful transactions
 */
export function ConfettiEffect({ isActive, onComplete }: ConfettiEffectProps) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (isActive) {
            // Generate confetti pieces
            const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                delay: Math.random() * 0.5,
                rotation: Math.random() * 360,
            }));
            setPieces(newPieces);

            // Cleanup after animation
            const timer = setTimeout(() => {
                setPieces([]);
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    if (!isActive || pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map((piece) => (
                <motion.div
                    key={piece.id}
                    className="absolute w-3 h-3"
                    style={{
                        left: `${piece.x}%`,
                        top: -20,
                        backgroundColor: piece.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                    initial={{
                        y: -20,
                        rotate: piece.rotation,
                        opacity: 1,
                    }}
                    animate={{
                        y: window.innerHeight + 100,
                        rotate: piece.rotation + 720,
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: 3,
                        delay: piece.delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                />
            ))}
        </div>
    );
}
