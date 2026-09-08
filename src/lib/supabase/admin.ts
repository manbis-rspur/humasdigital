import { createClient } from "@supabase/supabase-js";

/**
 * Koneksi Supabase dengan hak penuh (service_role) — MELEWATI RLS.
 *
 * HANYA boleh dipakai di sisi server, dan hanya untuk pekerjaan yang
 * memang tidak bisa dilakukan pengguna biasa, misalnya membuatkan akun
 * login. Setiap pemakaian WAJIB memeriksa dulu bahwa pemanggilnya Admin.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local — " +
        "pekerjaan admin tidak bisa dijalankan.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
