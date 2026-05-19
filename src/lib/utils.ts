import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names using clsx and tailwind-merge to handle Tailwind conflicts.
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
