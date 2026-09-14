"use server";

import { revalidatePath } from "next/cache";
import { izinHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import type { Balasan } from "@/lib/hasil";

/**
 * Menyimpan suntingan pada dokumen hasil susunan AI.
 *
 * Yang tersimpan menimpa naskah sebelumnya, bukan menambah revisi.
 * Riwayat di sini memang catatan "apa yang dipakai", bukan catatan
 * setiap perubahan — dan yang perlu riwayat perubahan sudah punya
 * tempatnya sendiri di Draf Bersama dan di Arsip Publikasi.
 */
export async function simpanSuntingan(id: number, hasil: string): Promise<Balasan> {
  if ((await izinHumas()) === "tidak") {
    return { ok: false, pesan: "Anda tidak berhak menyunting dokumen ini." };
  }
  if (hasil.trim() === "") {
    return { ok: false, pesan: "Dokumennya kosong — tidak ada yang bisa disimpan." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("riwayat_ai")
    .update({ hasil, diubah_pada: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}` };

  revalidatePath("/riwayat");
  return { ok: true, pesan: "Suntingan tersimpan." };
}

/** Menyimpan tautan Google Docs milik dokumen ini. */
export async function simpanTautanDocs(id: number, tautan: string): Promise<Balasan> {
  if ((await izinHumas()) === "tidak") {
    return { ok: false, pesan: "Anda tidak berhak mengubah dokumen ini." };
  }

  const bersih = tautan.trim();
  if (bersih !== "" && !bersih.startsWith("https://")) {
    return { ok: false, pesan: "Tautannya harus dimulai dengan https://" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("riwayat_ai")
    .update({ tautan_docs: bersih === "" ? null : bersih })
    .eq("id", id);

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}` };

  revalidatePath("/riwayat");
  return {
    ok: true,
    pesan: bersih === "" ? "Tautan dilepas." : "Tautan tersimpan di dokumen ini.",
  };
}
