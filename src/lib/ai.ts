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
 * Satu potong kiriman ke Gemini: tulisan biasa, atau berkas utuh
 * (PDF, tangkapan layar) yang dibaca langsung oleh modelnya.
 */
export type Bagian =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export async function susunDenganAI(
  perintah: string,
  instruksiSistem: string,
  suhu = 0.7,
): Promise<string> {
  return panggilGemini([{ text: perintah }], instruksiSistem, suhu, false);
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
): Promise<string> {
  return panggilGemini(bagian, instruksiSistem, 0, true);
}

async function panggilGemini(
  bagian: Bagian[],
  instruksiSistem: string,
  suhu: number,
  jsonSaja: boolean,
): Promise<string> {
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
            generationConfig: {
              temperature: suhu,
              ...(jsonSaja ? { responseMimeType: "application/json" } : {}),
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

        if (teks.trim()) return teks;

        // Jawaban kosong biasanya berarti permintaannya tertahan
        // penyaring keamanan Gemini, bukan gangguan jaringan.
        galatTerakhir =
          "Gemini tidak mengembalikan tulisan apa pun. Isian mungkin tertahan penyaring keamanannya — coba susun ulang kalimatnya.";
      } catch (galat) {
        galatTerakhir = galat instanceof Error ? galat.message : String(galat);
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
