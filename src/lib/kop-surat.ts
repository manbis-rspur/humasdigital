/**
 * Ketentuan kop surat untuk berkas PDF.
 *
 * Di berkas biasa, bukan di dalam berkas server action: peramban
 * memeriksa berkasnya sebelum mengunggah, dan berkas bertanda
 * "use server" hanya boleh mengekspor fungsi async.
 */

export const JENIS_KOP = [".png", ".jpg", ".jpeg"] as const;
export const ACCEPT_KOP = JENIS_KOP.join(",");

/** Kop yang lebih besar dari ini hampir pasti hasil pindai mentah. */
export const MAKS_KOP = 4 * 1024 * 1024;

export function jenisKopDiterima(nama: string): boolean {
  const n = nama.toLowerCase();
  return JENIS_KOP.some((akhiran) => n.endsWith(akhiran));
}

export type KopSurat = {
  id: number;
  nama: string;
  berkas_nama: string;
  bawaan: boolean;
  aktif: boolean;
};
