import type { ReactNode } from 'react'

import SvgIcon from './SvgIcon'
import { cn } from '~/lib/utils'

interface IExternalLinkProps {
  href: string
  className?: string
  children?: ReactNode
}

export default function ExternalLink({ href, className, children }: IExternalLinkProps) {
  return (
    <a href={href} target="_blank" className={cn('hover:underline transition-all duration-200', className)}>
      {children}
      <SvgIcon name="external" className="ml-1 w-4 h-4" />
    </a>
  )
}
