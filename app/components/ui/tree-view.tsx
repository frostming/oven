'use client'

import React, { forwardRef, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type {
  TreeViewElement,
} from './tree-view-api'
import {
  CollapseButton,
  File,
  Folder,
  Tree,
} from './tree-view-api'
import { cn } from '~/lib/utils'

// TODO: Add the ability to add custom icons

interface TreeViewComponentProps extends React.HTMLAttributes<HTMLDivElement> {}

type TreeViewProps = {
  initialSelectedId?: string
  elements: TreeViewElement[]
  indicator?: boolean
  onSelect?: (id: string) => void
} & (
  | {
    initialExpendedItems?: string[]
    expandAll?: false
  }
  | {
    initialExpendedItems?: undefined
    expandAll: true
  }
) &
TreeViewComponentProps

export function TreeView({
  elements,
  className,
  initialSelectedId,
  initialExpendedItems,
  expandAll,
  onSelect,
  indicator = false,
}: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { getVirtualItems } = useVirtualizer({
    count: elements.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => 40, []),
    overscan: 5,
  })

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full rounded-md overflow-hidden py-1 relative',
        className,
      )}
    >
      <Tree
        initialSelectedId={initialSelectedId}
        initialExpendedItems={initialExpendedItems}
        elements={elements}
        className="w-full h-full overflow-y-auto"
        onSelect={onSelect}
      >
        {getVirtualItems().map(element => (
          // eslint-disable-next-line ts/no-use-before-define
          <TreeItem
            aria-label="Root"
            key={element.key}
            elements={[elements[element.index]]}
            indicator={indicator}
          />
        ))}
        <CollapseButton elements={elements} expandAll={expandAll} />
      </Tree>
    </div>
  )
}

TreeView.displayName = 'TreeView'

export const TreeItem = forwardRef<
  HTMLUListElement,
  {
    elements?: TreeViewElement[]
    indicator?: boolean
  } & React.HTMLAttributes<HTMLUListElement>
>(({ className, elements, indicator, ...props }, ref) => {
  return (
    <ul ref={ref} className="w-full space-y-1 " {...props}>
      {elements
      && elements.map(element => (
        <li key={element.id} className="w-full">
          {element.children && element.children?.length > 0
            ? (
              <Folder
                element={element.name}
                value={element.id}
                isSelectable={element.isSelectable}
              >
                <TreeItem
                  key={element.id}
                  aria-label={`folder ${element.name}`}
                  elements={element.children}
                  indicator={indicator}
                />
              </Folder>
              )
            : (
              <File
                value={element.id}
                aria-label={`File ${element.name}`}
                key={element.id}
                isSelectable={element.isSelectable}
              >
                <span>{element?.name}</span>
              </File>
              )}
        </li>
      ))}
    </ul>
  )
})

TreeItem.displayName = 'TreeItem'
