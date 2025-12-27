import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges Tailwind CSS classes
 * 
 * This utility function combines class names using clsx and then merges
 * Tailwind classes to avoid conflicts. It's particularly useful when
 * you need to conditionally apply classes or merge component styles.
 * 
 * @param inputs - Class values to combine (strings, objects, arrays)
 * @returns Merged class string with Tailwind conflicts resolved
 * 
 * @example
 * ```ts
 * cn("px-4 py-2", { "bg-blue-500": isPrimary }, ["text-white", "rounded"])
 * // Returns: "px-4 py-2 bg-blue-500 text-white rounded"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
