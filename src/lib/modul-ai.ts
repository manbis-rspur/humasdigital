/**
 * Bentuk satu kolom isian pada modul AI.
 *
 * Modul disimpan sebagai data, bukan kode, supaya tim bisa
 * memperbaiki susunan perintahnya sendiri. Konsekuensinya bentuk
 * formulir tiap modul berbeda-beda, dan itulah yang dijelaskan
 * oleh tipe di bawah.
 */
export type JenisKolom =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "checkbox"
  | "multiselect";

export type Kolom = {
  kunci: string;
  label: string;
  jenis: JenisKolom;
  wajib?: boolean;
  pilihan?: string[];
  bawaan?: string | string[] | boolean;
  petunjuk?: string;
  contoh?: string;
  /**
   * Menyediakan kotak isian bebas di bawah daftar pilihan, untuk
   * hal yang tidak terpikir saat modulnya dirakit. Isinya digabung
   * ke pilihan yang dicentang.
   */
  boleh_lain?: boolean;
};

/** Nama isian bebas yang menyertai sebuah kolom pilihan. */
export function kunciLain(kunci: string) {
  return `${kunci}__lain`;
}

export type ModulAI = {
  id: number;
  judul: string;
  deskripsi: string;
  kategori: string;
  ikon: string;
  instruksi_sistem: string;
  pola_perintah: string;
  kolom: Kolom[];
  bawaan: boolean;
  aktif: boolean;
  urutan: number;
};

/** Membaca daftar kolom yang tersimpan sebagai jsonb. */
export function bacaKolom(nilai: unknown): Kolom[] {
  if (!Array.isArray(nilai)) return [];
  return nilai.filter(
    (k): k is Kolom =>
      typeof k === "object" && k !== null && "kunci" in k && "label" in k,
  );
}

/**
 * Mengganti penanda {{kunci}} pada pola perintah dengan isian
 * formulir.
 *
 * Isian yang kosong diganti tanda hubung, bukan dibiarkan sebagai
 * penanda mentah — kalau tidak, AI akan mengira "{{tema}}" adalah
 * bagian dari permintaan dan ikut menuliskannya.
 */
export function susunPerintah(pola: string, isian: Record<string, string>) {
  return pola.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_cocok, kunci: string) => {
    const nilai = isian[kunci];
    return nilai && nilai.trim() !== "" ? nilai : "-";
  });
}
