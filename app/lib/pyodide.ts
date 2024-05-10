import type { PyodideInterface } from 'pyodide'
import { loadPyodide } from 'pyodide'

async function loadPyodideInstance(): Promise<PyodideInterface> {
  const pyodide = await loadPyodide({
    stderr: line => console.error(line),
  })
  await pyodide.loadPackage('micropip')
  const micropip = pyodide.pyimport('micropip')
  await micropip.install('readme_renderer')
  return pyodide
}

export const pyodidePromise = loadPyodideInstance()

export async function runPythonCode(code: string, globals?: Record<string, unknown>) {
  const pyodide = await pyodidePromise
  if (globals) {
    for (const [key, value] of Object.entries(globals))
      pyodide.globals.set(key, value)
  }
  return await pyodide.runPythonAsync(code)
}
