/**
 * Mengambil warna-warna yang menonjol dari sebuah logo, lalu
 * memastikan warna pilihannya tetap enak dibaca.
 *
 * Kenapa tidak langsung dipakai apa adanya: logo yang terang
 * menghasilkan tombol putih di atas putih, dan tulisan di atasnya
 * jadi tidak terbaca. Jadi warna yang dipilih digelapkan seperlunya
 * sampai tulisan putih di atasnya memenuhi ambang keterbacaan.
 */

/** Ambang kontras yang lazim dipakai untuk teks biasa (WCAG AA). */
const AMBANG = 4.5;

function keHeks(r: number, g: number, b: number) {
  const dua = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${dua(r)}${dua(g)}${dua(b)}`;
}

function dariHeks(heks: string): [number, number, number] {
  const n = parseInt(heks.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Terang-tidaknya sebuah warna menurut ukuran yang dipakai WCAG. */
function luminansi(r: number, g: number, b: number) {
  const sesuaikan = (nilai: number) => {
    const x = nilai / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * sesuaikan(r) + 0.7152 * sesuaikan(g) + 0.0722 * sesuaikan(b);
}

/** Perbandingan kontras warna ini dengan tulisan putih di atasnya. */
export function kontrasDenganPutih(heks: string) {
  const [r, g, b] = dariHeks(heks);
  return 1.05 / (luminansi(r, g, b) + 0.05);
}

/**
 * Menggelapkan warna sampai tulisan putih di atasnya terbaca.
 * Warna yang sudah cukup gelap dikembalikan apa adanya.
 */
export function jadikanTerbaca(heks: string): string {
  let [r, g, b] = dariHeks(heks);

  for (let i = 0; i < 40 && 1.05 / (luminansi(r, g, b) + 0.05) < AMBANG; i++) {
    r *= 0.92;
    g *= 0.92;
    b *= 0.92;
  }

  return keHeks(r, g, b);
}

/**
 * Mencari warna-warna yang paling sering muncul di sebuah gambar.
 *
 * Putih, hitam, dan abu-abu diabaikan — hampir setiap logo punya
 * latar putih dan garis hitam, dan keduanya tidak berguna sebagai
 * warna khas. Yang dicari warna yang benar-benar berwarna.
 */
export async function warnaDariGambar(berkas: File, maksimal = 5): Promise<string[]> {
  const gambar = await createImageBitmap(berkas);

  const sisi = 80;
  const kanvas = document.createElement("canvas");
  kanvas.width = sisi;
  kanvas.height = sisi;

  const kuas = kanvas.getContext("2d", { willReadFrequently: true });
  if (!kuas) return [];

  kuas.drawImage(gambar, 0, 0, sisi, sisi);
  gambar.close();

  const { data } = kuas.getImageData(0, 0, sisi, sisi);
  const hitungan = new Map<string, { n: number; r: number; g: number; b: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];

    if (a < 200) continue;

    const terbesar = Math.max(r, g, b);
    const terkecil = Math.min(r, g, b);

    // Buang yang nyaris putih, nyaris hitam, dan yang kelabu.
    if (terbesar > 240 && terkecil > 240) continue;
    if (terbesar < 30) continue;
    if (terbesar - terkecil < 25) continue;

    // Dikelompokkan kasar supaya warna yang beda tipis tidak
    // dihitung sebagai dua warna berbeda.
    const kunci = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const ada = hitungan.get(kunci);
    if (ada) {
      ada.n += 1;
      ada.r += r;
      ada.g += g;
      ada.b += b;
    } else {
      hitungan.set(kunci, { n: 1, r, g, b });
    }
  }

  return [...hitungan.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, maksimal)
    .map((w) => keHeks(w.r / w.n, w.g / w.n, w.b / w.n));
}
