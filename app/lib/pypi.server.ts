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
  extra?: string
}

function parseAuthors(author_email?: string): Author[] {
  if (!author_email)
    return []
  return addrparser.parse(author_email).map(({ phrase, address }) => ({ name: phrase, email: address }))
}

function parseDependency(dep: string): Dependency | undefined {
  const regexPattern = /^((?:[A-Z0-9][A-Z0-9._-]*)?[A-Z0-9])(.*)$/gmi
  const match = regexPattern.exec(dep)
  if (!match)
    return undefined
  return { name: match[1], extra: match[2] }
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
