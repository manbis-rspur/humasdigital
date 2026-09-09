"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehMcu } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import type { Hasil } from "@/lib/hasil";
import type { RincianItem } from "@/lib/mcu";

async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pengguna: null, galat: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (!(await bolehMcu())) {
    return { pengguna: null, galat: "Anda tidak berhak membuka Kalkulator MCU." };
  }
  return { pengguna, galat: null };
}

function angka(formData: FormData, nama: string) {
  const n = Number(String(formData.get(nama) ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Menambah atau menyunting satu pemeriksaan. */
export async function simpanPemeriksaan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = Number(formData.get("id")) || null;
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { pesan: "Nama pemeriksaan harus diisi.", berhasil: null };

  const isi = {
    nama,
    tarif: angka(formData, "tarif"),
    cost: angka(formData, "cost"),
    diubah_pada: new Date().toISOString(),
    diubah_oleh: pengguna.id,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("mcu_item").update(isi).eq("id", id)
    : await supabase.from("mcu_item").insert(isi);

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  revalidatePath("/mcu/pemeriksaan");
  return { pesan: null, berhasil: `${nama} tersimpan.` };
}

/**
 * Menonaktifkan satu pemeriksaan.
 *
 * Bukan dihapus: penawaran lama menyimpan salinan rinciannya
 * sendiri, tapi daftar tetap perlu jejak bahwa pemeriksaan itu
 * pernah ada — dan sewaktu-waktu bisa diaktifkan lagi.
 */
export async function ubahAktifPemeriksaan(formData: FormData) {
  const { pengguna } = await pastikanBerhak();
  if (!pengguna) return;

  const supabase = await createClient();
  await supabase
    .from("mcu_item")
    .update({ aktif: formData.get("aktif") === "true" })
    .eq("id", Number(formData.get("id")));

  revalidatePath("/mcu/pemeriksaan");
}

/**
 * Menyimpan penawaran baru.
 *
 * Rincian pemeriksaan disalin ke dalam barisnya, bukan disambung
 * ke daftar tarif. Dengan begitu penawaran yang sudah dibuat tidak
 * ikut berubah ketika tarif dinaikkan bulan depan.
 */
export async function simpanPenawaran(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const rekanan = String(formData.get("rekanan") ?? "").trim();
  if (!rekanan) return { pesan: "Nama rekanan harus diisi.", berhasil: null };

  let rincian: RincianItem[];
  try {
    rincian = JSON.parse(String(formData.get("rincian") ?? "[]"));
  } catch {
    return { pesan: "Rincian pemeriksaan tidak terbaca.", berhasil: null };
  }

  if (!Array.isArray(rincian) || rincian.length === 0) {
    return { pesan: "Pilih dulu pemeriksaan yang termasuk paket.", berhasil: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcu_penawaran")
    .insert({
      rekanan,
      jenis_pemeriksaan: String(formData.get("jenis_pemeriksaan") ?? "").trim() || null,
      jumlah_peserta: Math.max(1, angka(formData, "jumlah_peserta")),
      harga_paket: angka(formData, "harga_paket"),
      kena_ppn: formData.get("kena_ppn") === "Ya",
      ppn_persen: Number(formData.get("ppn_persen")) || 11,
      rincian,
      catatan: String(formData.get("catatan") ?? "").trim() || null,
      tanggal_surat: String(formData.get("tanggal_surat") ?? "") || undefined,
      dibuat_oleh: pengguna.id,
    })
    .select("id")
    .single();

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  redirect(`/mcu/${data.id}`);
}

/**
 * Menerbitkan penawaran: mengambil nomor surat keluar dari buku
 * nomor manbis, lalu menandai penawarannya terbit.
 *
 * Nomornya diambil di sini, bukan diketik di formulir, supaya
 * penawaran tercatat di buku yang sama dengan surat keluar lain —
 * dan tidak mungkin kembar dengan surat yang diambil orang lain
 * pada saat yang sama.
 */
export async function terbitkanPenawaran(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { data: penawaran } = await supabase
    .from("mcu_penawaran")
    .select("id, rekanan, nomor_id, tanggal_surat")
    .eq("id", id)
    .maybeSingle();

  if (!penawaran) return { pesan: "Penawaran tidak ditemukan.", berhasil: null };
  if (penawaran.nomor_id) {
    return { pesan: "Penawaran ini sudah punya nomor surat.", berhasil: null };
  }

  const { data: jenis } = await supabase
    .from("jenis_dokumen")
    .select("id")
    .eq("kode", "SURAT")
    .maybeSingle();

  if (!jenis) {
    return {
      pesan: "Jenis dokumen Surat Keluar tidak ditemukan di pengaturan penomoran.",
      berhasil: null,
    };
  }

  const { data: nomor, error: galatNomor } = await supabase
    .from("nomor")
    .insert({
      jenis_id: jenis.id,
      perihal: `Penawaran MCU — ${penawaran.rekanan}`,
      ditujukan_kepada: penawaran.rekanan,
      tanggal_surat: penawaran.tanggal_surat,
      diambil_oleh: pengguna.id,
    })
    .select("id, nomor_lengkap")
    .single();

  if (galatNomor) {
    return { pesan: `Nomor surat gagal diambil: ${galatNomor.message}`, berhasil: null };
  }

  const { error } = await supabase
    .from("mcu_penawaran")
    .update({ nomor_id: nomor.id, status: "Terbit", diubah_pada: new Date().toISOString() })
    .eq("id", id);

  if (error) return { pesan: `Gagal menandai terbit: ${error.message}`, berhasil: null };

  revalidatePath(`/mcu/${id}`);
  revalidatePath("/mcu");
  // Buku nomornya sendiri ada di Dashboard Manajemen Bisnis, aplikasi
  // yang berbeda — halamannya di sana disegarkan saat dibuka, bukan
  // dari sini. Nomornya tetap satu buku karena databasenya satu.

  return { pesan: null, berhasil: `Terbit dengan nomor ${nomor.nomor_lengkap}.` };
}

/** Mengubah status penawaran — disetujui rekanan, atau batal. */
export async function ubahStatusPenawaran(formData: FormData) {
  const { pengguna } = await pastikanBerhak();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");

  const supabase = await createClient();
  await supabase
    .from("mcu_penawaran")
    .update({ status, diubah_pada: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/mcu/${id}`);
  revalidatePath("/mcu");
}

/** Versi ringkas untuk baris tabel yang disimpan satu per satu. */
export async function simpanBarisPemeriksaan(formData: FormData) {
  await simpanPemeriksaan({ pesan: null, berhasil: null }, formData);
}
