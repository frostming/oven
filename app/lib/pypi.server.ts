import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import fs from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import addrparser from 'address-rfc2822'
import { JSDOM } from 'jsdom'
import { normalizePackageName } from './utils'
import { BigQueryClient } from './bigquery.server'

interface Author {
  name?: string
  email?: string
}

interface File {
  filename: string
  yanked: boolean
  upload_time?: Date
}

interface FileResponse {
  upload_time_iso_8601: string
  filename: string
  yanked: boolean
}

export interface SearchResult {
  name: string
  version: string
  summary: string
}

export interface Package extends SearchResult {
  normalized_name: string
  published_time?: Date
  project_urls: Record<string, string>
  authors: Author[]
  package_url: string
  dependencies: Dependency[]
  requires_python?: string
  description: string
  description_content_type: 'text/markdown' | 'text/x-rst' | 'text/plain'
  yanked: boolean
  files: File[]
  releases: Record<string, File[]>
}

interface Dependency {
  name: string
  requirement: string
  extras: string[]
}

function parseAuthors(author_email?: string): Author[] {
  if (!author_email)
    return []
  return addrparser.parse(author_email).map(({ phrase, address }) => ({ name: phrase, email: address }))
}

type MarkerTokenType = 'lparen' | 'rparen' | 'and' | 'or' | 'op' | 'ident' | 'string' | 'not'

interface MarkerToken {
  type: MarkerTokenType
  value?: string
}

type MarkerNode =
  | { type: 'binary', op: 'and' | 'or', left: MarkerNode, right: MarkerNode }
  | { type: 'compare', op: string, left: MarkerNode, right: MarkerNode }
  | { type: 'ident', value: string }
  | { type: 'string', value: string }

function tokenizeMarker(input: string): MarkerToken[] {
  const tokens: MarkerToken[] = []
  let index = 0
  while (index < input.length) {
    const char = input[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (char === '(') {
      tokens.push({ type: 'lparen' })
      index += 1
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'rparen' })
      index += 1
      continue
    }
    if (char === '\'' || char === '"') {
      const quote = char
      let value = ''
      index += 1
      while (index < input.length) {
        const next = input[index]
        if (next === '\\' && index + 1 < input.length) {
          value += input[index + 1]
          index += 2
          continue
        }
        if (next === quote) {
          index += 1
          break
        }
        value += next
        index += 1
      }
      tokens.push({ type: 'string', value })
      continue
    }
    const twoChar = input.slice(index, index + 2)
    if (['==', '!=', '<=', '>='].includes(twoChar)) {
      tokens.push({ type: 'op', value: twoChar })
      index += 2
      continue
    }
    if (['<', '>'].includes(char)) {
      tokens.push({ type: 'op', value: char })
      index += 1
      continue
    }
    const wordMatch = input.slice(index).match(/^[A-Za-z0-9._-]+/)
    if (wordMatch) {
      const word = wordMatch[0]
      const lower = word.toLowerCase()
      if (lower === 'and') {
        tokens.push({ type: 'and' })
      }
      else if (lower === 'or') {
        tokens.push({ type: 'or' })
      }
      else if (lower === 'not') {
        tokens.push({ type: 'not' })
      }
      else if (lower === 'in') {
        tokens.push({ type: 'op', value: 'in' })
      }
      else {
        tokens.push({ type: 'ident', value: word })
      }
      index += word.length
      continue
    }
    index += 1
  }
  return tokens
}

class MarkerParser {
  private tokens: MarkerToken[]
  private index = 0

  constructor(tokens: MarkerToken[]) {
    this.tokens = tokens
  }

  parse(): MarkerNode | null {
    const expr = this.parseOr()
    if (!expr || this.index < this.tokens.length)
      return null
    return expr
  }

  private parseOr(): MarkerNode | null {
    let node = this.parseAnd()
    while (node && this.match('or')) {
      const right = this.parseAnd()
      if (!right)
        return node
      node = { type: 'binary', op: 'or', left: node, right }
    }
    return node
  }

  private parseAnd(): MarkerNode | null {
    let node = this.parseComparison()
    while (node && this.match('and')) {
      const right = this.parseComparison()
      if (!right)
        return node
      node = { type: 'binary', op: 'and', left: node, right }
    }
    return node
  }

  private parseComparison(): MarkerNode | null {
    let left = this.parsePrimary()
    if (!left)
      return null
    const op = this.parseOperator()
    if (!op)
      return left
    const right = this.parsePrimary()
    if (!right)
      return left
    return { type: 'compare', op, left, right }
  }

  private parsePrimary(): MarkerNode | null {
    if (this.match('lparen')) {
      const expr = this.parseOr()
      this.match('rparen')
      return expr
    }
    const token = this.peek()
    if (!token)
      return null
    if (token.type === 'ident') {
      this.index += 1
      return { type: 'ident', value: token.value || '' }
    }
    if (token.type === 'string') {
      this.index += 1
      return { type: 'string', value: token.value || '' }
    }
    return null
  }

  private parseOperator(): string | null {
    const token = this.peek()
    if (!token)
      return null
    if (token.type === 'op') {
      this.index += 1
      return token.value || ''
    }
    if (token.type === 'not') {
      const next = this.peek(1)
      if (next && next.type === 'op' && next.value === 'in') {
        this.index += 2
        return 'not in'
      }
    }
    return null
  }

  private peek(offset = 0): MarkerToken | undefined {
    return this.tokens[this.index + offset]
  }

  private match(type: MarkerTokenType): boolean {
    const token = this.peek()
    if (!token || token.type !== type)
      return false
    this.index += 1
    return true
  }
}

function collectExtrasFromComparison(node: MarkerNode, extras: Set<string>): boolean {
  if (node.type !== 'compare')
    return false
  const leftIsExtra = node.left.type === 'ident' && node.left.value.toLowerCase() === 'extra'
  const rightIsExtra = node.right.type === 'ident' && node.right.value.toLowerCase() === 'extra'
  if (!leftIsExtra && !rightIsExtra)
    return false
  if (node.op === '==') {
    const valueNode = leftIsExtra ? node.right : node.left
    if (valueNode.type === 'string')
      extras.add(valueNode.value)
  }
  return true
}

function stripExtraFromMarker(node: MarkerNode, extras: Set<string>): MarkerNode | null {
  if (node.type === 'compare') {
    if (collectExtrasFromComparison(node, extras))
      return null
    return node
  }
  if (node.type === 'binary') {
    const left = stripExtraFromMarker(node.left, extras)
    const right = stripExtraFromMarker(node.right, extras)
    if (!left && !right)
      return null
    if (!left)
      return right
    if (!right)
      return left
    return { type: 'binary', op: node.op, left, right }
  }
  return node
}

function serializeMarker(node: MarkerNode, parentOp?: 'and' | 'or'): string {
  if (node.type === 'binary') {
    const left = serializeMarker(node.left, node.op)
    const right = serializeMarker(node.right, node.op)
    const expr = `${left} ${node.op} ${right}`
    if (parentOp === 'and' && node.op === 'or')
      return `(${expr})`
    return expr
  }
  if (node.type === 'compare') {
    const left = serializeMarker(node.left)
    const right = serializeMarker(node.right)
    return `${left} ${node.op} ${right}`
  }
  if (node.type === 'ident')
    return node.value
  return `'${node.value}'`
}

function parseMarker(marker: string): { extras: string[], markerWithoutExtra?: string } {
  const tokens = tokenizeMarker(marker)
  const parser = new MarkerParser(tokens)
  const expr = parser.parse()
  if (!expr) {
    const extras = new Set<string>()
    const extraRegex = /extra\s*==\s*(['"])([^'"]+)\1/gi
    let match: RegExpExecArray | null
    while ((match = extraRegex.exec(marker)) !== null)
      extras.add(match[2])
    let stripped = marker.replace(extraRegex, '').replace(/\s+/g, ' ').trim()
    stripped = stripped.replace(/^(and|or)\s+/i, '').replace(/\s+(and|or)$/i, '').trim()
    return { extras: [...extras], markerWithoutExtra: stripped || undefined }
  }
  const extras = new Set<string>()
  const stripped = stripExtraFromMarker(expr, extras)
  const markerWithoutExtra = stripped ? serializeMarker(stripped) : undefined
  return { extras: [...extras], markerWithoutExtra }
}

function parseDependency(dep: string): Dependency | undefined {
  const splitIndex = dep.indexOf(';')
  const requirementPart = (splitIndex >= 0 ? dep.slice(0, splitIndex) : dep).trim()
  const markerPart = splitIndex >= 0 ? dep.slice(splitIndex + 1).trim() : undefined
  const match = requirementPart.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/)
  if (!match)
    return undefined
  const name = match[1]
  let extras: string[] = []
  let markerWithoutExtra: string | undefined
  if (markerPart) {
    const result = parseMarker(markerPart)
    extras = result.extras
    markerWithoutExtra = result.markerWithoutExtra
  }
  const requirement = markerWithoutExtra ? `${requirementPart}; ${markerWithoutExtra}` : requirementPart
  return { name, requirement, extras }
}

class PyPI {
  static readonly MAX_SEARCH_RESULTS = process.env.MAX_SEARCH_RESULTS ? Number.parseInt(process.env.MAX_SEARCH_RESULTS) : 10
  private url: string
  private cachePath: string

  constructor(url: string) {
    this.url = url
    this.cachePath = path.resolve(process.env.CACHE_PATH || path.resolve(os.homedir(), '.oven/cache'))
  }

  async getPackage(name: string, version?: string): Promise<Package | null> {
    const response = await fetch(`${this.url}/pypi/${name}${version ? `/${version}` : ''}/json`)
    if (!response.ok) {
      if (response.status === 404)
        return null

      throw new Error(`Failed to fetch package info: ${response.statusText}`)
    }
    const data = await response.json()
    const info = data.info
    const releases: Record<string, File[]> = {}
    let responseReleases = data.releases as Record<string, FileResponse[]>
    if (!responseReleases) {
      const parentResponse = await fetch(`${this.url}/pypi/${name}/json`)
      if (!parentResponse.ok)
        throw new Error(`Failed to fetch package info: ${parentResponse.statusText}`)

      const parentData = await parentResponse.json()
      responseReleases = parentData.releases as Record<string, FileResponse[]>
    }
    for (const [version, versions] of Object.entries(responseReleases as Record<string, FileResponse[]>)) {
      releases[version] = versions.map(file => ({
        upload_time: new Date(file.upload_time_iso_8601),
        filename: file.filename,
        yanked: file.yanked,
      }))
    }
    const files: File[] = data.urls.map((file: FileResponse) => ({
      upload_time: new Date(file.upload_time_iso_8601),
      filename: file.filename,
      yanked: file.yanked,
    }))
    // @ts-expect-error - TS doesn't know that Date is a valid value for Math#min
    const published_time = files.length > 0 ? Math.min(...files.map(file => file.upload_time)) as Date : undefined

    return {
      name: info.name,
      normalized_name: normalizePackageName(info.name),
      version: info.version,
      project_urls: info.project_urls,
      published_time,
      authors: parseAuthors(info.author_email || ''),
      package_url: info.package_url,
      dependencies: info.requires_dist ? (info.requires_dist as string[]).map(parseDependency).filter(dep => dep !== undefined) as Dependency[] : [],
      requires_python: info.requires_python,
      summary: info.summary,
      description: info.description,
      description_content_type: info.description_content_type || 'text/x-rst',
      yanked: info.yanked || false,
      releases,
      files,
    }
  }

  private async getStoragePath(name: string, version: string, filename: string): Promise<string> {
    const fileName = `${btoa(normalizePackageName(name))}.${btoa(filename)}`
    try {
      await fs.stat(this.cachePath)
    }
    catch {
      await fs.mkdir(this.cachePath, { recursive: true })
    }
    const storagePath = path.join(this.cachePath, fileName)
    return storagePath
  }

  async getPackageFile(name: string, version: string, filename: string): Promise<string> {
    const storagePath = await this.getStoragePath(name, version, filename)
    try {
      await fs.stat(storagePath)
      return storagePath
    }
    catch {
      // ignore
    }

    const response = await fetch(`${this.url}/pypi/${normalizePackageName(name)}/${version}/json`)
    if (!response.ok)
      throw new Error(`Failed to fetch package file: ${response.statusText}`)

    const data = await response.json()
    const fileUrl = data.urls.find((file: FileResponse) => file.filename === filename)?.url
    if (!fileUrl)
      throw new Response('File not found', { status: 404 })
    // fetch and save the file
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok)
      throw new Error(`Failed to fetch package file: ${fileResponse.statusText}`)
    const fileData = await fileResponse.arrayBuffer()
    await fs.writeFile(storagePath, Buffer.from(fileData))
    return storagePath
  }

  async search(query: string): Promise<SearchResult[]> {
    const url = `${this.url}/search?q=${encodeURIComponent(query)}`
    const response = await fetch(url)

    if (!response.ok)
      throw new Error(`Failed to fetch search results: ${response.statusText}`)
    // parse the HTML response
    const text = await response.text()
    const dom = new JSDOM(text)
    const results = [...dom.window.document.querySelectorAll('.package-snippet')].map((element: Element) => {
      const name = element.querySelector('.package-snippet__name')?.textContent || ''
      const version = element.querySelector('.package-snippet__version')?.textContent || ''
      const summary = element.querySelector('.package-snippet__description')?.textContent || ''
      if (!name || !version || !summary)
        return null
      return { name, version, summary }
    }).filter((result): result is SearchResult => result !== null).slice(0, PyPI.MAX_SEARCH_RESULTS)
    return results
  }
}

const pypi = new PyPI('https://pypi.org')
export default pypi
