// Shared Supabase client (Arin Shah, Sprint 2).
//
// Import this anywhere you need the database, Storage, or Auth:
//   import { supabase } from "../lib/supabase";
//
// Every request made through this client automatically carries the signed-in
// user's access token, so Row Level Security (auth.uid()) knows who is asking.
// That replaces the Sprint 1 "Authorization: Bearer <token>" header.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env.local and fill them in."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
