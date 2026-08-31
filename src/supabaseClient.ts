import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// getSession() は期限切れ時にネットワークを叩くので、起動判定はこのキーを同期で読む
const projectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return '';
  }
})();

export const AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`;

export const readPersistedSession = (): any | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession ?? parsed;
    return session?.user ? session : null;
  } catch {
    return null;
  }
};