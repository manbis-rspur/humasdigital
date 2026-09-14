import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { susunDenganAI, type Bagian } from "@/lib/ai";
import { susunPerintah, bacaKolom } from "@/lib/modul-ai";
import { daftarDokterUntukAI } from "@/lib/dokter-data";
import { daftarLayananUntukAI } from "@/lib/layanan-data";
import { usulanUntukAI } from "@/lib/isu-data";
import { mintaPerbaikan } from "@/lib/perbaikan";
import { pisahBlok } from "@/lib/markdown-tabel";

/**
 * Menyusun dan memperbaiki kalender konten lewat bot Telegram.
 *
 * Berjalan tanpa sesi login — yang memanggilnya Telegram, bukan
 * peramban. Karena itu semuanya memakai kunci layanan, dan hak
 * aksesnya diperiksa sendiri di rute webhook sebelum sampai ke
 * sini.
 */

const JUDUL_MODUL = "%kalender konten%";

export type HasilKalender = {
  ok: boolean;
  pesan: string;
  drafId: number | null;
  judul: string;
  hasil: string | null;
};

/** Nama kampanye dari judul pertama dokumen, untuk penamaan draf. */
function petikJudul(markdown: string): string {
  for (const baris of markdown.split("\n")) {
    const cocok = /^#{1,3}\s+(.+)$/.exec(baris.trim());
    if (cocok) return cocok[1].replace(/\*\*/g, "").trim().slice(0, 110);
  }
  const pertama = markdown.split("\n").find((b) => b.trim() !== "") ?? "Kalender Konten";
  return pertama.replace(/[#*]/g, "").trim().slice(0, 110) || "Kalender Konten";
}

/**
 * Ringkasan sependek mungkin untuk dibalas di chat.
 *
 * Yang dibaca orang di HP bukan kalendernya, melainkan apakah
 * hasilnya masuk akal — berapa butir, dan sebarannya condong ke
 * mana. Kalendernya sendiri dibuka dari PDF atau dari web.
 */
export function ringkasKalender(markdown: string): string {
  const tabel = pisahBlok(markdown).filter((b) => b.jenis === "tabel");
  if (tabel.length === 0) return "Tersusun.";

  // Tabel terpanjang adalah kalendernya; yang pendek biasanya
  // tabel sebaran atau jam tayang.
  const utama = tabel.reduce((a, b) => (b.isi.length > a.isi.length ? b : a));

  const hitung = { TOFU: 0, MOFU: 0, BOFU: 0 };
  for (const baris of utama.isi) {
    const isi = baris.join(" ").toUpperCase();
    for (const tahap of ["TOFU", "MOFU", "BOFU"] as const) {
      if (isi.includes(tahap)) {
        hitung[tahap]++;
        break;
      }
    }
  }

  const tahap = Object.values(hitung).some((n) => n > 0)
    ? ` · TOFU ${hitung.TOFU} · MOFU ${hitung.MOFU} · BOFU ${hitung.BOFU}`
    : "";

  return `${utama.isi.length} butir konten${tahap}`;
}

async function bacaModul() {
  const db = createAdminClient();
  const { data } = await db
    .from("modul_ai")
    .select("*")
    .ilike("judul", JUDUL_MODUL)
    .maybeSingle();
  return data;
}

/** Menyusun kalender baru dari cerita kampanye yang diketik di chat. */
export async function susunKalenderLewatTelegram(
  penggunaId: number,
  cerita: string,
): Promise<HasilKalender> {
  const gagal = (pesan: string): HasilKalender => ({
    ok: false,
    pesan,
    drafId: null,
    judul: "",
    hasil: null,
  });

  const modul = await bacaModul();
  if (!modul) return gagal("Modul Kalender Konten tidak ditemukan di sistem.");

  const db = createAdminClient();

  // Isian selain cerita dibiarkan kosong — perintah modulnya sudah
  // tahu cara memperlakukan isian kosong, dan menanyakannya satu
  // per satu lewat chat justru menghapus gunanya bot ini.
  const isian: Record<string, string> = {};
  for (const k of bacaKolom(modul.kolom)) isian[k.kunci] = "";
  isian.topik = cerita;

  const perintah: Bagian[] = [{ text: susunPerintah(modul.pola_perintah, isian) }];

  if (modul.pakai_isu === true) {
    const bahan = await usulanUntukAI("", "", db);
    if (bahan) perintah.push({ text: bahan });
  }
  if (modul.pakai_layanan === true) {
    const layanan = await daftarLayananUntukAI(db);
    if (layanan) perintah.push({ text: layanan });
  }
  if (modul.pakai_dokter === true) {
    const dokter = await daftarDokterUntukAI(db);
    if (dokter) perintah.push({ text: dokter });
  }

  let hasil: string;
  try {
    hasil = await susunDenganAI(perintah, modul.instruksi_sistem);
  } catch (galat) {
    return gagal(galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.");
  }

  const judul = petikJudul(hasil);

  await db.from("riwayat_ai").insert({
    modul_id: modul.id,
    modul_judul: modul.judul,
    judul: judul.slice(0, 200),
    hasil,
    masukan: isian,
    oleh: penggunaId,
  });

  const { data: draf, error } = await db
    .from("draf")
    .insert({
      judul: judul.slice(0, 120),
      jenis: modul.judul,
      isi: hasil,
      keterangan: "Disusun lewat Telegram.",
      dibuat_oleh: penggunaId,
    })
    .select("id")
    .single();

  if (error) return gagal(`Tersusun, tapi gagal masuk draf: ${error.message}`);

  return { ok: true, pesan: "", drafId: draf.id, judul, hasil };
}

/**
 * Memperbaiki draf terakhir yang dibuat orang itu.
 *
 * "Terakhir" ditentukan waktu pembuatan, bukan ditanyakan. Yang
 * sedang di HP baru saja menyusun satu kalender; menanyakan yang
 * mana justru menambah langkah pada alat yang gunanya memangkas
 * langkah. Nomor drafnya tetap disebut di balasan, jadi kalau
 * salah, kelihatan.
 */
export async function perbaikiKalenderLewatTelegram(
  penggunaId: number,
  permintaan: string,
): Promise<HasilKalender> {
  const gagal = (pesan: string): HasilKalender => ({
    ok: false,
    pesan,
    drafId: null,
    judul: "",
    hasil: null,
  });

  const db = createAdminClient();

  const { data: draf } = await db
    .from("draf")
    .select("*")
    .eq("dibuat_oleh", penggunaId)
    .not("isi", "is", null)
    .neq("status", "Terkirim")
    .order("dibuat_pada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!draf) {
    return gagal(
      "Belum ada draf yang bisa diperbaiki. Susun dulu dengan /kalender, atau buka drafnya di web.",
    );
  }

  const modul = await bacaModul();

  const hasil = await mintaPerbaikan({
    namaDokumen: draf.judul,
    instruksi: modul?.instruksi_sistem ?? null,
    pakaiDokter: modul?.pakai_dokter === true,
    pakaiLayanan: modul?.pakai_layanan === true,
    pakaiIsu: modul?.pakai_isu === true,
    untukRspur: draf.untuk_rspur !== false,
    instansi: draf.instansi ?? null,
    naskah: draf.isi,
    permintaan,
    klien: db,
  });

  if (hasil.hasil === null) return gagal(hasil.pesan ?? "Gagal memperbaiki.");

  const { error } = await db
    .from("draf")
    .update({ isi: hasil.hasil, diubah_pada: new Date().toISOString() })
    .eq("id", draf.id);

  if (error) return gagal(`Gagal disimpan: ${error.message}`);

  return {
    ok: true,
    pesan: hasil.peringatan ?? "",
    drafId: draf.id,
    judul: draf.judul,
    hasil: hasil.hasil,
  };
}
