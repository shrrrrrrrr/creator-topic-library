import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REMEMBER_LOGIN_KEY = "media-tool.auth.rememberLogin";

let cachedClient: SupabaseClient | null = null;

function shouldRememberLogin() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";
}

function getAuthStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    getItem: (key: string) =>
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
    setItem: (key: string, value: string) => {
      const storage = shouldRememberLogin()
        ? window.localStorage
        : window.sessionStorage;

      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
      storage.setItem(key, value);
    },
    removeItem: (key: string) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export function setRememberLoginPreference(rememberLogin: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REMEMBER_LOGIN_KEY, String(rememberLogin));
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: getAuthStorage(),
      },
    });
  }

  return cachedClient;
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: getAuthStorage(),
      },
    })
  : null;
