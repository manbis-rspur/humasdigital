import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { pastikanKunci, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Koneksi Supabase untuk kode yang berjalan di server
 * (Server Component, Route Handler, Server Action).
 * Sesi login dibaca dan disegarkan lewat cookie.
 */
export async function createClient() {
  pastikanKunci();
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component — cookie tidak bisa ditulis
            // di sini. Aman diabaikan karena proxy sudah menyegarkan sesi.
          }
        },
      },
    },
  );
}
