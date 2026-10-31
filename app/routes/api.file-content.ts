import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { isBinaryFile } from 'isbinaryfile'
import pypi from '~/lib/pypi.server'
import { ArchiveFileTooLargeError, getArchiveFile, guessLanguage } from '~/lib/utils.server'

const maxReadSize = 2 ** 20 // 1MB

export interface FileContent {
  content: string
  language: string
  errorReason: string
}

// Syntax highlighting is done in the browser, as rendering the HTML for a large
// file takes hundreds of MB that the server process never gives back.
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
  const storageFile = await pypi.getPackageFile(name, version, filename)
  let buffer
  try {
    buffer = await getArchiveFile(storageFile, path, maxReadSize)
  }
  catch (error) {
    if (error instanceof ArchiveFileTooLargeError)
      return json<FileContent>({ content: '', language, errorReason: 'File is too large to display.' })
    throw error
  }

  if (await isBinaryFile(buffer))
    return json<FileContent>({ content: '', language, errorReason: 'It looks like a binary file.' })

  return json<FileContent>({ content: buffer.toString('utf8'), language, errorReason: '' })
}
