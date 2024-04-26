import { Link } from '@remix-run/react'
import type { SerializeFrom } from '@remix-run/node'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import Command from './Command'
import { Badge } from './ui/badge'
import Time from './Time'
import ExternalLink from './ExternalLink'
import type { Package } from '~/lib/pypi'
import Email from '~/assets/email.svg?react'

export default function Metadata({ pkg, version }: { pkg: SerializeFrom<Package>, version?: string }) {
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
          <p>
            Published at
            {' '}
            {pkg.published_time ? <Time time={pkg.published_time} /> : null }
          </p>
          <p className="text-lg mt-2">{pkg.summary}</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 divide-y">
          <Command text={`pip install ${pkg.name}${version ? `==${version}` : ''}`} />
          <div>
            <h3 className="text-lg font-thin my-2">Authors</h3>
            {pkg.authors.map((author, index) => (
              <p key={index}>
                {author.email
                  ? (
                    <a href={`mailto:${author.email}`} target="blank" className="hover:underline flex items-center space-x-1">
                      <span>{author.name || author.email}</span>
                      <Email className="w-4" />
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
                      <ExternalLink href={url}>{name}</ExternalLink>
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
                    {dep.extra ? <code className="text-slate-500 bg-slate-100 text-sm px-1 border-r-2">{dep.extra}</code> : null }
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
