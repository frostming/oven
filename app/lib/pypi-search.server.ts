import process from 'node:process'
import { normalizePackageName } from './utils'
import { getSupabaseConfig } from './supabase.server'

export interface SearchResult {
  name: string
  latest_version: string | null
  description: string | null
}

const DEFAULT_SEARCH_LIMIT = 10
const MAX_QUERY_LENGTH = 100
const METADATA_FETCH_CONCURRENCY = 3

interface SearchRow extends SearchResult {
  last_serial: number
  metadata_serial: number | null
}

interface MetadataUpdate {
  normalized_name: string
  name: string
  latest_version: string
  description: string
  last_serial: number
}

async function callRpc(url: string, key: string, name: string, body: object) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok)
    throw new Error(`Supabase RPC ${name} failed with status ${response.status}`)

  if (response.status === 204)
    return undefined
  return response.json()
}

async function fetchMetadata(row: SearchRow): Promise<MetadataUpdate> {
  const normalizedName = normalizePackageName(row.name)
  const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(normalizedName)}/json`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': process.env.PYPI_USER_AGENT || 'oven/1.0',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok)
    throw new Error(`PyPI metadata request failed with status ${response.status}`)

  const payload = await response.json()
  const info = payload?.info
  if (!info || typeof info.name !== 'string' || typeof info.version !== 'string')
    throw new TypeError('PyPI returned invalid project metadata')
  if (normalizePackageName(info.name) !== normalizedName)
    throw new TypeError(`PyPI returned metadata for an unexpected project: ${info.name}`)

  return {
    normalized_name: normalizedName,
    name: info.name,
    latest_version: info.version,
    description: typeof info.summary === 'string' ? info.summary.slice(0, 1000) : '',
    last_serial: row.last_serial,
  }
}

async function hydrateRows(rows: SearchRow[]): Promise<MetadataUpdate[]> {
  const staleRows = rows.filter(row => row.metadata_serial !== row.last_serial)
  const updates: MetadataUpdate[] = []

  for (let offset = 0; offset < staleRows.length; offset += METADATA_FETCH_CONCURRENCY) {
    const batch = staleRows.slice(offset, offset + METADATA_FETCH_CONCURRENCY)
    const results = await Promise.allSettled(batch.map(fetchMetadata))
    for (const result of results) {
      if (result.status === 'fulfilled')
        updates.push(result.value)
    }
  }

  return updates
}

export async function searchPackages(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH)
  if (!query)
    return []

  const { url, publishableKey, secretKey } = getSupabaseConfig('public')
  const configuredLimit = Number.parseInt(process.env.MAX_SEARCH_RESULTS || '', 10)
  const resultLimit = Number.isFinite(configuredLimit) ? configuredLimit : DEFAULT_SEARCH_LIMIT
  const rows = await callRpc(url, publishableKey, 'search_packages', {
    query_text: query,
    result_limit: resultLimit,
  }) as SearchRow[]
  const updates = await hydrateRows(rows)

  if (updates.length > 0 && secretKey) {
    try {
      await callRpc(url, secretKey, 'update_package_metadata_batch', {
        metadata_batch: updates,
      })
    }
    catch (error) {
      console.error('Failed to cache PyPI package metadata', error)
    }
  }

  const updatesByName = new Map(updates.map(update => [update.normalized_name, update]))
  return rows.map((row) => {
    const update = updatesByName.get(normalizePackageName(row.name))
    return {
      name: update?.name ?? row.name,
      latest_version: update?.latest_version ?? row.latest_version,
      description: update?.description ?? row.description,
    }
  })
}
