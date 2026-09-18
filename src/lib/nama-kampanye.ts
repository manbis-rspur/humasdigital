/**
 * Membaca nama kampanye yang ditulis AI di kepala dokumen.
 *
 * Sebelumnya judul riwayat diambil dari isian pertama formulir.
 * Isian itu sekarang berupa cerita beberapa kalimat, jadi daftar
 * riwayat berisi potongan cerita yang terpenggal di tengah kata —
 * tidak bisa dipindai mata, dan dua kalender untuk kampanye
 * berbeda terlihat mirip karena sembilan puluh huruf pertamanya
 * kebetulan sama.
 *
 * Yang paling tahu inti sebuah cerita adalah yang baru saja
 * membacanya sampai habis. Maka namanya diminta ke AI, ditulis
 * pada satu baris bertanda di kepala dokumen, lalu dibaca dari
 * sana.
 *
 * Sengaja BUKAN judul setingkat satu ("# "): tanda itu sudah
 * dipakai memisah konsep dari kalendernya, dan kalender yang
 * diawali "# " akan dikira konsep sehingga unduhan
 * "kalender saja" jadi kosong.
 */

const PENANDA =
  /^\s*\**\s*(?:Nama Kampanye|Judul Ringkas)\s*\**\s*:\s*\**\s*(.+?)\s*$/i;

/** Berapa baris pertama yang ditengok. Penandanya memang di kepala. */
const JANGKAUAN = 12;

export function namaKampanye(markdown: string): string | null {
  for (const baris of markdown.split("\n").slice(0, JANGKAUAN)) {
    const cocok = PENANDA.exec(baris);
    if (!cocok) continue;

    // Tanda tebalnya dibuang dulu, baru dirapikan, baru tanda
    // kutipnya — urutan terbalik membuat kutip pembuka luput
    // karena masih ada spasi di depannya.
    const nama = cocok[1]
      .replace(/\*\*/g, "")
      .trim()
      .replace(/^["“']|["”']$/g, "")
      .trim();

    if (nama === "") return null;

    // Kepanjangan berarti AI menyalin ceritanya, bukan menamai —
    // dan itu persis keadaan yang hendak diperbaiki. Lebih baik
    // jatuh ke cara lama daripada menyimpan judul yang sama
    // panjangnya dengan sebelumnya.
    return nama.length > 90 ? null : nama;
  }

  return null;
}
