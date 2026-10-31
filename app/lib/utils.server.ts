import fs from 'node:fs'
import * as zlib from 'node:zlib'
import { Buffer } from 'node:buffer'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream'
import yauzl from 'yauzl'
import tar from 'tar-stream'
import bz2 from 'unbzip2-stream'

export interface FileTreeNode {
  id: string
  name: string
  fullPath: string
  children: FileTreeNode[]
}

const zipExtensions = ['.zip', '.whl']
const gzExtensions = ['.tar.gz', '.tgz']
const bzExtensions = ['.tar.bz2', '.tbz']
const xzExtensions = ['.tar.xz', '.txz', '.tlz', '.tar.lz', '.tar.lzma']
const tarExtensions = ['.tar', ...gzExtensions, ...bzExtensions, ...xzExtensions]

export class ArchiveFileTooLargeError extends Error {}

export async function listArchiveFiles(filePath: string): Promise<FileTreeNode[]> {
  const originalName = atob(filePath.split('.').pop()!)
  if (zipExtensions.some(ext => originalName.endsWith(ext)))
    return buildFileTree(await listZipFiles(filePath))
  else if (tarExtensions.some(ext => originalName.endsWith(ext)))
    return buildFileTree(await listTarFiles(filePath))
  else
    return []
}

export function guessLanguage(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext)
    return null
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'py':
    case 'pyi':
    case 'pyx':
      return 'python'
    case 'rb':
      return 'ruby'
    case 'php':
      return 'php'
    case 'java':
      return 'java'
    case 'swift':
      return 'swift'
    case 'c':
    case 'h':
      return 'c'
    case 'cpp':
    case 'hpp':
      return 'cpp'
    case 'cs':
      return 'csharp'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'sh':
      return 'bash'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'scss':
      return 'scss'
    case 'less':
      return 'less'
    case 'sass':
      return 'sass'
    case 'md':
      return 'markdown'
    case 'json':
      return 'json'
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'toml':
      return 'toml'
    case 'xml':
      return 'xml'
    default:
      return null
  }
}

export async function getArchiveFile(filePath: string, path: string, maxSize: number) {
  const originalName = atob(filePath.split('.').pop()!)
  if (zipExtensions.some(ext => originalName.endsWith(ext)))
    return getZipFile(filePath, path, maxSize)
  else if (tarExtensions.some(ext => originalName.endsWith(ext)))
    return getTarFile(filePath, path, maxSize)
  else
    throw new Error('Unknown archive type')
}

async function readStream(stream: Readable, maxSize: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    size += chunk.length
    if (size > maxSize) {
      stream.destroy()
      throw new ArchiveFileTooLargeError('File is too large to display.')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Only the central directory and the requested entry are read from disk,
// so memory usage doesn't grow with the size of the archive.
async function getZipFile(filePath: string, path: string, maxSize: number) {
  const zip = await yauzl.openPromise(filePath, { lazyEntries: true, autoClose: false })
  try {
    for await (const entry of zip.eachEntry()) {
      if (entry.fileName !== path)
        continue
      if (entry.uncompressedSize > maxSize)
        throw new ArchiveFileTooLargeError('File is too large to display.')
      return await readStream(await zip.openReadStreamPromise(entry), maxSize)
    }
    throw new Error('File not found')
  }
  finally {
    zip.close()
  }
}

async function listZipFiles(filePath: string): Promise<string[]> {
  const zip = await yauzl.openPromise(filePath, { lazyEntries: true, autoClose: false })
  try {
    const fileNames: string[] = []
    for await (const entry of zip.eachEntry()) {
      if (!entry.fileName.endsWith('/'))
        fileNames.push(entry.fileName)
    }
    return fileNames
  }
  finally {
    zip.close()
  }
}

function openTarArchive(filePath: string) {
  const originalName = atob(filePath.split('.').pop()!)
  if (xzExtensions.some(ext => originalName.endsWith(ext)))
    throw new Error('xz compressed files are not supported')

  const streams: NodeJS.ReadWriteStream[] = []
  if (gzExtensions.some(ext => originalName.endsWith(ext)))
    streams.push(zlib.createGunzip())
  else if (bzExtensions.some(ext => originalName.endsWith(ext)))
    streams.push(bz2())
  const extract = tar.extract()
  // pipeline() destroys every stream if any of them fails or the consumer
  // stops iterating early, so file handles and buffers are always released.
  pipeline([fs.createReadStream(filePath), ...streams, extract], () => {})
  return extract
}

async function getTarFile(filePath: string, path: string, maxSize: number): Promise<Buffer> {
  for await (const entry of openTarArchive(filePath)) {
    if (entry.header.name !== path) {
      entry.resume()
      continue
    }
    if ((entry.header.size ?? 0) > maxSize)
      throw new ArchiveFileTooLargeError('File is too large to display.')
    return await readStream(entry, maxSize)
  }
  throw new Error('File not found')
}

async function listTarFiles(filePath: string): Promise<string[]> {
  const fileNames: string[] = []
  for await (const entry of openTarArchive(filePath)) {
    if (!entry.header.name.endsWith('/'))
      fileNames.push(entry.header.name)
    entry.resume()
  }
  return fileNames
}

export function buildFileTree(files: string[]): FileTreeNode[] {
  const result: FileTreeNode[] = []
  for (const file of files) {
    const parts = file.split('/')
    let current = result
    for (let i = 0; i < parts.length; i++) {
      let node = current.find(n => n.name === parts[i])
      const fullPath = parts.slice(0, i + 1).join('/')
      if (!node) {
        node = { fullPath, name: parts[i], children: [], id: fullPath }
        current.push(node)
      }
      current = node.children
    }
  }
  return result
}
