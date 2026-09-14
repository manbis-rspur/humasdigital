"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { LINGKUP } from "@/lib/isu";
import type { Hasil } from "@/lib/hasil";

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function isiAtauNull(formData: FormData, nama: string) {
  const nilai = isi(formData, nama);
  return nilai === "" ? null : nilai;
}

function segarkan() {
  revalidatePath("/isu");
  // Panel usulan di halaman modul ikut disegarkan, kalau tidak
  // isu yang baru ditambah belum muncul di sana sampai halamannya
  // kedaluwarsa sendiri.
  revalidatePath("/modul/[id]", "page");
}

async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pengguna: null, galat: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (!(await punyaIzin("humas"))) {
    return { pengguna: null, galat: "Hanya Humas dan Digital Marketing yang bisa mengubah ini." };
  }
  return { pengguna, galat: null };
}

/** Menambah atau memperbaiki satu hari kesehatan. */
export async function simpanHariKesehatan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { galat } = await pastikanBerhak();
  if (galat) return { pesan: galat, berhasil: null };

  const nama = isi(formData, "nama");
  const bulan = Number(formData.get("bulan"));
  const tanggal = Number(formData.get("tanggal"));

  if (nama === "") return { pesan: "Nama harinya harus diisi.", berhasil: null };
  if (!(bulan >= 1 && bulan <= 12) || !(tanggal >= 1 && tanggal <= 31)) {
    return { pesan: "Tanggalnya belum benar.", berhasil: null };
  }

  const lingkup = isi(formData, "lingkup");
  const isian = {
    nama,
    bulan,
    tanggal,
    lingkup: (LINGKUP as readonly string[]).includes(lingkup) ? lingkup : "Internasional",
    kaitan: isiAtauNull(formData, "kaitan"),
    sudut: isiAtauNull(formData, "sudut"),
    aktif: formData.get("aktif") !== null,
  };

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("hari_kesehatan").update(isian).eq("id", id)
    : await supabase.from("hari_kesehatan").insert(isian);

  if (error) {
    return {
      pesan:
        error.code === "23505"
          ? `"${nama}" pada tanggal itu sudah ada.`
          : `Gagal disimpan: ${error.message}`,
      berhasil: null,
    };
  }

  segarkan();
  return { pesan: null, berhasil: `${nama} tersimpan.` };
}

/** Menambah atau memperbaiki satu isu yang sedang ramai. */
export async function simpanIsu(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const judul = isi(formData, "judul");
  if (judul === "") return { pesan: "Judul isunya harus diisi.", berhasil: null };

  const sumber = isi(formData, "sumber");
  if (sumber !== "" && !sumber.startsWith("https://")) {
    return { pesan: "Tautan sumbernya harus dimulai dengan https://", berhasil: null };
  }

  const mulai = isi(formData, "mulai");
  const sampai = isi(formData, "sampai");
  if (sampai !== "" && mulai !== "" && sampai < mulai) {
    return { pesan: "Tanggal berakhirnya mendahului tanggal mulai.", berhasil: null };
  }

  const isian = {
    judul,
    ringkasan: isiAtauNull(formData, "ringkasan"),
    sudut: isiAtauNull(formData, "sudut"),
    kaitan: isiAtauNull(formData, "kaitan"),
    sumber: sumber === "" ? null : sumber,
    mulai: mulai === "" ? new Date().toISOString().slice(0, 10) : mulai,
    sampai: sampai === "" ? null : sampai,
    aktif: formData.get("aktif") !== null,
  };

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("isu_ramai").update(isian).eq("id", id)
    : await supabase.from("isu_ramai").insert({ ...isian, dibuat_oleh: pengguna.id });

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  segarkan();
  return { pesan: null, berhasil: `"${judul}" tersimpan.` };
}

/** Menyalakan atau memadamkan satu baris, tanpa membuka formulir. */
export async function ubahAktifBahan(formData: FormData) {
  if ((await pastikanBerhak()).galat) return;

  const id = Number(formData.get("id"));
  const tabel = isi(formData, "tabel");
  if (!id || (tabel !== "hari_kesehatan" && tabel !== "isu_ramai")) return;

  const supabase = await createClient();
  await supabase
    .from(tabel)
    .update({ aktif: isi(formData, "aktif") === "ya" })
    .eq("id", id);

  segarkan();
}

export async function hapusBahan(formData: FormData) {
  if ((await pastikanBerhak()).galat) return;

  const id = Number(formData.get("id"));
  const tabel = isi(formData, "tabel");
  if (!id || (tabel !== "hari_kesehatan" && tabel !== "isu_ramai")) return;

  const supabase = await createClient();
  await supabase.from(tabel).delete().eq("id", id);

  segarkan();
}
