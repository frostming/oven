import { useEffect, useState } from 'react'
import SvgIcon from '../SvgIcon'
import { Skeleton } from '../ui/skeleton'
import { runPythonCode } from '~/lib/pyodide'

export default function RestructuredText({ children }: { children: string }) {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')

  useEffect(() => {
    setLoading(true)
    runPythonCode(`
import readme_renderer.rst
readme_renderer.rst.render(input_text)
`, { input_text: children }).then((output: string) => {
      setOutput(output)
      setLoading(false)
    })
  }, [children])

  return (
    loading
      ? (
        <Skeleton className="h-64 flex justify-center items-center">
          <SvgIcon name="spinner" />
        </Skeleton>
        )
      : <div dangerouslySetInnerHTML={{ __html: output }}></div>
  )
}
