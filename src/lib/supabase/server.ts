import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Koneksi Supabase untuk kode yang berjalan di server
 * (Server Component, Route Handler, Server Action).
 * Sesi login dibaca dan disegarkan lewat cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
