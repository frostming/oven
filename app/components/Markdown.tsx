import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
      {children}
    </ReactMarkdown>
  )
}
