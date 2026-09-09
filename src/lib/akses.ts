import { redirect } from "next/navigation";
import { getPenggunaAktif, type PenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Seberapa jauh seseorang boleh memakai dashboard ini.
 *
 *   penuh     — memakai semua modul dan merakit modul baru
 *   pelanggan — hanya modul berkategori Layanan Pelanggan
 *   tidak     — tidak berhak sama sekali
 *
 * Izinnya dibaca dari database yang sama dengan Dashboard
 * Manajemen Bisnis, jadi hanya ada satu daftar akun yang dirawat.
 * Menonaktifkan akun di sana ikut menutup akses ke sini.
 */
export type IzinHumas = "penuh" | "pelanggan" | "tidak";

async function bolehAkses(modul: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("boleh_akses", { p_modul: modul });
  return data === true;
}

export async function izinHumas(): Promise<IzinHumas> {
  if (await bolehAkses("humas")) return "penuh";
  if (await bolehAkses("humas_pelanggan")) return "pelanggan";
  return "tidak";
}

export async function wajibHumas(): Promise<IzinHumas> {
  const izin = await izinHumas();
  if (izin === "tidak") redirect("/tanpa-akses");
  return izin;
}

export async function wajibHumasPenuh(): Promise<void> {
  if ((await izinHumas()) !== "penuh") redirect("/tanpa-akses");
}

/**
 * Izin memakai kalkulator MCU.
 *
 * Berdiri sendiri, tidak menumpang izin humas: yang memegangnya
 * Marketing, yang tidak ada urusannya dengan modul penyusun dokumen.
 * Dashboard ini menampungnya karena kalkulatornya alat kerja
 * pemasaran, bukan karena orangnya bagian dari Humas.
 */
export async function bolehMcu(): Promise<boolean> {
  return bolehAkses("mcu");
}

export async function wajibMcu(): Promise<PenggunaAktif> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await bolehAkses("mcu"))) redirect("/tanpa-akses");
  return pengguna;
}

/**
 * Identitas orang yang sedang masuk, sekaligus memastikan berhak.
 *
 * Berhak berarti salah satu: boleh memakai modul penyusun dokumen,
 * atau boleh memakai kalkulator MCU. Pemegang izin MCU saja tetap
 * bisa masuk — yang dibatasi isi menunya, bukan pintunya.
 */
export async function penggunaBerhak(): Promise<PenggunaAktif> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");

  if ((await izinHumas()) === "tidak" && !(await bolehAkses("mcu"))) {
    redirect("/tanpa-akses");
  }

  return pengguna;
}

/** Izin menyusun laporan bulanan media sosial — khusus Digital Marketing. */
export async function bolehSosmed(): Promise<boolean> {
  return bolehAkses("sosmed");
}

export async function wajibSosmed(): Promise<PenggunaAktif> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await bolehAkses("sosmed"))) redirect("/tanpa-akses");
  return pengguna;
}
