import type { HighlightRequest, HighlightResponse } from './highlight.worker'

interface PendingRequest {
  resolve: (html: string) => void
  reject: (error: Error) => void
}

let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, PendingRequest>()

function getWorker() {
  if (worker)
    return worker
  worker = new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<HighlightResponse>) => {
    const request = pending.get(data.id)
    pending.delete(data.id)
    if (data.html !== undefined)
      request?.resolve(data.html)
    else
      request?.reject(new Error(data.error))
  }
  worker.onerror = (event) => {
    // Start a fresh worker for the next request.
    worker?.terminate()
    worker = undefined
    for (const request of pending.values())
      request.reject(new Error(event.message))
    pending.clear()
  }
  return worker
}

/** Highlight the code in a Web Worker, so that large files don't block the page. */
export function highlight(code: string, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, code, language } satisfies HighlightRequest)
  })
}
