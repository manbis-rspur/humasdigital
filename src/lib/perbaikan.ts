import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { susunDenganAI, type Bagian, type Jejak } from "@/lib/ai";
import { daftarDokterUntukAI } from "@/lib/dokter-data";
import { usulanUntukAI } from "@/lib/isu-data";
import { daftarLayananUntukAI } from "@/lib/layanan-data";
import { bersihkanAlamat, daftarSumberUntukAI } from "@/lib/sumber-data";

/**
 * Meminta AI memperbaiki dokumen yang sudah ada.
 *
 * Bukan menyusun ulang dari nol. Menyusun ulang berarti seluruh
 * dokumen berubah — termasuk bagian yang sudah benar dan sudah
 * disepakati — padahal yang meminta cuma ingin menambah satu baris
 * yang terlupa. Dan dokumen baru berarti riwayat serta daftar draf
 * menumpuk isinya hampir sama semua.
 */

export type HasilPerbaikan = {
  hasil: string | null;
  pesan: string | null;
  /** Terisi bila hasilnya mencurigakan, walaupun tidak gagal. */
  peringatan?: string;
  /** Berapa baris tabel yang berubah — selalu terisi bila ada tabel. */
  ringkasan?: string;
};

/**
 * Instruksi sistem saat menyunting — SELALU ini, bukan instruksi
 * modulnya.
 *
 * Dulu yang dipakai instruksi modul aslinya, yang berbunyi
 * "Anda Content Strategist… susun kalender konten yang edukatif…".
 * Itu uraian tugas MENGARANG. Diberikan sebagai instruksi sistem,
 * ia mengalahkan permintaan "ubah seadanya" yang cuma tertulis di
 * badan perintah — dan modelnya menyusun kalender baru, bukan
 * menyunting yang ada. Persis itu yang dikeluhkan: minta dianalisa
 * dan diperbaiki seperlunya, yang kembali isinya berubah semua.
 *
 * Aturan bentuk dari modulnya tetap dikirim, tapi di badan
 * perintah dan dengan kedudukan yang jelas: rujukan bentuk, bukan
 * perintah menyusun ulang.
 */
const INSTRUKSI_SUNTING =
  "Anda seorang penyunting naskah kehumasan rumah sakit. Pekerjaan Anda " +
  "MENYUNTING dokumen yang sudah jadi, bukan mengarang yang baru. " +
  "Dokumen yang diberikan adalah hasil kerja orang lain yang sudah " +
  "disepakati; Anda hanya menyentuh bagian yang diminta. " +
  "Anda TIDAK pernah menyusun ulang, tidak merapikan yang tidak diminta, " +
  "tidak mengganti pilihan kata, dan tidak menambah atau membuang baris " +
  "tabel atas kemauan sendiri. Bila menurut Anda ada yang keliru di luar " +
  "yang diminta, Anda menuliskannya sebagai saran — tidak mengubahnya " +
  "sendiri.";

/**
 * Membuang pagar kode yang kadang dipasang AI di sekeliling
 * jawabannya.
 *
 * Tanpa ini, seluruh kalender tergambar sebagai satu blok kode
 * abu-abu — tabelnya hilang, dan yang terlihat deretan tanda garis
 * tegak.
 */
export function tanpaPagar(teks: string): string {
  const bersih = teks.trim();
  const cocok = /^```[a-zA-Z]*\n([\s\S]*?)\n?```$/.exec(bersih);
  return cocok ? cocok[1].trim() : bersih;
}

/**
 * Baris tabel yang sesungguhnya berisi data.
 *
 * Baris pemisah ("|---|---|") dibuang, dan spasi dirapikan supaya
 * baris yang cuma berbeda lebar kolomnya tidak terhitung berubah.
 */
function barisTabel(teks: string): string[] {
  return teks
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b.startsWith("|") && !/^\|[\s|:-]+\|$/.test(b))
    .map((b) => b.replace(/\s+/g, " "));
}

/**
 * Berapa baris tabel yang tidak kembali utuh.
 *
 * Inilah ukuran yang paling dekat dengan keluhan aslinya: yang
 * hilang bukan kalimat di paragraf pembuka, melainkan isi kotak
 * jadwal yang sudah disepakati. Dihitung sebagai kantong —
 * dua baris kembar dihitung dua.
 */
function barisHilang(sebelum: string, sesudah: string): number {
  const kantong = new Map<string, number>();
  for (const b of barisTabel(sesudah)) kantong.set(b, (kantong.get(b) ?? 0) + 1);

  let hilang = 0;
  for (const b of barisTabel(sebelum)) {
    const sisa = kantong.get(b) ?? 0;
    if (sisa > 0) kantong.set(b, sisa - 1);
    else hilang++;
  }
  return hilang;
}

export async function mintaPerbaikan({
  namaDokumen,
  instruksi,
  pakaiDokter,
  pakaiLayanan,
  pakaiIsu,
  pakaiSumber = false,
  untukRspur,
  instansi,
  naskah,
  permintaan,
  klien,
}: {
  namaDokumen: string;
  instruksi: string | null;
  pakaiDokter: boolean;
  pakaiLayanan: boolean;
  pakaiIsu: boolean;
  /**
   * Baris yang baru ditambahkan lewat perbaikan juga memuat klaim
   * medis, dan tanpa daftar sumber AI akan mengarang alamat untuk
   * baris baru itu saja — di tengah dokumen yang sumber-sumber
   * lamanya sudah benar, dan justru di situ paling sulit terlihat.
   */
  pakaiSumber?: boolean;
  /** Dokumen milik instansi lain tidak boleh dibekali data RSPUR. */
  untukRspur: boolean;
  instansi: string | null;
  naskah: string;
  permintaan: string;
  /**
   * Dititipkan bot Telegram, yang bekerja tanpa sesi login dan
   * karena itu memakai kunci layanan.
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  klien?: SupabaseClient<any, any, any>;
}): Promise<HasilPerbaikan> {
  const minta = permintaan.trim();
  if (minta === "") return { hasil: null, pesan: "Tulis dulu apa yang perlu diperbaiki." };
  if (naskah.trim() === "") {
    return { hasil: null, pesan: "Dokumennya kosong — tidak ada yang bisa diperbaiki." };
  }

  const perintah: Bagian[] = [
    {
      text:
        `Di bawah ini dokumen "${namaDokumen}" yang sudah tersusun. ` +
        `Perbaiki sesuai permintaan, lalu kembalikan SELURUH dokumennya.\n\n` +
        `Aturan yang mengikat:\n` +
        `1. Kembalikan dokumen utuh dari awal sampai akhir, bukan potongan dan ` +
        `bukan daftar perubahan.\n` +
        `2. Bagian yang TIDAK diminta diubah dipertahankan kata demi kata. ` +
        `Jangan merapikan, jangan menyusun ulang, jangan mengganti pilihan kata.\n` +
        `3. Susunan tabel dan nama kolomnya tetap seperti aslinya.\n` +
        `4. Jangan menambahkan kalimat pembuka, penutup, atau permintaan maaf.\n` +
        `5. Jawab dengan Markdown biasa, tanpa pagar kode di sekelilingnya.\n` +
        `6. Baris tabel yang tidak disebut dalam permintaan dikembalikan PERSIS ` +
        `seperti aslinya — jumlahnya, urutannya, dan isi tiap kotaknya. Jangan ` +
        `menambah baris baru, jangan membuang baris, jangan menukar urutan.\n` +
        `7. Kalau ada hal lain yang menurut Anda patut diperbaiki tetapi TIDAK ` +
        `diminta, jangan mengubahnya. Tulis sebagai daftar berpoin di bagian ` +
        `paling bawah dokumen, di bawah judul "## Catatan & Saran Perbaikan", ` +
        `lalu biarkan yang memintanya memutuskan. Bila bagian itu sudah ada dari ` +
        `perbaikan sebelumnya, perbarui isinya, jangan ditumpuk.\n\n` +
        `YANG DIMINTA DIPERBAIKI:\n${minta}\n\n` +
        `DOKUMEN SEKARANG:\n${naskah}`,
    },
  ];

  // Baris yang baru ditambahkan juga perlu nama dokter yang benar
  // dan hari kesehatan yang tepat — sama seperti saat pertama
  // disusun.
  if (pakaiIsu) {
    const bahan = await usulanUntukAI("", "", klien);
    if (bahan) perintah.push({ text: bahan });
  }
  if (untukRspur && pakaiLayanan) {
    const layanan = await daftarLayananUntukAI(klien);
    if (layanan) perintah.push({ text: layanan });
  }
  if (untukRspur && pakaiDokter) {
    const dokter = await daftarDokterUntukAI(klien);
    if (dokter) perintah.push({ text: dokter });
  }
  if (pakaiSumber) {
    perintah.push({ text: await daftarSumberUntukAI(klien) });
  }

  // Aturan bentuk dari modulnya — kedudukannya rujukan, bukan
  // perintah. Tanpa kalimat pembatas di bawah ini, aturan seperti
  // "susun kalender yang edukatif dan menarik" terbaca sebagai
  // tugas baru, dan seluruh dokumen ditulis ulang.
  if (instruksi) {
    perintah.push({
      text:
        `Di bawah ini aturan bentuk dokumen jenis ini, dilampirkan SEBAGAI ` +
        `RUJUKAN saja. Pakai hanya bila Anda menambah bagian baru, supaya ` +
        `bentuknya seragam dengan yang sudah ada.\n\n` +
        `JANGAN menerapkannya surut ke bagian yang sudah tertulis. Bila ada ` +
        `bagian lama yang tidak sesuai aturan ini, biarkan apa adanya dan ` +
        `sebutkan di "## Catatan & Saran Perbaikan" — jangan diperbaiki ` +
        `sendiri, kecuali memang itu yang diminta.\n\n` +
        instruksi,
    });
  }

  if (!untukRspur) {
    perintah.push({
      text:
        `PENTING — dokumen ini BUKAN untuk RS Pertamedika Ummi Rosnati` +
        (instansi ? `, melainkan untuk ${instansi}` : "") +
        `. Abaikan penyebutan RSPUR pada instruksi sistem di atas. Jangan ` +
        `memasukkan nama dokter, layanan, fasilitas, nomor telepon, atau angka ` +
        `milik RSPUR — termasuk pada bagian yang Anda tambahkan sekarang.`,
    });
  }

  try {
    // Suhunya rendah: ini pekerjaan menyunting, bukan mengarang.
    // Suhu tinggi membuat AI ikut mengubah kalimat yang tidak
    // diminta, dan perubahan diam-diam itulah yang paling sulit
    // ketahuan.
    // Wadah kosong; diisi lapisan AI dengan nama mesin yang
    // akhirnya mengerjakan.
    const jejak: Jejak = {};
    const mentah = tanpaPagar(
      await susunDenganAI(perintah, INSTRUKSI_SUNTING, 0.1, jejak),
    );
    const hasil = pakaiSumber ? await bersihkanAlamat(mentah, klien) : mentah;

    // Kadang AI mengembalikan potongan yang diubah saja, bukan
    // dokumen utuh — walaupun sudah diminta. Kalau dibiarkan lewat
    // tanpa kata, sisa dokumennya hilang tanpa ada yang menyadari.
    // Menyimpannya tetap keputusan orangnya; di sini cukup
    // diperingatkan.
    const menyusut = hasil.length < naskah.length * 0.6;

    // Berapa banyak isi tabel yang tidak kembali utuh. Perbaikan
    // yang wajar menyentuh satu dua baris; yang menyentuh separuh
    // tabel hampir pasti menyusun ulang, dan itu harus terbaca
    // sebelum naskahnya disimpan menimpa yang lama.
    const semula = barisTabel(naskah).length;
    const hilang = barisHilang(naskah, hasil);
    const banyak = semula > 0 && hilang > Math.max(2, semula * 0.3);

    const dicadangkan =
      jejak.mesin && !jejak.mesin.startsWith("gemini")
        ? `Gemini sedang padat, jadi perbaikan ini dikerjakan mesin cadangan (${jejak.mesin}). ` +
          `Gaya bahasanya bisa terasa sedikit berbeda — periksa dulu sebelum disimpan. `
        : "";

    const peringatan = menyusut
      ? "Hasilnya jauh lebih pendek dari naskah sebelumnya — mungkin AI hanya " +
        "mengembalikan bagian yang diubah. Periksa dulu seluruhnya; kalau ada " +
        "yang hilang, tekan Batalkan perbaikan."
      : banyak
        ? `${hilang} dari ${semula} baris tabel ikut berubah, padahal yang ` +
          `diminta cuma satu hal. Kemungkinan besar AI menyusun ulang, bukan ` +
          `menyunting. Bandingkan dulu; kalau berlebihan, tekan Batalkan ` +
          `perbaikan lalu minta lagi dengan menyebut baris mana yang dimaksud.`
        : undefined;

    return {
      hasil,
      pesan: null,
      peringatan: dicadangkan
        ? `${dicadangkan}${peringatan ?? ""}`.trim()
        : peringatan,
      // Selalu dilaporkan, bukan cuma saat mencurigakan — orang
      // yang tahu "2 dari 14 baris berubah" tidak perlu membaca
      // ulang seluruh tabel untuk memastikan.
      ringkasan:
        semula > 0
          ? `${hilang} dari ${semula} baris tabel berubah.`
          : undefined,
    };
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.";
    return { hasil: null, pesan };
  }
}
