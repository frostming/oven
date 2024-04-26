import type { ReactNode } from 'react'

import ExternalIcon from '~/assets/external.svg?react'

export default function ExternalLink({ href, children }: { href: string, children: ReactNode }) {
  return (
    <a href={href} target="_blank" className="hover:underline transition-all duration-200">
      {children}
      <ExternalIcon className="w-4 ml-1 inline-block" />
    </a>
  )
}
