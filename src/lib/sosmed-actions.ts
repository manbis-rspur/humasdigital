"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehSosmed } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { susunDenganAI } from "@/lib/ai";
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("laporan_sosmed")
    .update({
      angka: isi,
      catatan: String(formData.get("catatan") ?? "").trim() || null,
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
