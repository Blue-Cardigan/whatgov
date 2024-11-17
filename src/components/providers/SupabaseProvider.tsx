'use client'

import { createClient } from '@/lib/supabase-client'
import { createContext, useContext } from 'react'

const SupabaseContext = createContext(createClient())

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
} 