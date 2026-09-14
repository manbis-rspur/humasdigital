import "server-only";
import { SITUS, ujungObjek, unduhMuatan } from "@/lib/situs-rspur";
import type { LayananBaca } from "@/lib/layanan";

/**
 * Mengambil daftar layanan dari halaman Layanan rspur.co.id.
 *
 * Daftar resminya disiarkan situs dalam bentuk schema.org —
 * keterangan baku yang memang dibuat untuk dibaca mesin, jadi
 * susunannya jauh lebih tahan perubahan tampilan daripada menebak
 * dari tulisan di layar.
 *
 * Kalimat pengenal tiap layanan tidak ikut di sana, jadi dipungut
 * terpisah dari muatan halamannya. Kalau tidak ketemu, layanannya
 * tetap tersimpan tanpa keterangan — nama layanan yang benar
 * tanpa kalimat pengenal masih jauh lebih berguna daripada tidak
 * ada sama sekali.
 */

export const ALAMAT_LAYANAN = `${SITUS}/layanan`;

type Butir = { "@type"?: string; name?: string; url?: string };

function daftarResmi(muatan: string): Butir[] {
  let i = 0;

  for (;;) {
    i = muatan.indexOf('{"@context":"https://schema.org"', i);
    if (i === -1) return [];

    const ujung = ujungObjek(muatan, i);
    if (ujung === -1) return [];

    try {
      const obj = JSON.parse(muatan.slice(i, ujung)) as {
        "@graph"?: { "@type"?: string; availableService?: Butir[] }[];
      };

      for (const simpul of obj["@graph"] ?? []) {
        if (Array.isArray(simpul.availableService) && simpul.availableService.length > 0) {
          return simpul.availableService;
        }
      }
    } catch {
      // Bukan keterangan baku yang dicari. Lanjut mencari.
    }

    i = ujung;
  }
}

/**
 * Kalimat pengenal sebuah layanan.
 *
 * Dicari sesudah tempat namanya tergambar: di kartu layanan,
 * judulnya selalu mendahului kalimat pengenalnya. Yang diambil
 * tulisan panjang pertama sesudah itu — yang pendek biasanya
 * label tombol seperti "Selengkapnya".
 */
function ringkasanUntuk(muatan: string, nama: string): string | null {
  const tanda = `"children":${JSON.stringify(nama)}`;
  const mulai = muatan.indexOf(tanda);
  if (mulai === -1) return null;

  const jendela = muatan.slice(mulai + tanda.length, mulai + tanda.length + 3000);

  for (const m of jendela.matchAll(/"children":("(?:[^"\\]|\\.)*")/g)) {
    try {
      const isi = JSON.parse(m[1]) as string;
      if (isi.trim().length >= 40) return isi.trim();
    } catch {
      // Bukan tulisan biasa. Lanjut.
    }
  }

  return null;
}

export type HasilLayananWeb =
  | { layanan: LayananBaca[]; pesan: null }
  | { layanan: null; pesan: string };

export async function ambilLayananDariWeb(
  alamat = ALAMAT_LAYANAN,
): Promise<HasilLayananWeb> {
  const unduh = await unduhMuatan(alamat);
  if (unduh.muatan === null) return { layanan: null, pesan: unduh.pesan };

  const butir = daftarResmi(unduh.muatan);

  if (butir.length === 0) {
    return {
      layanan: null,
      pesan:
        "Halaman layanannya terbaca, tapi daftar layanannya tidak ditemukan. " +
        "Susunan situsnya mungkin berubah — kabari saya, dan sementara ini " +
        "daftar lama tetap dipakai.",
    };
  }

  const hasil: LayananBaca[] = [];
  const sudah = new Set<string>();

  for (const b of butir) {
    const nama = (b.name ?? "").trim();
    if (nama === "" || sudah.has(nama.toLowerCase())) continue;
    sudah.add(nama.toLowerCase());

    hasil.push({
      nama,
      ringkasan: ringkasanUntuk(unduh.muatan, nama),
      tautan: b.url?.startsWith("https://") ? b.url : null,
    });
  }

  return { layanan: hasil, pesan: null };
}
