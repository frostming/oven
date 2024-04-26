import type { SerializeFrom } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import React, { useCallback, useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import { TreeView } from '../ui/tree-view'
import type { Package } from '~/lib/pypi'
import type { FileTreeNode } from '~/lib/server-utils'

interface IFileBrowserProps {
  pkg: SerializeFrom<Package>
}

export default function FileTree({ pkg }: IFileBrowserProps) {
  const fetcher = useFetcher<{ files: FileTreeNode[] }>()
  const codeFetcher = useFetcher<{ code: string, errorReason: string }>()

  const [activeFile, setActiveFile] = useState(pkg.files[0].filename)
  useEffect(() => {
    fetcher.submit({ name: pkg.name, version: pkg.version, filename: activeFile }, { action: '/api/file-list' })
  }, [activeFile])

  const fetchCode = useCallback((path: string) => {
    codeFetcher.submit({ name: pkg.name, version: pkg.version, filename: activeFile, path }, { action: '/api/file-content' })
  }, [pkg.name, pkg.version, activeFile])

  return (
    <div>
      <div className="max-w-[300px]">
        {pkg.files.length > 0
          ? (
            <Select defaultValue={pkg.files[0].filename} onValueChange={value => setActiveFile(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a verified email to display" />
              </SelectTrigger>
              <SelectContent>
                {pkg.files.map(file => (
                  <SelectItem key={file.filename} value={file.filename}>{file.filename}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            )
          : null}
      </div>
      <div>
        {fetcher.state === 'loading'
          ? <Skeleton className="h-96" />
          : fetcher.data
            ? (
              <div className="lg:flex items-stretch mt-4">
                <TreeView
                  elements={fetcher.data.files || []}
                  className="max-w-[200px] overflow-x-auto min-h-64 flex-shrink-0"
                  onSelect={id => fetchCode(id as string)}
                />
                <div className="rounding border border-slate-300 p-2 flex-grow overflow-auto">
                  { codeFetcher.state === 'idle' && codeFetcher.data
                    ? (
                        codeFetcher.data.errorReason
                          ? <pre className="w-full">{codeFetcher.data.errorReason}</pre>
                          : <pre className="overflow-auto max-h-[800px] w-full" dangerouslySetInnerHTML={{ __html: codeFetcher.data.code }} />)
                    : null}
                </div>
              </div>
              )
            : null}
      </div>
    </div>
  )
}
