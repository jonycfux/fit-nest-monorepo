import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge conditional class lists, resolving Tailwind conflicts. Works identically
// for DOM `className` (web) and NativeWind `className` (native).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function add(a: number, b: number): number {
  return a + b;
}
