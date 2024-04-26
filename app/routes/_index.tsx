import type { MetaFunction } from '@remix-run/node'
import { Form, useNavigate } from '@remix-run/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export const meta: MetaFunction = () => {
  return [
    { title: 'Oven: Explore Python packages' },
    { name: 'description', content: 'A warehouse alternative to explore Python packages' },
  ]
}

export default function Index() {
  const navigate = useNavigate()
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
      <Form
        action="/package"
        className="flex gap-2 items-center"
        onSubmit={(event) => {
          navigate(`/package/${event.currentTarget.package.value}`)
          event.preventDefault()
        }}
      >
        <Input name="package" placeholder="Search for a package" className="text-2xl py-8 max-w-sm" />
        <Button type="submit" className="text-2xl py-8">Browse Package</Button>
      </Form>
    </main>
  )
}
