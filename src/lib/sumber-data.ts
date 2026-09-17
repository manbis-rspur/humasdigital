import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Sumber } from "@/lib/sumber";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = SupabaseClient<any, any, any>;

/**
 * Daftar sumber yang disisipkan ke perintah penyusun konsep.
 *
 * AI hanya boleh menyalin dari daftar ini. Kalau daftarnya kosong,
 * yang disisipkan adalah pemberitahuan bahwa ia kosong — bukan
 * tidak disisipkan apa-apa. Perintah tanpa daftar membuat AI
 * kembali menebak dari ingatannya, dan justru itu yang dihindari.
 */
export async function daftarSumberUntukAI(klien?: Klien): Promise<string> {
  const supabase = klien ?? (await createClient());

  const { data } = await supabase
    .from("sumber_rujukan")
    .select("lembaga, judul, tautan, topik, aktif")
    .eq("aktif", true)
    .order("lembaga");

  const daftar = (data ?? []) as unknown as Sumber[];

  if (daftar.length === 0) {
    return (
      `DAFTAR SUMBER RUJUKAN\n\n(kosong — belum ada sumber yang didaftarkan)\n\n` +
      `Karena daftarnya kosong, SELURUH baris pada tabel Sumber Rujukan diisi ` +
      `"belum terdaftar — tambahkan di Bahan Tema". Jangan mengisinya dengan ` +
      `sumber dari ingatan Anda dalam keadaan apa pun.`
    );
  }

  const baris = daftar
    .map(
      (s) =>
        `- Lembaga: ${s.lembaga}\n  Judul: ${s.judul ?? "(halaman utama lembaga)"}\n  Tautan: ${s.tautan}` +
        (s.topik ? `\n  Topik: ${s.topik}` : ""),
    )
    .join("\n");

  return (
    `DAFTAR SUMBER RUJUKAN\n\n${baris}\n\n` +
    `Aturan memakai daftar di atas:\n` +
    `1. Kolom Lembaga, Judul Sumber, dan Tautan pada tabel Sumber Rujukan HANYA ` +
    `boleh diisi dengan menyalin dari daftar ini, huruf demi huruf.\n` +
    `2. Klaim yang tidak tercakup daftar ini ditulis "belum terdaftar — tambahkan ` +
    `di Bahan Tema" pada ketiga kolom itu. Jangan diganti sumber lain.\n` +
    `3. Jangan menambahkan tautan, judul, tahun, atau nama penulis yang tidak ` +
    `tertulis di atas.`
  );
}
