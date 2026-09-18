"use server";

import { revalidatePath } from "next/cache";
import { izinHumas } from "@/lib/akses";
import { mintaPerbaikan, type HasilPerbaikan } from "@/lib/perbaikan";
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

/**
 * Meminta AI memperbaiki dokumen riwayat.
 *
 * Hasilnya TIDAK langsung disimpan. Yang meminta harus melihatnya
 * dulu dan boleh membatalkan; menyimpan sendiri berarti dokumen
 * yang tadinya benar bisa tertimpa tanpa sempat diperiksa.
 */
export async function perbaikiDokumen(
  riwayatId: number,
  naskah: string,
  permintaan: string,
): Promise<HasilPerbaikan> {
  if ((await izinHumas()) === "tidak") {
    return { hasil: null, pesan: "Anda tidak berhak mengubah dokumen ini." };
  }

  const supabase = await createClient();

  const { data: riwayat } = await supabase
    .from("riwayat_ai")
    .select("*")
    .eq("id", riwayatId)
    .maybeSingle();

  if (!riwayat) return { hasil: null, pesan: "Dokumennya tidak ditemukan lagi." };

  // Modulnya boleh saja sudah dihapus. Dokumennya tetap bisa
  // diperbaiki — yang hilang cuma aturan susunan khas modul itu.
  const { data: modul } = riwayat.modul_id
    ? await supabase.from("modul_ai").select("*").eq("id", riwayat.modul_id).maybeSingle()
    : { data: null };

  return mintaPerbaikan({
    namaDokumen: riwayat.modul_judul,
    instruksi: modul?.instruksi_sistem ?? null,
    pakaiDokter: modul?.pakai_dokter === true,
    pakaiLayanan: modul?.pakai_layanan === true,
    pakaiIsu: modul?.pakai_isu === true,
    pakaiSumber: modul?.pakai_sumber === true,
    // Belum ada penandanya berarti dokumen lama, dan seluruh
    // dokumen lama memang untuk RSPUR.
    untukRspur: riwayat.untuk_rspur !== false,
    instansi: riwayat.instansi ?? null,
    naskah,
    permintaan,
  });
}
