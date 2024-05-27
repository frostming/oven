import { Link, useFetcher } from '@remix-run/react'
import type { SerializeFrom } from '@remix-run/node'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import Command from './Command'
import { Badge } from './ui/badge'
import Time from './Time'
import ExternalLink from './ExternalLink'
import SvgIcon from './SvgIcon'
import DownloadChart from './DownloadChart'
import { Skeleton } from './ui/skeleton'
import type { Package } from '~/lib/pypi.server'
import { getIcon } from '~/lib/utils'

interface IMetadataProps {
  pkg: SerializeFrom<Package>
  version?: string
}

export default function Metadata({ pkg, version }: IMetadataProps) {
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
            <ul>
              {pkg.dependencies.map((dep, index) => (
                <li key={index}>
                  <Link to={`/package/${dep.name.toLowerCase()}`} className="hover:underline">
                    <span className="font-semibold text-primary">{dep.name}</span>
                    {dep.extra ? <code className="text-sm px-1 border-r-2 text-secondary-foreground bg-secondary">{dep.extra}</code> : null }
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
