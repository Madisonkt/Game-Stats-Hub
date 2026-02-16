import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // In React Native, we handle deep-link URLs ourselves
    detectSessionInUrl: false,
  },
});

/**
 * Get the appropriate redirect URL for magic links.
 * Native: uses the app's URL scheme.
 * Web: uses the current origin.
 */
export function getAuthRedirectUrl(): string {
  if (Platform.OS === "web") {
    return `${window.location.origin}/auth/callback`;
  }
  // Native deep link — matches the scheme in app.json ("cheesesqueeze")
  return "cheesesqueeze://auth/callback";
}
