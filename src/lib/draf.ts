/**
 * Ketentuan draf bersama Humas dan Digital Marketing.
 *
 * Di berkas biasa, bukan di dalam berkas server action: peramban
 * membutuhkannya untuk memeriksa berkas sebelum mengunggah, dan
 * berkas bertanda "use server" hanya boleh mengekspor fungsi async.
 */

/**
 * Tahap kerja sebuah draf.
 *
 * Dulu bernama "Siap kirim" dan "Terkirim", menurut pengiriman ke
 * Arsip Manbis yang sekarang sudah dihapus. Nama yang tertinggal
 * itu berbohong — ia menjanjikan ada yang dikirim ke suatu tempat,
 * padahal tidak ada, dan orang baru akan mencarinya sampai
 * menyerah.
 */
export const STATUS_DRAF = [
  "Digarap",
  "Minta ditinjau",
  "Disepakati",
  "Selesai",
] as const;

export const JENIS_DRAF = [
  "Siaran Pers",
  "Kalender Konten",
  "Rencana Acara",
  "Klarifikasi & Krisis",
  "Naskah Video",
  "Desain",
  "Laporan Media Sosial",
  "Lainnya",
] as const;

export const JENIS_BERKAS_DRAF = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ACCEPT_DRAF = JENIS_BERKAS_DRAF.join(",");

/** Batas satu berkas draf. Video ditaruh di Drive lalu ditempel tautannya. */
export const MAKS_DRAF = 15 * 1024 * 1024;

export function jenisBerkasDrafDiterima(nama: string): boolean {
  const n = nama.toLowerCase();
  return JENIS_BERKAS_DRAF.some((akhiran) => n.endsWith(akhiran));
}

export function ukuranRapi(bita: number | null | undefined): string {
  if (!bita) return "";
  if (bita < 1024 * 1024) return `${Math.round(bita / 1024)} KB`;
  return `${(bita / 1024 / 1024).toFixed(1)} MB`;
}

export function warnaStatusDraf(status: string): string {
  if (status === "Selesai") return "bg-hijau-muda text-hijau";
  if (status === "Disepakati") return "bg-[#dce4ec] text-[#2f4e6b]";
  if (status === "Minta ditinjau") return "bg-[#f6efe2] text-oker";
  return "bg-permukaan-2 text-tinta-2";
}

export type Draf = {
  id: number;
  judul: string;
  keterangan: string | null;
  jenis: string;
  status: string;
  /** Naskah teks, untuk draf yang datang langsung dari modul AI. */
  isi: string | null;
  berkas_nama: string | null;
  berkas_ukuran: number | null;
  tautan: string | null;
  publikasi_id: number | null;
  dibuat_pada: string;
  diubah_pada: string | null;
};
