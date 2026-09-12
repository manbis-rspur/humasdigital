import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { pastikanKunci, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Koneksi Supabase untuk kode yang berjalan di server
 * (Server Component, Route Handler, Server Action).
 * Sesi login dibaca dan disegarkan lewat cookie.
 *
 * Dibungkus cache() sehingga satu permintaan memakai satu koneksi
 * saja, betapa pun banyak tempat yang memintanya. Ini bukan sekadar
 * hemat.
 *
 * Tiap koneksi membawa pengurus sesinya sendiri, dan tiap pengurus
 * berhak menyegarkan token yang hampir kedaluwarsa. Membuka satu
 * halaman saja memanggil fungsi ini tujuh sampai delapan kali —
 * tata letak, pemeriksaan izin, identitas, lonceng, lalu halamannya
 * sendiri — dan Next.js memuat lebih dulu setiap menu di kepala
 * halaman, jadi sekali klik bisa berarti puluhan koneksi berjalan
 * berbarengan.
 *
 * Token penyegar Supabase hanya sah sekali pakai. Kalau beberapa
 * koneksi menyegarkan berbarengan dengan token yang sama, Supabase
 * menganggapnya dipakai ulang dan membatalkan seluruh sesi — tanpa
 * pesan galat apa pun. Gejalanya: orang tiba-tiba terlempar ke
 * halaman masuk, paling sering justru saat menyimpan, karena
 * menyimpan memicu banyak halaman digambar ulang sekaligus.
 */
export const createClient = cache(async function createClient() {
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
});
