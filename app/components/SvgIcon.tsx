import { Suspense, lazy, useMemo } from 'react'
import { cn } from '~/lib/utils'
import Web from '~/assets/web.svg?react'

interface ISvgIconProps {
  name: string
  className?: string
}

export default function SvgIcon({ name, className }: ISvgIconProps) {
  const Icon = useMemo(() => {
    const icons = import.meta.glob(
      '../assets/*.svg',
      { query: '?react' },
    ) as {
      [key: string]: () => Promise<{ default: React.ComponentType<React.SVGProps<SVGSVGElement>> }>
    }
    return lazy(icons[`../assets/${name}.svg`])
  }, [name])

  return (
    <Suspense fallback={<Web className={cn('inline-block', className)} />}>
      <Icon className={cn('inline-block', className)} />
    </Suspense>
  )
}
