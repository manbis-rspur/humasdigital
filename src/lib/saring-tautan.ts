/**
 * Menyaring alamat web yang ditulis AI.
 *
 * Model bahasa tidak menyimpan alamat; yang ia tulis bentuknya
 * benar tapi isinya belum tentu ada. Jadi tiap alamat yang muncul
 * di naskah dicocokkan dengan dua daftar yang memang sahih:
 * sumber yang didaftarkan manusia, dan halaman yang benar-benar
 * dibuka Gemini saat mencari.
 *
 * Yang tidak cocok TIDAK dihapus diam-diam, melainkan ditandai —
 * supaya yang membaca tahu ada klaim yang sumbernya belum
 * terbukti, bukan mengira tidak ada klaim sama sekali.
 */

const TANDA = "[alamat tidak terverifikasi]";

/** Nama induk sebuah alamat, tanpa "www". */
export function namaInduk(alamat: string): string | null {
  try {
    return new URL(alamat).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Daftar induk yang boleh muncul, dirangkai dari alamat yang sahih
 * dan dari judul potongan pencarian — Gemini menaruh nama induknya
 * di judul, sementara alamatnya berupa pengalihan yang bentuknya
 * tidak sama dengan yang ditulis di naskah.
 */
export function indukDiizinkan(
  alamatSahih: string[],
  judulTemuan: string[],
): Set<string> {
  const izin = new Set<string>();

  for (const a of alamatSahih) {
    const induk = namaInduk(a);
    if (induk) izin.add(induk);
  }

  for (const j of judulTemuan) {
    const bersih = j.trim().toLowerCase().replace(/^www\./, "");
    // Judul potongan hampir selalu berupa nama induk. Yang
    // berbentuk kalimat dilewati, bukan dipaksa jadi induk.
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(bersih)) izin.add(bersih);
  }

  return izin;
}

export type HasilSaring = { teks: string; ditandai: number };

export function saringTautan(teks: string, izin: Set<string>): HasilSaring {
  let ditandai = 0;

  const hasil = teks.replace(/https?:\/\/[^\s)\]|<>"']+/g, (alamat) => {
    const induk = namaInduk(alamat);
    if (induk && izin.has(induk)) return alamat;
    ditandai++;
    return TANDA;
  });

  return { teks: hasil, ditandai };
}
