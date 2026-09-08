import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

/**
 * Mengubah dokumen hasil susunan AI menjadi berkas Word.
 *
 * Kenapa Word dan bukan Google Docs: Google Docs bukan format
 * berkas, melainkan dokumen yang hidup di Drive. Membuatnya
 * langsung dari sini berarti menyambungkan akun Google beserta
 * izin Drive-nya. Berkas Word membuka jalan yang sama dalam satu
 * langkah — Google Docs membukanya utuh, termasuk tabelnya, lalu
 * tautannya bisa dibagikan seperti biasa.
 *
 * Yang dikenali: judul bertingkat, paragraf, huruf tebal, daftar
 * berpoin dan bernomor, tabel, serta garis pemisah. Itulah bentuk
 * yang benar-benar dihasilkan modul-modul ini.
 */

/** Memecah satu baris jadi potongan tebal dan biasa. */
function potongTebal(baris: string): TextRun[] {
  const hasil: TextRun[] = [];
  const bagian = baris.split(/(\*\*[^*]+\*\*)/g);

  for (const b of bagian) {
    if (!b) continue;
    if (b.startsWith("**") && b.endsWith("**")) {
      hasil.push(new TextRun({ text: b.slice(2, -2), bold: true }));
    } else {
      hasil.push(new TextRun(b));
    }
  }

  return hasil.length > 0 ? hasil : [new TextRun("")];
}

/** Membaca satu baris tabel markdown jadi daftar sel. */
function selTabel(baris: string): string[] {
  return baris
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());
}

function barisPemisah(baris: string) {
  return /^\|?[\s:|-]+\|[\s:|-]*$/.test(baris) && baris.includes("-");
}

function buatTabel(baris: string[]): Table {
  const isi = baris.map(selTabel);
  const lebarKolom = Math.max(...isi.map((b) => b.length));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: isi.map(
      (sel, nomor) =>
        new TableRow({
          tableHeader: nomor === 0,
          children: Array.from({ length: lebarKolom }, (_, i) => {
            const teks = sel[i] ?? "";
            return new TableCell({
              shading: nomor === 0 ? { fill: "EFEFEF" } : undefined,
              children: [
                new Paragraph({
                  children:
                    nomor === 0
                      ? [new TextRun({ text: teks.replace(/\*\*/g, ""), bold: true })]
                      : potongTebal(teks),
                }),
              ],
            });
          }),
        }),
    ),
  });
}

export async function jadikanWord(judul: string, markdown: string): Promise<Buffer> {
  const baris = markdown.replace(/\r\n/g, "\n").split("\n");
  const isi: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: judul, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const bersih = b.trim();

    if (bersih === "") continue;

    // Tabel: dikenali dari baris pemisah pada baris berikutnya.
    if (bersih.startsWith("|") && barisPemisah(baris[i + 1] ?? "")) {
      const kumpulan: string[] = [bersih];
      i++; // lewati baris pemisah
      while (i + 1 < baris.length && baris[i + 1].trim().startsWith("|")) {
        kumpulan.push(baris[++i].trim());
      }
      isi.push(buatTabel(kumpulan));
      isi.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    if (/^---+$/.test(bersih)) {
      isi.push(new Paragraph({ text: "", border: { bottom: { style: "single", size: 6, color: "CCCCCC" } } }));
      continue;
    }

    const judulCocok = bersih.match(/^(#{1,4})\s+(.*)$/);
    if (judulCocok) {
      const tingkat = judulCocok[1].length;
      isi.push(
        new Paragraph({
          children: potongTebal(judulCocok[2]),
          heading:
            tingkat === 1
              ? HeadingLevel.HEADING_1
              : tingkat === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        }),
      );
      continue;
    }

    const poin = bersih.match(/^[-*+]\s+(.*)$/);
    if (poin) {
      isi.push(new Paragraph({ children: potongTebal(poin[1]), bullet: { level: 0 } }));
      continue;
    }

    const bernomor = bersih.match(/^\d+[.)]\s+(.*)$/);
    if (bernomor) {
      isi.push(
        new Paragraph({
          children: potongTebal(bernomor[1]),
          numbering: { reference: "daftar-bernomor", level: 0 },
        }),
      );
      continue;
    }

    isi.push(new Paragraph({ children: potongTebal(bersih), spacing: { after: 120 } }));
  }

  const dokumen = new Document({
    numbering: {
      config: [
        {
          reference: "daftar-bernomor",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children: isi }],
  });

  return Packer.toBuffer(dokumen);
}
