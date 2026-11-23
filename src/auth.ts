import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, state } from "./state.js";

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = config();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign_in failed: ${error.message}`);
  if (!data.session) throw new Error("sign_in failed: no session returned");
  state.jwt = data.session.access_token;
  state.user = { id: data.user!.id, email: data.user!.email ?? null };
  return { user: state.user };
}

export async function signOut() {
  try {
    await supabase().auth.signOut();
  } catch {
    /* non-fatal */
  }
  state.jwt = null;
  state.user = null;
  return { ok: true };
}

export function whoami() {
  return { user: state.user };
}

/** Attempt to refresh the Supabase session if the SDK still has one. */
export async function refreshJwt(): Promise<string | null> {
  const { data } = await supabase().auth.refreshSession();
  if (data.session) {
    state.jwt = data.session.access_token;
    return state.jwt;
  }
  return null;
}
