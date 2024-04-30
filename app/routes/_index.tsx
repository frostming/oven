import type { MetaFunction } from '@remix-run/node'
import { useNavigate } from '@remix-run/react'
import { useRef } from 'react'
import type { loader as searchLoader } from './api.search'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDebounceFetcher } from '~/lib/debounce'
import PackageList from '~/components/PackageList'

export const meta: MetaFunction = () => {
  return [
    { title: 'Oven: Explore Python packages' },
    { name: 'description', content: 'A warehouse alternative to explore Python packages' },
  ]
}

export default function Index() {
  const navigate = useNavigate()
  const fetcher = useDebounceFetcher<typeof searchLoader>()
  const inputRef = useRef<HTMLInputElement>(null)

  const searchResults = inputRef.current?.value.trim() ? fetcher.data?.results ?? [] : []

  return (
    <main className="bg-cover bg-center bg-slate-300 flex-1 flex items-center justify-center flex-col gap-4 bg-[url('/img/home-bg.jpg')]">
      <h1 className="text-8xl font-bold alig">Oven</h1>
      <h2 className="text-4xl mb-2">
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
        <Button type="submit" className="text-2xl py-8">Browse Package</Button>
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
