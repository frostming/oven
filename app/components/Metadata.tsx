import { Link, useFetcher } from '@remix-run/react'
import type { SerializeFrom } from '@remix-run/node'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import Command from './Command'
import { Badge } from './ui/badge'
import Time from './Time'
import ExternalLink from './ExternalLink'
import SvgIcon from './SvgIcon'
import DownloadChart from './DownloadChart'
import { Skeleton } from './ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import type { Package } from '~/lib/pypi.server'
import { getIcon } from '~/lib/utils'

interface IMetadataProps {
  pkg: SerializeFrom<Package>
  version?: string
}

export default function Metadata({ pkg, version }: IMetadataProps) {
  const dependencies = pkg.dependencies ?? []
  const { groupedDependencies, orderedGroups } = useMemo(() => {
    const grouped = dependencies.reduce<Record<string, typeof dependencies>>((acc, dep) => {
      const extras = dep.extras.length > 0 ? dep.extras : ['default']
      for (const extra of extras) {
        if (!acc[extra])
          acc[extra] = []
        acc[extra].push(dep)
      }
      return acc
    }, {})
    const groups = Object.keys(grouped)
    const ordered = groups.includes('default')
      ? ['default', ...groups.filter(group => group !== 'default').sort()]
      : groups.sort()
    return { groupedDependencies: grouped, orderedGroups: ordered }
  }, [dependencies])
  const [activeGroup, setActiveGroup] = useState<string>(orderedGroups[0])
  useEffect(() => {
    setActiveGroup(orderedGroups[0])
  }, [orderedGroups])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <ExternalLink href={pkg.package_url}>{pkg.name}</ExternalLink>
              <span className="text-slate-400 text-base">{pkg.version}</span>
            </div>
            {pkg.yanked ? <Badge variant="destructive">YANKED</Badge> : null}
          </div>
        </CardTitle>
        <CardDescription>
          {pkg.published_time
            ? (
              <p>
                Published
                {' '}
                <Time time={pkg.published_time} />
              </p>
              )
            : null }
          <p className="text-lg mt-2">{pkg.summary}</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 divide-y">
          <Command name={pkg.normalized_name} version={version} />
          <div>
            <h3 className="text-lg font-thin my-2">Package Downloads</h3>
            <img src={`https://pepy.tech/badge/${pkg.normalized_name}/week`} alt="Weekly Downloads" className="my-2" />
            <img src={`https://pepy.tech/badge/${pkg.normalized_name}/month`} alt="Monthly Downloads" className="my-2" />
          </div>
          <div>
            <h3 className="text-lg font-thin my-2">Authors</h3>
            {pkg.authors.map((author, index) => (
              <p key={index}>
                {author.email
                  ? (
                    <a href={`mailto:${author.email}`} target="blank" className="hover:underline flex items-center space-x-1">
                      <span>{author.name || author.email}</span>
                      <SvgIcon name="email" className="w-4" />
                    </a>
                    )
                  : <span>{author.name || 'Unknown'}</span>}
              </p>
            ))}
          </div>
          {pkg.project_urls
            ? (
              <div>
                <h3 className="text-lg font-thin my-2">Project URLs</h3>
                <ul>
                  {Object.entries(pkg.project_urls).map(([name, url], index) => (
                    <li key={index}>
                      <ExternalLink href={url}>
                        <SvgIcon name={getIcon(name)} className="w-4 h-4 mb-0.5" />
                        {' '}
                        {name}
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              </div>
              )
            : null}
          <div>
            <h3 className="text-lg font-thin my-2">Requires Python</h3>
            <p>{pkg.requires_python}</p>
          </div>
          <div>
            <h3 className="text-lg font-thin my-2">Dependencies</h3>
            {dependencies.length === 0
              ? <p className="text-sm text-muted-foreground">No dependencies</p>
              : (
                <>
                  <Select value={activeGroup} onValueChange={value => setActiveGroup(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an extra group" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderedGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ul className="mt-2">
                    {groupedDependencies[activeGroup]?.map((dep, index) => (
                      <li key={`${dep.requirement}-${index}`}>
                        <Link to={`/package/${dep.name.toLowerCase()}`} className="hover:underline">
                          <code className="text-sm text-primary">{dep.requirement}</code>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
                )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
