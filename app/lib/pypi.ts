import addrparser from 'address-rfc2822'

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

export interface Package {
  name: string
  version: string
  published_time?: Date
  project_urls: Record<string, string>
  authors: Author[]
  package_url: string
  dependencies: Dependency[]
  requires_python?: string
  summary: string
  description: string
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
  private url: string

  constructor(url: string) {
    this.url = url
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
      version: info.version,
      project_urls: info.project_urls,
      published_time,
      authors: parseAuthors(info.author_email || ''),
      package_url: info.package_url,
      dependencies: info.requires_dist ? (info.requires_dist as string[]).map(parseDependency).filter(dep => dep !== undefined) as Dependency[] : [],
      requires_python: info.requires_python,
      summary: info.summary,
      description: info.description,
      yanked: info.yanked || false,
      releases,
      files,
    }
  }
}

const pypi = new PyPI('https://pypi.org')
export default pypi
