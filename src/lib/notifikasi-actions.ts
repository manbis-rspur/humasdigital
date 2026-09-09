"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Menandai lonceng sudah dibuka, supaya angka merahnya hilang.
 *
 * Lewat fungsi database, bukan update langsung: kebijakan RLS tabel
 * pengguna hanya mengizinkan Admin mengubah baris, dan itu memang
 * tidak layak dilonggarkan cuma demi satu kolom penanda.
 */
export async function tandaiKabarDibaca(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("tandai_notifikasi_dibaca");
}
