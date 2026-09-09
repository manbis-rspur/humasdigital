"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Hasil } from "@/lib/hasil";

/**
 * Mengosongkan data penawaran MCU.
 *
 * Pindahan dari menu Hapus Data di Dashboard Manajemen Bisnis, ikut
 * modulnya. Penghapusannya memakai kunci penuh karena aturan
 * keamanan database sengaja TIDAK mengizinkan siapa pun menghapus
 * baris penawaran lewat jalur biasa — termasuk Admin. Jadi pintu ini
 * satu-satunya, dan penjaganya ada di sini: pemeriksaan peran,
 * penegasan yang harus diketik, dan pencatatan setelahnya.
 *
 * Daftar tarif pemeriksaan tidak ikut terhapus. Tarif itu acuan yang
 * dirawat bertahun-tahun; yang perlu dibersihkan sesudah percobaan
 * cuma penawarannya.
 */
const KUMPULAN = {
  nama: "Penawaran MCU",
  penegasan: "HAPUS PENAWARAN",
  keterangan:
    "Seluruh penawaran MCU beserta nilainya. Daftar tarif pemeriksaan tidak ikut terhapus, dan nomor surat yang terlanjur diambil tetap tercatat di buku nomor manbis.",
} as const;

export async function keteranganHapus() {
  return { ...KUMPULAN };
}

export async function hapusPenawaranMcu(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };
  if (pengguna.peran !== "Admin") {
    return { pesan: "Hanya Admin yang boleh menghapus data.", berhasil: null };
  }

  const diketik = String(formData.get("penegasan") ?? "").trim();
  if (diketik !== KUMPULAN.penegasan) {
    return {
      pesan: `Penegasannya belum cocok. Ketik persis: ${KUMPULAN.penegasan}`,
      berhasil: null,
    };
  }

  const db = createAdminClient();

  const { count } = await db
    .from("mcu_penawaran")
    .select("*", { count: "exact", head: true });

  const { error } = await db.from("mcu_penawaran").delete().gt("id", 0);
  if (error) return { pesan: `Gagal menghapus: ${error.message}`, berhasil: null };

  const jumlah = count ?? 0;

  // Dicatat di tempat yang sama dengan penghapusan lain — satu
  // riwayat untuk seluruh data unit, walaupun dashboardnya dua.
  await db.from("log_hapus_data").insert({
    jenis: "mcu",
    keterangan: KUMPULAN.nama,
    jumlah,
    oleh: pengguna.id,
    nama_oleh: pengguna.nama,
  });

  revalidatePath("/mcu");
  revalidatePath("/mcu/hapus");

  return { pesan: null, berhasil: `${KUMPULAN.nama} dikosongkan — ${jumlah} baris terhapus.` };
}
