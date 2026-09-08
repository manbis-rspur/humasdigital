import { createBrowserClient } from "@supabase/ssr";

/**
 * Koneksi Supabase untuk kode yang berjalan di browser
 * (komponen dengan "use client"). Hanya memakai kunci publik.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
