import "server-only";
import { createClient } from "@/lib/supabase/server";
import { HARI, ringkasJadwal, type Sesi } from "@/lib/dokter";

/**
 * Daftar dokter yang disisipkan ke perintah AI.
 *
 * Hanya untuk modul yang memang membutuhkannya — lihat kolom
 * pakai_dokter di tabel modul_ai. Tanpa daftar ini AI tidak punya
 * cara mengetahui siapa dokter di sini, dan kalau tetap diminta
 * menyebut nama, ia akan mengarang. Untuk sebuah rumah sakit itu
 * jauh lebih buruk daripada tidak menyebut nama sama sekali.
 */
export async function daftarDokterUntukAI(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("dokter")
    .select("poliklinik, nama, urutan, dokter_jadwal(hari, jam)")
    .eq("aktif", true)
    .order("poliklinik")
    .order("urutan");

  const daftar = (data ?? []) as unknown as {
    poliklinik: string;
    nama: string;
    dokter_jadwal: Sesi[] | null;
  }[];

  if (daftar.length === 0) return null;

  const perPoli = new Map<string, string[]>();

  for (const d of daftar) {
    const jadwal = ringkasJadwal(d.dokter_jadwal ?? []);
    const isi = perPoli.get(d.poliklinik) ?? [];
    isi.push(jadwal === "" ? `- ${d.nama}` : `- ${d.nama} — ${jadwal}`);
    perPoli.set(d.poliklinik, isi);
  }

  const tabel = [...perPoli.entries()]
    .map(([poli, isi]) => `${poli}:\n${isi.join("\n")}`)
    .join("\n\n");

  return (
    `DAFTAR DOKTER RS PERTAMEDIKA UMMI ROSNATI\n\n${tabel}\n\n` +
    `Aturan memakai daftar di atas:\n` +
    `1. Sebutkan dokter hanya bila temanya memang menyangkut polikliniknya. ` +
    `Konten tentang kesehatan anak menyebut dokter Spesialis Anak, bukan yang lain.\n` +
    `2. Nama ditulis persis seperti di daftar, lengkap dengan gelarnya. ` +
    `Jangan menyingkat, jangan memperbaiki ejaan, jangan menambah gelar.\n` +
    `3. Dokter di luar daftar ini tidak ada. Jangan mengarang nama, ` +
    `dan jangan memakai nama dokter dari rumah sakit lain.\n` +
    `4. Jam praktik hanya boleh disalin apa adanya dari daftar. Bila ragu, ` +
    `sebut poliklinik dan nama dokternya saja tanpa jam.\n` +
    `5. Bila tidak ada dokter yang cocok dengan temanya, sebut poliklinik ` +
    `yang bersangkutan tanpa nama — jangan memaksakan nama yang tidak nyambung.\n` +
    `6. Hari dalam daftar ini ditulis ${HARI[1]} sampai ${HARI[7]}.`
  );
}
