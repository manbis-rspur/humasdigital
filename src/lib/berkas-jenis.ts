/**
 * Jenis berkas yang bisa dibaca AI sebagai rujukan.
 *
 * Di berkas tersendiri, bukan di dalam pembacanya, karena peramban
 * pun membutuhkannya — ia memeriksa berkasnya sebelum mulai
 * mengunggah, dan berkas bertanda "server-only" tidak boleh ditarik
 * dari sana.
 */

export const JENIS_DATA = [
  ".csv",
  ".tsv",
  ".txt",
  ".xlsx",
  ".docx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ACCEPT_DATA = JENIS_DATA.join(",");

/** Berkas rekapan jarang besar; batas ini menjaga tagihan Gemini. */
export const MAKS_DATA = 15 * 1024 * 1024;

export function jenisDataDiterima(nama: string): boolean {
  const n = nama.toLowerCase();
  return JENIS_DATA.some((akhiran) => n.endsWith(akhiran));
}
