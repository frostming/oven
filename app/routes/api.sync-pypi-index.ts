import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import {
  PackageIndexConfigurationError,
  PackageIndexSyncInProgressError,
  syncPackageIndex,
} from '~/lib/pypi-index.server'

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

export async function loader() {
  return jsonResponse({ error: 'Method not allowed' }, 405)
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed' }, 405)

  const syncToken = process.env.PYPI_SYNC_TOKEN
  if (!syncToken)
    return jsonResponse({ error: 'Package sync API is not configured' }, 503)
  if (!isAuthorized(request, syncToken))
    return jsonResponse({ error: 'Unauthorized' }, 401)

  try {
    return jsonResponse(await syncPackageIndex())
  }
  catch (error) {
    if (error instanceof PackageIndexConfigurationError)
      return jsonResponse({ error: 'Package sync API is not configured' }, 503)
    if (error instanceof PackageIndexSyncInProgressError)
      return jsonResponse({ error: 'A package sync is already running' }, 409)

    console.error('PyPI package index sync failed', error)
    return jsonResponse({ error: 'Package sync failed' }, 502)
  }
}
