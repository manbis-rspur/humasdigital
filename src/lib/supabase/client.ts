import { createBrowserClient } from "@supabase/ssr";
import { pastikanKunci, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Koneksi Supabase untuk kode yang berjalan di browser
 * (komponen dengan "use client"). Hanya memakai kunci publik.
 */
export function createClient() {
  pastikanKunci();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
