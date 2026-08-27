# Welcome to Oven!

![Oven logo](/app/assets/logo.svg)

📖 See the [Remix docs](https://remix.run/docs) and the [Remix Vite docs](https://remix.run/docs/en/main/guides/vite) for details on supported features.

## Development

Create a Supabase project, apply
`supabase/migrations/20260827000000_create_pypi_package_index.sql`, and configure:

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
PYPI_USER_AGENT='oven/1.0 admin@example.com'
PYPI_SYNC_TOKEN=your-random-sync-token
```

The application uses the publishable key for the read-only `search_packages`
RPC. The secret key remains server-only and is used for package-name sync and
for caching lazily fetched PyPI metadata.

Trigger the initial package-name synchronization after the application starts:

```sh
curl --fail-with-body --max-time 1800 --request POST \
  --header "Authorization: Bearer ${PYPI_SYNC_TOKEN}" \
  https://your-oven.example.com/api/sync-pypi-index
```

Configure a daily Dokploy scheduled task to send the same HTTP request. The
scheduler only needs the public application URL and `PYPI_SYNC_TOKEN`; it does
not need the Supabase secret key.

A successful request returns:

```json
{
  "package_count": 700000,
  "batch_count": 140,
  "source_serial": 30000000
}
```

The endpoint returns `409` if another sync owns the database lease. The request
waits for the complete synchronization, so the caller timeout should be long
enough for the full PyPI index. `PYPI_USER_AGENT` should identify this service
and provide an operator contact, as recommended by PyPI.

Package names are discovered through PyPI's JSON Index API. Latest versions and
short descriptions are fetched lazily from each project's JSON API when a search
result has no cached metadata or its PyPI serial has changed.

Run the Vite dev server:

```shellscript
pnpm run dev
```

## Deployment

First, build your app for production:

```sh
pnpm run build
```

Then run the app in production mode:

```sh
pnpm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `pnpm run build`

- `build/server`
- `build/client`
