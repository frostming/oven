import type { LoaderFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { normalizePackageName } from '~/lib/utils'

// `/p/<package>[/<version>]` is a short alias of `/package/<package>[/<version>]`.
// It redirects so that the canonical URL stays unique.
export async function loader({ params, request }: LoaderFunctionArgs) {
  invariant(params.package, 'No package name provided')
  const normalizedName = normalizePackageName(params.package)
  const url = new URL(request.url)
  url.pathname = `/package/${normalizedName}${params.version ? `/${params.version}` : ''}`
  return redirect(`${url.pathname}${url.search}`, { status: 302 })
}
