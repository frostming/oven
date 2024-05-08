import { type ClassValue, clsx } from 'clsx'
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

export function getPlatform(): string {
  // @ts-expect-error Future API
  return (navigator.userAgentData?.platform ?? navigator.platform) || 'unknown'
}

export function getOgUrl(title: string, options: { extra?: string, description?: string } = {}) {
  const origin = 'https://pyoven.org'
  const url = new URL('/api/og', origin)
  url.searchParams.set('title', title)
  if (options.extra)
    url.searchParams.set('extra', options.extra)
  if (options.description)
    url.searchParams.set('description', options.description)
  return url.href
}
