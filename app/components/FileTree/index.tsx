import type { SerializeFrom } from '@remix-run/node'
import { useFetcher, useSearchParams } from '@remix-run/react'
import { ChevronRight, FileIcon, FolderIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import styles from './file-tree.module.css'
import type { Package } from '~/lib/pypi.server'
import type { FileTreeNode } from '~/lib/utils.server'
import { cn } from '~/lib/utils'

interface IFileBrowserProps {
  pkg: SerializeFrom<Package>
}

interface ResolvedPath {
  /** The entries to list, empty when a file is selected */
  entries: FileTreeNode[]
  /** Whether the current path points at a directory(the archive root included) */
  isDirectory: boolean
}

function isDir(node: FileTreeNode) {
  return node.children.length > 0
}

function sortEntries(entries: FileTreeNode[]) {
  return [...entries].sort((a, b) => {
    if (isDir(a) !== isDir(b))
      return isDir(a) ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/** Walk the tree down to `path`, falling back to the root when it doesn't exist. */
function resolvePath(nodes: FileTreeNode[], path: string): ResolvedPath {
  let children: FileTreeNode[] = nodes
  let node: FileTreeNode | undefined
  for (const segment of path ? path.split('/') : []) {
    node = children.find(child => child.name === segment)
    if (!node)
      return { entries: sortEntries(nodes), isDirectory: true }
    children = node.children
  }
  if (node && !isDir(node))
    return { entries: [], isDirectory: false }
  return { entries: sortEntries(children), isDirectory: true }
}

/**
 * The browsed distribution and the current path inside it are kept in the URL
 * as `?artifact=<dist-filename>&file=<path/in/archive>`, so that any directory
 * or file can be linked directly.
 */
export default function FileTree({ pkg }: IFileBrowserProps) {
  const listFetcher = useFetcher<{ files: FileTreeNode[] }>()
  const codeFetcher = useFetcher<{ code: string, errorReason: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedArtifact = searchParams.get('artifact')
  const artifact = pkg.files.some(file => file.filename === requestedArtifact)
    ? requestedArtifact!
    : pkg.files[0]?.filename ?? ''
  const path = searchParams.get('file') ?? ''
  const segments = useMemo(() => (path ? path.split('/') : []), [path])

  useEffect(() => {
    if (!artifact)
      return
    listFetcher.submit({ name: pkg.name, version: pkg.version, filename: artifact }, { action: '/api/file-list' })
  }, [artifact])

  const { entries, isDirectory } = useMemo(
    () => resolvePath(listFetcher.data?.files ?? [], path),
    [listFetcher.data, path],
  )

  useEffect(() => {
    if (!artifact || !path || isDirectory)
      return
    codeFetcher.submit({ name: pkg.name, version: pkg.version, filename: artifact, path }, { action: '/api/file-content' })
  }, [artifact, path, isDirectory])

  const updateParams = useCallback((update: (params: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      prev.set('tab', 'files')
      update(prev)
      return prev
    }, { replace: true, preventScrollReset: true })
  }, [setSearchParams])

  const selectArtifact = useCallback((filename: string) => {
    updateParams((params) => {
      params.set('artifact', filename)
      params.delete('file')
    })
  }, [updateParams])

  const navigate = useCallback((target: string) => {
    updateParams((params) => {
      // Pin the artifact as well, it is implicit until the user picks one.
      params.set('artifact', artifact)
      if (target)
        params.set('file', target)
      else
        params.delete('file')
    })
  }, [updateParams, artifact])

  const listing = (
    <div className="rounded-md border border-slate-300 overflow-auto max-h-[800px] lg:max-h-none">
      <div className="px-4 py-2 text-sm font-medium bg-muted border-b border-slate-300 sticky top-0">Name</div>
      <ul>
        {segments.length > 0
          ? (
            <li>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-muted"
                onClick={() => navigate(segments.slice(0, -1).join('/'))}
              >
                <FolderIcon className="h-4 w-4 flex-shrink-0 text-sky-500" />
                ..
              </button>
            </li>
            )
          : null}
        {entries.map(entry => (
          <li key={entry.id}>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-muted text-left"
              onClick={() => navigate(entry.fullPath)}
            >
              {isDir(entry)
                ? <FolderIcon className="h-4 w-4 flex-shrink-0 text-sky-500" />
                : <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />}
              <span className="truncate">{entry.name}</span>
            </button>
          </li>
        ))}
        {entries.length === 0
          ? <li className="px-4 py-3 text-sm text-slate-400">This archive has no browsable entry.</li>
          : null}
      </ul>
    </div>
  )

  const content = codeFetcher.state !== 'idle' || !codeFetcher.data
    ? <Skeleton className="flex-grow min-h-64" />
    : (
      <div
        className={cn('rounded-md border border-slate-300 p-2 overflow-auto text-sm max-h-[800px] lg:max-h-none', styles.code)}
        {...(!codeFetcher.data.errorReason ? { dangerouslySetInnerHTML: { __html: codeFetcher.data.code } } : {})}
      >
        {codeFetcher.data.errorReason
          ? <pre className="w-full">{codeFetcher.data.errorReason}</pre>
          : null}
      </div>
      )

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="w-full max-w-[300px]">
          {pkg.files.length > 0
            ? (
              <Select value={artifact} onValueChange={selectArtifact}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a distribution to browse" />
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
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap text-sm min-w-0">
          <button
            type="button"
            className={cn('hover:underline', segments.length > 0 ? 'text-sky-600' : 'font-medium')}
            onClick={() => navigate('')}
          >
            {artifact}
          </button>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1
            return (
              <span key={segment + String(index)} className="flex items-center min-w-0">
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                {isLast
                  ? <span className="font-medium truncate">{segment}</span>
                  : (
                    <button
                      type="button"
                      className="text-sky-600 hover:underline truncate"
                      onClick={() => navigate(segments.slice(0, index + 1).join('/'))}
                    >
                      {segment}
                    </button>
                    )}
              </span>
            )
          })}
        </nav>
      </div>
      <div className="flex-grow min-h-0 flex flex-col mt-4 [&>*]:flex-grow [&>*]:min-h-0">
        {listFetcher.state !== 'idle' || !listFetcher.data
          ? <Skeleton className="flex-grow min-h-64" />
          : isDirectory
            ? listing
            : content}
      </div>
    </div>
  )
}
