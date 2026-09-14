/**
 * Membongkar dokumen Markdown jadi blok teks dan blok tabel, lalu
 * merangkainya kembali.
 *
 * Gunanya supaya tabel bisa disunting sebagai tabel — kotak per
 * kotak — bukan sebagai deretan tanda garis tegak. Menyunting
 * kalender konten dalam bentuk mentah gampang merusak barisnya, dan
 * yang rusak baru ketahuan setelah dokumennya diunduh.
 *
 * Bagian di luar tabel sengaja dibiarkan apa adanya, tidak ikut
 * diurai. Yang tidak diurai tidak bisa rusak.
 */

export type Rata = "kiri" | "tengah" | "kanan" | "bebas";

export type Blok =
  | { jenis: "teks"; isi: string }
  | { jenis: "tabel"; kepala: string[]; rata: Rata[]; isi: string[][] };

/** Memisah satu baris tabel jadi isi tiap kotak. */
function pisahBaris(baris: string): string[] {
  const bersih = baris.trim().replace(/^\|/, "").replace(/\|$/, "");
  const kotak: string[] = [];
  let kini = "";

  for (let i = 0; i < bersih.length; i++) {
    const huruf = bersih[i];

    // Garis tegak yang didahului garis miring adalah isi, bukan
    // pemisah — begitulah caranya menulis "|" di dalam kotak.
    if (huruf === "\\" && bersih[i + 1] === "|") {
      kini += "|";
      i++;
      continue;
    }

    if (huruf === "|") {
      kotak.push(kini.trim());
      kini = "";
      continue;
    }

    kini += huruf;
  }

  kotak.push(kini.trim());
  return kotak;
}

/** Baris pemisah kepala tabel: |---|:--:|---:| */
function barisPemisah(baris: string): boolean {
  const bersih = baris.trim();
  if (!bersih.includes("|") || !bersih.includes("-")) return false;
  return pisahBaris(bersih).every((k) => /^:?-{1,}:?$/.test(k.replace(/\s/g, "")));
}

function bacaRata(kotak: string): Rata {
  const k = kotak.replace(/\s/g, "");
  const kiri = k.startsWith(":");
  const kanan = k.endsWith(":");
  if (kiri && kanan) return "tengah";
  if (kanan) return "kanan";
  if (kiri) return "kiri";
  return "bebas";
}

function tulisRata(rata: Rata): string {
  if (rata === "tengah") return ":---:";
  if (rata === "kanan") return "---:";
  if (rata === "kiri") return ":---";
  return "---";
}

/** Sebuah baris dianggap baris tabel bila mengandung garis tegak. */
function mungkinTabel(baris: string): boolean {
  return baris.includes("|");
}

export function pisahBlok(markdown: string): Blok[] {
  const baris = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blok: Blok[] = [];
  let teks: string[] = [];

  function tutupTeks() {
    if (teks.length > 0) {
      blok.push({ jenis: "teks", isi: teks.join("\n") });
      teks = [];
    }
  }

  for (let i = 0; i < baris.length; i++) {
    const kepalaTabel =
      mungkinTabel(baris[i]) &&
      i + 1 < baris.length &&
      barisPemisah(baris[i + 1]) &&
      !barisPemisah(baris[i]);

    if (!kepalaTabel) {
      teks.push(baris[i]);
      continue;
    }

    const kepala = pisahBaris(baris[i]);
    const rata = pisahBaris(baris[i + 1]).map(bacaRata);
    const isi: string[][] = [];

    let j = i + 2;
    for (; j < baris.length; j++) {
      const b = baris[j];
      if (b.trim() === "" || !mungkinTabel(b)) break;

      const kotak = pisahBaris(b);
      // Baris pendek dilengkapi, baris kepanjangan dipotong —
      // tabel bergerigi membuat penyuntingan per kotak mustahil.
      while (kotak.length < kepala.length) kotak.push("");
      isi.push(kotak.slice(0, kepala.length));
    }

    tutupTeks();
    blok.push({
      jenis: "tabel",
      kepala,
      rata: kepala.map((_, k) => rata[k] ?? "bebas"),
      isi,
    });

    i = j - 1;
  }

  tutupTeks();
  return blok;
}

function amankan(isi: string): string {
  return isi.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

export function gabungBlok(blok: Blok[]): string {
  return blok
    .map((b) => {
      if (b.jenis === "teks") return b.isi;

      const baris = [
        `| ${b.kepala.map(amankan).join(" | ")} |`,
        `| ${b.rata.map(tulisRata).join(" | ")} |`,
        ...b.isi.map((r) => `| ${r.map(amankan).join(" | ")} |`),
      ];
      return baris.join("\n");
    })
    .join("\n");
}

/** Baris kosong baru, sepanjang jumlah kolom tabelnya. */
export function barisKosong(jumlahKolom: number): string[] {
  return Array.from({ length: jumlahKolom }, () => "");
}

export function adaTabel(markdown: string): boolean {
  return pisahBlok(markdown).some((b) => b.jenis === "tabel");
}
