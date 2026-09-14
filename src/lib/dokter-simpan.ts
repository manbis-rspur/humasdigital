import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DokterBaca } from "@/lib/dokter";

/**
 * Menanam daftar dokter ke database.
 *
 * Dipakai dua jalur: tombol di halaman Daftar Dokter, dan
 * penyelarasan harian yang berjalan sendiri. Keduanya harus
 * menanam dengan cara yang persis sama — kalau tidak, hasilnya
 * berbeda tergantung siapa yang memicunya, dan bedanya baru
 * ketahuan saat ada yang mengeluh.
 */

export type HasilTanam = { jumlah: number; pesan: string | null };

/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = SupabaseClient<any, any, any>;

/** Mengosongkan daftar. Jadwalnya ikut terhapus lewat on delete cascade. */
export async function kosongkanDokter(supabase: Klien): Promise<string | null> {
  const { error } = await supabase.from("dokter").delete().gt("id", 0);
  return error ? `Gagal mengosongkan daftar: ${error.message}` : null;
}

export async function tanamDokter(
  supabase: Klien,
  daftar: DokterBaca[],
): Promise<HasilTanam> {
  if (daftar.length === 0) return { jumlah: 0, pesan: "Tidak ada dokter untuk disimpan." };

  const baris = daftar.map((d, urutan) => ({
    poliklinik: d.poliklinik,
    nama: d.nama,
    urutan,
    // Dokter tanpa satu pun jam praktik dipadamkan, bukan dibuang.
    // Ia memang sedang tidak praktik, dan konten tidak boleh
    // mengajak orang datang menemuinya. Namanya tetap disimpan
    // supaya tidak perlu diketik ulang saat ia kembali.
    aktif: d.jadwal.length > 0,
    diubah_pada: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("dokter")
    .upsert(baris, { onConflict: "poliklinik,nama" })
    .select("id, poliklinik, nama");

  if (error) return { jumlah: 0, pesan: `Gagal menyimpan: ${error.message}` };

  const peta = new Map<string, number>();
  for (const d of data ?? []) peta.set(`${d.poliklinik}|${d.nama}`, d.id);

  const id = [...peta.values()];
  if (id.length > 0) {
    await supabase.from("dokter_jadwal").delete().in("dokter_id", id);
  }

  const sesi: { dokter_id: number; hari: number; jam: string }[] = [];
  for (const d of daftar) {
    const dokterId = peta.get(`${d.poliklinik}|${d.nama}`);
    if (!dokterId) continue;
    for (const s of d.jadwal) sesi.push({ dokter_id: dokterId, hari: s.hari, jam: s.jam });
  }

  if (sesi.length > 0) {
    const { error: galatSesi } = await supabase.from("dokter_jadwal").insert(sesi);
    if (galatSesi) {
      return { jumlah: peta.size, pesan: `Jadwalnya gagal disimpan: ${galatSesi.message}` };
    }
  }

  return { jumlah: peta.size, pesan: null };
}
