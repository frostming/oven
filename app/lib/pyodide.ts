interface PyodideInterface {
  loadPackage: (name: string) => Promise<void>
  runPythonAsync: (code: string) => Promise<any>
  pyimport: (name: string) => any
  globals: Map<string, any>
}

declare global {
  interface Window {
    loadPyodide: (_config: { indexURL?: string, stderr: (line: string) => void }) => Promise<PyodideInterface>
  }
}

async function loadPyodideInstance(): Promise<PyodideInterface> {
  const pyodide = await window.loadPyodide({
    stderr: line => console.error(line),
  })
  await pyodide.loadPackage('micropip')
  const micropip = pyodide.pyimport('micropip')
  await micropip.install('readme_renderer')
  return pyodide
}
export async function runPythonCode(code: string, globals?: Record<string, unknown>) {
  const pyodide = await loadPyodideInstance()
  if (globals) {
    for (const [key, value] of Object.entries(globals))
      pyodide.globals.set(key, value)
  }
  return await pyodide.runPythonAsync(code)
}
