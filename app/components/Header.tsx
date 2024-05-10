import { Link, useNavigate, useNavigation } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import { Input } from './ui/input'
import SvgIcon from './SvgIcon'
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import PackageList from './PackageList'
import Key from './Key'
import ThemeToggle from './ThemeToggle'
import Logo from '~/assets/logo.svg'
import { getPlatform } from '~/lib/utils'
import type { loader as searchLoader } from '~/routes/api.search'
import { useDebounceFetcher } from '~/lib/debounce'

export default function Header() {
  const navigate = useNavigate()
  const navigation = useNavigation()
  const ref = useRef<HTMLInputElement>(null)
  const fetcher = useDebounceFetcher<typeof searchLoader>()
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

  useEffect(() => {
    const isAppleDevice = /(Mac|iPhone|iPod|iPad)/i.test(getPlatform())

    const handleKeyDown = (event: KeyboardEvent) => {
      const mutated = isAppleDevice ? event.metaKey : event.ctrlKey
      if (mutated && event.key === 'k') {
        if (
          (event.target instanceof HTMLElement && event.target.isContentEditable)
          || event.target instanceof HTMLInputElement
          || event.target instanceof HTMLTextAreaElement
          || event.target instanceof HTMLSelectElement
        )
          return

        event.preventDefault()
        setSearchDialogOpen(open => !open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (navigation.state === 'loading' && searchDialogOpen)
      setSearchDialogOpen(false)
  }, [navigation.state, searchDialogOpen])

  const listData = ref.current?.value.trim() ? fetcher.data?.results ?? [] : []

  return (
    <header className="px-6 py-4 flex gap-4 flex-row justify-between items-center shadow shadow-gray-200">
      <Link to="/" className="flex flex-row gap-4 items-center">
        <img src={Logo} alt="Oven logo" className="w-12 h-12" />
        <h1 className="text-4xl hidden lg:block">Oven</h1>
      </Link>
      <div className="flex flex-row gap-4 items-center">
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogTrigger>
            <Button variant="outline" className="p-2 flex items-center gap-2">
              <span>Search packages...</span>
              <Key>
                <span className="mr-0.5">⌘</span>
                K
              </Key>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <fetcher.Form
              action="/api/search"
              onChange={(event) => {
                if (ref.current?.value.trim())
                  fetcher.debounceSubmit(event.currentTarget, { debounceTimeout: 1000 })
              }}
              onSubmit={(event) => {
                event.preventDefault()
                if (!ref.current?.value.trim())
                  return
                navigate(`/package/${ref.current.value}`)
                setSearchDialogOpen(false)
              }}
            >
              <Input type="search" name="q" placeholder="Search packages..." ref={ref} />
            </fetcher.Form>
            <PackageList
              packages={listData}
              loading={fetcher.state === 'loading'}
              onSelectChange={(pkg) => {
                if (ref.current)
                  ref.current.value = pkg.name
              }}
              onEnter={() => setSearchDialogOpen(false)}
            />
            <DialogFooter>
              <div className="text-sm">
                <span className="mr-2">
                  <Key>↑</Key>
                  {' '}
                  <Key>↓</Key>
                  {' '}
                  to navigate
                </span>
                <span>
                  <Key>Esc</Key>
                  {' '}
                  to close
                </span>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <a href="https://github.com/frostming/oven.git">
          <SvgIcon name="github" />
        </a>
        <ThemeToggle />
      </div>
    </header>
  )
}
