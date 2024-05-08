import { type LoaderFunctionArgs, json } from '@remix-run/node'
import pypi from '~/lib/pypi.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get('q')
  if (!q)
    return json({ error: 'Missing query', results: [] }, { status: 400 })
  const results = await pypi.search(q)
  return json({ results })
}
