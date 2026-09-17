import "server-only";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pisahBlok } from "@/lib/markdown-tabel";
import { bacaUkuranGambar } from "@/lib/ukuran-gambar";

/**
 * Mengubah dokumen Markdown jadi PDF.
 *
 * Dibuat untuk dikirim lewat Telegram. Word sengaja tidak dipakai
 * di jalur itu: dibuka dari HP, tabel Word sering berantakan atau
 * malah tidak terbuka sama sekali, sementara PDF tampil sama di
 * mana pun.
 *
 * Kertasnya melintang. Tabel kalender punya sembilan kolom, dan di
 * kertas tegak kolomnya jadi sempit sekali sampai tiap kotak pecah
 * jadi lima baris.
 */

/** Warna hijau rumah sakit, untuk kepala tabel. */
const HIJAU: [number, number, number] = [31, 106, 79];

/**
 * Menyederhanakan huruf yang tidak dikenal huruf bawaan PDF.
 *
 * Huruf bawaannya hanya mengenal abjad Latin dasar; tanda pisah
 * panjang, titik tengah, dan petik miring hilang begitu saja —
 * bukan berubah jadi tanda tanya, melainkan LENYAP, sehingga
 * "Sekali Jalan — Tenggat Jumat" jadi "Sekali Jalan  Tenggat
 * Jumat". Menyematkan huruf yang lengkap berarti menambah ratusan
 * kilobita ke tiap berkas, dan untuk dokumen kerja seperti ini
 * menggantinya jauh lebih masuk akal.
 */
function sederhanakan(teks: string): string {
  return teks
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    // Penebalan dan penerangan Markdown tidak punya arti di sini.
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");
}

/** Membuang tanda judul Markdown, menyisakan tulisannya. */
function tanpaTandaJudul(baris: string): { teks: string; tingkat: number } {
  const cocok = /^(#{1,6})\s+(.*)$/.exec(baris.trim());
  if (cocok) return { teks: cocok[2], tingkat: cocok[1].length };
  return { teks: baris, tingkat: 0 };
}

const KIRI = 10;
const ATAS = 14;

/** Kop surat yang dipasang di kepala halaman pertama. */
export type Kop = { isi: Uint8Array; nama: string };

export function jadikanPdf(
  judul: string,
  markdown: string,
  kop?: Kop | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const lebar = doc.internal.pageSize.getWidth() - KIRI * 2;
  const tinggi = doc.internal.pageSize.getHeight();

  let y = ATAS;

  /**
   * Kop dipasang di halaman pertama saja, seperti kebiasaan surat
   * resmi. Halaman berikutnya cukup nama instansinya kecil di kaki
   * halaman — kop yang berulang tiap halaman memakan ruang yang
   * justru dibutuhkan tabel selebar ini.
   */
  let namaKaki = "";

  if (kop) {
    const ukuran = bacaUkuranGambar(kop.isi);
    if (ukuran && ukuran.lebar > 0 && ukuran.tinggi > 0) {
      const tinggiKop = (lebar * ukuran.tinggi) / ukuran.lebar;
      // Kop yang terlalu tinggi menelan halaman pertama. Batasnya
      // seperempat halaman; lebih dari itu diperkecil menurut
      // perbandingan aslinya, bukan digepengkan.
      const maks = tinggi / 4;
      const pakaiTinggi = Math.min(tinggiKop, maks);
      const pakaiLebar = (pakaiTinggi * ukuran.lebar) / ukuran.tinggi;

      doc.addImage(
        kop.isi,
        ukuran.jenis,
        KIRI + (lebar - pakaiLebar) / 2,
        8,
        pakaiLebar,
        pakaiTinggi,
      );

      y = 8 + pakaiTinggi + 6;
      doc.setDrawColor(200);
      doc.line(KIRI, y - 3, KIRI + lebar, y - 3);
      namaKaki = kop.nama;
    }
  }

  function halamanBaru(butuh: number) {
    if (y + butuh > tinggi - 12) {
      doc.addPage();
      y = ATAS;
    }
  }

  function tulis(teks: string, ukuran: number, tebal: boolean, jarak: number) {
    doc.setFontSize(ukuran);
    doc.setFont("helvetica", tebal ? "bold" : "normal");
    for (const potong of doc.splitTextToSize(sederhanakan(teks), lebar) as string[]) {
      halamanBaru(jarak);
      doc.text(potong, KIRI, y);
      y += jarak;
    }
  }

  tulis(judul, 15, true, 7);
  y += 1;

  for (const b of pisahBlok(markdown)) {
    if (b.jenis === "tabel") {
      halamanBaru(30);

      autoTable(doc, {
        head: [b.kepala.map(sederhanakan)],
        body: b.isi.map((baris) => baris.map(sederhanakan)),
        startY: y,
        margin: { left: KIRI, right: KIRI },
        styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: HIJAU, textColor: 255, fontSize: 6.5 },
        // Baris berselang-seling warnanya, supaya mata tidak
        // melompat baris saat membaca tabel selebar ini.
        alternateRowStyles: { fillColor: [246, 245, 242] },
      });

      // Tipe autoTable tidak menyertakan penanda posisi terakhir,
      // padahal nilainya memang ditaruh di sana setelah menggambar.
      const akhir = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      y = (akhir?.finalY ?? y) + 6;
      continue;
    }

    for (const baris of b.isi.split("\n")) {
      const bersih = baris.trim();

      if (bersih === "") {
        y += 2;
        continue;
      }

      // Garis pemisah Markdown digambar sebagai garis sungguhan.
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(bersih)) {
        halamanBaru(6);
        doc.setDrawColor(215);
        doc.line(KIRI, y, KIRI + lebar, y);
        y += 5;
        continue;
      }

      const { teks, tingkat } = tanpaTandaJudul(bersih);

      if (tingkat > 0) {
        y += tingkat <= 2 ? 4 : 2;
        tulis(teks, tingkat <= 2 ? 12 : 10, true, tingkat <= 2 ? 6 : 5);
        y += 1;
        continue;
      }

      const daftar = /^[-*+]\s+(.*)$/.exec(bersih);
      if (daftar) {
        tulis(`- ${daftar[1]}`, 9, false, 4.5);
        continue;
      }

      tulis(bersih, 9, false, 4.5);
    }

    y += 2;
  }

  // Nama instansi di kaki tiap halaman sesudah yang pertama, dan
  // nomor halaman di semuanya.
  const jumlah = doc.getNumberOfPages();
  for (let h = 1; h <= jumlah; h++) {
    doc.setPage(h);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130);

    if (namaKaki && h > 1) {
      doc.text(sederhanakan(namaKaki), KIRI, tinggi - 6);
    }
    doc.text(`${h} / ${jumlah}`, KIRI + lebar, tinggi - 6, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
