import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Peran = "Admin" | "Staf";

export type PenggunaAktif = {
  authId: string;
  id: number;
  nama: string;
  jabatan: string;
  email: string;
  peran: Peran;
};

function isPeran(nilai: unknown): nilai is Peran {
  return nilai === "Admin" || nilai === "Staf";
}

/**
 * Mengambil identitas orang yang sedang login beserta perannya dari
 * tabel `pengguna`. Mengembalikan null bila belum login, bila akunnya
 * belum didaftarkan sebagai anggota manbis, atau bila sudah dinonaktifkan.
 */
export async function getPenggunaAktif(): Promise<PenggunaAktif | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("pengguna")
    .select("id, nama, jabatan, email, peran, aktif")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data || !data.aktif || !isPeran(data.peran)) return null;

  return {
    authId: user.id,
    id: data.id,
    nama: data.nama,
    jabatan: data.jabatan,
    email: data.email,
    peran: data.peran,
  };
}

/** Versi yang memaksa login — dipakai di halaman dalam aplikasi. */
export async function wajibLogin(): Promise<PenggunaAktif> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  return pengguna;
}

/** Memastikan hanya Admin yang bisa membuka halaman pengaturan. */
export async function wajibAdmin(): Promise<PenggunaAktif> {
  const pengguna = await wajibLogin();
  if (pengguna.peran !== "Admin") redirect("/tanpa-akses");
  return pengguna;
}
