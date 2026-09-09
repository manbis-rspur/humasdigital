import "server-only";
import PizZip from "pizzip";
import type { Bagian } from "@/lib/ai";

/**
 * Mengubah berkas rekapan jadi sesuatu yang bisa dibaca Gemini.
 *
 * Dua jalur, karena dua jenis berkas yang berbeda sifatnya:
 *
 *   - Yang isinya sudah berupa tulisan atau tabel (CSV, Excel, Word)
 *     diperas jadi teks di sini. Lebih murah, lebih tepat, dan
 *     angkanya sampai apa adanya tanpa melewati pengenalan gambar.
 *
 *   - Yang berupa halaman tercetak atau tangkapan layar (PDF, PNG,
 *     JPG) dikirim utuh. Meta dan TikTok Studio sering hanya bisa
 *     dibagikan dalam bentuk itu, dan memaksanya jadi teks lebih
 *     dulu justru merusak susunan tabelnya.
 */

export const JENIS_DATA = [
  ".csv",
  ".tsv",
  ".txt",
  ".xlsx",
  ".docx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ACCEPT_DATA = JENIS_DATA.join(",");

/** Berkas rekapan jarang besar; batas ini menjaga tagihan Gemini. */
export const MAKS_DATA = 15 * 1024 * 1024;

export function jenisDataDiterima(nama: string): boolean {
  const n = nama.toLowerCase();
  return JENIS_DATA.some((akhiran) => n.endsWith(akhiran));
}

const MIME_GAMBAR: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function akhiran(nama: string): string {
  const n = nama.toLowerCase();
  const titik = n.lastIndexOf(".");
  return titik === -1 ? "" : n.slice(titik);
}

/** Membuang tag XML, menyisakan tulisannya saja. */
function tanpaTag(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Membaca lembar kerja Excel jadi baris-baris dipisah tanda titik
 * koma.
 *
 * Ditulis sendiri, bukan memakai pustaka pembaca Excel: yang
 * dibutuhkan hanya nilai selnya, dan berkas xlsx pada dasarnya
 * berkas zip berisi XML — cukup dibongkar seperlunya.
 */
function dariExcel(isi: ArrayBuffer): string {
  const zip = new PizZip(isi);

  // Sebagian besar teks di Excel tidak ditulis di selnya, melainkan
  // di satu daftar bersama yang ditunjuk nomor.
  const bersama: string[] = [];
  const berkasBersama = zip.file("xl/sharedStrings.xml");
  if (berkasBersama) {
    const xml = berkasBersama.asText();
    for (const potong of xml.split(/<si[ >]/).slice(1)) {
      const teks = [...potong.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((m) => m[1])
        .join("");
      bersama.push(tanpaTag(teks));
    }
  }

  const lembar = zip
    .file(/^xl\/worksheets\/sheet\d+\.xml$/)
    .sort((a, b) => a.name.localeCompare(b.name));

  const keluar: string[] = [];

  for (const l of lembar) {
    const xml = l.asText();
    keluar.push(`--- ${l.name} ---`);

    for (const baris of xml.split(/<row[ >]/).slice(1)) {
      const sel: string[] = [];

      for (const m of baris.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const sifat = m[1];
        const dalam = m[2];
        const nilai = /<v[^>]*>([\s\S]*?)<\/v>/.exec(dalam)?.[1] ?? "";

        if (/t="s"/.test(sifat)) {
          sel.push(bersama[Number(nilai)] ?? "");
        } else if (/t="inlineStr"/.test(sifat)) {
          sel.push(tanpaTag(dalam));
        } else {
          sel.push(nilai);
        }
      }

      if (sel.some((s) => s !== "")) keluar.push(sel.join(";"));
    }
  }

  return keluar.join("\n");
}

function dariWord(isi: ArrayBuffer): string {
  const zip = new PizZip(isi);
  const xml = zip.file("word/document.xml")?.asText() ?? "";

  // Tiap paragraf jadi satu baris, supaya tabel tidak berantakan
  // menyatu jadi satu kalimat panjang.
  return xml
    .split(/<\/w:p>/)
    .map((p) => tanpaTag(p))
    .filter((p) => p !== "")
    .join("\n");
}

export type Kiriman =
  | { bagian: Bagian; pesan: null }
  | { bagian: null; pesan: string };

export function siapkanKiriman(nama: string, isi: ArrayBuffer): Kiriman {
  const jenis = akhiran(nama);

  try {
    if (jenis === ".csv" || jenis === ".tsv" || jenis === ".txt") {
      const teks = new TextDecoder("utf-8").decode(isi);
      return { bagian: { text: `Isi berkas ${nama}:\n\n${teks}` }, pesan: null };
    }

    if (jenis === ".xlsx") {
      return {
        bagian: { text: `Isi berkas ${nama}:\n\n${dariExcel(isi)}` },
        pesan: null,
      };
    }

    if (jenis === ".docx") {
      return {
        bagian: { text: `Isi berkas ${nama}:\n\n${dariWord(isi)}` },
        pesan: null,
      };
    }

    const mime = MIME_GAMBAR[jenis];
    if (mime) {
      return {
        bagian: {
          inlineData: { mimeType: mime, data: Buffer.from(isi).toString("base64") },
        },
        pesan: null,
      };
    }
  } catch (galat) {
    return {
      bagian: null,
      pesan: `Berkas ${nama} tidak terbaca: ${
        galat instanceof Error ? galat.message : String(galat)
      }`,
    };
  }

  return { bagian: null, pesan: `Jenis berkas ${nama} belum didukung.` };
}
