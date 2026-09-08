/**
 * Nilai awal untuk formulir yang memakai useActionState.
 *
 * Ditaruh di berkas tersendiri, bukan di sebelah aksinya, karena
 * berkas bertanda "use server" hanya boleh mengekspor fungsi.
 * Mengekspor objek dari sana membuat halaman gagal dimuat — dan
 * gagalnya baru terasa saat halamannya dibuka, bukan saat dibangun.
 */

export type Hasil = { pesan: string | null; berhasil: string | null };
export const hasilAwal: Hasil = { pesan: null, berhasil: null };

export type HasilKomplain = { pesan: string | null; kode: string | null };
export const komplainAwal: HasilKomplain = { pesan: null, kode: null };

export type Balasan = { ok: boolean; pesan: string };
