/**
 * Perhitungan laporan bulanan media sosial.
 *
 * Ditulis terpisah dari tampilan supaya angka yang muncul di layar
 * dan angka yang dikirim ke AI berasal dari satu sumber — kalau
 * dihitung dua kali, cepat atau lambat keduanya berbeda dan
 * laporannya jadi tidak bisa dipercaya.
 */

export type Konten = {
  id: number;
  tanggal: string | null;
  platform: string;
  judul: string;
  format: string | null;
  funnel: string | null;
  tayangan: number;
  jangkauan: number;
  suka: number;
  komentar: number;
  dibagikan: number;
  disimpan: number;
  ada_ads: boolean;
  biaya_ads: number;
  catatan: string | null;
};

export type Ringkasan = {
  jumlah: number;
  tayangan: number;
  jangkauan: number;
  interaksi: number;
  biayaAds: number;
  /** Rata-rata interaksi dibanding tayangan. */
  rasioInteraksi: number;
};

export const NAMA_BULAN = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function interaksi(k: Konten) {
  return k.suka + k.komentar + k.dibagikan + k.disimpan;
}

export function ringkas(daftar: Konten[]): Ringkasan {
  const tayangan = daftar.reduce((j, k) => j + k.tayangan, 0);
  const total = daftar.reduce((j, k) => j + interaksi(k), 0);

  return {
    jumlah: daftar.length,
    tayangan,
    jangkauan: daftar.reduce((j, k) => j + k.jangkauan, 0),
    interaksi: total,
    biayaAds: daftar.reduce((j, k) => j + k.biaya_ads, 0),
    rasioInteraksi: tayangan > 0 ? total / tayangan : 0,
  };
}

/** Ukuran capaian tingkat akun yang diisi sendiri per platform. */
export const UKURAN = [
  { kunci: "pengikut_awal", label: "Pengikut awal bulan" },
  { kunci: "pengikut_akhir", label: "Pengikut akhir bulan" },
  { kunci: "jangkauan", label: "Jangkauan akun" },
  { kunci: "tayangan", label: "Tayangan akun" },
  { kunci: "kunjungan_profil", label: "Kunjungan profil" },
  { kunci: "klik_tautan", label: "Klik tautan" },
] as const;

export const PLATFORM = ["Instagram", "TikTok"] as const;

export function angkaRapi(n: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export function persenRapi(pecahan: number) {
  return `${(pecahan * 100).toFixed(2)}%`;
}
