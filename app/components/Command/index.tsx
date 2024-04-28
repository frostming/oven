import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import SvgIcon from '../SvgIcon'
import styles from './command.module.css'
import { cn } from '~/lib/utils'

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
      <pre className="bg-gray-100 p-4 w-full overflow-x-auto rounded">
        {text}
      </pre>
      <Button variant="outline" size="sm" className={styles.copyBtn} onClick={() => copyText()}>
        <SvgIcon name={isCopied ? 'check' : 'copy'} className="w-4 h-4" />
      </Button>
    </div>
  )
}
