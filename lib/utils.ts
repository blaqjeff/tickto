import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for combining Tailwind classes with proper merging
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
