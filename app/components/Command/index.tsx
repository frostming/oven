import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import styles from './command.module.css'
import { cn } from '~/lib/utils'
import Copy from '~/assets/copy.svg?react'
import Check from '~/assets/check.svg?react'

interface ICommandProps {
  text: string
  className?: string
}

export default function Command({ text, className }: ICommandProps) {
  const [isCopied, setIsCopied] = useState(false)

  const copyText = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1000)
  }, [text, setIsCopied])

  return (
    <div className={cn('flex items-center relative', styles.command, className)}>
      <pre className="bg-gray-100 p-4 w-full overflow-x-auto">
        {text}
      </pre>
      <Button variant="outline" size="sm" className={styles.copyBtn} onClick={() => copyText()}>
        {isCopied ? <Check className="w-4" /> : <Copy className="w-4" />}
      </Button>
    </div>
  )
}
