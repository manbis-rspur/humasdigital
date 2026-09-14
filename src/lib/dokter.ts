/**
 * Ketentuan daftar dokter spesialis.
 *
 * Di berkas biasa, bukan di dalam berkas server action: peramban
 * ikut memakainya, dan berkas bertanda "use server" hanya boleh
 * mengekspor fungsi async.
 */

/** 1 = Senin ... 7 = Minggu, sama seperti di tabel dokter_jadwal. */
export const HARI = [
  "",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

export const ACCEPT_DOKTER = ".xlsx";
export const MAKS_DOKTER = 10 * 1024 * 1024;

export type Sesi = { hari: number; jam: string };

export type Dokter = {
  id: number;
  poliklinik: string;
  nama: string;
  aktif: boolean;
  catatan: string | null;
  urutan: number;
};

export type DokterJadwal = Dokter & { jadwal: Sesi[] };

/** Bentuk satu dokter yang baru dibaca dari Excel, belum disimpan. */
export type DokterBaca = {
  poliklinik: string;
  nama: string;
  jadwal: Sesi[];
};

/** Satu lembar dalam berkas jadwal, beserta dokter yang terbaca di sana. */
export type LembarDokter = {
  nama: string;
  dokter: DokterBaca[];
};

/**
 * Menyusun jadwal jadi satu baris terbaca: "Senin 08.00 - 12.00,
 * 14.00 - 16.00 · Rabu 09.00 - 11.00".
 */
export function ringkasJadwal(jadwal: Sesi[]): string {
  const perHari = new Map<number, string[]>();

  for (const s of jadwal) {
    const isi = perHari.get(s.hari) ?? [];
    isi.push(s.jam);
    perHari.set(s.hari, isi);
  }

  return [...perHari.keys()]
    .sort((a, b) => a - b)
    .map((h) => `${HARI[h]} ${perHari.get(h)!.join(", ")}`)
    .join(" · ");
}

/** Mengelompokkan dokter menurut poliklinik, urutannya dipertahankan. */
export function kelompokPoli<T extends { poliklinik: string }>(
  daftar: T[],
): { poliklinik: string; isi: T[] }[] {
  const peta = new Map<string, T[]>();

  for (const d of daftar) {
    const isi = peta.get(d.poliklinik) ?? [];
    isi.push(d);
    peta.set(d.poliklinik, isi);
  }

  return [...peta.entries()].map(([poliklinik, isi]) => ({ poliklinik, isi }));
}
