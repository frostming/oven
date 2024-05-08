import type { MetaFunction } from '@remix-run/node'
import { useNavigate } from '@remix-run/react'
import { useRef } from 'react'
import { Search } from 'lucide-react'
import type { loader as searchLoader } from './api.search'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDebounceFetcher } from '~/lib/debounce'
import PackageList from '~/components/PackageList'
import { getOgUrl } from '~/lib/utils'

export const meta: MetaFunction = () => {
  return [
    { title: 'Oven: Explore Python packages' },
    { name: 'description', content: 'A warehouse alternative to explore Python packages' },
    { property: 'og:title', content: 'Oven: Explore Python packages' },
    { property: 'og:description', content: 'A warehouse alternative to explore Python packages' },
    { property: 'og:image', content: getOgUrl('Oven', { description: 'Explore Python packages' }) },
    { property: 'twitter:card', content: 'summary_large_image' },
    { property: 'twitter:title', content: 'Oven: Explore Python packages' },
    { property: 'twitter:description', content: 'A warehouse alternative to explore Python packages' },
    { property: 'twitter:image', content: getOgUrl('Oven', { description: 'Explore Python packages' }) },
  ]
}

export default function Index() {
  const navigate = useNavigate()
  const fetcher = useDebounceFetcher<typeof searchLoader>()
  const inputRef = useRef<HTMLInputElement>(null)

  const searchResults = inputRef.current?.value.trim() ? fetcher.data?.results ?? [] : []

  return (
    <main className="bg-cover bg-center flex-1 flex items-center justify-center flex-col gap-4 relative">
      <div className="w-full h-full absolute inset-0 bg-[url('/img/home-bg.jpg')] object-cover dark:invert -z-10" />
      <h1 className="text-8xl font-bold alig">Oven</h1>
      <h2 className="text-4xl mb-2 px-2 text-center">
        ... to
        {' '}
        <del>bake pies</del>
        {' '}
        explore Python packages
      </h2>
      <fetcher.Form
        action="/api/search"
        className="flex gap-2 items-center relative"
        onSubmit={(event) => {
          event.preventDefault()
          if (inputRef.current?.value.trim())
            navigate(`/package/${inputRef.current.value}`)
        }}
        onChange={(event) => {
          if (inputRef.current?.value.trim())
            fetcher.debounceSubmit(event.currentTarget, { debounceTimeout: 1000 })
        }}
      >
        <Input ref={inputRef} name="q" placeholder="Search for a package" className="text-2xl py-8 max-w-sm" />
        <Button type="submit" className="text-2xl py-8 flex-shrink-0">
          <Search className="lg:hidden" />
          <span className="sr-only lg:not-sr-only">Browse Package</span>
        </Button>
        {searchResults.length > 0
          ? (
            <PackageList
              className="absolute top-full left-0 w-full shadow-lg bg-background"
              packages={searchResults}
              loading={fetcher.state === 'loading'}
              onSelectChange={(pkg) => {
                if (inputRef.current)
                  inputRef.current.value = pkg.name
              }}
            />
            )
          : null}
      </fetcher.Form>
    </main>
  )
}
