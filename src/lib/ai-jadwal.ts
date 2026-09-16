import "server-only";
import { HARI, ringkasJadwal, type Sesi } from "@/lib/dokter";
import { kunciNama, type PerubahanBaca } from "@/lib/jadwal-ubah";

/**
 * Membaca satu instruksi perubahan jadwal jadi daftar perubahan.
 *
 * Satu kalimat sering berisi lebih dari satu perubahan: "Sabtu
 * dr. Nurjannah libur, diganti dr. Wahdini jam 10" berarti satu
 * penghapusan dan satu penambahan.
 *
 * Nama dokternya TIDAK ditebak. Ia dicocokkan dengan daftar yang
 * memang ada di sistem — daftar yang ditarik dari rspur.co.id —
 * dan yang tidak ketemu ditandai, bukan dikarang. Jadwal dokter
 * dibaca pasien; nama yang salah di situ membuat orang datang
 * percuma.
 */

const MODEL = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const ALAMAT = "https://generativelanguage.googleapis.com/v1beta/models";

export type DokterKini = {
  id: number;
  nama: string;
  poliklinik: string;
  jadwal: Sesi[];
};

export type HasilBacaJadwal = {
  perubahan: PerubahanBaca[];
  /** Terisi bila hasilnya perlu diperiksa sendiri. */
  catatan: string | null;
};

/** "08:30", "8.30", "0830" jadi "08.30". */
function jamRapi(nilai: string): string | null {
  const cocok = /^(\d{1,2})[.:]?(\d{2})$/.exec(nilai.trim());
  if (!cocok) return null;
  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);
  if (jam > 23 || menit > 59) return null;
  return `${String(jam).padStart(2, "0")}.${cocok[2]}`;
}

function rentangRapi(nilai: unknown): string | null {
  if (typeof nilai !== "string") return null;
  const cocok = /^(.+?)\s*[-–]\s*(.+)$/.exec(nilai.trim());
  if (!cocok) return null;
  const a = jamRapi(cocok[1]);
  const b = jamRapi(cocok[2]);
  return a && b ? `${a} - ${b}` : null;
}

/**
 * Menyusun daftar dokter jadi bahan yang bisa dibaca AI.
 *
 * Jadwal yang berlaku ikut disertakan, bukan cuma namanya —
 * tanpa itu AI tidak bisa mengisi "dari jam berapa", dan
 * perubahannya jadi setengah keterangan.
 */
function daftarUntukAI(dokter: DokterKini[]): string {
  return dokter
    .map((d) => `- ${d.nama} (${d.poliklinik}): ${ringkasJadwal(d.jadwal) || "belum ada jadwal"}`)
    .join("\n");
}

const PETUNJUK = `Anda mengubah satu instruksi perubahan jadwal praktik dokter jadi daftar perubahan.

Jawab HANYA dengan JSON berbentuk:
{"perubahan":[{"dokter":"...","aksi":"tambah|ubah|hapus","hari":1,"jam_lama":"08.00 - 12.00","jam_baru":"10.00 - 12.00"}]}

Aturan:
- dokter: nama PERSIS seperti pada DAFTAR DOKTER di bawah, lengkap gelarnya. Jangan menyingkat, jangan memperbaiki ejaan, jangan mengarang nama yang tidak ada di daftar.
- aksi: "hapus" bila jadwal dihilangkan (libur, cuti, tutup). "tambah" bila ada jadwal baru. "ubah" bila jam pada hari yang sama berpindah.
- hari: 1 = Senin sampai 7 = Minggu.
- jam_lama: untuk "hapus" dan "ubah", SALIN dari jadwal dokter itu di daftar. null untuk "tambah".
- jam_baru: untuk "tambah" dan "ubah". null untuk "hapus".
- Jam ditulis "HH.MM - HH.MM".
- Satu kalimat boleh menghasilkan beberapa perubahan. "A libur, diganti B jam 10-12" berarti satu "hapus" untuk A dan satu "tambah" untuk B.
- Bila sesuatu tidak jelas, JANGAN menebak — hilangkan saja dari daftar.
- Jangan menambah apa pun di luar JSON.`;

export async function bacaPerubahanJadwal(
  instruksi: string,
  dokter: DokterKini[],
  kini: string,
): Promise<HasilBacaJadwal> {
  const kunci = process.env.GEMINI_API_KEY;

  const menyerah = (sebab: string): HasilBacaJadwal => ({
    perubahan: [],
    catatan: sebab,
  });

  if (!kunci) return menyerah("Kunci AI belum dipasang, jadi instruksinya saya simpan apa adanya.");
  if (dokter.length === 0) return menyerah("Daftar dokter masih kosong di sistem.");

  const badan = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text:
              `Tanggal hari ini: ${kini} (Asia/Jakarta).\n\n` +
              `DAFTAR DOKTER DAN JADWALNYA SEKARANG:\n${daftarUntukAI(dokter)}\n\n` +
              `INSTRUKSI:\n${instruksi}`,
          },
        ],
      },
    ],
    systemInstruction: { parts: [{ text: PETUNJUK }] },
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  for (const model of MODEL) {
    try {
      const jawaban = await fetch(`${ALAMAT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
        body: badan,
      });
      if (!jawaban.ok) continue;

      const isi = (await jawaban.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const teks = (isi.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");

      const baca = JSON.parse(teks) as { perubahan?: unknown[] };
      if (!Array.isArray(baca.perubahan)) continue;

      return { perubahan: cocokkan(baca.perubahan, dokter), catatan: null };
    } catch {
      // Coba model berikutnya.
    }
  }

  return menyerah("AI sedang tidak bisa dipanggil, jadi instruksinya saya simpan apa adanya.");
}

/** Mencocokkan nama yang dibaca AI dengan dokter yang benar-benar ada. */
function cocokkan(mentah: unknown[], dokter: DokterKini[]): PerubahanBaca[] {
  const peta = new Map(dokter.map((d) => [kunciNama(d.nama), d]));
  const hasil: PerubahanBaca[] = [];

  for (const butir of mentah) {
    if (typeof butir !== "object" || butir === null) continue;
    const b = butir as Record<string, unknown>;

    const nama = String(b.dokter ?? "").trim();
    if (nama === "") continue;

    const aksi = String(b.aksi ?? "");
    if (!["tambah", "ubah", "hapus"].includes(aksi)) continue;

    const hari = Number(b.hari);
    const cocok = peta.get(kunciNama(nama));

    hasil.push({
      dokter_nama: cocok?.nama ?? nama,
      poliklinik: cocok?.poliklinik ?? null,
      aksi,
      hari: Number.isInteger(hari) && hari >= 1 && hari <= 7 ? hari : null,
      jam_lama: rentangRapi(b.jam_lama),
      jam_baru: rentangRapi(b.jam_baru),
      belum_cocok: cocok === undefined,
    });
  }

  return hasil;
}

/** Nama hari untuk pesan balasan. */
export function sebutHariTunggal(hari: number | null): string {
  return hari ? HARI[hari] : "";
}
