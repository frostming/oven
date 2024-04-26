import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import invariant from 'tiny-invariant'
import pypi from '~/lib/pypi'
import { listArchiveFiles } from '~/lib/server-utils'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  const version = url.searchParams.get('version')
  const filename = url.searchParams.get('filename')
  invariant(name, 'No package name provided')
  invariant(version, 'No package version provided')
  invariant(filename, 'No filename provided')

  const storageFile = await pypi.getPackageFile(name, version, filename)
  const files = await listArchiveFiles(storageFile)
  return json({ files })
}
