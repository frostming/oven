import { useCallback, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import { Button } from '../ui/button'
import SvgIcon from '../SvgIcon'
import styles from './command.module.css'
import { cn } from '~/lib/utils'

interface ICommandProps {
  name: string
  version?: string
  className?: string
}

type PackageManager = 'pip' | 'pdm' | 'rye' | 'poetry'

export default function Command({ name, version, className }: ICommandProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [packageManager, setPackageManager] = useState<PackageManager>('pip')

  const text = useMemo(() => {
    const nameVersion = version ? `${name}==${version}` : name
    switch (packageManager) {
      case 'pip':
        return `pip install ${nameVersion}`
      case 'pdm':
        return `pdm add ${nameVersion}`
      case 'rye':
        return `rye add ${nameVersion}`
      case 'poetry':
        return `poetry add ${nameVersion}`
    }
  }, [name, version, packageManager])

  const copyText = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1000)
  }, [text, setIsCopied])

  return (
    <Tabs defaultValue={packageManager} onValueChange={value => setPackageManager(value as PackageManager)} className={cn('rounded bg-muted', className)}>
      <TabsList className="inline-flex h-9 items-center text-muted-foreground w-full justify-start rounded-none border-b bg-transparent p-0">
        {['pip', 'pdm', 'rye', 'poetry'].map(manager => (
          <TabsTrigger
            value={manager}
            key={manager}
            className="inline-flex items-center justify-center whitespace-nowrap pt-3 pb-2 px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative h-9 rounded-none border-b-2 border-b-transparent text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            {manager}
          </TabsTrigger>
        ))}
      </TabsList>
      {['pip', 'pdm', 'rye', 'poetry'].map(manager => (
        <TabsContent key={manager} value={manager} className={cn('relative', styles.command)}>
          <Button className={cn('absolute top-2 right-1 py-1 px-2', styles.copyBtn)} onClick={() => copyText(text)} variant="outline">
            <SvgIcon name={isCopied ? 'check' : 'copy'} className="w-4 h-4" />
          </Button>
          <pre className="pr-2 pl-3 py-4">{text}</pre>
        </TabsContent>
      ))}
    </Tabs>
  )
}
