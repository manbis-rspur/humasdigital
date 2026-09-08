/**
 * Membaca kredensial Supabase dari .env.local.
 * Kalau belum diisi, aplikasi tetap bisa dijalankan dan akan
 * menampilkan petunjuk pengisian — bukan layar error.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
