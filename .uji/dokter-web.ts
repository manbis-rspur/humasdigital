
import { HARI, type DokterBaca, type Sesi } from "../src/lib/dokter.ts";

/**
 * Mengambil daftar dokter langsung dari situs rspur.co.id.
 *
 * Lebih baik daripada berkas Excel, dan alasannya bukan soal
 * kemudahan: situs itulah yang dibaca pasien. Kalau daftar di sini
 * berbeda dengan yang di sana, yang salah hampir selalu yang di
 * sini — dan konten yang menyebut dokter yang sudah tidak
 * diumumkan lagi membuat orang datang percuma.
 *
 * Halaman jadwalnya dibangun Next.js, dan data dokternya ikut
 * tertanam di dalam halaman sebagai JSON. Jadi yang dibaca di sini
 * data aslinya, bukan tulisan hasil penggambaran — susunan
 * tampilan boleh berubah tanpa merusak pembacaan ini.
 */

export const ALAMAT_JADWAL = "https://rspur.co.id/jadwal";

type DokterSitus = {
  id: number;
  name: string;
  specialty: string;
  isActive?: boolean;
  schedules?: { day: string; startTime: string; endTime: string }[];
};

/**
 * Merangkai kembali muatan yang ditanam Next.js di dalam halaman.
 *
 * Muatannya dipecah jadi banyak potongan, tiap potongan sebuah
 * tulisan JavaScript berisi teks yang sudah dilolosi. Disambung
 * dulu, baru bisa dibaca.
 */
function rangkaiMuatan(html: string): string {
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
function ujungObjek(teks: string, mulai: number): number {
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

function petikDokter(muatan: string): DokterSitus[] {
  const hasil = new Map<number, DokterSitus>();
  let i = 0;

  for (;;) {
    i = muatan.indexOf('{"id":', i);
    if (i === -1) break;

    const ujung = ujungObjek(muatan, i);
    if (ujung === -1) break;

    try {
      const obj = JSON.parse(muatan.slice(i, ujung)) as DokterSitus;
      if (obj && obj.name && obj.specialty && Array.isArray(obj.schedules)) {
        hasil.set(obj.id, obj);
      }
    } catch {
      // Bukan objek dokter. Bukan kesalahan — muatan itu berisi
      // banyak hal lain juga.
    }

    i += 6;
  }

  return [...hasil.values()];
}

/** "08:30" jadi "08.30", supaya sebentuk dengan yang dari Excel. */
function rapikanJam(mulai: string, selesai: string): string | null {
  const pola = /^(\d{1,2})[.:](\d{2})$/;
  const a = pola.exec(mulai.trim());
  const b = pola.exec(selesai.trim());
  if (!a || !b) return null;

  const dua = (n: string) => n.padStart(2, "0");
  return `${dua(a[1])}.${a[2]} - ${dua(b[1])}.${b[2]}`;
}

function nomorHari(nama: string): number {
  const bersih = nama.trim().toLowerCase().replace(/['’]/g, "");
  const nomor = HARI.findIndex((h) => h !== "" && h.toLowerCase() === bersih);
  // Situsnya menulis "Jumat"; ejaan "Jum'at" dan "Jumaat" ikut
  // diterima supaya perubahan ejaan di sana tidak menghilangkan
  // satu hari penuh tanpa pemberitahuan.
  if (nomor > 0) return nomor;
  if (bersih.startsWith("jum")) return 5;
  return 0;
}

/**
 * Nama poliklinik dari sebutan di situs.
 *
 * "Dokter Spesialis Anak" jadi "Spesialis Anak" — yang disimpan di
 * sini nama polikliniknya, bukan sebutan orangnya.
 */
function namaPoli(specialty: string): string {
  return specialty.replace(/^Dokter\s+/i, "").trim() || "Lainnya";
}

export type HasilWeb =
  | { dokter: DokterBaca[]; pesan: null }
  | { dokter: null; pesan: string };

export async function ambilDariWeb(alamat = ALAMAT_JADWAL): Promise<HasilWeb> {
  let html: string;

  try {
    const jawaban = await fetch(alamat, {
      headers: { "User-Agent": "Dashboard Humas RSPUR (sinkron jadwal dokter)" },
      // Selalu ambil yang terbaru. Salinan lama justru kebalikan
      // dari gunanya menyambung ke situs.
      cache: "no-store",
    });

    if (!jawaban.ok) {
      return { dokter: null, pesan: `Situsnya menjawab ${jawaban.status}. Coba lagi nanti.` };
    }

    html = await jawaban.text();
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : String(galat);
    return { dokter: null, pesan: `Tidak bisa menghubungi rspur.co.id: ${pesan}` };
  }

  const daftar = petikDokter(rangkaiMuatan(html));

  if (daftar.length === 0) {
    return {
      dokter: null,
      pesan:
        "Halaman jadwalnya terbaca, tapi tidak ada data dokter di dalamnya. " +
        "Susunan situsnya mungkin berubah — kabari saya, dan sementara ini " +
        "daftar lama tetap dipakai.",
    };
  }

  const hasil: DokterBaca[] = [];

  for (const d of daftar) {
    if (d.isActive === false) continue;

    const jadwal: Sesi[] = [];
    for (const s of d.schedules ?? []) {
      const hari = nomorHari(s.day);
      const jam = rapikanJam(s.startTime, s.endTime);
      if (hari > 0 && jam) jadwal.push({ hari, jam });
    }

    jadwal.sort((a, b) => a.hari - b.hari || a.jam.localeCompare(b.jam));
    hasil.push({ poliklinik: namaPoli(d.specialty), nama: d.name.trim(), jadwal });
  }

  hasil.sort(
    (a, b) => a.poliklinik.localeCompare(b.poliklinik) || a.nama.localeCompare(b.nama),
  );

  return { dokter: hasil, pesan: null };
}
