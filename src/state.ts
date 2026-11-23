/**
 * In-memory auth + session state shared across tool handlers.
 */
export interface SessionState {
  jwt: string | null;
  user: { id: string; email: string | null } | null;
}

export const state: SessionState = {
  jwt: null,
  user: null,
};

export function config() {
  const apiUrl = (process.env.ADSIQ_API_URL || "https://ads-iq.vercel.app").replace(/\/+$/, "");
  const supabaseUrl = process.env.ADSIQ_SUPABASE_URL;
  const supabaseAnonKey = process.env.ADSIQ_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "ADSIQ_SUPABASE_URL and ADSIQ_SUPABASE_ANON_KEY must be set in the environment.",
    );
  }
  return { apiUrl, supabaseUrl, supabaseAnonKey };
}
