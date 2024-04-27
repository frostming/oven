import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { isBinaryFile } from 'isbinaryfile'
import { getHighlighter } from 'shiki'
import pypi from '~/lib/pypi'
import { getArchiveFile, guessLanguage } from '~/lib/server-utils'

const maxReadSize = 2 ** 20 // 1MB

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  const version = url.searchParams.get('version')
  const filename = url.searchParams.get('filename')
  const path = url.searchParams.get('path')
  invariant(name, 'No package name provided')
  invariant(version, 'No package version provided')
  invariant(filename, 'No filename provided')
  invariant(path, 'No path provided')

  const language = guessLanguage(path) || 'plaintext'

  const highlighter = await getHighlighter({
    themes: ['github-light'],
    langs: [language],
  })

  const storageFile = await pypi.getPackageFile(name, version, filename)
  const buffer = await getArchiveFile(storageFile, path)
  let errorReason = ''
  let code = ''
  if (buffer.length > maxReadSize) {
    errorReason = 'File is too large to display.'
  }
  else if (await isBinaryFile(buffer)) {
    errorReason = 'It looks like a binary file.'
  }
  else {
    code = highlighter.codeToHtml(buffer.toString('utf8'), {
      lang: language,
      theme: 'github-light',
    })
  }

  return json({ code, errorReason })
}
