import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import * as zlib from 'node:zlib'
import type { Buffer } from 'node:buffer'
import jszip from 'jszip'
import tar from 'tar-stream'
import bz2 from 'unbzip2-stream'
import * as bl from 'bl'

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

export async function getArchiveFile(filePath: string, path: string) {
  const originalName = atob(filePath.split('.').pop()!)
  if (zipExtensions.some(ext => originalName.endsWith(ext)))
    return getZipFile(filePath, path)
  else if (tarExtensions.some(ext => originalName.endsWith(ext)))
    return getTarFile(filePath, path)
  else
    throw new Error('Unknown archive type')
}

async function getZipFile(filePath: string, path: string) {
  const data = await fs.readFile(filePath)
  const zip = await jszip.loadAsync(data)
  const file = zip.file(path)
  if (!file)
    throw new Error('File not found')
  return await file.async('nodebuffer')
}

async function getTarFile(filePath: string, path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()

    extract.on('entry', (header, stream, next) => {
      if (header.name === path) {
        stream.pipe(bl.BufferListStream((err, data) => {
          if (err)
            reject(err)
          else
            resolve(data)
        }))
      }
      else {
        stream.resume() // Skip to the next entry
        next()
      }
    })

    getFileStream(filePath).pipe(extract).on('error', reject)
  })
}

function getFileStream(filePath: string) {
  const originalName = atob(filePath.split('.').pop()!)
  const stream = fsSync.createReadStream(filePath)
  if (gzExtensions.some(ext => originalName.endsWith(ext)))
    return stream.pipe(zlib.createGunzip())
  else if (bzExtensions.some(ext => originalName.endsWith(ext)))
    return stream.pipe(bz2())
  else if (xzExtensions.some(ext => originalName.endsWith(ext)))
    throw new Error('xz compressed files are not supported')
  else
    return stream
}

async function listZipFiles(filePath: string): Promise<string[]> {
  const data = await fs.readFile(filePath)
  const zip = await jszip.loadAsync(data)
  const filenames = Object.keys(zip.files)
  return filenames
}

async function listTarFiles(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const fileNames: string[] = []
    const extract = tar.extract()

    extract.on('entry', (header, stream, next) => {
      fileNames.push(header.name)
      stream.resume() // Consume the stream
      next()
    })

    extract.on('finish', () => resolve(fileNames))

    getFileStream(filePath)
      .pipe(extract)
      .on('error', reject)
  })
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
