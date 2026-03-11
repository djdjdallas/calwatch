import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service role key.
 * Used in OG image routes and generateMetadata which run server-side only.
 * NEVER import this in client components.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

export const supabaseServer =
  supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null
