"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bacaBerkasDokter } from "@/lib/dokter-impor";
import { ambilDariWeb } from "@/lib/dokter-web";
import { kosongkanDokter, tanamDokter } from "@/lib/dokter-simpan";
import type { DokterBaca, LembarDokter, Sesi } from "@/lib/dokter";
import type { Balasan, Hasil } from "@/lib/hasil";

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function segarkan() {
  revalidatePath("/dokter");
}

/** Daftar dokter hanya boleh diubah Humas dan Digital Marketing. */
async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return "Sesi Anda sudah berakhir. Masuk lagi.";
  if (!(await punyaIzin("humas"))) {
    return "Daftar dokter hanya bisa diubah Humas dan Digital Marketing.";
  }
  return null;
}

export type IzinDokter =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

/** Izin sekali-pakai untuk menaruh berkas jadwal sebelum dibaca. */
export async function siapkanBerkasDokter(namaBerkas: string): Promise<IzinDokter> {
  const tolak = (pesan: string): IzinDokter => ({ jalur: null, token: null, pesan });

  const galat = await pastikanBerhak();
  if (galat) return tolak(galat);

  if (!namaBerkas.toLowerCase().endsWith(".xlsx")) {
    return tolak("Berkasnya harus .xlsx — simpan dulu dari Excel sebagai Excel Workbook.");
  }

  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `dokter/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

export type HasilBaca =
  | { lembar: LembarDokter[]; pesan: null }
  | { lembar: null; pesan: string };

/**
 * Membaca berkas yang barusan naik, tanpa menyimpan apa pun.
 *
 * Sengaja dipisah dari penyimpanan: berkas jadwal disusun manusia,
 * dan susunannya berubah-ubah. Yang bisa memastikan hasil bacanya
 * benar hanya orang yang mengenal jadwalnya — jadi ia harus melihat
 * dulu sebelum daftar lama tertimpa.
 */
export async function bacaBerkasJadwal(jalur: string): Promise<HasilBaca> {
  const galat = await pastikanBerhak();
  if (galat) return { lembar: null, pesan: galat };

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .download(jalur);

  if (error || !data) return { lembar: null, pesan: "Berkasnya tidak bisa dibuka lagi." };

  try {
    const lembar = bacaBerkasDokter(await data.arrayBuffer());
    const berisi = lembar.filter((l) => l.dokter.length > 0);

    if (berisi.length === 0) {
      return {
        lembar: null,
        pesan:
          "Tidak ada jadwal yang terbaca. Pastikan berkasnya punya baris kepala " +
          "berisi “Poliklinik”, “Nama Dokter”, dan nama-nama hari.",
      };
    }

    return { lembar: berisi, pesan: null };
  } catch (kesalahan) {
    const pesan = kesalahan instanceof Error ? kesalahan.message : String(kesalahan);
    return { lembar: null, pesan: `Berkasnya tidak terbaca: ${pesan}` };
  }
}

/**
 * Menyimpan hasil bacaan.
 *
 * Berkasnya dibaca ulang dari penyimpanan, bukan dikirim balik dari
 * peramban. Yang dikirim peramban bisa berbeda dari yang ditampilkan
 * — dan yang disimpan harus persis yang sudah dilihat orangnya.
 */
export async function simpanJadwalDokter(_s: Hasil, formData: FormData): Promise<Hasil> {
  const galat = await pastikanBerhak();
  if (galat) return { pesan: galat, berhasil: null };

  const jalur = isi(formData, "jalur");
  const nomorLembar = Number(formData.get("lembar"));
  const ganti = isi(formData, "cara") === "ganti";

  const dibaca = await bacaBerkasJadwal(jalur);
  if (dibaca.lembar === null) return { pesan: dibaca.pesan, berhasil: null };

  const pilihan = dibaca.lembar[nomorLembar];
  if (!pilihan) return { pesan: "Lembarnya tidak ditemukan lagi.", berhasil: null };

  const supabase = await createClient();

  if (ganti) {
    const galatKosong = await kosongkanDokter(supabase);
    if (galatKosong) return { pesan: galatKosong, berhasil: null };
  }

  const hasil = await tanamDokter(supabase, pilihan.dokter);
  if (hasil.pesan) return { pesan: hasil.pesan, berhasil: null };

  // Berkas sementara tidak perlu disimpan: isinya sudah pindah ke
  // tabel, dan menyimpannya hanya menumpuk berkas yang tak dibuka
  // siapa pun.
  await createAdminClient().storage.from("dokumen").remove([jalur]);

  segarkan();
  return {
    pesan: null,
    berhasil: `${hasil.jumlah} dokter tersimpan dari lembar “${pilihan.nama}”.`,
  };
}

/**
 * Membaca daftar dokter dari situs rspur.co.id, tanpa menyimpan.
 *
 * Ditunjukkan dulu seperti pada berkas Excel. Situsnya milik kita
 * sendiri, tapi susunannya bisa berubah tanpa pemberitahuan — dan
 * yang bisa menilai hasil bacanya masuk akal hanya orangnya.
 */
export async function bacaDokterDariWeb(): Promise<
  { dokter: DokterBaca[]; pesan: null } | { dokter: null; pesan: string }
> {
  const galat = await pastikanBerhak();
  if (galat) return { dokter: null, pesan: galat };

  return ambilDariWeb();
}

/** Menyimpan daftar dokter yang barusan dibaca dari situs. */
export async function simpanDokterDariWeb(_s: Hasil, formData: FormData): Promise<Hasil> {
  const galat = await pastikanBerhak();
  if (galat) return { pesan: galat, berhasil: null };

  const dibaca = await ambilDariWeb();
  if (dibaca.dokter === null) return { pesan: dibaca.pesan, berhasil: null };

  const supabase = await createClient();

  if (isi(formData, "cara") === "ganti") {
    const galatKosong = await kosongkanDokter(supabase);
    if (galatKosong) return { pesan: galatKosong, berhasil: null };
  }

  const hasil = await tanamDokter(supabase, dibaca.dokter);
  if (hasil.pesan) return { pesan: hasil.pesan, berhasil: null };

  segarkan();
  return {
    pesan: null,
    berhasil: `${hasil.jumlah} dokter tersimpan dari rspur.co.id.`,
  };
}

/** Menambah atau memperbaiki satu dokter dengan tangan. */
export async function simpanDokter(_s: Hasil, formData: FormData): Promise<Hasil> {
  const galat = await pastikanBerhak();
  if (galat) return { pesan: galat, berhasil: null };

  const nama = isi(formData, "nama");
  const poliklinik = isi(formData, "poliklinik");
  if (nama === "" || poliklinik === "") {
    return { pesan: "Poliklinik dan nama dokter harus diisi.", berhasil: null };
  }

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const isian = {
    poliklinik,
    nama,
    aktif: formData.get("aktif") !== null,
    catatan: isi(formData, "catatan") || null,
    diubah_pada: new Date().toISOString(),
  };

  const { data, error } = id
    ? await supabase.from("dokter").update(isian).eq("id", id).select("id").single()
    : await supabase.from("dokter").insert(isian).select("id").single();

  if (error) {
    const kembar = error.code === "23505";
    return {
      pesan: kembar
        ? `${nama} sudah ada di ${poliklinik}.`
        : `Gagal disimpan: ${error.message}`,
      berhasil: null,
    };
  }

  // Jadwalnya ditulis ulang seluruhnya, bukan ditambal. Menambal
  // berarti sesi yang dihapus dari formulir tetap tertinggal.
  const sesi: Sesi[] = [];
  for (let hari = 1; hari <= 7; hari++) {
    for (const nilai of formData.getAll(`jam_${hari}`)) {
      const jam = String(nilai).trim();
      if (jam !== "") sesi.push({ hari, jam });
    }
  }

  await supabase.from("dokter_jadwal").delete().eq("dokter_id", data.id);
  if (sesi.length > 0) {
    await supabase
      .from("dokter_jadwal")
      .insert(sesi.map((s) => ({ dokter_id: data.id, hari: s.hari, jam: s.jam })));
  }

  segarkan();
  return { pesan: null, berhasil: `${nama} tersimpan.` };
}

/** Menyalakan atau memadamkan satu dokter tanpa membuka formulir. */
export async function ubahAktifDokter(formData: FormData) {
  if (await pastikanBerhak()) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("dokter")
    .update({
      aktif: isi(formData, "aktif") === "ya",
      diubah_pada: new Date().toISOString(),
    })
    .eq("id", id);

  segarkan();
}

export async function hapusDokter(formData: FormData): Promise<Balasan> {
  const galat = await pastikanBerhak();
  if (galat) return { ok: false, pesan: galat };

  const id = Number(formData.get("id"));
  if (!id) return { ok: false, pesan: "Dokter tidak dikenali." };

  const supabase = await createClient();
  const { error } = await supabase.from("dokter").delete().eq("id", id);
  if (error) return { ok: false, pesan: `Gagal dihapus: ${error.message}` };

  segarkan();
  return { ok: true, pesan: "Terhapus." };
}
