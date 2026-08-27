import process from 'node:process'

interface PublicSupabaseConfig {
  url: string
  publishableKey: string
  secretKey?: string
}

interface SecretSupabaseConfig {
  url: string
  publishableKey?: string
  secretKey: string
}

export class SupabaseConfigurationError extends Error {}

export function getSupabaseConfig(requirement: 'public'): PublicSupabaseConfig
export function getSupabaseConfig(requirement: 'secret'): SecretSupabaseConfig
export function getSupabaseConfig(
  requirement: 'public' | 'secret',
): PublicSupabaseConfig | SecretSupabaseConfig {
  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url)
    throw new SupabaseConfigurationError('SUPABASE_URL must be configured')
  if (secretKey && !secretKey.startsWith('sb_secret_'))
    throw new SupabaseConfigurationError('SUPABASE_SECRET_KEY must be a Supabase secret key')

  const normalizedUrl = url.replace(/\/$/, '')
  if (requirement === 'public') {
    if (!publishableKey)
      throw new SupabaseConfigurationError('SUPABASE_PUBLISHABLE_KEY must be configured')
    return { url: normalizedUrl, publishableKey, secretKey }
  }

  if (!secretKey)
    throw new SupabaseConfigurationError('SUPABASE_SECRET_KEY must be configured')
  return { url: normalizedUrl, publishableKey, secretKey }
}
