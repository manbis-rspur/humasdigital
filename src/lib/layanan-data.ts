import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Layanan } from "@/lib/layanan";

/**
 * Daftar layanan yang disisipkan ke perintah AI.
 *
 * Pendamping daftar dokter. Dokter menjawab "siapa", layanan
 * menjawab "apa yang kita punya" — dan tanpa yang kedua, layanan
 * yang tidak punya poli sendiri tidak pernah terangkat: Medical
 * Check Up, Radiologi, Laboratorium, Ambulans, pelayanan BPJS.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = SupabaseClient<any, any, any>;

export async function daftarLayananUntukAI(klien?: Klien): Promise<string | null> {
  const supabase = klien ?? (await createClient());

  const { data } = await supabase
    .from("layanan")
    .select("nama, ringkasan, aktif, urutan")
    .eq("aktif", true)
    .order("urutan");

  const daftar = (data ?? []) as unknown as Layanan[];
  if (daftar.length === 0) return null;

  const baris = daftar
    .map((l) => (l.ringkasan ? `- ${l.nama} — ${l.ringkasan}` : `- ${l.nama}`))
    .join("\n");

  return (
    `LAYANAN RS PERTAMEDIKA UMMI ROSNATI\n\n${baris}\n\n` +
    `Aturan memakai daftar di atas:\n` +
    `1. Hanya layanan di daftar ini yang boleh disebut ada. Jangan mengarang ` +
    `layanan, alat, atau fasilitas yang tidak tertulis.\n` +
    `2. Pakai keterangan di sebelah namanya sebagai pegangan isi — di situlah ` +
    `bedanya satu layanan dengan yang lain.\n` +
    `3. Ratakan sorotannya. Layanan yang jarang diumumkan — Medical Check Up, ` +
    `Radiologi, Laboratorium, Ambulans, pelayanan BPJS — layak mendapat giliran, ` +
    `bukan hanya poliklinik yang itu-itu saja.\n` +
    `4. Jangan menjanjikan hasil pengobatan, dan jangan membandingkan dengan ` +
    `rumah sakit lain.`
  );
}
