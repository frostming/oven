import Markdown from './Markdown'
import RestructuredText from './RestructuredText'

interface IReadmeProps {
  contentType: 'text/markdown' | 'text/x-rst' | 'text/plain'
  children: string
}

export default function Readme({ contentType, children }: IReadmeProps) {
  return (
    <div className="p-4 prose dark:prose-invert max-w-none mx-auto">
      {contentType === 'text/plain'
        ? (
          <pre>{children}</pre>
          )
        : contentType === 'text/x-rst'
          ? (
            <RestructuredText>{children}</RestructuredText>
            )
          : (
            <Markdown>{children}</Markdown>
            )}
    </div>
  )
}
