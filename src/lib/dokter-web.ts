import "server-only";
import { HARI, type DokterBaca, type Sesi } from "@/lib/dokter";
import { SITUS, ujungObjek, unduhMuatan } from "@/lib/situs-rspur";

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

export const ALAMAT_JADWAL = `${SITUS}/jadwal`;

type DokterSitus = {
  id: number;
  name: string;
  specialty: string;
  isActive?: boolean;
  schedules?: { day: string; startTime: string; endTime: string }[];
};

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
  const unduh = await unduhMuatan(alamat);
  if (unduh.muatan === null) return { dokter: null, pesan: unduh.pesan };

  const daftar = petikDokter(unduh.muatan);

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
