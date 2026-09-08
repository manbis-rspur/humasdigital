"use server";

import { revalidatePath } from "next/cache";
import { izinHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import type { Balasan } from "@/lib/hasil";

/**
 * Mengirim satu dokumen hasil ke Arsip Publikasi di Dashboard
 * Manajemen Bisnis.
 *
 * Dikirim sebagai teks, bukan berkas, supaya Koordinator bisa
 * menyuntingnya langsung di sana — dan suntingannya terlihat lagi
 * di sini, karena keduanya memakai database yang sama.
 */
export async function kirimKeArsip(
  judul: string,
  jenis: string,
  keterangan: string,
  isi: string,
): Promise<Balasan> {
  if ((await izinHumas()) === "tidak") {
    return { ok: false, pesan: "Anda tidak berhak mengirim dokumen." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("kirim_ke_arsip", {
    p_judul: judul,
    p_jenis: jenis,
    p_keterangan: keterangan,
    p_isi: isi,
  });

  if (error) return { ok: false, pesan: `Gagal dikirim: ${error.message}` };

  revalidatePath("/arsip");
  return {
    ok: true,
    pesan: "Terkirim ke Arsip Publikasi. Koordinator bisa membaca dan menyuntingnya.",
  };
}
