import "server-only";

/**
 * Membaca data yang ditanam Next.js di dalam halaman rspur.co.id.
 *
 * Dipakai bersama oleh pembaca daftar dokter dan pembaca daftar
 * layanan. Keduanya membaca data aslinya, bukan tulisan hasil
 * penggambaran — susunan tampilan situs boleh berubah tanpa
 * merusak pembacaan ini.
 */

export const SITUS = "https://rspur.co.id";

/**
 * Merangkai kembali muatan yang ditanam di dalam halaman.
 *
 * Muatannya dipecah jadi banyak potongan, tiap potongan sebuah
 * tulisan JavaScript berisi teks yang sudah dilolosi. Disambung
 * dulu, baru bisa dibaca.
 */
export function rangkaiMuatan(html: string): string {
  const potongan = html.matchAll(
    /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g,
  );

  let isi = "";
  for (const p of potongan) {
    try {
      isi += JSON.parse(p[1]) as string;
    } catch {
      // Potongan yang tidak terbaca dilewati; satu potongan rusak
      // tidak boleh membatalkan seluruh pengambilan.
    }
  }
  return isi;
}

/** Akhir objek JSON yang dimulai di titik tertentu, atau -1. */
export function ujungObjek(teks: string, mulai: number): number {
  let dalam = 0;
  let diTulisan = false;
  let lolos = false;

  for (let i = mulai; i < teks.length; i++) {
    const huruf = teks[i];

    if (diTulisan) {
      if (lolos) lolos = false;
      else if (huruf === "\\") lolos = true;
      else if (huruf === '"') diTulisan = false;
      continue;
    }

    if (huruf === '"') diTulisan = true;
    else if (huruf === "{") dalam++;
    else if (huruf === "}") {
      dalam--;
      if (dalam === 0) return i + 1;
    }
  }

  return -1;
}

export type HasilUnduh =
  | { muatan: string; pesan: null }
  | { muatan: null; pesan: string };

/** Mengambil satu halaman situs, lalu merangkai muatannya. */
export async function unduhMuatan(alamat: string): Promise<HasilUnduh> {
  try {
    const jawaban = await fetch(alamat, {
      headers: { "User-Agent": "Dashboard Humas RSPUR (sinkron data situs)" },
      // Selalu ambil yang terbaru. Salinan lama justru kebalikan
      // dari gunanya menyambung ke situs.
      cache: "no-store",
    });

    if (!jawaban.ok) {
      return { muatan: null, pesan: `Situsnya menjawab ${jawaban.status}. Coba lagi nanti.` };
    }

    return { muatan: rangkaiMuatan(await jawaban.text()), pesan: null };
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : String(galat);
    return { muatan: null, pesan: `Tidak bisa menghubungi rspur.co.id: ${pesan}` };
  }
}
