/**
 * Ketentuan daftar layanan rumah sakit.
 *
 * Di berkas biasa, bukan di dalam berkas server action: peramban
 * ikut memakainya, dan berkas bertanda "use server" hanya boleh
 * mengekspor fungsi async.
 */

export type Layanan = {
  id: number;
  nama: string;
  ringkasan: string | null;
  tautan: string | null;
  aktif: boolean;
  urutan: number;
};

/** Bentuk satu layanan yang baru dibaca dari situs, belum disimpan. */
export type LayananBaca = {
  nama: string;
  ringkasan: string | null;
  tautan: string | null;
};
