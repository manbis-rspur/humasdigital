import { createClient } from "@/lib/supabase/server";

export type Identitas = {
  logoUrl: string | null;
  warnaUtama: string | null;
  namaUnit: string;
  /** Alamat dan kontak RS pada kop dokumen cetak. */
  alamatKop: string | null;
  /** Kop surat resmi berupa gambar. Kalau ada, ini yang dipakai. */
  kopUrl: string | null;
};

/**
 * Membaca identitas aplikasi: logo dan warna utamanya.
 *
 * Dipakai tata letak untuk menampilkan logo dan mewarnai seluruh
 * halaman. Kalau belum diatur, dikembalikan nilai kosong dan
 * aplikasi memakai warna bawaannya.
 */
export async function bacaIdentitas(): Promise<Identitas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pengaturan_sistem")
    .select("logo_url, warna_utama, nama_unit, alamat_kop, kop_url")
    .eq("id", 1)
    .maybeSingle();

  return {
    logoUrl: data?.logo_url ?? null,
    warnaUtama: data?.warna_utama ?? null,
    namaUnit: data?.nama_unit ?? "Manajemen Bisnis",
    alamatKop: data?.alamat_kop ?? null,
    kopUrl: data?.kop_url ?? null,
  };
}
