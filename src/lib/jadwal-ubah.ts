/**
 * Niat perubahan jadwal dokter yang belum diterapkan di situs.
 *
 * Catatan ini BUKAN jadwal yang berlaku. Jadwal yang berlaku tetap
 * yang ada di rspur.co.id, dan daftar dokter di sini tetap ditarik
 * dari sana tiap pagi. Kalau catatan ini dianggap jadwal, akan ada
 * dua sumber kebenaran yang diam-diam berbeda — dan itu lebih
 * berbahaya daripada lupa.
 */

import { HARI } from "@/lib/dokter";

export const AKSI = ["tambah", "ubah", "hapus", "catatan"] as const;

export type Perubahan = {
  id: number;
  dokter_id: number | null;
  dokter_nama: string;
  poliklinik: string | null;
  aksi: string;
  hari: number | null;
  jam_lama: string | null;
  jam_baru: string | null;
  instruksi: string;
  status: string;
  dicatat_pada: string;
};

/** Bentuk satu perubahan yang baru dibaca, belum dicatat. */
export type PerubahanBaca = {
  dokter_nama: string;
  poliklinik: string | null;
  aksi: string;
  hari: number | null;
  jam_lama: string | null;
  jam_baru: string | null;
  /** Terisi bila nama dokternya tidak ketemu di daftar. */
  belum_cocok?: boolean;
};

/** Satu baris ringkasan yang enak dibaca di chat maupun di web. */
export function sebutPerubahan(p: PerubahanBaca | Perubahan): string {
  const hari = p.hari ? HARI[p.hari] : null;

  if (p.aksi === "hapus") {
    return `${hari ?? "Jadwal"} ${p.jam_lama ?? ""} → dihapus`.replace(/\s+/g, " ").trim();
  }

  if (p.aksi === "tambah") {
    return `${hari ?? "Jadwal"} ${p.jam_baru ?? ""} → ditambah`.replace(/\s+/g, " ").trim();
  }

  if (p.aksi === "ubah") {
    return `${hari ?? "Jadwal"} ${p.jam_lama ?? "?"} → ${p.jam_baru ?? "?"}`;
  }

  return "Perlu diperiksa sendiri";
}

/**
 * Apakah sebuah niat perubahan sudah terlihat di jadwal yang
 * sekarang berlaku di situs.
 *
 * Diputuskan dengan perbandingan lurus, bukan ditanyakan ke AI.
 * Pertanyaan "sudah berubah atau belum" harus punya jawaban yang
 * sama tiap kali ditanyakan.
 */
export function sudahDiterapkan(
  p: Perubahan,
  jadwalSekarang: { hari: number; jam: string }[],
): boolean | null {
  if (p.aksi === "catatan" || p.hari === null) return null;

  const punya = (jam: string | null) =>
    jam !== null && jadwalSekarang.some((s) => s.hari === p.hari && s.jam === jam);

  if (p.aksi === "hapus") return !punya(p.jam_lama);
  if (p.aksi === "tambah") return punya(p.jam_baru);
  if (p.aksi === "ubah") return punya(p.jam_baru) && !punya(p.jam_lama);

  return null;
}

/** Menyamakan nama dokter yang ejaannya sedikit berbeda. */
export function kunciNama(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/\b(prof|dr|drg|sp|k|m|ked|s|e|st)\b\.?/g, " ")
    .replace(/[^a-z]/g, "");
}
