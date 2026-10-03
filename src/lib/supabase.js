import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '');
const supabasePublishableKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_PUBLISHABLE_KEY : '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey
);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Supabase] Vite Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.'
  );
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export default supabase;

