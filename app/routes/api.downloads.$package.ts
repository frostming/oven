import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { BigQueryClient } from '~/lib/bigquery.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const pkg = new URL(request.url).searchParams.get('package')
  invariant(pkg, 'No package name provided')

  const bigquery = new BigQueryClient()
  const [rows, error] = await bigquery.queryPackageDownloadStats(pkg)
  return json({ rows, error })
}

export type PackageDownloadStatsLoader = typeof loader
