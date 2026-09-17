import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { susunDenganAI, type Bagian } from "@/lib/ai";
import { susunPerintah } from "@/lib/modul-ai";
import { daftarDokterUntukAI } from "@/lib/dokter-data";
import { daftarLayananUntukAI } from "@/lib/layanan-data";
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

  try {
    const hasil = await susunDenganAI(perintah, modul.instruksi_sistem, 0.8);
    return { hasil: tanpaPagar(hasil), pesan: null };
  } catch (galat) {
    return {
      hasil: null,
      pesan: galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.",
    };
  }
}
