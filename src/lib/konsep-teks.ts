/**
 * Menempelkan konsep ke naskah, atau mengganti yang sudah ada.
 *
 * Menekan "susun ulang" tidak boleh menambah salinan kedua di
 * bawah yang pertama. Draf yang berisi tiga konsep hampir sama
 * untuk baris yang sama justru kekacauan yang ingin dihindari —
 * dan yang membacanya nanti tidak tahu mana yang berlaku.
 *
 * Bagiannya dikenali dari judulnya, yang disusun dari barisnya
 * sendiri sehingga selalu sama untuk baris yang sama.
 */

export function judulKonsep(tanggal: string, format: string): string {
  return ["Konsep", tanggal, format].filter((b) => b.trim() !== "").join(" — ");
}

/** Apakah naskah ini sudah memuat konsep untuk baris tersebut. */
export function punyaKonsep(naskah: string, judul: string): boolean {
  return naskah.includes(`# ${judul}`);
}

/**
 * Menempelkan konsep baru, atau menimpa yang judulnya sama.
 *
 * Batas bagiannya: judul setingkat berikutnya, atau garis pemisah
 * — keduanya penanda yang memang dipakai saat menempelkan.
 */
export function tempelKonsep(
  naskah: string,
  judul: string,
  isi: string,
): string {
  const penanda = `# ${judul}`;
  const mulai = naskah.indexOf(penanda);
  const bagian = `${penanda}\n\n${isi.trim()}\n`;

  if (mulai === -1) {
    return `${naskah.trimEnd()}\n\n---\n\n${bagian}`;
  }

  // Cari awal bagian berikutnya sesudah bagian ini.
  const sesudah = naskah.slice(mulai + penanda.length);
  const cocok = /\n(?:---+\s*\n|# )/.exec(sesudah);
  const akhir = cocok ? mulai + penanda.length + cocok.index + 1 : naskah.length;

  return `${naskah.slice(0, mulai)}${bagian}\n${naskah.slice(akhir)}`.replace(
    /\n{3,}/g,
    "\n\n",
  );
}

export type BagianNaskah = {
  /** Kosong untuk bagian pertama — kalendernya sendiri. */
  judul: string;
  isi: string;
};

/**
 * Memisah naskah jadi kalender dan konsep-konsepnya.
 *
 * Tiap konsep ditempel dengan judul setingkat satu ("# Konsep — …"),
 * dan itulah batasnya. Kalendernya sendiri memakai judul setingkat
 * dua ke bawah, jadi ia tidak ikut terpotong.
 *
 * Gunanya supaya konsep bisa dilipat. Satu kalender dengan enam
 * konsep di bawahnya bisa berpuluh halaman di layar, dan yang
 * dicari orang hampir selalu satu di antaranya.
 */
export function pisahBagian(naskah: string): BagianNaskah[] {
  const baris = naskah.split("\n");
  const bagian: BagianNaskah[] = [];

  let judul = "";
  let kumpul: string[] = [];

  const tutup = () => {
    const isi = kumpul.join("\n").trim();
    // Garis pemisah yang tertinggal sendirian bukan isi.
    if (judul !== "" || isi.replace(/^-{3,}$/gm, "").trim() !== "") {
      bagian.push({ judul, isi });
    }
    kumpul = [];
  };

  for (const b of baris) {
    const kepala = /^#\s+(.*\S)\s*$/.exec(b);

    if (kepala) {
      tutup();
      judul = kepala[1];
      continue;
    }

    kumpul.push(b);
  }

  tutup();
  return bagian;
}
