import ExternalLink from './ExternalLink'

export default function Footer() {
  return (
    <footer className="flex items-stretch py-8 bg-slate-900 text-slate-50 divide-x divide-slate-200">
      <div className="flex justify-center flex-1">
        <p>
          © 2024
          {' '}
          <ExternalLink href="https://github.com/frostming">Frost Ming</ExternalLink>
        </p>
      </div>
      <div className="flex-1 text-center">
        <h2 className="mb-2">Links</h2>
        <ul>
          <li>
            <ExternalLink href="https://python.org">Python website</ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://pypi.org">PyPI warehouse</ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://pypi-browser.org">PyPI Browser</ExternalLink>
          </li>
        </ul>
      </div>
    </footer>
  )
}
