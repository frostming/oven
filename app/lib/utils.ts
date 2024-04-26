import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePackageName(name: string) {
  return name.trim().replace(/[-_.]+/g, '-').toLowerCase()
}
