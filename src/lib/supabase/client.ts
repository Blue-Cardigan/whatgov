'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Create a single instance
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

const createClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

export default createClient;