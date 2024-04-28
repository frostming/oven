import { Suspense } from 'react'
import { cn, getIcon } from '~/lib/utils'
import Web from '~/assets/web.svg?react'

interface ILinkIconProps {
  name: string
  className?: string
}

export default function LinkIcon({ name, className }: ILinkIconProps) {
  const Icon = getIcon(name)

  return (
    <Suspense fallback={<Web className={cn('inline-block', className)} />}>
      <Icon className={cn('inline-block', className)} />
    </Suspense>
  )
}
