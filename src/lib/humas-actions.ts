"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { izinHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { susunDenganAI } from "@/lib/ai";
import { bacaKolom, kunciLain, susunPerintah } from "@/lib/modul-ai";

export type HasilSusun = {
  pesan: string | null;
  hasil: string | null;
  judul: string;
  riwayatId: number | null;
};

/**
 * Menjalankan satu modul: menyusun perintah dari isian formulir,
 * mengirimnya ke Gemini, lalu menyimpan hasilnya sebagai riwayat
 * milik tim.
 */
export async function jalankanModul(
  _s: HasilSusun,
  formData: FormData,
): Promise<HasilSusun> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna || (await izinHumas()) === "tidak") {
    return {
      pesan: "Anda tidak berhak memakai modul ini.",
      hasil: null,
      judul: "",
      riwayatId: null,
    };
  }

  const modulId = Number(formData.get("modul_id"));
  const supabase = await createClient();

  const { data: modul } = await supabase
    .from("modul_ai")
    .select("id, judul, instruksi_sistem, pola_perintah, kolom")
    .eq("id", modulId)
    .maybeSingle();

  if (!modul)
    return { pesan: "Modul tidak ditemukan.", hasil: null, judul: "", riwayatId: null };

  const kolom = bacaKolom(modul.kolom);
  const isian: Record<string, string> = {};

  for (const k of kolom) {
    if (k.jenis === "multiselect") {
      const semua = formData.getAll(k.kunci).map(String).filter(Boolean);

      // Isian bebas digabung ke pilihan yang dicentang, dipisah
      // koma seperti yang lain — dari sisi perintah keduanya tidak
      // dibedakan, dan memang tidak perlu dibedakan.
      if (k.boleh_lain) {
        const lain = String(formData.get(kunciLain(k.kunci)) ?? "").trim();
        for (const bagian of lain.split(",").map((b) => b.trim()).filter(Boolean)) {
          if (!semua.includes(bagian)) semua.push(bagian);
        }
      }

      isian[k.kunci] = semua.join(", ");
    } else if (k.jenis === "checkbox") {
      isian[k.kunci] = formData.get(k.kunci) ? "Ya" : "Tidak";
    } else {
      isian[k.kunci] = String(formData.get(k.kunci) ?? "").trim();
    }

    if (k.wajib && (isian[k.kunci] === "" || isian[k.kunci] === "-")) {
      return { pesan: `${k.label} harus diisi.`, hasil: null, judul: "", riwayatId: null };
    }
  }

  let hasil: string;
  try {
    hasil = await susunDenganAI(
      susunPerintah(modul.pola_perintah, isian),
      modul.instruksi_sistem,
    );
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.";
    return { pesan, hasil: null, judul: "", riwayatId: null };
  }

  // Judul riwayat diambil dari isian wajib pertama — itu biasanya
  // yang paling menjelaskan isi dokumennya.
  const kunciJudul = kolom.find((k) => k.wajib)?.kunci ?? kolom[0]?.kunci;
  const judul = (kunciJudul && isian[kunciJudul]) || modul.judul;

  const { data: tersimpan } = await supabase
    .from("riwayat_ai")
    .insert({
      modul_id: modul.id,
      modul_judul: modul.judul,
      judul: judul.slice(0, 200),
      hasil,
      masukan: isian,
      oleh: pengguna.id,
    })
    .select("id")
    .single();

  revalidatePath("/riwayat");
  return { pesan: null, hasil, judul, riwayatId: tersimpan?.id ?? null };
}

export type HasilModul = { pesan: string | null; berhasil: string | null };

/** Menyimpan modul baru atau menyunting yang sudah ada. */
export async function simpanModul(
  _s: HasilModul,
  formData: FormData,
): Promise<HasilModul> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna || (await izinHumas()) !== "penuh") {
    return { pesan: "Anda tidak berhak mengubah modul.", berhasil: null };
  }

  const id = Number(formData.get("id")) || null;
  const judul = String(formData.get("judul") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "Umum").trim() || "Umum";
  const instruksi = String(formData.get("instruksi_sistem") ?? "").trim();
  const pola = String(formData.get("pola_perintah") ?? "").trim();
  const kolomMentah = String(formData.get("kolom") ?? "[]");

  if (!judul) return { pesan: "Nama modul harus diisi.", berhasil: null };
  if (!instruksi) return { pesan: "Instruksi sistem harus diisi.", berhasil: null };
  if (!pola) return { pesan: "Pola perintah harus diisi.", berhasil: null };

  let kolom: unknown;
  try {
    kolom = JSON.parse(kolomMentah);
  } catch {
    return {
      pesan: "Susunan kolom isian tidak terbaca. Periksa tanda kurung dan komanya.",
      berhasil: null,
    };
  }

  if (!Array.isArray(kolom)) {
    return { pesan: "Kolom isian harus berupa daftar.", berhasil: null };
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("modul_ai")
      .update({
        judul,
        deskripsi,
        kategori,
        instruksi_sistem: instruksi,
        pola_perintah: pola,
        kolom,
        diubah_pada: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  } else {
    const { error } = await supabase.from("modul_ai").insert({
      judul,
      deskripsi,
      kategori,
      instruksi_sistem: instruksi,
      pola_perintah: pola,
      kolom,
      bawaan: false,
      dibuat_oleh: pengguna.id,
    });

    if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  }

  revalidatePath("/");
  return { pesan: null, berhasil: `Modul "${judul}" tersimpan.` };
}

/** Menghapus modul buatan sendiri. Modul bawaan tidak bisa dihapus. */
export async function hapusModul(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna || (await izinHumas()) !== "penuh") return;

  const supabase = await createClient();
  await supabase.from("modul_ai").delete().eq("id", Number(formData.get("id")));

  revalidatePath("/");
}

/** Menghapus satu dokumen dari riwayat. */
export async function hapusRiwayat(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna || (await izinHumas()) === "tidak") return;

  const supabase = await createClient();
  await supabase.from("riwayat_ai").delete().eq("id", Number(formData.get("id")));

  revalidatePath("/riwayat");
}
