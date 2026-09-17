import "server-only";

/**
 * Membaca lebar dan tinggi gambar dari beberapa bita pertamanya.
 *
 * Dibutuhkan karena pembuat PDF meminta ukuran gambar disebutkan,
 * dan di peladen tidak ada peramban yang bisa memuat gambar untuk
 * menanyakannya. Memasang ukuran tebakan membuat kop surat
 * gepeng atau melar — dan kop yang gepeng lebih buruk daripada
 * tidak ada kop.
 */

export type UkuranGambar = { lebar: number; tinggi: number; jenis: "PNG" | "JPEG" };

export function bacaUkuranGambar(isi: Uint8Array): UkuranGambar | null {
  // PNG: delapan bita tanda pengenal, lalu blok IHDR yang empat
  // bita pertamanya lebar dan empat berikutnya tinggi.
  if (
    isi.length > 24 &&
    isi[0] === 0x89 &&
    isi[1] === 0x50 &&
    isi[2] === 0x4e &&
    isi[3] === 0x47
  ) {
    const baca = (mulai: number) =>
      (isi[mulai] << 24) | (isi[mulai + 1] << 16) | (isi[mulai + 2] << 8) | isi[mulai + 3];
    return { lebar: baca(16) >>> 0, tinggi: baca(20) >>> 0, jenis: "PNG" };
  }

  // JPEG: ditelusuri penandanya sampai ketemu penanda awal bingkai
  // (SOF), yang memuat ukurannya.
  if (isi.length > 4 && isi[0] === 0xff && isi[1] === 0xd8) {
    let i = 2;
    while (i + 9 < isi.length) {
      if (isi[i] !== 0xff) {
        i++;
        continue;
      }

      const penanda = isi[i + 1];
      const panjang = (isi[i + 2] << 8) | isi[i + 3];

      const awalBingkai =
        penanda >= 0xc0 &&
        penanda <= 0xcf &&
        penanda !== 0xc4 &&
        penanda !== 0xc8 &&
        penanda !== 0xcc;

      if (awalBingkai) {
        return {
          tinggi: (isi[i + 5] << 8) | isi[i + 6],
          lebar: (isi[i + 7] << 8) | isi[i + 8],
          jenis: "JPEG",
        };
      }

      if (panjang <= 0) return null;
      i += 2 + panjang;
    }
  }

  return null;
}
