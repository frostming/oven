import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { ShouldRevalidateFunctionArgs } from '@remix-run/react'
import { Link, useLoaderData, useNavigate, useNavigation } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { explain, rcompare } from '@renovatebot/pep440'
import dayjs from 'dayjs'
import { Card } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import pypi from '~/lib/pypi'
import Markdown from '~/components/Markdown'
import { Skeleton } from '~/components/ui/skeleton'
import Metadata from '~/components/Metadata'
import FileTree from '~/components/FileTree'
import Time from '~/components/Time'
import { Badge } from '~/components/ui/badge'
import { normalizePackageName } from '~/lib/utils'
import SvgIcon from '~/components/SvgIcon'

export function shouldRevalidate({ currentParams, nextParams, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentParams.package === nextParams.package && currentParams.version === nextParams.version)
    return false
  return defaultShouldRevalidate
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  invariant(params.package, 'No package name provided')
  const pkg = await pypi.getPackage(normalizePackageName(params.package), params.version)
  const url = new URL(request.url)
  const activeTab = url.searchParams.get('tab')
  if (!pkg)
    throw new Response('Package not found', { status: 404 })
  return json({ package: pkg, version: params.version, activeTab })
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data)
    return []

  const title = `${data.package.name}${data.version ? ` ${data.version}` : ''} - Oven`
  return [
    { name: 'description', content: data.package.summary },
    { title },
    { property: 'og:title', content: title },
    { property: 'og:description', content: data.package.summary },
  ]
}

export default function Package() {
  const { package: pkg, activeTab, version } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const navigate = useNavigate()
  const loading = navigation.state === 'loading'

  return (
    <main className="lg:flex items-stretch gap-2 mb-8">
      <div className="lg:w-[400px] flex-shrink-0 p-4">
        {loading
          ? (
            <div className="flex flex-col space-y-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </div>
            )
          : <Metadata pkg={pkg} version={version} />}
      </div>
      <div className="flex-grow lg:p-4 min-w-0">
        <Tabs defaultValue={activeTab || 'description'} onValueChange={value => navigate({ search: `tab=${value}` }, { replace: true })}>
          <TabsList className="w-full flex">
            <TabsTrigger value="description" className="flex-grow">
              <SvgIcon name="readme" className="w-4 h-4 mr-1" />
              Description
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex-grow">
              <SvgIcon name="tags" className="w-4 h-4 mr-1" />
              {`${Object.keys(pkg.releases).length} Versions`}
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-grow">
              <SvgIcon name="tree" className="w-4 h-4 mr-1" />
              Files
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <Card className="p-2">
              {loading
                ? <Skeleton className="h-96" />
                : (
                  <div className="p-4 prose max-w-none mx-auto">
                    <Markdown>{pkg.description}</Markdown>
                  </div>
                  )}
            </Card>
          </TabsContent>
          <TabsContent value="versions">
            {loading
              ? <Skeleton className="h-96" />
              : (
                <Card className="p-2">
                  <div>
                    {Object.entries(pkg.releases).filter(([a]) => explain(a) !== null).sort((a, b) => rcompare(a[0], b[0])).map(([version, files]) => (
                      <div key={version} className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Link className="hover:underline transition duration-300" to={`/package/${pkg.name}/${version}`}>{version}</Link>
                            {explain(version)?.is_prerelease ? <Badge className="bg-yellow-300 text-yellow-700">PRE</Badge> : null}
                            {pkg.version === version ? <Badge className="bg-green-300 text-green-700">CURRENT</Badge> : null}
                          </div>
                          {files.length > 0
                            ? (
                              <span className="text-sm text-slate-400">
                                Published at
                                {' '}
                                <Time time={files.map(file => dayjs(file.upload_time)).sort((a, b) => a.diff(b))[0]} />
                              </span>
                              )
                            : null}
                        </h3>
                        <ul className="mt-2">
                          {files.map(file => (
                            <li key={file.filename}>
                              <code>{file.filename}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
                )}
          </TabsContent>
          <TabsContent value="files">
            <Card className="p-2">{loading ? <Skeleton className="h-96" /> : <FileTree pkg={pkg} />}</Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
