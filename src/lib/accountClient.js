import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Creates a throwaway Supabase client that does NOT save its session.
 *
 * Why this exists: supabase.auth.signUp() normally logs you in as the brand
 * new account. So when an admin creates a teacher or student login, the admin
 * would get kicked out of their own session. This client keeps its session in
 * memory only, so the admin stays logged in as the admin.
 */
export const createAccountClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
