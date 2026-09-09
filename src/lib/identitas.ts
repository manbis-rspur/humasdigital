import { createClient } from "@/lib/supabase/server";

export type Identitas = {
  logoUrl: string | null;
  warnaUtama: string | null;
};

/**
 * Logo dan warna dashboard ini.
 *
 * Disimpan pada kolom tersendiri, terpisah dari milik Dashboard
 * Manajemen Bisnis — keduanya dashboard yang berbeda, dan mengganti
 * tampilan yang satu tidak seharusnya mengubah yang lain.
 */
export async function bacaIdentitas(): Promise<Identitas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pengaturan_sistem")
    .select("logo_humas_url, warna_humas")
    .eq("id", 1)
    .maybeSingle();

  return {
    logoUrl: data?.logo_humas_url ?? null,
    warnaUtama: data?.warna_humas ?? null,
  };
}


/**
 * Kop surat resmi rumah sakit.
 *
 * Dibaca dari kolom yang sama dengan yang dipakai Dashboard
 * Manajemen Bisnis — kop surat milik rumah sakit, bukan milik salah
 * satu dashboard, jadi tidak boleh ada dua versi yang bisa berbeda.
 * Diatur di sana, dipakai di sini.
 */
export type Kop = {
  kopUrl: string | null;
  logoUrl: string | null;
  alamatKop: string | null;
};

export async function bacaKop(): Promise<Kop> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pengaturan_sistem")
    .select("kop_url, logo_url, alamat_kop")
    .eq("id", 1)
    .maybeSingle();

  return {
    kopUrl: data?.kop_url ?? null,
    logoUrl: data?.logo_url ?? null,
    alamatKop: data?.alamat_kop ?? null,
  };
}
