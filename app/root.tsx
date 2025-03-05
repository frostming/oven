import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'

import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import { cssBundleHref } from '@remix-run/css-bundle'
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'
import clsx from 'clsx'
import globalStyles from './globals.css?url'
import Header from './components/Header'
import Footer from './components/Footer'
import { themeSessionResolver } from './lib/theme.server'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: globalStyles },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
]

export async function loader({ request }: LoaderFunctionArgs) {
  const { getTheme } = await themeSessionResolver(request)
  return {
    theme: getTheme(),
  }
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>()
  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction="/api/set-theme">
      <App />
    </ThemeProvider>
  )
}

export function App() {
  const data = useLoaderData<typeof loader>()
  const [theme] = useTheme()
  return (
    <html lang="en" className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"></script>
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <Outlet />
        <Footer />
        <ScrollRestoration />
        <script async src="https://umami.fming.dev/script.js" data-website-id="03cf647d-256a-40d6-a950-4fb12664a060"></script>
        <Scripts />
      </body>
    </html>
  )
}
