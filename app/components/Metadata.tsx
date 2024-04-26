import { useEffect } from 'react'
import { Link } from '@remix-run/react'
import type { SerializeFrom } from '@remix-run/node'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import Command from './Command'
import { Badge } from './ui/badge'
import Time from './Time'
import type { Package } from '~/lib/pypi'
import ExternalIcon from '~/assets/external.svg?react'
import Email from '~/assets/email.svg?react'

export default function Metadata({ pkg, version }: { pkg: SerializeFrom<Package>, version?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <a href={pkg.package_url} target="_blank" className="hover:underline flex space-x-2 items-baseline">
              <div className="flex items-center gap-2">
                <span>{pkg.name}</span>
                <ExternalIcon className="w-4" />
              </div>
              <span className="text-sm text-slate-400">{pkg.version}</span>
            </a>
            {pkg.yanked ? <Badge variant="destructive">YANKED</Badge> : null}
          </div>
        </CardTitle>
        <CardDescription>
          <p>
            Published at
            {' '}
            <Time time={pkg.published_time} />
          </p>
          <p className="text-lg mt-2">{pkg.summary}</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 divide-y">
          <Command text={`pip install ${pkg.name}${version ? `==${version}` : ''}`} />
          <div>
            <h3 className="text-lg font-semibold">Authors</h3>
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
          <div>
            <h3 className="text-lg font-semibold">Requires Python</h3>
            <p>{pkg.requires_python}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Dependencies</h3>
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
