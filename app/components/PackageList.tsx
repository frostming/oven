import { Link } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import SvgIcon from './SvgIcon'
import { Skeleton } from './ui/skeleton'
import type { SearchResult } from '~/lib/pypi'

interface IPackageListProps {
  loading?: boolean
  packages: SearchResult[]
  className?: string
  onSelectChange?: (pkg: SearchResult) => void
  onEnter?: (pkg: SearchResult) => void
}

export default function PackageList({ loading, packages, className, onSelectChange, onEnter }: IPackageListProps) {
  const [itemSelected, setItemSelected] = useState<number | undefined>()

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        setItemSelected((prev) => {
          if (prev === undefined)
            return 0
          return Math.min(prev + 1, packages.length - 1)
        })
      }
      else if (event.key === 'ArrowUp') {
        setItemSelected((prev) => {
          if (prev === undefined)
            return packages.length - 1
          return Math.max(prev - 1, 0)
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [packages])

  useEffect(() => {
    if (itemSelected === undefined)
      return
    onSelectChange?.(packages[itemSelected])

    if (listRef.current) {
      const selectedElement = listRef.current.childNodes[itemSelected] as HTMLElement
      selectedElement.focus()
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [itemSelected, packages])

  return (
    <div className={className}>
      {loading
        ? (
          <Skeleton className="h-64 flex justify-center items-center">
            <SvgIcon name="spinner" />
          </Skeleton>
          )
        : (
          <div className="max-h-80 overflow-y-auto flex flex-col" ref={listRef}>
            {packages.map(pkg => (
              <Link
                key={pkg.name}
                to={`/package/${pkg.name}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter')
                    onEnter?.(pkg)
                }}
                className="p-2 hover:bg-secondary border-b border-muted focus:bg-muted focus:border-2 focus:border-primary"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <span className="text-sm text-muted-foreground">{pkg.version}</span>
                </div>
                <p className="text-sm">{pkg.summary}</p>
              </Link>
            ))}
          </div>
          )}
    </div>
  )
}
