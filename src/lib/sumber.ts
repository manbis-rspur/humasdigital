/**
 * Daftar sumber rujukan untuk klaim medis dalam konten.
 *
 * Isinya dimasukkan manusia, bukan dikarang AI. Itulah seluruh
 * gunanya: model bahasa tidak menyimpan alamat web, jadi sumber
 * yang ia tulis sendiri bentuknya benar tapi isinya tidak ada.
 * Yang ada di sini sudah pernah dibuka orang.
 */

export type Sumber = {
  id: number;
  lembaga: string;
  judul: string | null;
  tautan: string;
  topik: string | null;
  catatan: string | null;
  aktif: boolean;
  /**
   * Rujukan nasional mengikat praktik di Indonesia; rujukan
   * internasional jadi dasar pedoman nasional itu dan bisa
   * ditelusuri lebih dalam. Konten kesehatan sebaiknya berdiri di
   * atas keduanya, jadi lingkupnya perlu dibedakan.
   */
  lingkup: Lingkup;
};

export type Lingkup = "nasional" | "internasional";

export const LINGKUP: { nilai: Lingkup; label: string }[] = [
  { nilai: "nasional", label: "Nasional" },
  { nilai: "internasional", label: "Internasional" },
];

/** Lembaga yang lazim jadi rujukan, untuk memudahkan pengisian. */
export const LEMBAGA_LAZIM = [
  "Kementerian Kesehatan RI",
  "World Health Organization",
  "IDAI — Ikatan Dokter Anak Indonesia",
  "PERKI — Perhimpunan Dokter Spesialis Kardiovaskular",
  "PAPDI — Perhimpunan Dokter Spesialis Penyakit Dalam",
  "PDPI — Perhimpunan Dokter Paru Indonesia",
  "PERDOSKI — Perhimpunan Dokter Kulit dan Kelamin",
  "POGI — Perkumpulan Obstetri dan Ginekologi Indonesia",
  "PERDOSSI — Perhimpunan Dokter Spesialis Saraf",
  "BPJS Kesehatan",
  "BPOM RI",
  "BKKBN",
  "World Health Organization",
  "CDC — Centers for Disease Control and Prevention",
  "MedlinePlus — US National Library of Medicine",
  "PubMed — US National Library of Medicine",
  "Cochrane Library",
  "NICE — National Institute for Health and Care Excellence",
  "Mayo Clinic",
  "American Heart Association",
  "American Diabetes Association",
];
