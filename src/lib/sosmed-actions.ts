"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehSosmed } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bacaDenganAI, susunDenganAI, type Bagian } from "@/lib/ai";
import {
  MAKS_DATA,
  jenisDataDiterima,
  siapkanKiriman,
} from "@/lib/berkas-data";
import {
  NAMA_BULAN,
  PLATFORM,
  UKURAN,
  angkaRapi,
  interaksi,
  persenRapi,
  ringkas,
  type Konten,
} from "@/lib/sosmed";
import type { Hasil } from "@/lib/hasil";

async function pastikanBerhak() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pengguna: null, galat: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (!(await bolehSosmed())) {
    return { pengguna: null, galat: "Laporan media sosial hanya untuk Digital Marketing." };
  }
  return { pengguna, galat: null };
}

function angka(formData: FormData, nama: string) {
  const n = Number(String(formData.get(nama) ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Membuat laporan bulan tertentu. Satu bulan hanya boleh satu laporan. */
export async function buatLaporan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const bulan = angka(formData, "bulan");
  const tahun = angka(formData, "tahun");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("laporan_sosmed")
    .insert({ bulan, tahun, dibuat_oleh: pengguna.id })
    .select("id")
    .single();

  if (error) {
    return {
      pesan: error.message.includes("laporan_sekali_sebulan")
        ? `Laporan ${NAMA_BULAN[bulan]} ${tahun} sudah ada. Buka yang itu saja.`
        : `Gagal dibuat: ${error.message}`,
      berhasil: null,
    };
  }

  redirect(`/laporan/${data.id}`);
}

/** Menyimpan capaian tingkat akun beserta catatannya. */
export async function simpanAngka(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = angka(formData, "id");
  const isi: Record<string, Record<string, number>> = {};
  for (const p of PLATFORM) {
    isi[p] = {};
    for (const u of UKURAN) isi[p][u.kunci] = angka(formData, `${p}_${u.kunci}`);
  }

  const tenggat = String(formData.get("tenggat") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("laporan_sosmed")
    .update({
      angka: isi,
      catatan: String(formData.get("catatan") ?? "").trim() || null,
      tenggat: tenggat || null,
      diubah_pada: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  revalidatePath(`/laporan/${id}`);
  return { pesan: null, berhasil: "Capaian akun tersimpan." };
}

/** Menambah satu konten ke laporan. */
export async function tambahKonten(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const laporanId = angka(formData, "laporan_id");
  const judul = String(formData.get("judul") ?? "").trim();
  if (!judul) return { pesan: "Judul konten harus diisi.", berhasil: null };

  const supabase = await createClient();
  const { error } = await supabase.from("laporan_konten").insert({
    laporan_id: laporanId,
    tanggal: String(formData.get("tanggal") ?? "") || null,
    platform: String(formData.get("platform") ?? "Instagram"),
    judul,
    format: String(formData.get("format") ?? "").trim() || null,
    funnel: String(formData.get("funnel") ?? "") || null,
    tayangan: angka(formData, "tayangan"),
    jangkauan: angka(formData, "jangkauan"),
    suka: angka(formData, "suka"),
    komentar: angka(formData, "komentar"),
    dibagikan: angka(formData, "dibagikan"),
    disimpan: angka(formData, "disimpan"),
    ada_ads: formData.get("ada_ads") === "on",
    biaya_ads: angka(formData, "biaya_ads"),
    catatan: String(formData.get("catatan") ?? "").trim() || null,
  });

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  revalidatePath(`/laporan/${laporanId}`);
  return { pesan: null, berhasil: `"${judul}" ditambahkan.` };
}

export async function hapusKonten(formData: FormData) {
  const { pengguna } = await pastikanBerhak();
  if (!pengguna) return;

  const supabase = await createClient();
  await supabase.from("laporan_konten").delete().eq("id", angka(formData, "id"));
  revalidatePath(`/laporan/${angka(formData, "laporan_id")}`);
}

/**
 * Menyusun naskah laporan.
 *
 * Seluruh angka dihitung di sini lalu disodorkan jadi ke AI —
 * bukan dibiarkan AI yang menjumlahkan sendiri dari daftar mentah.
 * Model bahasa keliru menghitung tanpa memberi tanda, dan laporan
 * bulanan yang angkanya salah lebih buruk daripada tidak ada.
 */
export async function susunLaporan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = angka(formData, "id");
  const supabase = await createClient();

  const { data: laporan } = await supabase
    .from("laporan_sosmed")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!laporan) return { pesan: "Laporan tidak ditemukan.", berhasil: null };

  const { data: baris } = await supabase
    .from("laporan_konten")
    .select("*")
    .eq("laporan_id", id)
    .order("tanggal", { ascending: true });

  const konten = (baris ?? []) as Konten[];
  if (konten.length === 0) {
    return { pesan: "Belum ada konten yang dicatat. Tambahkan dulu.", berhasil: null };
  }

  const bulan = `${NAMA_BULAN[laporan.bulan]} ${laporan.tahun}`;
  const semua = ringkas(konten);
  const organik = ringkas(konten.filter((k) => !k.ada_ads));
  const berbayar = ringkas(konten.filter((k) => k.ada_ads));

  const baresTabel = konten
    .slice()
    .sort((a, b) => interaksi(b) - interaksi(a))
    .map(
      (k) =>
        `| ${k.tanggal ?? "-"} | ${k.platform} | ${k.judul} | ${k.format ?? "-"} | ${k.funnel ?? "-"} | ${angkaRapi(k.tayangan)} | ${angkaRapi(interaksi(k))} | ${k.ada_ads ? `Ya (Rp ${angkaRapi(k.biaya_ads)})` : "Tidak"} |`,
    )
    .join("\n");

  const perFunnel = ["TOFU", "MOFU", "BOFU"]
    .map((f) => {
      const r = ringkas(konten.filter((k) => k.funnel === f));
      return `- ${f}: ${r.jumlah} konten · ${angkaRapi(r.tayangan)} tayangan · ${angkaRapi(r.interaksi)} interaksi · rasio ${persenRapi(r.rasioInteraksi)}`;
    })
    .join("\n");

  const tanpaFunnel = konten.filter((k) => !k.funnel).length;

  const perAkun = PLATFORM.map((p) => {
    const a = (laporan.angka?.[p] ?? {}) as Record<string, number>;
    const isi = UKURAN.map((u) => `${u.label}: ${angkaRapi(a[u.kunci] ?? 0)}`).join(" · ");
    const r = ringkas(konten.filter((k) => k.platform === p));
    const tumbuh = (a.pengikut_akhir ?? 0) - (a.pengikut_awal ?? 0);
    return `${p} (@${laporan.akun.replace("@", "")})\n  ${isi}\n  Pertumbuhan pengikut: ${tumbuh >= 0 ? "+" : ""}${angkaRapi(tumbuh)}\n  Konten terbit: ${r.jumlah} · tayangan ${angkaRapi(r.tayangan)} · interaksi ${angkaRapi(r.interaksi)}`;
  }).join("\n\n");

  const instruksi = `Anda menyusun laporan bulanan media sosial untuk unit Humas dan Digital Marketing Rumah Sakit Pertamedika Ummi Rosnati (RSPUR), akun Instagram dan TikTok @rspurosnati.

Tulis dengan urutan bagian berikut, memakai judul markdown:

1. Executive Summary — ringkasan padat untuk pimpinan, maksimal satu paragraf ditambah tiga sampai lima butir capaian terpenting.
2. Highlight ${bulan} — kejadian dan konten paling menonjol bulan itu, sebutkan judul kontennya.
3. Kesimpulan Singkat — tiga sampai lima kalimat, langsung ke intinya.
4. Analisis Kuantitatif — bahas angkanya: pertumbuhan pengikut, jangkauan, tayangan, interaksi, dan perbandingan Instagram dengan TikTok. Sajikan tabel bila membantu.
5. Analisis Funnel Konten — bahas TOFU, MOFU, dan BOFU: sebarannya, mana yang kuat, mana yang kurang, dan apa artinya bagi perjalanan calon pasien.
6. Analisis Kualitatif — bahas isi dan gaya kontennya: tema apa yang menarik perhatian, format apa yang bekerja, apa yang tidak, dan mengapa.
7. Rencana Kerja Bulan Berikutnya — daftar tindakan yang jelas dan bisa dikerjakan, sebutkan penanggung jawabnya bila memungkinkan.

ATURAN YANG TIDAK BOLEH DILANGGAR:

- Seluruh angka sudah dihitungkan dan diberikan di bawah. Pakai apa adanya. Jangan menjumlah ulang, jangan menaksir, dan jangan mengarang angka yang tidak diberikan.
- Bedakan dengan tegas konten berbayar dan konten organik di setiap bagian yang membahas capaian. Konten yang memakai iklan sudah ditandai. Jangan pernah menyimpulkan sebuah konten berhasil tanpa menyebut apakah ia memakai iklan — capaian tinggi karena dibayar dan karena disukai orang adalah dua hal yang berbeda, dan mencampurnya membuat rencana bulan berikutnya keliru.
- Bila sebuah konten tidak diberi tahap funnel, sebutkan itu sebagai catatan pencatatan, jangan ditebak sendiri.
- Jangan menyebut nama pasien, kondisi medis perorangan, atau apa pun yang menyerempet rekam medis.
- Bahasa Indonesia yang lugas dan enak dibaca. Hindari istilah asing yang tidak perlu, kecuali istilah baku seperti TOFU, MOFU, BOFU, dan reach.`;

  const perintah = `LAPORAN BULANAN MEDIA SOSIAL RSPUR — ${bulan}

CAPAIAN TINGKAT AKUN
${perAkun}

RINGKASAN SELURUH KONTEN
- Jumlah konten terbit : ${semua.jumlah}
- Total tayangan       : ${angkaRapi(semua.tayangan)}
- Total jangkauan      : ${angkaRapi(semua.jangkauan)}
- Total interaksi      : ${angkaRapi(semua.interaksi)}
- Rasio interaksi      : ${persenRapi(semua.rasioInteraksi)}
- Total biaya iklan    : Rp ${angkaRapi(semua.biayaAds)}

ORGANIK (tanpa iklan)
- ${organik.jumlah} konten · ${angkaRapi(organik.tayangan)} tayangan · ${angkaRapi(organik.interaksi)} interaksi · rasio ${persenRapi(organik.rasioInteraksi)}

BERBAYAR (memakai iklan)
- ${berbayar.jumlah} konten · ${angkaRapi(berbayar.tayangan)} tayangan · ${angkaRapi(berbayar.interaksi)} interaksi · rasio ${persenRapi(berbayar.rasioInteraksi)} · biaya Rp ${angkaRapi(berbayar.biayaAds)}

SEBARAN FUNNEL
${perFunnel}
${tanpaFunnel > 0 ? `- Belum diberi tahap funnel: ${tanpaFunnel} konten` : ""}

DAFTAR KONTEN, diurutkan dari interaksi terbanyak
| Tanggal | Platform | Judul | Format | Funnel | Tayangan | Interaksi | Iklan |
| :--- | :--- | :--- | :--- | :--- | ---: | ---: | :--- |
${baresTabel}

${laporan.catatan ? `CATATAN DARI PENYUSUN\n${laporan.catatan}` : ""}`;

  let hasil: string;
  try {
    hasil = await susunDenganAI(perintah, instruksi);
  } catch (e) {
    return { pesan: e instanceof Error ? e.message : "Gagal menyusun laporan.", berhasil: null };
  }

  const { error } = await supabase
    .from("laporan_sosmed")
    .update({ hasil, disusun_pada: new Date().toISOString() })
    .eq("id", id);

  if (error) return { pesan: `Naskah gagal disimpan: ${error.message}`, berhasil: null };

  revalidatePath(`/laporan/${id}`);
  return { pesan: null, berhasil: "Laporan tersusun." };
}


/**
 * Izin sekali-pakai untuk menaruh satu berkas rekapan di
 * penyimpanan.
 *
 * Berkasnya tidak dititipkan lewat server action karena batas
 * kirimannya cuma 1 MB (4,5 MB di Vercel) — rekapan Excel dari Meta
 * gampang melewatinya. Ditaruh di wadah 'dokumen' yang tertutup,
 * dengan awalan tersendiri supaya tidak tercampur arsip publikasi.
 */
export type IzinUnggah =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

export async function siapkanUnggahData(namaBerkas: string): Promise<IzinUnggah> {
  const tolak = (pesan: string): IzinUnggah => ({ jalur: null, token: null, pesan });

  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return tolak(galat ?? "Tidak berhak.");

  if (!jenisDataDiterima(namaBerkas)) {
    return tolak(
      `${namaBerkas} belum didukung. Yang bisa dibaca: CSV, Excel, Word, PDF, dan tangkapan layar.`,
    );
  }

  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `sosmed/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

/** Bentuk jawaban yang diminta dari Gemini saat membaca rekapan. */
const BENTUK_JAWABAN = `{
  "angka": {
    "Instagram": { "pengikut_awal": 0, "pengikut_akhir": 0, "jangkauan": 0, "tayangan": 0, "kunjungan_profil": 0, "klik_tautan": 0 },
    "TikTok":    { "pengikut_awal": 0, "pengikut_akhir": 0, "jangkauan": 0, "tayangan": 0, "kunjungan_profil": 0, "klik_tautan": 0 }
  },
  "konten": [
    {
      "tanggal": "2026-09-01",
      "platform": "Instagram",
      "judul": "judul atau keterangan singkat kontennya",
      "format": "Reels | Feed | Carousel | Story | Video",
      "funnel": "TOFU | MOFU | BOFU",
      "tayangan": 0, "jangkauan": 0, "suka": 0, "komentar": 0,
      "dibagikan": 0, "disimpan": 0,
      "ada_ads": false, "biaya_ads": 0,
      "catatan": "keterangan bila ada yang perlu diperiksa manusia"
    }
  ],
  "keterangan": "satu paragraf: apa yang terbaca, apa yang tidak ada di berkas"
}`;

const INSTRUKSI_BACA = `Anda membaca rekapan resmi media sosial rumah sakit — hasil unduhan
Meta Business Suite, Instagram Insight, atau TikTok Studio — lalu
memindahkannya ke bentuk JSON.

Ini pekerjaan MENYALIN, bukan menganalisis. Aturannya keras:

1. Hanya tulis angka yang benar-benar tertera di berkas. Tidak ada
   angka yang boleh dikira-kira, dibulatkan, atau diisi karena
   "biasanya segitu". Yang tidak ada di berkas diisi 0.
2. Jangan menghitung apa pun. Jumlah, rata-rata, dan persentase
   dihitung sendiri oleh sistem dari angka yang Anda salin.
3. "ada_ads" hanya true kalau berkas memang menyebutkan konten itu
   diiklankan — misalnya ada kolom biaya iklan, jangkauan berbayar,
   "promoted", "boosted", "hasil iklan", atau anggaran yang terpakai.
   Kalau tidak disebut, isi false. Jangan menebak dari angkanya yang
   tinggi.
4. "funnel" diisi hanya kalau berkasnya memang menyebut tahapnya.
   Kalau tidak ada, isi null — biar orangnya sendiri yang menentukan.
5. Tanggal ditulis YYYY-MM-DD. Kalau di berkas cuma ada tanggal dan
   bulan, pakai tahun laporan yang disebutkan di perintah.
6. Angka Indonesia sering ditulis dengan titik sebagai pemisah ribuan
   ("12.345" berarti dua belas ribu tiga ratus empat puluh lima) dan
   koma sebagai desimal. Baca sesuai kebiasaan itu. Singkatan seperti
   "1,2 rb" atau "3,4 jt" dijabarkan jadi angka penuh.
7. Kalau ada yang meragukan — kolom yang tidak jelas artinya, angka
   yang terpotong — tulis keraguannya di "catatan" baris itu, jangan
   dibereskan diam-diam.
8. Jawab HANYA dengan JSON berbentuk persis seperti contoh, tanpa
   penjelasan tambahan di luar JSON.`;

/**
 * Membaca berkas rekapan lalu mengisi laporan dari isinya.
 *
 * Hasil bacaan TIDAK langsung dianggap benar: barisnya masuk sebagai
 * konten biasa yang bisa diperiksa, diperbaiki, dan dihapus satu per
 * satu sebelum naskah laporannya disusun. Mesin yang salah baca satu
 * kolom tidak boleh diam-diam jadi angka resmi rumah sakit.
 */
export async function bacaDataSosmed(_s: Hasil, formData: FormData): Promise<Hasil> {
  const { pengguna, galat } = await pastikanBerhak();
  if (!pengguna) return { pesan: galat, berhasil: null };

  const id = angka(formData, "id");
  const jalur = String(formData.get("jalur") ?? "")
    .split("\n")
    .map((j) => j.trim())
    .filter((j) => j !== "");

  if (jalur.length === 0) {
    return { pesan: "Pilih dulu berkas rekapannya.", berhasil: null };
  }

  const supabase = await createClient();
  const { data: laporan } = await supabase
    .from("laporan_sosmed")
    .select("bulan, tahun, akun, angka")
    .eq("id", id)
    .maybeSingle();

  if (!laporan) return { pesan: "Laporannya tidak ditemukan.", berhasil: null };

  const db = createAdminClient();
  const bagian: Bagian[] = [];
  const gagal: string[] = [];

  for (const j of jalur) {
    const { data: berkas, error } = await db.storage.from("dokumen").download(j);

    if (error || !berkas) {
      gagal.push(`${j.split("-").slice(-1)[0]} tidak bisa dibaca ulang`);
      continue;
    }

    if (berkas.size > MAKS_DATA) {
      gagal.push(`${j.split("-").slice(-1)[0]} terlalu besar`);
      continue;
    }

    const siap = siapkanKiriman(j, await berkas.arrayBuffer());
    if (siap.bagian === null) gagal.push(siap.pesan);
    else bagian.push(siap.bagian);
  }

  // Berkas mentahnya tidak perlu disimpan: yang berharga hasil
  // bacaannya, dan menyimpannya berarti menimbun data lama yang
  // tidak pernah dibuka lagi.
  await db.storage.from("dokumen").remove(jalur);

  if (bagian.length === 0) {
    return {
      pesan: `Tidak ada berkas yang bisa dibaca. ${gagal.join("; ")}`,
      berhasil: null,
    };
  }

  bagian.unshift({
    text: `Laporan yang sedang disusun: ${NAMA_BULAN[laporan.bulan]} ${laporan.tahun},
akun ${laporan.akun} di Instagram dan TikTok.

Salin isi berkas berikut ke JSON dengan bentuk persis seperti ini:

${BENTUK_JAWABAN}`,
  });

  let mentah: string;
  try {
    mentah = await bacaDenganAI(bagian, INSTRUKSI_BACA);
  } catch (kesalahan) {
    return {
      pesan: kesalahan instanceof Error ? kesalahan.message : String(kesalahan),
      berhasil: null,
    };
  }

  type Baca = {
    angka?: Record<string, Record<string, unknown>>;
    konten?: Record<string, unknown>[];
    keterangan?: string;
  };

  let hasil: Baca;
  try {
    // Sesekali jawabannya masih dibungkus pagar kode walaupun sudah
    // diminta JSON saja.
    const bersih = mentah.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "");
    hasil = JSON.parse(bersih.trim()) as Baca;
  } catch {
    return {
      pesan: "Jawaban AI tidak berbentuk JSON yang bisa dibaca. Coba ulangi, atau unggah berkasnya satu per satu.",
      berhasil: null,
    };
  }

  const bilangan = (nilai: unknown): number => {
    const n = Number(String(nilai ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };

  const teks = (nilai: unknown): string | null => {
    const t = String(nilai ?? "").trim();
    return t === "" || t.toLowerCase() === "null" ? null : t;
  };

  // Capaian tingkat akun hanya menimpa yang masih kosong. Angka yang
  // sudah diketik orang lebih dipercaya daripada hasil bacaan mesin.
  const angkaLama = (laporan.angka ?? {}) as Record<string, Record<string, number>>;
  const angkaBaru: Record<string, Record<string, number>> = {};
  let adaAngka = false;

  for (const p of PLATFORM) {
    angkaBaru[p] = {};
    for (const u of UKURAN) {
      const lama = Number(angkaLama[p]?.[u.kunci] ?? 0);
      const baca = bilangan(hasil.angka?.[p]?.[u.kunci]);
      angkaBaru[p][u.kunci] = lama > 0 ? lama : baca;
      if (lama === 0 && baca > 0) adaAngka = true;
    }
  }

  const baris = (hasil.konten ?? [])
    .map((k) => {
      const judul = teks(k.judul);
      if (!judul) return null;

      const platform = String(k.platform ?? "").toLowerCase().includes("tik")
        ? "TikTok"
        : "Instagram";

      const funnel = String(k.funnel ?? "").toUpperCase();

      return {
        laporan_id: id,
        tanggal: /^\d{4}-\d{2}-\d{2}$/.test(String(k.tanggal ?? ""))
          ? String(k.tanggal)
          : null,
        platform,
        judul: judul.slice(0, 200),
        format: teks(k.format),
        funnel: ["TOFU", "MOFU", "BOFU"].includes(funnel) ? funnel : null,
        tayangan: bilangan(k.tayangan),
        jangkauan: bilangan(k.jangkauan),
        suka: bilangan(k.suka),
        komentar: bilangan(k.komentar),
        dibagikan: bilangan(k.dibagikan),
        disimpan: bilangan(k.disimpan),
        ada_ads: k.ada_ads === true,
        biaya_ads: bilangan(k.biaya_ads),
        catatan: teks(k.catatan),
      };
    })
    .filter((b) => b !== null);

  if (baris.length > 0) {
    const { error } = await supabase.from("laporan_konten").insert(baris);
    if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  }

  if (adaAngka) {
    await supabase
      .from("laporan_sosmed")
      .update({ angka: angkaBaru, diubah_pada: new Date().toISOString() })
      .eq("id", id);
  }

  revalidatePath(`/laporan/${id}`);

  const berkiklan = baris.filter((b) => b.ada_ads).length;
  const catatan = [
    `${baris.length} konten terbaca dari ${bagian.length - 1} berkas`,
    berkiklan > 0 ? `${berkiklan} di antaranya pakai iklan` : "tidak ada yang ditandai pakai iklan",
    adaAngka ? "capaian akun yang masih kosong ikut terisi" : null,
    hasil.keterangan ? String(hasil.keterangan).slice(0, 300) : null,
    gagal.length > 0 ? `Belum terbaca: ${gagal.join("; ")}` : null,
    "Periksa dulu barisnya sebelum naskahnya disusun — mesin bisa salah baca kolom.",
  ].filter(Boolean);

  return { pesan: null, berhasil: catatan.join(". ") + "." };
}
