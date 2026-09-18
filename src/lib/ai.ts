import "server-only";

/**
 * Memanggil Gemini untuk menyusun dokumen.
 *
 * Kunci API hanya ada di server dan tidak pernah sampai ke
 * peramban. Pemeriksaan siapa yang berhak memakai dilakukan oleh
 * pemanggil — di aplikasi lama, alamat serupa terbuka untuk umum,
 * sehingga siapa pun yang menemukannya bisa menghabiskan kuota
 * Gemini rumah sakit.
 */

/**
 * Dicoba berurutan; yang pertama berhasil dipakai.
 *
 * Yang pertama lebih pintar tapi lebih sering penuh — Google
 * menjawab 503 saat permintaan sedang ramai. Yang kedua lebih
 * ringan dan hampir selalu tersedia, jadi dipakai sebagai jaring
 * pengaman supaya petugas tidak berhadapan dengan layar gagal
 * hanya karena sedang jam sibuk.
 *
 * Model bertanggal seperti gemini-2.5-flash sengaja tidak dipakai:
 * Google menariknya dari waktu ke waktu, dan begitu ditarik,
 * cadangannya ikut mati tanpa ada yang menyadari.
 */
const MODEL = ["gemini-flash-latest", "gemini-flash-lite-latest"];

/** Berapa kali satu model diulang sebelum pindah ke cadangan. */
const ULANGI = 2;

const ALAMAT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Cadangan bila Gemini menolak terus.
 *
 * Bukan pengganti: selama Gemini sehat, yang ini tidak pernah
 * dipanggil sama sekali. Ia baru bekerja sesudah SELURUH model
 * Gemini di atas habis dicoba — yang artinya Google memang sedang
 * ramai, dan pilihannya tinggal dua: menyerahkan pekerjaan ke
 * mesin lain, atau menyuruh orangnya menunggu tanpa kepastian.
 *
 * Kuncinya boleh tidak ada. Tanpa DEEPSEEK_API_KEY, seluruh
 * bagian ini dilewati dan perilakunya persis seperti sebelum
 * cadangan ini dipasang.
 */
const CADANGAN = {
  alamat: "https://api.deepseek.com/chat/completions",
  model: "deepseek-flash",
  nama: "DeepSeek",
};

/**
 * Gambar yang bisa dibaca model cadangan.
 *
 * PDF sengaja TIDAK ada di sini walaupun Gemini membacanya.
 * Cadangannya cuma menerima gambar, dan memaksakan PDF ke sana
 * akan menghasilkan jawaban tentang berkas yang tidak pernah
 * benar-benar dibaca — lebih buruk daripada berterus terang
 * bahwa pekerjaannya tidak bisa dicadangkan.
 */
const GAMBAR_CADANGAN = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Penanda bahwa pekerjaan ini memang tidak boleh dicadangkan —
 * bukan bahwa cadangannya gagal.
 *
 * Dibedakan supaya yang sampai ke layar tetap penolakan asli dari
 * Gemini, bukan keluhan tentang mesin kedua yang tidak pernah
 * diminta orangnya.
 */
class TidakBisaDicadangkan extends Error {}

/**
 * Catatan siapa yang akhirnya mengerjakan.
 *
 * Dititipkan pemanggil sebagai wadah kosong, lalu diisi di sini.
 * Bukan tetapan global: dua orang bisa menyusun berbarengan, dan
 * catatan global akan tertukar antar-permintaan.
 */
export type Jejak = { mesin?: string };

/**
 * Satu potong kiriman ke Gemini: tulisan biasa, atau berkas utuh
 * (PDF, tangkapan layar) yang dibaca langsung oleh modelnya.
 */
export type Bagian =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/** Satu halaman yang benar-benar dibuka Gemini saat mencari. */
export type SumberTemuan = { judul: string; tautan: string };

export type HasilBerSumber = { teks: string; sumber: SumberTemuan[] };

/**
 * Menyusun sambil MENCARI di web.
 *
 * Bedanya dengan susunDenganAI biasa: alamat yang dikembalikan
 * bukan dari ingatan model, melainkan dari halaman yang
 * benar-benar dibuka Gemini saat menjawab. Itulah satu-satunya
 * cara sumbernya bisa disebut akurat.
 *
 * Perlu penagihan Gemini aktif. Tanpa itu Google menolak dengan
 * kuota habis — dan penolakan itu dilempar apa adanya supaya
 * pemanggilnya bisa mundur ke cara biasa, bukan gagal seluruhnya.
 */
export async function susunSambilMencari(
  perintah: Bagian[],
  instruksiSistem: string,
  suhu = 0.7,
): Promise<HasilBerSumber> {
  return panggilGemini(perintah, instruksiSistem, suhu, false, true) as Promise<HasilBerSumber>;
}

export async function susunDenganAI(
  perintah: string | Bagian[],
  instruksiSistem: string,
  suhu = 0.7,
  jejak?: Jejak,
): Promise<string> {
  // Boleh berupa tulisan saja, boleh tulisan berikut berkas rujukan
  // — foto ruangan, panduan merek, kerangka acuan acara. Bentuk lama
  // tetap diterima supaya modul yang sudah ada tidak perlu diubah.
  const bagian = typeof perintah === "string" ? [{ text: perintah }] : perintah;
  return panggilGemini(bagian, instruksiSistem, suhu, false, false, jejak) as Promise<string>;
}

/**
 * Membaca berkas — rekapan Meta, ekspor TikTok Studio, tangkapan
 * layar — lalu menjawab dalam bentuk JSON.
 *
 * Suhunya nol dan jawabannya dikunci ke JSON karena ini pekerjaan
 * menyalin, bukan mengarang: yang diminta angka yang memang tertulis
 * di berkasnya, bukan tafsiran.
 */
export async function bacaDenganAI(
  bagian: Bagian[],
  instruksiSistem: string,
  jejak?: Jejak,
): Promise<string> {
  return panggilGemini(bagian, instruksiSistem, 0, true, false, jejak) as Promise<string>;
}

/**
 * Kiriman Gemini diterjemahkan ke bentuk OpenAI yang dipakai
 * cadangan.
 *
 * Yang tidak bisa diangkut — PDF, misalnya — menghentikan seluruh
 * penerjemahan, bukan dibuang diam-diam. Membuang satu lampiran
 * lalu tetap menjawab berarti menjawab pertanyaan yang berbeda
 * dari yang ditanyakan.
 */
function untukCadangan(bagian: Bagian[]) {
  return bagian.map((b) => {
    if ("text" in b) return { type: "text", text: b.text };

    const { mimeType, data } = b.inlineData;
    if (!GAMBAR_CADANGAN.has(mimeType)) {
      throw new TidakBisaDicadangkan(`lampiran ${mimeType} tidak bisa dibaca cadangan`);
    }

    return {
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${data}` },
    };
  });
}

/**
 * Memanggil model cadangan.
 *
 * Mode berpikirnya sengaja DIMATIKAN. Dalam mode berpikir,
 * DeepSeek mengabaikan suhu — dan suhu rendah itulah yang menahan
 * dia agar menyunting, bukan mengarang ulang. Menyalakannya
 * berarti mengembalikan persis keluhan yang baru saja diperbaiki:
 * minta dianalisa seperlunya, yang kembali naskah yang berubah
 * semua.
 */
async function panggilCadangan(
  bagian: Bagian[],
  instruksiSistem: string,
  suhu: number,
  jsonSaja: boolean,
): Promise<string> {
  const kunci = process.env.DEEPSEEK_API_KEY;
  if (!kunci) throw new TidakBisaDicadangkan("kunci cadangan belum dipasang");

  const jawaban = await fetch(CADANGAN.alamat, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${kunci}`,
    },
    body: JSON.stringify({
      model: CADANGAN.model,
      messages: [
        { role: "system", content: instruksiSistem },
        { role: "user", content: untukCadangan(bagian) },
      ],
      thinking: { type: "disabled" },
      temperature: suhu,
      ...(jsonSaja ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!jawaban.ok) {
    throw new Error(`${CADANGAN.nama} menolak (${jawaban.status}).`);
  }

  const data = await jawaban.json();
  const teks: string = data?.choices?.[0]?.message?.content ?? "";

  if (!teks.trim()) throw new Error(`${CADANGAN.nama} menjawab kosong.`);
  return teks;
}

async function panggilGemini(
  bagian: Bagian[],
  instruksiSistem: string,
  suhu: number,
  jsonSaja: boolean,
  mencari = false,
  jejak?: Jejak,
): Promise<string | HasilBerSumber> {
  const kunci = process.env.GEMINI_API_KEY;

  if (!kunci) {
    throw new Error(
      "Kunci Gemini belum dipasang. Isi GEMINI_API_KEY di .env.local, lalu jalankan ulang aplikasinya.",
    );
  }

  let galatTerakhir = "";

  for (const model of MODEL) {
    for (let percobaan = 1; percobaan <= ULANGI; percobaan++) {
      try {
        const jawaban = await fetch(`${ALAMAT}/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": kunci,
          },
          body: JSON.stringify({
            contents: [{ parts: bagian }],
            systemInstruction: { parts: [{ text: instruksiSistem }] },
            ...(mencari ? { tools: [{ google_search: {} }] } : {}),
            generationConfig: {
              temperature: suhu,
              // Pencarian dan jawaban terkunci-JSON tidak bisa
              // dipakai bersamaan; yang mencari memang menjawab
              // dengan tulisan biasa.
              ...(jsonSaja && !mencari ? { responseMimeType: "application/json" } : {}),
            },
          }),
        });

        if (!jawaban.ok) {
          const isi = await jawaban.text();
          galatTerakhir = terjemahkanGalat(jawaban.status, isi);

          // Penuh atau sesak hanya soal waktu — beri jeda sebentar,
          // baru diulang. Penolakan lain tidak akan membaik dengan
          // diulang, jadi langsung pindah ke model berikutnya.
          const sementara = jawaban.status === 503 || jawaban.status === 429;
          if (sementara && percobaan < ULANGI) {
            await new Promise((lanjut) => setTimeout(lanjut, 1500));
            continue;
          }
          break;
        }

        const data = await jawaban.json();
        const teks: string =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("") ?? "";

        if (teks.trim()) {
          if (jejak) jejak.mesin = model;
          if (!mencari) return teks;

          // Alamatnya diambil dari keterangan pencarian Gemini,
          // bukan dari tulisan yang ia hasilkan. Yang ia tulis
          // bisa karangan; yang ada di sini benar-benar dibuka.
          const potongan =
            data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

          const sumber: SumberTemuan[] = [];
          for (const p of potongan as { web?: { uri?: string; title?: string } }[]) {
            const tautan = p.web?.uri;
            if (!tautan || sumber.some((x) => x.tautan === tautan)) continue;
            sumber.push({ judul: p.web?.title ?? tautan, tautan });
          }

          return { teks, sumber };
        }

        // Jawaban kosong biasanya berarti permintaannya tertahan
        // penyaring keamanan Gemini, bukan gangguan jaringan.
        galatTerakhir =
          "Gemini tidak mengembalikan tulisan apa pun. Isian mungkin tertahan penyaring keamanannya — coba susun ulang kalimatnya.";
      } catch (galat) {
        galatTerakhir = galat instanceof Error ? galat.message : String(galat);
      }
    }
  }

  /**
   * Seluruh model Gemini sudah habis dicoba. Baru di sinilah
   * cadangan dipanggil.
   *
   * Yang MENCARI tidak pernah dicadangkan: cadangannya tidak
   * punya pencarian web, dan menjawab tanpa mencari berarti
   * sumbernya kembali datang dari ingatan model — persis yang
   * seluruh sistem sumber rujukan ini dibangun untuk menghindari.
   */
  if (!mencari) {
    try {
      const teks = await panggilCadangan(bagian, instruksiSistem, suhu, jsonSaja);
      if (jejak) jejak.mesin = CADANGAN.nama;
      return teks;
    } catch (galat) {
      // Cadangan yang memang tidak berlaku untuk pekerjaan ini
      // tidak perlu disebut — yang perlu diketahui orangnya tetap
      // penolakan asli dari Gemini.
      if (!(galat instanceof TidakBisaDicadangkan)) {
        const sebab = galat instanceof Error ? galat.message : String(galat);
        galatTerakhir = `${galatTerakhir} Cadangan ${CADANGAN.nama} juga gagal: ${sebab}`;
      }
    }
  }

  throw new Error(galatTerakhir || "Gagal menghubungi Gemini.");
}

/** Menerjemahkan galat Gemini jadi kalimat yang bisa ditindaklanjuti. */
function terjemahkanGalat(status: number, isi: string) {
  if (status === 401 || status === 403 || isi.includes("API_KEY_INVALID")) {
    return (
      "Kunci Gemini ditolak. Pastikan kuncinya masih berlaku dan layanan " +
      "Generative Language API sudah diaktifkan untuk kunci itu."
    );
  }

  if (status === 429 || isi.includes("RESOURCE_EXHAUSTED")) {
    return (
      "Kuota Gemini sudah habis untuk hari ini, atau modelnya tidak termasuk " +
      "kuota gratis. Coba lagi besok, atau pakai modul yang lebih ringan."
    );
  }

  if (status === 503) {
    return "Gemini sedang ramai dan menolak permintaan baru. Coba lagi beberapa menit lagi.";
  }

  if (status >= 500) {
    return "Layanan Gemini sedang bermasalah. Coba lagi beberapa saat lagi.";
  }

  return `Gemini menolak permintaan (kode ${status}).`;
}
