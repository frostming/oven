import process from 'node:process'
import { normalizePackageName } from './utils'

const PYPI_INDEX_URL = 'https://pypi.org/simple/'
const BATCH_SIZE = 5000
const MAX_ATTEMPTS = 4

interface SimpleProject {
  'name': string
  '_last-serial': number
}

interface SimpleIndexPayload {
  meta: {
    '_last-serial': number
  }
  projects: SimpleProject[]
}

interface PackageRow {
  normalized_name: string
  name: string
  last_serial: number
  sync_id: string
}

export interface PackageIndexSyncResult {
  package_count: number
  batch_count: number
  source_serial: number
}

export class PackageIndexConfigurationError extends Error {}
export class PackageIndexSyncInProgressError extends Error {}

function getSyncConfig() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const userAgent = process.env.PYPI_USER_AGENT

  if (!supabaseUrl || !serviceRoleKey || !userAgent) {
    throw new PackageIndexConfigurationError(
      'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PYPI_USER_AGENT must be configured',
    )
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
    userAgent,
  }
}

async function fetchWithRetry(url: string, init: RequestInit, label: string) {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(120_000),
      })
      if (response.ok)
        return response

      const detail = await response.text()
      lastError = new Error(`${label} failed with status ${response.status}: ${detail.slice(0, 500)}`)
      if (response.status < 500 && response.status !== 429)
        break
    }
    catch (error) {
      lastError = error
    }

    if (attempt < MAX_ATTEMPTS)
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000))
  }

  throw lastError
}

function uniqueProjects(projects: SimpleProject[], syncId: string): PackageRow[] {
  const unique = new Map<string, PackageRow>()

  for (const project of projects) {
    if (!project || typeof project.name !== 'string')
      throw new TypeError('PyPI returned a project without a valid name')
    if (!Number.isSafeInteger(project['_last-serial']) || project['_last-serial'] < 0)
      throw new TypeError(`PyPI returned an invalid serial for ${project.name}`)

    const normalizedName = normalizePackageName(project.name)
    const existing = unique.get(normalizedName)
    if (!existing || existing.last_serial < project['_last-serial']) {
      unique.set(normalizedName, {
        normalized_name: normalizedName,
        name: project.name,
        last_serial: project['_last-serial'],
        sync_id: syncId,
      })
    }
  }

  return [...unique.values()]
}

async function fetchProjectIndex(userAgent: string): Promise<SimpleIndexPayload> {
  const response = await fetchWithRetry(
    PYPI_INDEX_URL,
    {
      headers: {
        'Accept': 'application/vnd.pypi.simple.v1+json',
        'User-Agent': userAgent,
      },
    },
    'PyPI index request',
  )
  const payload = await response.json() as SimpleIndexPayload

  if (!payload.meta || !Number.isSafeInteger(payload.meta['_last-serial']))
    throw new TypeError('PyPI returned an invalid index serial')
  if (!Array.isArray(payload.projects))
    throw new TypeError('PyPI returned an invalid projects collection')

  return payload
}

function createRpcClient(supabaseUrl: string, serviceRoleKey: string) {
  return async function callRpc(name: string, body: object) {
    const response = await fetchWithRetry(
      `${supabaseUrl}/rest/v1/rpc/${name}`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      `Supabase RPC ${name}`,
    )

    if (response.status === 204)
      return undefined
    return response.json()
  }
}

export async function syncPackageIndex(): Promise<PackageIndexSyncResult> {
  const { supabaseUrl, serviceRoleKey, userAgent } = getSyncConfig()
  const callRpc = createRpcClient(supabaseUrl, serviceRoleKey)

  let syncId: string
  try {
    syncId = await callRpc('begin_package_sync', {}) as string
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('A package sync is already running'))
      throw new PackageIndexSyncInProgressError(error.message)
    throw error
  }

  try {
    const payload = await fetchProjectIndex(userAgent)
    const projects = uniqueProjects(payload.projects, syncId)
    const batchCount = Math.ceil(projects.length / BATCH_SIZE)

    for (let offset = 0; offset < projects.length; offset += BATCH_SIZE) {
      await callRpc('upsert_package_batch', {
        package_batch: projects.slice(offset, offset + BATCH_SIZE),
      })
    }

    const packageCount = await callRpc('finish_package_sync', {
      requested_sync_id: syncId,
      requested_source_serial: payload.meta['_last-serial'],
      expected_package_count: projects.length,
    }) as number

    return {
      package_count: packageCount,
      batch_count: batchCount,
      source_serial: payload.meta['_last-serial'],
    }
  }
  catch (error) {
    try {
      await callRpc('abort_package_sync', { requested_sync_id: syncId })
    }
    catch (abortError) {
      console.error('Failed to release the package sync lease', abortError)
    }
    throw error
  }
}
