import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Sumber } from "@/lib/sumber";
import { indukDiizinkan, saringTautan } from "@/lib/saring-tautan";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = SupabaseClient<any, any, any>;

/**
 * Aturan yang menyertai daftar sumber, sama untuk semua modul.
 *
 * Dipisah jadi tetapan supaya perintah ke AI dan penjelasan di
 * layar tidak bisa berbeda diam-diam — dulu keduanya ditulis
 * ulang di dua tempat, dan yang satu tertinggal saat yang lain
 * diperbaiki.
 *
 * Isi pokoknya: ALAMAT hanya boleh disalin, sedangkan NAMA
 * LEMBAGA dan NAMA PEDOMAN boleh disebut dari pengetahuan AI
 * asalkan diawali "Usulan:" dan tanpa alamat. Menyebut nama
 * pedoman memberi petunjuk mencari; menulis alamat palsu memberi
 * rasa aman palsu.
 */
const ATURAN =
  `Aturan memakai daftar di atas:\n` +
  `1. ALAMAT WEB hanya boleh diisi dengan menyalin dari daftar ini, huruf demi ` +
  `huruf. Tidak ada sumber alamat yang lain.\n` +
  `2. Sumbernya ada di daftar: salin nama lembaga, judulnya, dan tautannya apa adanya.\n` +
  `3. Sumbernya TIDAK ada di daftar: sebutkan lembaga dan nama pedoman yang Anda ` +
  `yakini memuat klaim itu, diawali kata "Usulan:", dan sebagai ganti alamat ` +
  `tulis "belum ada tautan — perlu dicek". Gunanya memberi tahu yang memeriksa ` +
  `harus mencari ke mana.\n` +
  `4. Jangan pernah menulis dari ingatan: alamat web, judul artikel jurnal ` +
  `beserta nama jurnalnya, nama penulis, tahun terbit, nomor jilid, nomor ` +
  `halaman, atau angka statistik. Kalimat yang terasa butuh angka ditulis ` +
  `"[angka perlu dicek]".\n` +
  `5. Usahakan ada rujukan nasional sekaligus internasional untuk klaim yang ` +
  `penting — pedoman Indonesia mengikat praktiknya, rujukan internasional jadi ` +
  `dasarnya.`;

/**
 * Yang nasional lebih dulu, lalu yang internasional.
 *
 * Urutannya bukan hiasan: yang disebut lebih dulu lebih sering
 * dipilih AI, dan untuk konten rumah sakit di Indonesia pedoman
 * Kemenkes memang yang seharusnya dipakai lebih dulu.
 */
function urutLingkup(daftar: Sumber[]): Sumber[] {
  const bobot = (s: Sumber) => (s.lingkup === "internasional" ? 1 : 0);
  return [...daftar].sort((a, b) => bobot(a) - bobot(b));
}

/**
 * Daftar sumber yang disisipkan ke perintah modul medis.
 *
 * Selalu disisipkan, termasuk saat daftarnya kosong — perintah
 * tanpa daftar membuat AI kembali mengarang alamat dari
 * ingatannya, dan justru itu yang dihindari.
 */
export async function daftarSumberUntukAI(klien?: Klien): Promise<string> {
  const supabase = klien ?? (await createClient());

  // Seluruh kolom, bukan daftar tetap: kolom lingkup baru ada
  // sesudah berkas SQL 54 dijalankan, dan menyebut kolom yang
  // belum ada membuat kuerinya gagal seluruhnya — daftar sumber
  // jadi kosong, lalu AI diberi tahu bahwa tidak ada sumber.
  const { data } = await supabase
    .from("sumber_rujukan")
    .select("*")
    .eq("aktif", true)
    .order("lembaga");

  const daftar = urutLingkup((data ?? []) as unknown as Sumber[]);

  if (daftar.length === 0) {
    return (
      `DAFTAR SUMBER RUJUKAN\n\n(kosong — belum ada sumber yang didaftarkan)\n\n` +
      `Karena daftarnya kosong, TIDAK ADA satu pun alamat web yang boleh Anda ` +
      `tulis. Seluruh sumber ditulis diawali kata "Usulan:", dan sebagai ganti ` +
      `alamat tulis "belum ada tautan — perlu dicek". Lembaga dan nama ` +
      `pedomannya tetap disebutkan supaya bisa dicari.`
    );
  }

  const baris = daftar
    .map(
      (s) =>
        `- Lembaga: ${s.lembaga}\n` +
        `  Judul: ${s.judul ?? "(halaman utama lembaga)"}\n` +
        `  Tautan: ${s.tautan}\n` +
        `  Lingkup: ${s.lingkup === "internasional" ? "Internasional" : "Nasional"}` +
        (s.topik ? `\n  Topik: ${s.topik}` : ""),
    )
    .join("\n");

  return `DAFTAR SUMBER RUJUKAN\n\n${baris}\n\n${ATURAN}`;
}

/**
 * Alamat sumber yang sudah didaftarkan manusia.
 *
 * Dipakai sebagai daftar induk yang sah saat menyaring alamat
 * pada naskah: yang di luar daftar ini ditandai, bukan dibiarkan
 * lewat seolah-olah sudah terbukti.
 */
export async function alamatSumberSahih(klien?: Klien): Promise<string[]> {
  const supabase = klien ?? (await createClient());

  const { data } = await supabase
    .from("sumber_rujukan")
    .select("tautan")
    .eq("aktif", true);

  return ((data ?? []) as { tautan: string }[]).map((t) => t.tautan);
}

/**
 * Menandai alamat karangan pada naskah, lalu menyisipkan catatan
 * bila ada yang ditandai.
 *
 * Catatannya ikut ke dalam naskah, bukan cuma ditampilkan sekali
 * di layar — naskah itu berpindah ke Draf Bersama, ke PDF, dan ke
 * Telegram, dan peringatan yang tertinggal di layar tidak ikut ke
 * mana-mana.
 */
export async function bersihkanAlamat(teks: string, klien?: Klien): Promise<string> {
  const izin = indukDiizinkan(await alamatSumberSahih(klien), []);
  const saring = saringTautan(teks, izin);

  if (saring.ditandai === 0) return saring.teks;

  return (
    `${saring.teks}\n\n> ${saring.ditandai} alamat pada naskah ini bukan berasal ` +
    `dari sumber terdaftar, jadi ditandai. Jangan dipakai sebelum diperiksa, dan ` +
    `yang ternyata benar silakan didaftarkan di Bahan Tema.`
  );
}
