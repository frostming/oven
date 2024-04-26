import { Form, Link, useNavigate } from '@remix-run/react'
import { Input } from './ui/input'
import Logo from '~/assets/logo.svg'
import GitHub from '~/assets/github.svg?react'

interface IHeaderProps {
  showSearch?: boolean
}

export default function Header({ showSearch = true }: IHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="px-6 py-4 flex gap-4 flex-row justify-between items-center shadow shadow-gray-200">
      <Link to="/" className="flex flex-row gap-4 items-center">
        <img src={Logo} alt="Plaza logo" className="w-12 h-12" />
        <h1 className="text-4xl">Plaza</h1>
      </Link>
      <div className="flex flex-row gap-4 items-center">
        {showSearch && (
          <Form
            action="package"
            onSubmit={(event) => {
              navigate(`/package/${event.currentTarget.package.value}`)
              event.preventDefault()
            }}
          >
            <Input type="search" name="package" placeholder="Search packages" className="p-2 rounded-lg border border-primay-300" />
          </Form>
        )}
        <a href="https://github.com/frostming/plaza.git">
          <GitHub />
        </a>
      </div>
    </header>
  )
}
