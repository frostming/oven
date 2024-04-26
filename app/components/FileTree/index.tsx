import type { SerializeFrom } from '@remix-run/node'
import { Card } from '../ui/card'
import type { Package } from '~/lib/pypi'

export default function FileTree({ pkg }: { pkg: SerializeFrom<Package> }) {
  return (
    <Card><p>File Tree</p></Card>
  )
}
