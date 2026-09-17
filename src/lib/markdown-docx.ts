import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { bacaUkuranGambar } from "@/lib/ukuran-gambar";
import { pisahBlok, type Blok } from "@/lib/markdown-tabel";
import type { Kop } from "@/lib/markdown-pdf";

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

/**
 * Memecah satu baris jadi potongan tebal dan biasa.
 *
 * Ukurannya dititipkan dari luar, bukan disetel belakangan:
 * TextRun itu kelas, dan menyalinnya dengan sebaran objek
 * menghasilkan isi dalamannya — bukan pilihan yang dipakai
 * membuatnya. Hasilnya berkas Word yang terbentuk tapi tulisannya
 * hilang.
 */
function potongTebal(baris: string, ukuran?: number): TextRun[] {
  const hasil: TextRun[] = [];

  // Tebal (**begini**), miring (*begini*), dan kode (`begini`).
  // Sebelumnya hanya yang tebal dikenali, jadi bintang tunggal
  // ikut tercetak apa adanya — "*(Haornas)*" muncul lengkap dengan
  // bintangnya di berkas Word.
  const bagian = baris.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g);

  for (const b of bagian) {
    if (!b) continue;

    const tebal = b.startsWith("**") && b.endsWith("**") && b.length > 4;
    const miring = !tebal && b.startsWith("*") && b.endsWith("*") && b.length > 2;
    const kode = b.startsWith("`") && b.endsWith("`") && b.length > 2;

    let teks = b;
    if (tebal) teks = b.slice(2, -2);
    else if (miring || kode) teks = b.slice(1, -1);
    // Penanda yang tersisa sendirian — bintang atau garis bawah
    // yang pasangannya hilang — dibuang, bukan dicetak. Yang
    // membaca berkas Word tidak tahu artinya penanda Markdown.
    else teks = b.replace(/\*+/g, "").replace(/(^|\s)_(?=\S)|(?<=\S)_(?=\s|$)/g, "$1");

    if (teks === "") continue;

    hasil.push(
      new TextRun({
        text: teks,
        bold: tebal,
        italics: miring,
        font: HURUF,
        size: ukuran ?? UKURAN,
      }),
    );
  }

  return hasil.length > 0
    ? hasil
    : [new TextRun({ text: "", font: HURUF, size: ukuran ?? UKURAN })];
}

/**
 * Huruf seluruh dokumen.
 *
 * Ukurannya dalam setengah titik — 24 berarti 12 pt. Tahoma
 * dipilih sendiri oleh unitnya; ia ada di Windows maupun Mac,
 * jadi berkasnya terbaca sama di kedua tempat.
 */
const HURUF = "Tahoma";
const UKURAN = 24;

/**
 * Jarak daftar berpoin dan bernomor, dalam twip (1.440 per inci).
 *
 * MENJOROK adalah jarak seluruh butir dari tepi kiri; MENGGANTUNG
 * adalah jarak dari nomor ke tulisannya. Bawaan docx jauh lebih
 * lebar dari ini — nomornya seakan terpisah sendiri dari
 * kalimatnya.
 *
 * Dipasang pada paragrafnya, bukan hanya pada aturan penomoran.
 * Yang dipasang di aturan penomoran saja tidak bisa digeser
 * dengan penggaris Word; yang di paragraf bisa.
 */
const MENJOROK = 340;
const MENGGANTUNG = 230;

const GARIS = { style: BorderStyle.SINGLE, size: 2, color: "D6D3CC" };

function buatTabel(blok: Extract<Blok, { jenis: "tabel" }>): Table {
  const isi = [blok.kepala, ...blok.isi];
  const lebarKolom = blok.kepala.length;

  /**
   * Lebar kolom ditentukan dari isinya, bukan dibagi rata.
   *
   * Kolom "Detik" dan "Halaman" cuma berisi beberapa huruf,
   * sedangkan "Ide Visual" berisi kalimat. Dibagi rata, yang
   * pendek jadi lapang dan yang panjang pecah jadi tujuh baris —
   * dan tabel seperti itu justru lebih sulit dibaca daripada
   * paragraf.
   */
  const panjangKolom = Array.from({ length: lebarKolom }, (_, i) => {
    const semua = isi.map((sel) => (sel[i] ?? "").length);
    // Akar pangkat dua meredam bedanya: kolom sepuluh kali lebih
    // panjang tidak layak jadi sepuluh kali lebih lebar.
    return Math.sqrt(Math.max(...semua, 4));
  });

  const jumlah = panjangKolom.reduce((a, b) => a + b, 0);
  const lebar = panjangKolom.map((p) => Math.max(5, Math.round((p / jumlah) * 100)));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: lebar,
    borders: {
      top: GARIS,
      bottom: GARIS,
      left: GARIS,
      right: GARIS,
      insideHorizontal: GARIS,
      insideVertical: GARIS,
    },
    rows: isi.map(
      (sel, nomor) =>
        new TableRow({
          // Kepala tabel diulang di tiap halaman. Tabel panjang
          // yang terpotong tanpa kepala membuat yang membaca
          // halaman kedua menebak-nebak isi tiap kolom.
          tableHeader: nomor === 0,
          children: Array.from({ length: lebarKolom }, (_, i) => {
            const teks = sel[i] ?? "";
            return new TableCell({
              width: { size: lebar[i], type: WidthType.PERCENTAGE },
              shading: nomor === 0 ? { fill: "EFEDE8" } : undefined,
              margins: { top: 60, bottom: 60, left: 90, right: 90 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children:
                    nomor === 0
                      ? [
                          new TextRun({
                            text: teks.replace(/[*`]/g, ""),
                            bold: true,
                            font: HURUF,
                            size: UKURAN,
                          }),
                        ]
                      : potongTebal(teks, UKURAN),
                }),
              ],
            });
          }),
        }),
    ),
  });
}

/**
 * Menyusun kop surat jadi kepala halaman Word.
 *
 * Dipasang sebagai header dokumen, bukan gambar di baris pertama.
 * Gambar di baris pertama ikut bergeser begitu isinya bertambah;
 * header tetap di tempatnya, dan itulah yang membuat berkasnya
 * terbaca sebagai dokumen resmi — bukan naskah yang kebetulan
 * diawali gambar.
 *
 * Halaman pertama saja: titlePage membuat header ini hanya
 * berlaku di sana, seperti kebiasaan surat resmi.
 */
function kepalaKop(kop: Kop): Header | null {
  const ukuran = bacaUkuranGambar(kop.isi);
  if (!ukuran || ukuran.lebar === 0 || ukuran.tinggi === 0) return null;

  // Lebar isi halaman A4 MELINTANG dengan tepi rapat, dalam titik.
  const LEBAR_ISI = 770;
  const TINGGI_MAKS = 90;

  let lebar = LEBAR_ISI;
  let tinggi = (LEBAR_ISI * ukuran.tinggi) / ukuran.lebar;

  // Kop yang terlalu tinggi menelan halaman pertama. Diperkecil
  // menurut perbandingan aslinya, bukan digepengkan.
  if (tinggi > TINGGI_MAKS) {
    tinggi = TINGGI_MAKS;
    lebar = (TINGGI_MAKS * ukuran.lebar) / ukuran.tinggi;
  }

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: ukuran.jenis === "PNG" ? "png" : "jpg",
            data: kop.isi,
            transformation: { width: Math.round(lebar), height: Math.round(tinggi) },
          }),
        ],
      }),
    ],
  });
}

export async function jadikanWord(
  judul: string,
  markdown: string,
  kop?: Kop | null,
): Promise<Buffer> {
  const isi: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: judul, bold: true, size: 28, font: HURUF })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  /**
   * Isinya disusun dari blok, memakai pengurai tabel yang sama
   * dengan berkas PDF.
   *
   * Dulu berkas ini punya pembaca tabelnya sendiri, dan pembaca
   * itu berhenti begitu ketemu baris yang tidak diawali garis
   * tegak — padahal AI kadang memotong satu baris tabel jadi dua.
   * Akibatnya separuh kalender hilang dari berkas Word sementara
   * PDF-nya utuh, dan bedanya tidak kelihatan sampai ada yang
   * membandingkan. Dua pembaca untuk satu bentuk yang sama memang
   * selalu berakhir begitu.
   */
  for (const blok of pisahBlok(markdown)) {
    if (blok.jenis === "tabel") {
      isi.push(buatTabel(blok));
      isi.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    for (const b of blok.isi.split("\n")) {
      const bersih = b.trim();
      if (bersih === "") continue;

      if (/^---+$/.test(bersih)) {
        isi.push(
          new Paragraph({
            text: "",
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
          }),
        );
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
        isi.push(
          new Paragraph({
            children: potongTebal(poin[1]),
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: MENJOROK, hanging: MENGGANTUNG },
          }),
        );
        continue;
      }

      const bernomor = bersih.match(/^\d+[.)]\s+(.*)$/);
      if (bernomor) {
        isi.push(
          new Paragraph({
            children: potongTebal(bernomor[1]),
            numbering: { reference: "daftar-bernomor", level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: MENJOROK, hanging: MENGGANTUNG },
          }),
        );
        continue;
      }

      isi.push(
        new Paragraph({
          children: potongTebal(bersih),
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
        }),
      );
    }
  }

  const kepala = kop ? kepalaKop(kop) : null;

  const dokumen = new Document({
    // Huruf bawaan untuk seluruh dokumen, termasuk judul bertingkat
    // yang tidak dibuat sendiri di sini.
    styles: {
      default: {
        document: { run: { font: HURUF, size: UKURAN } },
        // Judul tetap bertingkat supaya susunannya kelihatan,
        // tapi selisihnya dirapatkan ke 12 pt: 14, 13, lalu 12.
        heading1: { run: { font: HURUF, size: 28, bold: true } },
        heading2: { run: { font: HURUF, size: 26, bold: true } },
        heading3: { run: { font: HURUF, size: UKURAN, bold: true } },
      },
    },
    numbering: {
      config: [
        {
          reference: "daftar-bernomor",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: MENJOROK, hanging: MENGGANTUNG } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        /**
         * Melintang, menyamai berkas PDF-nya.
         *
         * Seluruh isi konsep sekarang berbentuk tabel, dan tabel
         * sembilan kolom di kertas tegak membuat tiap kotak pecah
         * jadi lima baris. Itulah sebabnya berkas Word-nya terasa
         * berantakan.
         *
         * Tepinya dirapatkan supaya lebarnya terpakai untuk isi,
         * bukan untuk ruang kosong.
         */
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
          // Kop hanya di halaman pertama, seperti kebiasaan surat
          // resmi dan seperti berkas PDF-nya.
          ...(kepala ? { titlePage: true } : {}),
        },
        children: isi,
        // titlePage membuat header di bawah hanya berlaku pada
        // halaman pertama; tanpa header default, halaman
        // berikutnya bersih.
        ...(kepala ? { headers: { first: kepala } } : {}),
      },
    ],
  });

  return Packer.toBuffer(dokumen);
}
