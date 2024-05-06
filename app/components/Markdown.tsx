import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw, remarkGfm]}>
      {children}
    </ReactMarkdown>
  )
}
