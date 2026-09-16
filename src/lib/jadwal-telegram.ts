import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ambilDariWeb } from "@/lib/dokter-web";
import { bacaPerubahanJadwal, type DokterKini } from "@/lib/ai-jadwal";
import {
  kunciNama,
  sebutPerubahan,
  sudahDiterapkan,
  type Perubahan,
} from "@/lib/jadwal-ubah";
import { hariIniWIB } from "@/lib/isu";
import type { Sesi } from "@/lib/dokter";

/**
 * Mencatat dan memeriksa perubahan jadwal dokter.
 *
 * Bot tidak menulis apa pun ke rspur.co.id — situs itulah yang
 * jadi sumber kebenaran, dan daftar dokter di sini justru ditarik
 * dari sana tiap pagi. Yang dikerjakan di sini dua hal yang selama
 * ini tidak ada: mengingat persis apa yang harus diubah, dan
 * memeriksa apakah ia benar-benar sudah berubah.
 */

/** Halaman admin situs. Bisa ditimpa lewat pengaturan bila alamatnya berubah. */
export const ADMIN_SITUS = process.env.ADMIN_RSPUR_URL ?? "https://admin.rspur.co.id";

export type HasilCatat = {
  ok: boolean;
  pesan: string;
  dicatat: Perubahan[];
  belumCocok: string[];
};

export async function catatPerubahanJadwal(
  penggunaId: number,
  instruksi: string,
): Promise<HasilCatat> {
  const db = createAdminClient();

  const { data } = await db
    .from("dokter")
    .select("id, nama, poliklinik, aktif, dokter_jadwal(hari, jam)")
    .eq("aktif", true)
    .order("poliklinik");

  const dokter = ((data ?? []) as unknown as {
    id: number;
    nama: string;
    poliklinik: string;
    dokter_jadwal: Sesi[] | null;
  }[]).map<DokterKini>((d) => ({
    id: d.id,
    nama: d.nama,
    poliklinik: d.poliklinik,
    jadwal: d.dokter_jadwal ?? [],
  }));

  const baca = await bacaPerubahanJadwal(
    instruksi,
    dokter,
    hariIniWIB().toISOString().slice(0, 10),
  );

  const peta = new Map(dokter.map((d) => [kunciNama(d.nama), d.id]));

  // Yang tidak terbaca tetap dicatat sebagai catatan mentah.
  // Instruksi yang hilang karena AI sedang penuh adalah kegagalan
  // yang paling mahal di sini — orangnya sudah merasa mencatat.
  const baris =
    baca.perubahan.length > 0
      ? baca.perubahan.map((p) => ({
          dokter_id: peta.get(kunciNama(p.dokter_nama)) ?? null,
          dokter_nama: p.dokter_nama,
          poliklinik: p.poliklinik,
          aksi: p.aksi,
          hari: p.hari,
          jam_lama: p.jam_lama,
          jam_baru: p.jam_baru,
          instruksi,
          dicatat_oleh: penggunaId,
        }))
      : [
          {
            dokter_id: null,
            dokter_nama: "(perlu dibaca sendiri)",
            poliklinik: null,
            aksi: "catatan",
            hari: null,
            jam_lama: null,
            jam_baru: null,
            instruksi,
            dicatat_oleh: penggunaId,
          },
        ];

  const { data: tersimpan, error } = await db
    .from("perubahan_jadwal")
    .insert(baris)
    .select("*");

  if (error) {
    return { ok: false, pesan: `Gagal dicatat: ${error.message}`, dicatat: [], belumCocok: [] };
  }

  return {
    ok: true,
    pesan: baca.catatan ?? "",
    dicatat: (tersimpan ?? []) as unknown as Perubahan[],
    belumCocok: baca.perubahan.filter((p) => p.belum_cocok).map((p) => p.dokter_nama),
  };
}

export type HasilPeriksa = {
  ok: boolean;
  pesan: string;
  sudah: { p: Perubahan; sekarang: string }[];
  belum: { p: Perubahan; sekarang: string }[];
  ragu: Perubahan[];
};

/**
 * Membandingkan niat perubahan dengan jadwal yang sekarang benar-
 * benar terbit di rspur.co.id.
 *
 * Dibaca langsung dari situsnya, bukan dari salinan harian di
 * sistem kita — pertanyaannya memang "sudah berubah di sana atau
 * belum", dan salinan yang berumur belasan jam tidak bisa
 * menjawabnya.
 */
export async function periksaPerubahanJadwal(): Promise<HasilPeriksa> {
  const db = createAdminClient();

  const { data: menunggu } = await db
    .from("perubahan_jadwal")
    .select("*")
    .eq("status", "Menunggu")
    .order("dicatat_pada", { ascending: true })
    .limit(30);

  const daftar = (menunggu ?? []) as unknown as Perubahan[];

  if (daftar.length === 0) {
    return { ok: true, pesan: "Tidak ada perubahan yang menunggu.", sudah: [], belum: [], ragu: [] };
  }

  const situs = await ambilDariWeb();
  if (situs.dokter === null) {
    return { ok: false, pesan: situs.pesan, sudah: [], belum: [], ragu: [] };
  }

  const peta = new Map(situs.dokter.map((d) => [kunciNama(d.nama), d]));

  const sudah: { p: Perubahan; sekarang: string }[] = [];
  const belum: { p: Perubahan; sekarang: string }[] = [];
  const ragu: Perubahan[] = [];
  const selesai: number[] = [];

  for (const p of daftar) {
    const d = peta.get(kunciNama(p.dokter_nama));

    if (!d || p.aksi === "catatan") {
      ragu.push(p);
      continue;
    }

    const hasil = sudahDiterapkan(p, d.jadwal);
    const sekarang =
      d.jadwal
        .filter((s) => s.hari === p.hari)
        .map((s) => s.jam)
        .join(", ") || "kosong";

    if (hasil === true) {
      sudah.push({ p, sekarang });
      selesai.push(p.id);
    } else if (hasil === false) {
      belum.push({ p, sekarang });
    } else {
      ragu.push(p);
    }
  }

  const kini = new Date().toISOString();

  if (selesai.length > 0) {
    await db
      .from("perubahan_jadwal")
      .update({ status: "Selesai", selesai_pada: kini, diperiksa_pada: kini })
      .in("id", selesai);
  }

  const belumSelesai = daftar.filter((p) => !selesai.includes(p.id)).map((p) => p.id);
  if (belumSelesai.length > 0) {
    await db
      .from("perubahan_jadwal")
      .update({ diperiksa_pada: kini })
      .in("id", belumSelesai);
  }

  return { ok: true, pesan: "", sudah, belum, ragu };
}

export { sebutPerubahan };
