import "server-only";
import PizZip from "pizzip";
import type { Bagian } from "@/lib/ai";

export { ACCEPT_DATA, JENIS_DATA, MAKS_DATA, jenisDataDiterima } from "@/lib/berkas-jenis";

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

      // Sel kosong ditulis menutup sendiri (<c r="A58"/>). Tanpa
      // cabang kedua di bawah, pola serakah itu menelan sel
      // sesudahnya, dan isi tabel bergeser satu kolom.
      for (const m of baris.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const sifat = m[1];
        const dalam = m[2] ?? "";
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

/**
 * Satu baris tabel Word, dikembalikan jadi baris markdown.
 *
 * Kotaknya boleh memuat beberapa paragraf; semuanya digabung
 * dengan titik koma, sama seperti aturan menulis tabel yang
 * dipakai AI — supaya yang pulang berbentuk sama dengan yang
 * berangkat.
 */
function barisDariTr(tr: string): string {
  const kotak = tr
    .split(/<\/w:tc>/)
    .slice(0, -1)
    .map((tc) =>
      tc
        .split(/<\/w:p>/)
        .map((p) => tanpaTag(p))
        .filter((p) => p !== "")
        .join("; ")
        .replace(/\|/g, "\\|"),
    );

  return `| ${kotak.join(" | ")} |`;
}

/**
 * Isi berkas Word sebagai teks, TABELNYA TETAP TABEL.
 *
 * Dulu seluruh isinya dipipihkan jadi baris-baris paragraf. Untuk
 * dibaca sepintas itu cukup, tetapi berakibat buruk pada satu hal
 * yang justru paling sering dilakukan: melampirkan kalender yang
 * sudah dirapikan tangan, lalu meminta diperbaiki seperlunya.
 * Kalendernya sampai ke AI tanpa satu pun tanda tabel — tidak ada
 * baris yang bisa ia pertahankan, jadi ia menyusunnya ulang. Lalu
 * yang dikira rewel adalah AI-nya, padahal tabelnya memang sudah
 * hilang sebelum sampai.
 *
 * Tabel Word tidak bersarang di dalam paragraf, jadi dokumennya
 * dipenggal pada batas <w:tbl> lebih dulu; yang di dalamnya
 * dibaca per baris, yang di luarnya per paragraf seperti dulu.
 */
function dariWord(isi: ArrayBuffer): string {
  const zip = new PizZip(isi);
  const xml = zip.file("word/document.xml")?.asText() ?? "";

  const keluar: string[] = [];

  for (const potong of xml.split(/(<w:tbl>[\s\S]*?<\/w:tbl>)/)) {
    if (potong.startsWith("<w:tbl>")) {
      const baris = potong
        .split(/<\/w:tr>/)
        .slice(0, -1)
        .map(barisDariTr);

      if (baris.length === 0) continue;

      // Baris pemisah markdown disisipkan sesudah kepala tabel;
      // tanpa itu yang membaca cuma melihat deretan garis tegak.
      const jumlahKolom = (baris[0].match(/\|/g)?.length ?? 2) - 1;
      keluar.push(baris[0]);
      keluar.push(`|${" --- |".repeat(Math.max(jumlahKolom, 1))}`);
      keluar.push(...baris.slice(1));
      keluar.push("");
      continue;
    }

    for (const p of potong.split(/<\/w:p>/)) {
      const teks = tanpaTag(p);
      if (teks !== "") keluar.push(teks);
    }
  }

  return keluar.join("\n");
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
