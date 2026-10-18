import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'
import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node'
import {
  PackageIndexConfigurationError,
  PackageIndexSyncInProgressError,
  getPackageIndexSyncStatus,
  startPackageIndexSync,
} from '~/lib/pypi-index.server'
import { SupabaseConfigurationError } from '~/lib/supabase.server'

function jsonResponse(body: object, status = 200) {
  return json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isAuthorized(request: Request, expectedToken: string) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer '))
    return false

  const actual = Buffer.from(authorization.slice('Bearer '.length), 'utf8')
  const expected = Buffer.from(expectedToken, 'utf8')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function checkAuthorization(request: Request) {
  const syncToken = process.env.PYPI_SYNC_TOKEN
  if (!syncToken)
    return jsonResponse({ error: 'Package sync API is not configured' }, 503)
  if (!isAuthorized(request, syncToken))
    return jsonResponse({ error: 'Unauthorized' }, 401)
  return null
}

function isConfigurationError(error: unknown) {
  return error instanceof PackageIndexConfigurationError || error instanceof SupabaseConfigurationError
}

export async function loader({ request }: LoaderFunctionArgs) {
  const unauthorized = checkAuthorization(request)
  if (unauthorized)
    return unauthorized

  try {
    return jsonResponse(await getPackageIndexSyncStatus())
  }
  catch (error) {
    if (isConfigurationError(error))
      return jsonResponse({ error: 'Package sync API is not configured' }, 503)

    console.error('Failed to read PyPI package index sync status', error)
    return jsonResponse({ error: 'Failed to read package sync status' }, 502)
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed' }, 405)

  const unauthorized = checkAuthorization(request)
  if (unauthorized)
    return unauthorized

  try {
    const { sync_id } = await startPackageIndexSync()
    return jsonResponse({ status: 'running', sync_id }, 202)
  }
  catch (error) {
    if (isConfigurationError(error))
      return jsonResponse({ error: 'Package sync API is not configured' }, 503)
    if (error instanceof PackageIndexSyncInProgressError)
      return jsonResponse({ error: 'A package sync is already running' }, 409)

    console.error('Failed to start PyPI package index sync', error)
    return jsonResponse({ error: 'Failed to start package sync' }, 502)
  }
}
