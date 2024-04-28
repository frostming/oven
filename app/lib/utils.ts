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
  const icons = import.meta.glob(
    '../assets/*.svg',
    { query: '?react' },
  ) as {
    [key: string]: () => Promise<{ default: React.ComponentType<React.SVGProps<SVGSVGElement>> }>
  }
  const iconName = (Object.keys(iconMap) as (keyof typeof iconMap)[]).find(
    key => iconMap[key].some(keyword => name.trim().toLowerCase().includes(keyword)),
  ) || 'web'
  return React.lazy(icons[`../assets/${iconName}.svg`])
}
