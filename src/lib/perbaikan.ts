import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { susunDenganAI, type Bagian } from "@/lib/ai";
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
};

const INSTRUKSI_UMUM =
  "Anda menyunting dokumen kehumasan Rumah Sakit Pertamedika Ummi Rosnati " +
  "(RSPUR). Pertahankan susunan, gaya, dan isi dokumen yang diberikan.";

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
        `4. Jangan menambahkan kalimat pembuka, penutup, permintaan maaf, atau ` +
        `catatan tentang apa yang Anda ubah.\n` +
        `5. Jawab dengan Markdown biasa, tanpa pagar kode di sekelilingnya.\n\n` +
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
    const mentah = tanpaPagar(await susunDenganAI(perintah, instruksi ?? INSTRUKSI_UMUM, 0.25));
    const hasil = pakaiSumber ? await bersihkanAlamat(mentah, klien) : mentah;

    // Kadang AI mengembalikan potongan yang diubah saja, bukan
    // dokumen utuh — walaupun sudah diminta. Kalau dibiarkan lewat
    // tanpa kata, sisa dokumennya hilang tanpa ada yang menyadari.
    // Menyimpannya tetap keputusan orangnya; di sini cukup
    // diperingatkan.
    const menyusut = hasil.length < naskah.length * 0.6;

    return {
      hasil,
      pesan: null,
      peringatan: menyusut
        ? "Hasilnya jauh lebih pendek dari naskah sebelumnya — mungkin AI hanya " +
          "mengembalikan bagian yang diubah. Periksa dulu seluruhnya; kalau ada " +
          "yang hilang, tekan Batalkan perbaikan."
        : undefined,
    };
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "Gagal menghubungi Gemini.";
    return { hasil: null, pesan };
  }
}
