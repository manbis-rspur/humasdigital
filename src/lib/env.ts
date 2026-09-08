/**
 * Membaca kredensial Supabase dari lingkungan.
 *
 * Kalau ada yang belum terpasang, kesalahannya disebutkan
 * terang-terangan beserta nama kuncinya. Tanpa ini, kunci yang
 * lupa dipasang di Vercel hanya menghasilkan "A server error
 * occurred" — pesan yang tidak memberi tahu apa pun, dan mencari
 * sebabnya bisa memakan waktu berjam-jam.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Memastikan kunci yang dibutuhkan ada, atau menjelaskan yang kurang. */
export function pastikanKunci() {
  const kurang: string[] = [];
  if (!supabaseUrl) kurang.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) kurang.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (kurang.length > 0) {
    throw new Error(
      `Kunci berikut belum terpasang: ${kurang.join(", ")}. ` +
        "Di Vercel, isi lewat Settings → Environment Variables, lalu Redeploy — " +
        "kunci berawalan NEXT_PUBLIC_ ditanamkan saat build, jadi tidak berlaku sampai dibangun ulang.",
    );
  }
}
