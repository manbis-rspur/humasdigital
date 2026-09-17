"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JENIS_KOP, jenisKopDiterima } from "@/lib/kop-surat";
import type { Balasan } from "@/lib/hasil";

async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pengguna: null, galat: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (!(await punyaIzin("humas"))) {
    return { pengguna: null, galat: "Kop surat hanya bisa diatur Humas dan Digital Marketing." };
  }
  return { pengguna, galat: null };
}

export type IzinKop =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

/** Izin sekali-pakai untuk menaruh satu berkas kop. */
export async function siapkanKopSurat(namaBerkas: string): Promise<IzinKop> {
  const tolak = (pesan: string): IzinKop => ({ jalur: null, token: null, pesan });

  const { galat } = await pastikanBerhak();
  if (galat) return tolak(galat);

  if (!jenisKopDiterima(namaBerkas)) {
    return tolak(`Kop surat harus berupa gambar: ${JENIS_KOP.join(", ")}.`);
  }

  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `kop/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

/** Menyimpan kop yang berkasnya sudah naik lewat izin di atas. */
export async function simpanKopSurat(_s: Balasan, formData: FormData): Promise<Balasan> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { ok: false, pesan: galat ?? "Tidak berhak." };

  const nama = String(formData.get("nama") ?? "").trim();
  const jalur = String(formData.get("jalur") ?? "").trim();
  const berkasNama = String(formData.get("berkas_nama") ?? "").trim();

  if (nama === "") return { ok: false, pesan: "Beri nama kopnya — misalnya RSPUR." };
  if (jalur === "") return { ok: false, pesan: "Pilih dulu gambar kopnya." };

  const supabase = await createClient();
  const jadikanBawaan = formData.get("bawaan") !== null;

  // Hanya satu yang boleh jadi bawaan, dan database menjaganya.
  // Yang lama dipadamkan lebih dulu supaya penyimpanan ini tidak
  // ditolak karena bentrok.
  if (jadikanBawaan) {
    await supabase.from("kop_surat").update({ bawaan: false }).eq("bawaan", true);
  }

  const { error } = await supabase.from("kop_surat").insert({
    nama,
    berkas_jalur: jalur,
    berkas_nama: berkasNama || "kop",
    bawaan: jadikanBawaan,
    dibuat_oleh: pengguna.id,
  });

  if (error) {
    await createAdminClient().storage.from("dokumen").remove([jalur]);
    return {
      ok: false,
      pesan:
        error.code === "23505"
          ? `Sudah ada kop bernama "${nama}".`
          : `Gagal disimpan: ${error.message}`,
    };
  }

  revalidatePath("/kop-surat");
  revalidatePath("/draf", "layout");
  return { ok: true, pesan: `Kop "${nama}" tersimpan.` };
}

/** Menjadikan satu kop sebagai bawaan. */
export async function jadikanKopBawaan(formData: FormData) {
  if ((await pastikanBerhak()).galat) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("kop_surat").update({ bawaan: false }).eq("bawaan", true);
  await supabase.from("kop_surat").update({ bawaan: true }).eq("id", id);

  revalidatePath("/kop-surat");
  revalidatePath("/draf", "layout");
}

export async function hapusKopSurat(formData: FormData) {
  if ((await pastikanBerhak()).galat) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();

  // Berkasnya dibuang lebih dulu, selagi catatan jalurnya masih ada.
  const { data } = await supabase
    .from("kop_surat")
    .select("berkas_jalur")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("kop_surat").delete().eq("id", id);
  if (error) return;

  if (data?.berkas_jalur) {
    await createAdminClient().storage.from("dokumen").remove([data.berkas_jalur]);
  }

  revalidatePath("/kop-surat");
  revalidatePath("/draf", "layout");
}
