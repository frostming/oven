import { type LoaderFunctionArgs, json } from '@remix-run/node'
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
import Readme from '~/assets/readme.svg?react'
import Tags from '~/assets/tags.svg?react'
import Tree from '~/assets/tree.svg?react'
import FileTree from '~/components/FileTree'
import Time from '~/components/Time'
import { Badge } from '~/components/ui/badge'

export function shouldRevalidate({ currentParams, nextParams, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentParams.package === nextParams.package && currentParams.version === nextParams.version)
    return false
  return defaultShouldRevalidate
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  invariant(params.package, 'No package name provided')
  const pkg = await pypi.getPackage(params.package, params.version)
  const activeTab = new URL(request.url).searchParams.get('tab')
  if (!pkg)
    throw new Response('Package not found', { status: 404 })
  return json({ package: pkg, version: params.version, activeTab })
}

export default function Package() {
  const { package: pkg, activeTab, version } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const navigate = useNavigate()
  const loading = navigation.state === 'loading'

  return (
    <main className="flex items-stretch gap-2 mb-8">
      <div className="w-full lg:w-[400px] flex-shrink-0 p-4">
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
      <div className="flex-grow pr-4">
        <Tabs defaultValue={activeTab || 'description'} onValueChange={value => navigate({ search: `tab=${value}` }, { replace: true })}>
          <TabsList className="w-full flex mt-4">
            <TabsTrigger value="description" className="flex-grow">
              <Readme className="w-4" />
              {' '}
              Description
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex-grow">
              <Tags className="w-4" />
              {' '}
              {`${Object.keys(pkg.releases).length} Versions`}
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-grow">
              <Tree className="w-4" />
              {' '}
              Files
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <Card>
              <div className="p-6 prose max-w-[90ch] mx-auto">
                <Markdown>{pkg.description}</Markdown>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="versions">
            <Card>
              <div>
                {Object.entries(pkg.releases).sort((a, b) => rcompare(a[0], b[0])).map(([version, files]) => (
                  <div key={version} className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Link className="hover:underline transition duration-300" to={`/package/${pkg.name}/${version}`}>{version}</Link>
                        {explain(version)?.is_prerelease ? <Badge className="bg-yellow-300 text-yellow-700">PRE</Badge> : null}
                        {pkg.version === version ? <Badge className="bg-green-300 text-green-700">CURRENT</Badge> : null}
                      </div>
                      <span className="text-sm text-slate-400">
                        Published at
                        {' '}
                        <Time time={files.map(file => dayjs(file.upload_time)).sort((a, b) => a.diff(b))[0]} />
                      </span>
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
          </TabsContent>
          <TabsContent value="files">
            <FileTree pkg={pkg} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
