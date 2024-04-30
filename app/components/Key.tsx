import type { ReactNode } from 'react'

export default function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="text-xs mr-1 border rounded border-slate-200 shadow px-1 py-1">
      {children}
    </kbd>
  )
}
