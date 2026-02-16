import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Singleton browser-side Supabase client.
 * Uses default browser localStorage for session persistence.
 */
export function createSupabaseBrowserClient() {
  if (client) return client;

  client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    }
  );

  return client;
}
