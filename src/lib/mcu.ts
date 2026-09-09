/**
 * Perhitungan penawaran MCU.
 *
 * Ditulis di satu tempat dan dipakai bersama oleh layar kalkulator,
 * halaman penawaran, dan dokumen cetak — supaya angka yang dilihat
 * saat menghitung sama persis dengan angka yang tercetak di surat.
 *
 * PERBEDAAN PENTING dari sistem lama: PPN tidak dihitung sebagai
 * pendapatan. Di sana margin dan laba diturunkan dari harga yang
 * sudah termasuk PPN, sehingga keduanya tampak lebih besar dari
 * kenyataan — persis sebesar PPN-nya. PPN adalah titipan untuk
 * negara, bukan uang yang diterima rumah sakit.
 */

export type RincianItem = {
  nama: string;
  tarif: number;
  cost: number;
};

export type Hitungan = {
  /** Jumlah tarif seluruh pemeriksaan, sebelum ditawar. */
  subTarif: number;
  /** Jumlah biaya yang benar-benar keluar untuk satu peserta. */
  subCost: number;
  labaDaftar: number;
  marginDaftar: number;

  /** Harga yang ditawarkan untuk satu peserta, sebelum PPN. */
  hargaPaket: number;
  diskon: number;
  diskonPersen: number;

  ppnPerPeserta: number;
  tagihanPerPeserta: number;

  totalTagihan: number;
  totalPpn: number;
  totalBiaya: number;

  /** Laba bersih rumah sakit — tidak termasuk PPN. */
  pendapatan: number;
  /** Margin terhadap harga sebelum PPN. */
  margin: number;
};

export function hitungPenawaran(
  rincian: RincianItem[],
  pilihan: {
    hargaPaket?: number | null;
    jumlahPeserta: number;
    kenaPpn: boolean;
    ppnPersen: number;
  },
): Hitungan {
  const subTarif = rincian.reduce((j, i) => j + i.tarif, 0);
  const subCost = rincian.reduce((j, i) => j + i.cost, 0);

  // Harga penawaran boleh dikosongkan; bila kosong, dipakai harga
  // daftar apa adanya.
  const hargaPaket =
    pilihan.hargaPaket === null || pilihan.hargaPaket === undefined
      ? subTarif
      : Math.max(0, Math.round(pilihan.hargaPaket));

  const peserta = Math.max(1, Math.round(pilihan.jumlahPeserta || 1));

  const diskon = subTarif - hargaPaket;
  const ppnPerPeserta = pilihan.kenaPpn
    ? Math.round((hargaPaket * pilihan.ppnPersen) / 100)
    : 0;

  const labaPerPeserta = hargaPaket - subCost;

  return {
    subTarif,
    subCost,
    labaDaftar: subTarif - subCost,
    marginDaftar: subTarif > 0 ? (subTarif - subCost) / subTarif : 0,

    hargaPaket,
    diskon,
    diskonPersen: subTarif > 0 ? diskon / subTarif : 0,

    ppnPerPeserta,
    tagihanPerPeserta: hargaPaket + ppnPerPeserta,

    totalTagihan: (hargaPaket + ppnPerPeserta) * peserta,
    totalPpn: ppnPerPeserta * peserta,
    totalBiaya: subCost * peserta,

    pendapatan: labaPerPeserta * peserta,
    margin: hargaPaket > 0 ? labaPerPeserta / hargaPaket : 0,
  };
}

const rupiahTanpaDesimal = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function rupiah(nilai: number) {
  return rupiahTanpaDesimal.format(Math.round(nilai));
}

export function persen(pecahan: number) {
  return `${Math.round(pecahan * 100)}%`;
}

const SATUAN = [
  "", "satu", "dua", "tiga", "empat", "lima",
  "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas",
];

/**
 * Mengubah angka jadi tulisan — dipakai pada surat penawaran,
 * karena nilai uang pada dokumen resmi lazim ditulis dua kali:
 * dengan angka dan dengan huruf.
 */
export function terbilang(n: number): string {
  const angka = Math.floor(Math.abs(n));
  if (angka < 12) return SATUAN[angka] || "nol";
  if (angka < 20) return `${terbilang(angka - 10)} belas`;
  if (angka < 100)
    return `${terbilang(Math.floor(angka / 10))} puluh ${terbilang(angka % 10)}`.trim();
  if (angka < 200) return `seratus ${terbilang(angka - 100)}`.trim();
  if (angka < 1000)
    return `${terbilang(Math.floor(angka / 100))} ratus ${terbilang(angka % 100)}`.trim();
  if (angka < 2000) return `seribu ${terbilang(angka - 1000)}`.trim();
  if (angka < 1_000_000)
    return `${terbilang(Math.floor(angka / 1000))} ribu ${terbilang(angka % 1000)}`.trim();
  if (angka < 1_000_000_000)
    return `${terbilang(Math.floor(angka / 1_000_000))} juta ${terbilang(angka % 1_000_000)}`.trim();
  return `${terbilang(Math.floor(angka / 1_000_000_000))} miliar ${terbilang(angka % 1_000_000_000)}`.trim();
}

export function terbilangRupiah(n: number) {
  const kata = terbilang(n).replace(/\s+/g, " ").trim();
  return `${kata.charAt(0).toUpperCase()}${kata.slice(1)} rupiah`;
}
