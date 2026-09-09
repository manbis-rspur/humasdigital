import { createClient } from "@/lib/supabase/server";
import { getPenggunaAktif } from "@/lib/auth";
import type { NamaIkon } from "@/components/ikon";

/**
 * Kabar kegiatan — isi lonceng di pojok kanan atas.
 *
 * Tidak ada tabel notifikasi. Daftarnya dirangkai saat itu juga dari
 * tabel yang memang sudah mencatat kejadiannya: dokumen yang disusun
 * AI, laporan media sosial, dan dokumen yang sudah dikirim ke arsip
 * Dashboard Manajemen Bisnis.
 *
 * Kabar laporan media sosial hanya sampai ke yang berhak membukanya,
 * karena pertanyaannya dijawab RLS — sama seperti kalau halamannya
 * dibuka langsung.
 */

export type Kabar = {
  kunci: string;
  ikon: NamaIkon;
  judul: string;
  rincian: string;
  waktu: string;
  tautan: string;
  olehSaya: boolean;
};

export type IsiLonceng = {
  daftar: Kabar[];
  baru: number;
};

const BANYAK = 12;

const NAMA_BULAN = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function nama(nilai: unknown): string {
  const isi = Array.isArray(nilai) ? nilai[0] : nilai;
  if (isi && typeof isi === "object" && "nama" in isi) {
    return String((isi as { nama: unknown }).nama ?? "");
  }
  return "";
}

function potong(teks: string | null | undefined, batas = 70): string {
  const bersih = (teks ?? "").replace(/\s+/g, " ").trim();
  if (bersih.length <= batas) return bersih;
  return `${bersih.slice(0, batas - 1)}…`;
}

export async function bacaLonceng(): Promise<IsiLonceng> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { daftar: [], baru: 0 };

  const supabase = await createClient();

  const [{ data: saya }, { data: riwayat }, { data: laporan }, { data: arsip }] =
    await Promise.all([
      supabase
        .from("pengguna")
        .select("notifikasi_dilihat_pada")
        .eq("id", pengguna.id)
        .maybeSingle(),
      supabase
        .from("riwayat_ai")
        .select("id, modul_judul, judul, pada, oleh, pengguna(nama)")
        .order("pada", { ascending: false })
        .limit(BANYAK),
      supabase
        .from("laporan_sosmed")
        .select("id, bulan, tahun, disusun_pada, dibuat_oleh, dibuat_pada")
        .order("dibuat_pada", { ascending: false })
        .limit(BANYAK),
      supabase
        .from("publikasi")
        .select("id, judul, jenis, diunggah_pada, diunggah_oleh, pengguna(nama)")
        .order("diunggah_pada", { ascending: false })
        .limit(BANYAK),
    ]);

  const daftar: Kabar[] = [];

  for (const r of riwayat ?? []) {
    daftar.push({
      kunci: `riwayat-${r.id}`,
      ikon: "template",
      judul: `${potong(r.modul_judul, 40)} disusun`,
      rincian: `${potong(r.judul, 45)} — ${nama(r.pengguna) || "anggota unit"}`,
      waktu: r.pada,
      tautan: "/riwayat",
      olehSaya: r.oleh === pengguna.id,
    });
  }

  for (const l of laporan ?? []) {
    const bulan = NAMA_BULAN[l.bulan] ?? "";
    daftar.push({
      kunci: `laporan-${l.id}`,
      ikon: "laporan",
      judul: `Laporan media sosial ${bulan} ${l.tahun}`,
      rincian: l.disusun_pada
        ? "Naskahnya sudah tersusun"
        : "Baru dibuat, naskahnya belum disusun",
      waktu: l.disusun_pada ?? l.dibuat_pada,
      tautan: `/laporan/${l.id}`,
      olehSaya: l.dibuat_oleh === pengguna.id,
    });
  }

  for (const p of arsip ?? []) {
    daftar.push({
      kunci: `arsip-${p.id}`,
      ikon: "publikasi",
      judul: `Dokumen ${p.jenis} masuk arsip manbis`,
      rincian: `${potong(p.judul)} — ${nama(p.pengguna) || "anggota unit"}`,
      waktu: p.diunggah_pada,
      tautan: "/riwayat",
      olehSaya: p.diunggah_oleh === pengguna.id,
    });
  }

  daftar.sort((a, b) => b.waktu.localeCompare(a.waktu));
  const terbaru = daftar.slice(0, BANYAK);

  const batas = saya?.notifikasi_dilihat_pada ?? null;
  const baru = terbaru.filter(
    (k) => !k.olehSaya && (batas === null || k.waktu > batas),
  ).length;

  return { daftar: terbaru, baru };
}
