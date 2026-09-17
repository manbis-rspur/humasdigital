import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { susunDenganAI, susunSambilMencari, type Bagian, type SumberTemuan } from "@/lib/ai";
import { susunPerintah } from "@/lib/modul-ai";
import { daftarDokterUntukAI } from "@/lib/dokter-data";
import { daftarLayananUntukAI } from "@/lib/layanan-data";
import { daftarSumberUntukAI } from "@/lib/sumber-data";
import { indukDiizinkan, saringTautan } from "@/lib/saring-tautan";
import { tanpaPagar } from "@/lib/perbaikan";
import { kunciNama } from "@/lib/jadwal-ubah";
import type { BarisKalender } from "@/lib/kalender-baris";

/**
 * Mengubah satu baris kalender jadi brief produksi.
 *
 * Formatnya TIDAK ditanyakan ulang — kolom "Format & Kanal" pada
 * barisnya sudah menyebutkannya, begitu juga tahap corong, dokter,
 * dan angle-nya. Menanyakan ulang apa yang sudah tertulis membuat
 * orang mengisi formulir dua kali untuk keterangan yang sama.
 */

const JUDUL_MODUL = "Konsep Konten";

export type HasilKonsep =
  | { hasil: string; pesan: null }
  | { hasil: null; pesan: string };

/**
 * Poliklinik tempat dokter itu praktik.
 *
 * Dicari dari daftar dokter, bukan ditebak dari nama topiknya —
 * dan kalau dokternya tidak ketemu, dibiarkan kosong. Poliklinik
 * yang salah membuat ajakan di penutup konten mengarahkan orang ke
 * tempat yang keliru.
 */
async function poliklinikDokter(nama: string): Promise<string> {
  if (nama.trim() === "") return "";

  const { data } = await createAdminClient()
    .from("dokter")
    .select("nama, poliklinik")
    .eq("aktif", true);

  const kunci = kunciNama(nama);
  const cocok = (data ?? []).find(
    (d) => kunciNama(d.nama as string) === kunci,
  ) as { poliklinik: string } | undefined;

  return cocok?.poliklinik ?? "";
}

export async function susunKonsepKonten(
  baris: BarisKalender,
  batas: { durasiVideo: number; maksCarousel: number },
  perbaikan = "",
): Promise<HasilKonsep> {
  const db = createAdminClient();

  const { data: modul } = await db
    .from("modul_ai")
    .select("*")
    .eq("judul", JUDUL_MODUL)
    .maybeSingle();

  if (!modul) {
    return {
      hasil: null,
      pesan: `Modul "${JUDUL_MODUL}" belum ada. Jalankan dulu berkas SQL 48.`,
    };
  }

  const isian: Record<string, string> = {
    tanggal: baris.tanggal,
    tahap: baris.tahap,
    pilar: baris.pilar,
    topik: baris.topik,
    format: baris.format,
    angle: baris.angle,
    dokter: baris.dokter,
    poliklinik: await poliklinikDokter(baris.dokter),
    durasi_video: String(batas.durasiVideo),
    maks_carousel: String(batas.maksCarousel),
    catatan: "",
    perbaikan,
  };

  const perintah: Bagian[] = [{ text: susunPerintah(modul.pola_perintah, isian) }];

  if (modul.pakai_layanan === true) {
    const layanan = await daftarLayananUntukAI(db);
    if (layanan) perintah.push({ text: layanan });
  }
  if (modul.pakai_dokter === true) {
    const dokter = await daftarDokterUntukAI(db);
    if (dokter) perintah.push({ text: dokter });
  }

  // Selalu disertakan, termasuk saat daftarnya kosong — perintah
  // tanpa daftar membuat AI kembali menebak dari ingatannya, dan
  // justru itu yang dihindari.
  perintah.push({ text: await daftarSumberUntukAI(db) });

  // Alamat sumber yang sudah didaftarkan manusia — selalu sahih.
  const { data: terdaftar } = await db
    .from("sumber_rujukan")
    .select("tautan")
    .eq("aktif", true);

  const alamatSahih = ((terdaftar ?? []) as { tautan: string }[]).map((t) => t.tautan);

  /**
   * Dicoba mencari dulu, baru menyusun tanpa mencari.
   *
   * Mencari membuat sumbernya datang dari halaman yang
   * benar-benar dibuka, bukan dari ingatan model — itulah
   * satu-satunya cara "sumber akurat" bisa dipenuhi AI sendiri.
   * Tapi ia menuntut penagihan Gemini aktif; tanpa itu Google
   * menolak dengan kuota habis.
   *
   * Penolakan itu bukan alasan menggagalkan seluruhnya. Yang
   * dilakukan: mundur ke cara biasa, dan konsepnya tetap jadi —
   * hanya kolom sumbernya bertulis "belum terdaftar".
   */
  let teks: string;
  let temuan: SumberTemuan[] = [];

  try {
    const dicari = await susunSambilMencari(
      [
        ...perintah,
        {
          text:
            `Anda boleh MENCARI DI WEB untuk mengisi tabel Sumber Rujukan. ` +
            `Utamakan halaman resmi Kementerian Kesehatan RI, WHO, dan ` +
            `perhimpunan dokter spesialis Indonesia. Tulis alamat yang ` +
            `BENAR-BENAR Anda buka saat mencari — jangan menuliskan alamat ` +
            `dari ingatan. Klaim yang tidak ketemu sumbernya tetap ditulis ` +
            `"belum terdaftar — tambahkan di Bahan Tema".`,
        },
      ],
      modul.instruksi_sistem,
      0.8,
    );
    teks = dicari.teks;
    temuan = dicari.sumber;
  } catch {
    try {
      teks = await susunDenganAI(perintah, modul.instruksi_sistem, 0.8);
    } catch (galat) {
      return {
        hasil: null,
        pesan: galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.",
      };
    }
  }

  const izin = indukDiizinkan(
    alamatSahih,
    temuan.map((t) => t.judul),
  );

  // Alamat yang tidak berasal dari dua daftar sahih itu ditandai,
  // bukan dibiarkan. Yang memeriksa harus tahu mana yang belum
  // terbukti.
  const saring = saringTautan(tanpaPagar(teks), izin);

  const ekor =
    temuan.length > 0
      ? `\n\n## Halaman yang Dibuka Saat Menyusun\n\n` +
        temuan.map((t) => `- ${t.judul} — ${t.tautan}`).join("\n") +
        `\n\nDaftar ini ditulis sistem dari catatan pencarian Gemini, bukan oleh AI. ` +
        `Periksa isinya sebelum dipakai, lalu daftarkan yang layak di Bahan Tema.`
      : "";

  const catatan =
    saring.ditandai > 0
      ? `\n\n> ${saring.ditandai} alamat pada naskah ini tidak berasal dari sumber ` +
        `terdaftar maupun hasil pencarian, jadi ditandai. Jangan dipakai sebelum diperiksa.`
      : "";

  return { hasil: `${saring.teks}${ekor}${catatan}`, pesan: null };
}
