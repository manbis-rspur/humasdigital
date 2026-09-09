"use client";

import { createClient } from "@/lib/supabase/client";
import type { IzinUnggah } from "@/lib/sosmed-actions";

/**
 * Mengunggah satu berkas dari peramban langsung ke penyimpanan,
 * memakai izin sekali-pakai yang diterbitkan peladen.
 *
 * Tidak lewat server action: server action hanya menerima kiriman
 * 1 MB, dan di Vercel batas kerasnya 4,5 MB — rekapan Excel atau
 * PDF dari Meta gampang melewatinya.
 */
export async function unggahLewatIzin(
  berkas: File,
  mintaIzin: (nama: string) => Promise<IzinUnggah>,
): Promise<{ jalur: string; pesan: null } | { jalur: null; pesan: string }> {
  const izin = await mintaIzin(berkas.name);
  if (izin.pesan !== null) return { jalur: null, pesan: izin.pesan };

  const { error } = await createClient()
    .storage.from("dokumen")
    .uploadToSignedUrl(izin.jalur, izin.token, berkas, {
      contentType: berkas.type || "application/octet-stream",
    });

  if (error) {
    return { jalur: null, pesan: `${berkas.name} gagal naik: ${error.message}` };
  }

  return { jalur: izin.jalur, pesan: null };
}
