import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Kop } from "@/lib/markdown-pdf";

/**
 * Mengambil berkas kop surat untuk dipasang di PDF.
 *
 * Memakai kunci layanan karena dipanggil juga oleh bot Telegram,
 * yang bekerja tanpa sesi login. Isinya bukan rahasia — kop surat
 * memang tercetak di tiap dokumen yang keluar.
 */
export async function ambilKop(id?: number | null): Promise<Kop | null> {
  const db = createAdminClient();

  const kueri = db.from("kop_surat").select("nama, berkas_jalur").eq("aktif", true);

  const { data } = id
    ? await kueri.eq("id", id).maybeSingle()
    : await kueri.eq("bawaan", true).maybeSingle();

  if (!data?.berkas_jalur) return null;

  const { data: berkas } = await db.storage
    .from("dokumen")
    .download(data.berkas_jalur as string);

  if (!berkas) return null;

  return {
    isi: new Uint8Array(await berkas.arrayBuffer()),
    nama: data.nama as string,
  };
}
