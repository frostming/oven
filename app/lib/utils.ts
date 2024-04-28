import { type ClassValue, clsx } from 'clsx'
import React from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePackageName(name: string) {
  return name.trim().replace(/[-_.]+/g, '-').toLowerCase()
}

const iconMap = {
  'bug': ['issue', 'bug'],
  'chat': ['discord', 'chat'],
  'dollar-circle': ['donate', 'sponsor'],
  'github': ['source', 'repository'],
  'scroll': ['change'],
  'readme': ['readme', 'documentation', 'docs'],
  'web': ['website', 'homepage'],
}

export function getIcon(name: string) {
  return (Object.keys(iconMap) as (keyof typeof iconMap)[]).find(
    key => iconMap[key].some(keyword => name.trim().toLowerCase().includes(keyword)),
  ) || 'web'
}
