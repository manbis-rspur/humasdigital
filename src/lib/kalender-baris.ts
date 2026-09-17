/**
 * Membaca baris-baris kalender konten dari naskah Markdown.
 *
 * Gunanya supaya satu baris kalender bisa dijadikan brief produksi
 * sendiri. Kolomnya dikenali dari namanya, bukan dari urutannya —
 * susunan tabel itu tersimpan sebagai data dan boleh diubah sendiri
 * lewat menu Sunting Modul, jadi mengandalkan urutan berarti fitur
 * ini diam-diam rusak begitu ada yang menggeser satu kolom.
 */

import { pisahBlok } from "@/lib/markdown-tabel";

export type BarisKalender = {
  /** Nomor urut di dalam tabel, dipakai sebagai kunci tampilan. */
  nomor: number;
  tanggal: string;
  tahap: string;
  pilar: string;
  topik: string;
  format: string;
  angle: string;
  dokter: string;
};

/** Kata kunci yang dicari pada nama kolom, berurutan dari yang paling khas. */
const PETA: [keyof Omit<BarisKalender, "nomor">, string[]][] = [
  ["tanggal", ["tanggal", "minggu"]],
  ["tahap", ["tahap", "corong", "funnel"]],
  ["pilar", ["pilar"]],
  ["topik", ["topik", "judul konten"]],
  ["format", ["format", "kanal"]],
  ["angle", ["angle", "konsep"]],
  ["dokter", ["dokter", "narasumber"]],
];

function bersih(nilai: string): string {
  return nilai.replace(/\*\*/g, "").trim();
}

/** Apakah isi kotak ini benar-benar ada isinya. */
function ada(nilai: string): boolean {
  const n = nilai.trim();
  return n !== "" && n !== "-" && n !== "—" && n !== "–";
}

export function bacaBarisKalender(markdown: string): BarisKalender[] {
  const tabel = pisahBlok(markdown).filter((b) => b.jenis === "tabel");
  if (tabel.length === 0) return [];

  // Tabel terpanjang adalah kalendernya; yang pendek biasanya tabel
  // sebaran tahap atau jam tayang terbaik.
  const utama = tabel.reduce((a, b) => (b.isi.length > a.isi.length ? b : a));

  const kolom = new Map<keyof Omit<BarisKalender, "nomor">, number>();

  utama.kepala.forEach((nama, i) => {
    const rapi = nama.toLowerCase();
    for (const [kunci, kata] of PETA) {
      if (kolom.has(kunci)) continue;
      if (kata.some((k) => rapi.includes(k))) {
        kolom.set(kunci, i);
        break;
      }
    }
  });

  // Tanpa topik, sebuah baris tidak bisa dijadikan brief apa pun.
  if (!kolom.has("topik")) return [];

  const ambil = (baris: string[], kunci: keyof Omit<BarisKalender, "nomor">) => {
    const i = kolom.get(kunci);
    if (i === undefined) return "";
    const nilai = bersih(baris[i] ?? "");
    return ada(nilai) ? nilai : "";
  };

  return utama.isi
    .map((baris, nomor) => ({
      nomor,
      tanggal: ambil(baris, "tanggal"),
      tahap: ambil(baris, "tahap"),
      pilar: ambil(baris, "pilar"),
      topik: ambil(baris, "topik"),
      format: ambil(baris, "format"),
      angle: ambil(baris, "angle"),
      dokter: ambil(baris, "dokter"),
    }))
    .filter((b) => b.topik !== "");
}

/** Sebutan pendek satu baris, untuk daftar pilihan. */
export function sebutBaris(b: BarisKalender): string {
  return [b.tanggal, b.topik].filter(Boolean).join(" · ");
}
