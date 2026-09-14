/**
 * Bahan usulan tema: hari kesehatan dan isu yang sedang ramai.
 *
 * Di berkas biasa, bukan di dalam berkas server action: peramban
 * ikut memakainya, dan berkas bertanda "use server" hanya boleh
 * mengekspor fungsi async.
 */

export const LINGKUP = ["Internasional", "Nasional", "RSPUR"] as const;

export const NAMA_BULAN = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export type HariKesehatan = {
  id: number;
  nama: string;
  bulan: number;
  tanggal: number;
  lingkup: string;
  kaitan: string | null;
  sudut: string | null;
  aktif: boolean;
};

export type IsuRamai = {
  id: number;
  judul: string;
  ringkasan: string | null;
  sudut: string | null;
  kaitan: string | null;
  sumber: string | null;
  mulai: string;
  sampai: string | null;
  aktif: boolean;
};

/** Satu kartu usulan, apa pun asalnya. */
export type Usulan = {
  kunci: string;
  jenis: "hari" | "isu";
  judul: string;
  kapan: string;
  kaitan: string | null;
  sudut: string | null;
  /** Berapa hari lagi. Negatif berarti sedang berlangsung. */
  jarak: number;
};

export function sebutTanggal(bulan: number, tanggal: number): string {
  return `${tanggal} ${NAMA_BULAN[bulan] ?? ""}`.trim();
}

/**
 * Tanggal hari ini menurut waktu Jakarta.
 *
 * Peladen Vercel berjalan pada waktu UTC, dan sampai pukul tujuh
 * pagi WIB tanggalnya masih tanggal kemarin di sana. Tanpa ini,
 * hari kesehatan yang jatuh hari ini hilang dari daftar sepanjang
 * pagi.
 */
export function hariIniWIB(): Date {
  const sekarang = new Date();
  const rapi = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(sekarang);
  return new Date(`${rapi}T00:00:00Z`);
}

const SEHARI = 24 * 60 * 60 * 1000;

export function selisihHari(dari: Date, sampai: Date): number {
  return Math.round((sampai.getTime() - dari.getTime()) / SEHARI);
}

/**
 * Menyusun hari kesehatan jadi kartu usulan untuk rentang tertentu.
 *
 * Bulan dan tanggal disimpan tanpa tahun, jadi tahunnya dipasang di
 * sini: tahun ini bila belum lewat, tahun depan bila sudah — supaya
 * "Hari Gizi 25 Januari" yang dilihat pada bulan Desember muncul
 * sebagai bulan depan, bukan sebelas bulan yang lalu.
 */
export function usulanDariHari(
  daftar: HariKesehatan[],
  sejak: Date,
  sampaiHari: number,
): Usulan[] {
  const hasil: Usulan[] = [];
  const tahunIni = sejak.getUTCFullYear();

  for (const h of daftar) {
    for (const tahun of [tahunIni, tahunIni + 1]) {
      const jatuh = new Date(Date.UTC(tahun, h.bulan - 1, h.tanggal));
      const jarak = selisihHari(sejak, jatuh);
      if (jarak < 0 || jarak > sampaiHari) continue;

      hasil.push({
        kunci: `hari-${h.id}-${tahun}`,
        jenis: "hari",
        judul: h.nama,
        kapan: `${sebutTanggal(h.bulan, h.tanggal)} ${tahun}`,
        kaitan: h.kaitan,
        sudut: h.sudut,
        jarak,
      });
      break;
    }
  }

  return hasil;
}

export function usulanDariIsu(daftar: IsuRamai[], sejak: Date): Usulan[] {
  return daftar.map((i) => ({
    kunci: `isu-${i.id}`,
    jenis: "isu" as const,
    judul: i.judul,
    kapan: i.sampai ? `berlaku sampai ${i.sampai}` : "sedang berlangsung",
    kaitan: i.kaitan,
    sudut: i.sudut ?? i.ringkasan,
    jarak: Math.min(0, selisihHari(sejak, new Date(`${i.mulai}T00:00:00Z`))),
  }));
}

/** Isu lebih dulu, lalu hari kesehatan menurut yang paling dekat. */
export function urutkanUsulan(daftar: Usulan[]): Usulan[] {
  return [...daftar].sort((a, b) => {
    if (a.jenis !== b.jenis) return a.jenis === "isu" ? -1 : 1;
    return a.jarak - b.jarak;
  });
}

/** Kalimat yang disisipkan ke kotak cerita kampanye saat kartu diklik. */
export function kalimatUsulan(u: Usulan): string {
  const bagian = [
    u.jenis === "hari" ? `Mengangkat ${u.judul} (${u.kapan}).` : `Isu yang sedang ramai: ${u.judul}.`,
  ];
  if (u.sudut) bagian.push(u.sudut.endsWith(".") ? u.sudut : `${u.sudut}.`);
  if (u.kaitan) bagian.push(`Layanan yang disorot: ${u.kaitan}.`);
  return bagian.join(" ");
}
