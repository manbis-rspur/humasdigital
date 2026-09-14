import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  hariIniWIB,
  selisihHari,
  urutkanUsulan,
  usulanDariHari,
  usulanDariIsu,
  type HariKesehatan,
  type IsuRamai,
  type Usulan,
} from "@/lib/isu";

/** Isu yang masa berlakunya mencakup hari ini. */
function masihBerlaku(daftar: IsuRamai[], hariIni: Date): IsuRamai[] {
  const patokan = hariIni.toISOString().slice(0, 10);
  return daftar.filter((i) => i.mulai <= patokan && (i.sampai === null || i.sampai >= patokan));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = SupabaseClient<any, any, any>;

async function ambil(klien?: Klien) {
  const supabase = klien ?? (await createClient());

  const [{ data: hari }, { data: isu }] = await Promise.all([
    supabase
      .from("hari_kesehatan")
      .select("id, nama, bulan, tanggal, lingkup, kaitan, sudut, aktif")
      .eq("aktif", true),
    supabase
      .from("isu_ramai")
      .select("id, judul, ringkasan, sudut, kaitan, sumber, mulai, sampai, aktif")
      .eq("aktif", true)
      .order("mulai", { ascending: false }),
  ]);

  return {
    hari: (hari ?? []) as unknown as HariKesehatan[],
    isu: (isu ?? []) as unknown as IsuRamai[],
  };
}

/**
 * Kartu usulan untuk panel di sebelah kotak cerita kampanye.
 *
 * Dihitung di peladen sekali saat halaman dibuka, bukan tiap
 * ketikan. Yang sedang ramai tidak berubah tiap huruf, dan panel
 * yang berkedip sewaktu orang sedang menulis justru memutus
 * pikirannya.
 */
export async function bacaUsulan(sampaiHari = 90, klien?: Klien): Promise<Usulan[]> {
  const hariIni = hariIniWIB();
  const { hari, isu } = await ambil(klien);

  return urutkanUsulan([
    ...usulanDariIsu(masihBerlaku(isu, hariIni), hariIni),
    ...usulanDariHari(hari, hariIni, sampaiHari),
  ]);
}

/**
 * Bahan yang disisipkan ke perintah AI.
 *
 * Bila rentang tanggalnya ditentukan, hari kesehatan yang dipakai
 * hanya yang jatuh di dalam rentang itu — kalender bulan Maret
 * tidak ada gunanya diberi tahu Hari Ibu.
 */
export async function usulanUntukAI(
  mulai: string,
  selesai: string,
  klien?: Klien,
): Promise<string | null> {
  const hariIni = hariIniWIB();

  const awal = /^\d{4}-\d{2}-\d{2}$/.test(mulai)
    ? new Date(`${mulai}T00:00:00Z`)
    : hariIni;
  const akhir = /^\d{4}-\d{2}-\d{2}$/.test(selesai)
    ? new Date(`${selesai}T00:00:00Z`)
    : null;

  const jangkauan = akhir ? Math.max(0, selisihHari(awal, akhir)) : 90;

  const { hari, isu } = await ambil(klien);
  const hariTerkait = usulanDariHari(hari, awal, jangkauan);
  const isuTerkait = masihBerlaku(isu, hariIni);

  if (hariTerkait.length === 0 && isuTerkait.length === 0) return null;

  const bagian: string[] = ["BAHAN USULAN TEMA"];

  if (hariTerkait.length > 0) {
    bagian.push(
      `Hari kesehatan yang jatuh pada rentang ini:\n` +
        hariTerkait
          .map(
            (h) =>
              `- ${h.kapan} — ${h.judul}` +
              (h.kaitan ? ` (layanan: ${h.kaitan})` : "") +
              (h.sudut ? `. Sudut yang diusulkan: ${h.sudut}` : ""),
          )
          .join("\n"),
    );
  }

  if (isuTerkait.length > 0) {
    bagian.push(
      `Isu kesehatan yang sedang ramai dibicarakan:\n` +
        isuTerkait
          .map(
            (i) =>
              `- ${i.judul}` +
              (i.kaitan ? ` (layanan: ${i.kaitan})` : "") +
              (i.ringkasan ? `. ${i.ringkasan}` : "") +
              (i.sudut ? ` Sudut yang diusulkan: ${i.sudut}` : ""),
          )
          .join("\n"),
    );
  }

  bagian.push(
    `Cara memakai bahan di atas:\n` +
      `1. Hari kesehatan dipakai sebagai tanggal jangkar — taruh kontennya pada ` +
      `tanggal itu, bukan digeser ke tanggal lain.\n` +
      `2. Isu yang sedang ramai ditulis sebagai EDUKASI dan arahan ke poliklinik ` +
      `yang menangani. Rumah sakit tidak menyatakan ada wabah, tidak menyebut ` +
      `jumlah kasus, tidak menakut-nakuti, dan tidak menjanjikan kesembuhan.\n` +
      `3. Untuk isu bencana seperti kabut asap atau banjir, nadanya menenangkan ` +
      `dan menolong — beri langkah yang bisa dilakukan orang di rumah, lalu ` +
      `sebutkan kapan harus ke rumah sakit.\n` +
      `4. Bahan ini usulan, bukan kewajiban. Kalau cerita kampanye yang ditulis ` +
      `sudah jelas arahnya, utamakan itu dan pakai bahan ini hanya sebagai pelengkap.`,
  );

  return bagian.join("\n\n");
}
