import type { BundledLanguage, Highlighter } from 'shiki'
import { getHighlighter } from 'shiki'

export interface HighlightRequest {
  id: number
  code: string
  language: string
}

export interface HighlightResponse {
  id: number
  html?: string
  error?: string
}

let highlighterPromise: Promise<Highlighter> | undefined

async function getSharedHighlighter(language: string) {
  highlighterPromise ??= getHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [],
  }).catch((error) => {
    highlighterPromise = undefined
    throw error
  })
  const highlighter = await highlighterPromise
  if (language !== 'plaintext' && !highlighter.getLoadedLanguages().includes(language))
    await highlighter.loadLanguage(language as BundledLanguage)
  return highlighter
}

const scope = globalThis as unknown as Worker

scope.onmessage = async ({ data }: MessageEvent<HighlightRequest>) => {
  const response: HighlightResponse = { id: data.id }
  try {
    const highlighter = await getSharedHighlighter(data.language)
    response.html = highlighter.codeToHtml(data.code, {
      lang: data.language,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    })
  }
  catch (error) {
    response.error = error instanceof Error ? error.message : String(error)
  }
  scope.postMessage(response)
}
