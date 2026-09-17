"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JENIS_BERKAS_DRAF, jenisBerkasDrafDiterima, STATUS_DRAF } from "@/lib/draf";
import { mintaPerbaikan, type HasilPerbaikan } from "@/lib/perbaikan";
import { susunKonsepKonten } from "@/lib/konsep-konten";
import { judulKonsep, tempelKonsep } from "@/lib/konsep-teks";
import type { BarisKalender } from "@/lib/kalender-baris";
import type { Balasan, Hasil } from "@/lib/hasil";

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function isiAtauNull(formData: FormData, nama: string) {
  const nilai = isi(formData, nama);
  return nilai === "" ? null : nilai;
}

function segarkan(id?: number) {
  revalidatePath("/draf");
  if (id) revalidatePath(`/draf/${id}`);
}

/** Hanya Humas dan Digital Marketing — bukan Admin, bukan Koordinator. */
async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pengguna: null, galat: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (!(await punyaIzin("humas"))) {
    return { pengguna: null, galat: "Draf bersama hanya untuk Humas dan Digital Marketing." };
  }
  return { pengguna, galat: null };
}

/**
 * Izin sekali-pakai untuk menaruh satu berkas draf.
 *
 * Berkasnya naik dari peramban langsung ke penyimpanan — server
 * action hanya menerima kiriman 1 MB, dan desain beresolusi cetak
 * gampang melewatinya.
 */
export type IzinDraf =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

export async function siapkanBerkasDraf(namaBerkas: string): Promise<IzinDraf> {
  const tolak = (pesan: string): IzinDraf => ({ jalur: null, token: null, pesan });

  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return tolak(galat ?? "Tidak berhak.");

  if (!jenisBerkasDrafDiterima(namaBerkas)) {
    return tolak(
      `Jenis berkas belum didukung. Yang diterima: ${JENIS_BERKAS_DRAF.join(", ")}. Video cukup ditempel tautannya.`,
    );
  }

  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `draf/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

/** Menaruh draf baru. Berkasnya sudah naik lebih dulu lewat izin di atas. */
export async function tambahDraf(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const judul = isi(formData, "judul");
  if (judul === "") return { pesan: "Judul draf harus diisi.", berhasil: null };

  const jalur = isi(formData, "jalur");
  const tautan = isi(formData, "tautan");

  if (!jalur && !tautan) {
    return { pesan: "Pilih berkasnya, atau tempel tautan Drive-nya.", berhasil: null };
  }
  if (tautan && !tautan.startsWith("https://")) {
    return { pesan: "Tautannya harus dimulai dengan https://", berhasil: null };
  }

  const ukuran = Number(formData.get("berkas_ukuran"));
  const supabase = await createClient();

  const { data: baru, error } = await supabase
    .from("draf")
    .insert({
      judul,
      keterangan: isiAtauNull(formData, "keterangan"),
      jenis: isi(formData, "jenis") || "Lainnya",
      berkas_jalur: jalur || null,
      berkas_nama: jalur ? isi(formData, "berkas_nama") || "dokumen" : null,
      berkas_ukuran: Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null,
      tautan: tautan || null,
      dibuat_oleh: pengguna.id,
    })
    .select("id")
    .single();

  if (error) {
    // Berkasnya sudah terlanjur naik tapi catatannya gagal — dibuang
    // lagi supaya tidak ada berkas yatim di penyimpanan.
    if (jalur) await createAdminClient().storage.from("dokumen").remove([jalur]);
    return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  }

  if (jalur) {
    await supabase.from("draf_revisi").insert({
      draf_id: baru.id,
      berkas_jalur: jalur,
      berkas_nama: isi(formData, "berkas_nama") || "dokumen",
      berkas_ukuran: Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null,
      catatan: "Naskah pertama",
      oleh: pengguna.id,
    });
  }

  segarkan();
  return { pesan: null, berhasil: `"${judul}" masuk daftar draf.` };
}

/**
 * Menaruh naskah hasil susunan AI langsung jadi draf.
 *
 * Tanpa diunduh lalu diunggah lagi. Dua langkah itu tidak
 * menghasilkan apa pun, dan tiap langkah adalah kesempatan
 * memakai berkas versi lama — yang justru persoalan yang ingin
 * dipecahkan Draf Bersama.
 */
export async function drafDariNaskah(
  judul: string,
  jenis: string,
  isi: string,
  riwayatId: number | null = null,
): Promise<Balasan & { id: number | null }> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { ok: false, pesan: galat ?? "Tidak berhak.", id: null };

  const bersih = judul.trim() || "Naskah tanpa judul";
  if (isi.trim() === "") {
    return { ok: false, pesan: "Naskahnya kosong.", id: null };
  }

  const supabase = await createClient();

  // Penanda instansi dibawa serta dari dokumen asalnya. Tanpa ini,
  // draf milik instansi lain kembali dianggap milik RSPUR begitu
  // ada yang meminta perbaikan di halaman draf.
  const { data: asal } = riwayatId
    ? await supabase.from("riwayat_ai").select("*").eq("id", riwayatId).maybeSingle()
    : { data: null };

  const { data, error } = await supabase
    .from("draf")
    .insert({
      judul: bersih.slice(0, 120),
      jenis: jenis || "Lainnya",
      isi,
      untuk_rspur: asal?.untuk_rspur !== false,
      instansi: asal?.instansi ?? null,
      keterangan: "Disusun dengan modul AI, lalu dikirim langsung ke sini.",
      dibuat_oleh: pengguna.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}`, id: null };

  segarkan();
  return {
    ok: true,
    pesan: "Masuk ke Draf Bersama. Humas dan Digital Marketing bisa membahasnya di sana.",
    id: data.id,
  };
}

/** Menyimpan suntingan naskah pada draf berupa teks. */
export async function simpanNaskahDraf(id: number, isi: string): Promise<Balasan> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { ok: false, pesan: galat ?? "Tidak berhak." };
  if (isi.trim() === "") return { ok: false, pesan: "Naskahnya kosong." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("draf")
    .update({ isi, diubah_pada: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}` };

  segarkan(id);
  return { ok: true, pesan: "Naskah tersimpan." };
}

/**
 * Meminta AI memperbaiki naskah draf.
 *
 * Perlu ada di sini juga, bukan cuma di halaman hasil. Yang
 * terlupa sering baru ketahuan saat dibahas berdua — dan kalau
 * perbaikannya harus lewat menyusun ulang, yang masuk ke daftar
 * draf jadi dua naskah yang isinya hampir sama.
 */
export async function perbaikiNaskahDraf(
  id: number,
  naskah: string,
  permintaan: string,
): Promise<HasilPerbaikan> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { hasil: null, pesan: galat ?? "Tidak berhak." };

  const supabase = await createClient();

  const { data: draf } = await supabase
    .from("draf")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!draf) return { hasil: null, pesan: "Drafnya tidak ditemukan lagi." };

  // Jenis draf memakai nama modul yang menyusunnya, jadi aturan
  // susunan modul itu bisa ditemukan kembali dari sini. Kalau
  // tidak ketemu — draf yang ditulis tangan, misalnya — dipakai
  // aturan umum.
  const { data: modul } = await supabase
    .from("modul_ai")
    .select("*")
    .ilike("judul", draf.jenis)
    .maybeSingle();

  return mintaPerbaikan({
    namaDokumen: draf.judul,
    instruksi: modul?.instruksi_sistem ?? null,
    pakaiDokter: modul?.pakai_dokter === true,
    pakaiLayanan: modul?.pakai_layanan === true,
    pakaiIsu: modul?.pakai_isu === true,
    untukRspur: draf.untuk_rspur !== false,
    instansi: draf.instansi ?? null,
    naskah,
    permintaan,
  });
}

/**
 * Membuat brief produksi dari satu baris kalender, lalu
 * menempelkannya ke draf yang sama.
 *
 * Ditempelkan, bukan dijadikan draf baru. Konsep itu milik
 * kalender asalnya — dipisahkan, ia jadi potongan lepas yang
 * sebulan kemudian tidak ada yang tahu asalnya dari mana, dan
 * Draf Bersama penuh oleh serpihan.
 */
export async function buatKonsepKonten(
  drafId: number,
  baris: BarisKalender,
  durasiVideo = 60,
  maksCarousel = 4,
  perbaikan = "",
): Promise<Balasan & { isi: string | null }> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { ok: false, pesan: galat ?? "Tidak berhak.", isi: null };

  const supabase = await createClient();

  const { data: draf } = await supabase
    .from("draf")
    .select("isi, status")
    .eq("id", drafId)
    .maybeSingle();

  if (!draf?.isi) return { ok: false, pesan: "Drafnya tidak ditemukan.", isi: null };
  if (draf.status === "Selesai") {
    return { ok: false, pesan: "Draf ini sudah ditandai selesai.", isi: null };
  }

  const konsep = await susunKonsepKonten(
    baris,
    { durasiVideo, maksCarousel },
    perbaikan,
  );
  if (konsep.hasil === null) return { ok: false, pesan: konsep.pesan, isi: null };

  // Ditempel bila belum ada, ditimpa bila sudah. Menekan "susun
  // ulang" tidak boleh meninggalkan dua konsep untuk baris yang
  // sama — yang membacanya nanti tidak akan tahu mana yang
  // berlaku.
  const kepala = judulKonsep(baris.tanggal, baris.format);
  const adaSebelumnya = draf.isi.includes(`# ${kepala}`);
  const baru = tempelKonsep(draf.isi, kepala, konsep.hasil);

  const { error } = await supabase
    .from("draf")
    .update({ isi: baru, diubah_pada: new Date().toISOString() })
    .eq("id", drafId);

  if (error) {
    return { ok: false, pesan: `Konsepnya jadi, tapi gagal disimpan: ${error.message}`, isi: null };
  }

  segarkan(drafId);
  return {
    ok: true,
    pesan: adaSebelumnya
      ? "Konsep disusun ulang, yang lama diganti."
      : "Konsep ditempelkan di bawah kalender.",
    isi: baru,
  };
}

/** Mengunggah revisi. Versi lama tidak ditimpa. */
export async function tambahRevisiDraf(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = Number(formData.get("id"));
  const jalur = isi(formData, "jalur");
  if (!id || !jalur) return { pesan: "Pilih dulu berkas revisinya.", berhasil: null };

  const nama = isi(formData, "berkas_nama") || "dokumen";
  const ukuran = Number(formData.get("berkas_ukuran"));
  const besar = Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null;

  const supabase = await createClient();

  const { data: revisi, error } = await supabase
    .from("draf_revisi")
    .insert({
      draf_id: id,
      berkas_jalur: jalur,
      berkas_nama: nama,
      berkas_ukuran: besar,
      catatan: isiAtauNull(formData, "catatan"),
      oleh: pengguna.id,
    })
    .select("versi")
    .single();

  if (error) {
    await createAdminClient().storage.from("dokumen").remove([jalur]);
    return { pesan: `Revisi gagal dicatat: ${error.message}`, berhasil: null };
  }

  // Draf diarahkan ke versi terakhir, supaya yang membuka selalu
  // mendapat yang terbaru.
  await supabase
    .from("draf")
    .update({
      berkas_jalur: jalur,
      berkas_nama: nama,
      berkas_ukuran: besar,
      diubah_pada: new Date().toISOString(),
    })
    .eq("id", id);

  segarkan(id);
  return { pesan: null, berhasil: `Tersimpan sebagai versi ${revisi.versi}.` };
}

/** Mengubah status draf. */
export async function ubahStatusDraf(formData: FormData) {
  const { pengguna } = await pastikanBerhak();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  const status = isi(formData, "status");
  if (!id || !(STATUS_DRAF as readonly string[]).includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("draf")
    .update({ status, diubah_pada: new Date().toISOString() })
    .eq("id", id);

  segarkan(id);
}

/** Menambah satu komentar pada percakapan draf. */
export async function tambahKomentar(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = Number(formData.get("id"));
  const teks = isi(formData, "isi");
  if (!id || teks === "") return { pesan: "Tulis dulu catatannya.", berhasil: null };

  const supabase = await createClient();
  const { error } = await supabase
    .from("draf_komentar")
    .insert({ draf_id: id, isi: teks, oleh: pengguna.id });

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  segarkan(id);
  return { pesan: null, berhasil: null };
}

/** Menghapus draf yang salah tulis, beserta seluruh berkasnya. */
export async function hapusDraf(formData: FormData) {
  const { pengguna } = await pastikanBerhak();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();

  // Berkasnya dibuang lebih dulu, selagi catatan jalurnya masih ada.
  // Kalau barisnya dihapus duluan, jalurnya ikut hilang dan berkasnya
  // tertinggal selamanya di penyimpanan.
  const { data: revisi } = await supabase
    .from("draf_revisi")
    .select("berkas_jalur")
    .eq("draf_id", id);

  const jalur = [...new Set((revisi ?? []).map((r) => r.berkas_jalur))];

  const { error } = await supabase.from("draf").delete().eq("id", id);
  if (error) return;

  if (jalur.length > 0) {
    await createAdminClient().storage.from("dokumen").remove(jalur);
  }

  segarkan();

  // Penghapusan dipanggil dari halaman rincian draf itu sendiri.
  // Tanpa ini, yang menekan tombol tertinggal di halaman yang
  // barisnya sudah tidak ada lagi.
  redirect("/draf");
}
