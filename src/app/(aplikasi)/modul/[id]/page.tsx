import Link from "next/link";
import { notFound } from "next/navigation";
import { izinHumas, wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaKolom, type Kolom } from "@/lib/modul-ai";
import { NAMA_BULAN, perasEvaluasi } from "@/lib/sosmed";
import { FormJalankan } from "./form-jalankan";

export default async function HalamanModul({
  params,
  searchParams,
}: PageProps<"/modul/[id]">) {
  await wajibHumas();
  const izin = await izinHumas();
  const { id } = await params;
  const q = await searchParams;

  const supabase = await createClient();
  const { data: modul } = await supabase
    .from("modul_ai")
    .select("id, judul, deskripsi, kategori, kolom, bawaan")
    .eq("id", Number(id))
    .maybeSingle();

  if (!modul) notFound();

  let kolom: Kolom[] = bacaKolom(modul.kolom);
  let pijakan: string | null = null;

  /**
   * Kalender konten yang dibuka dari sebuah laporan berangkat dengan
   * evaluasinya sudah terisi.
   *
   * Isinya tetap ditaruh di kotak yang bisa dibaca dan diubah, bukan
   * diselundupkan diam-diam ke perintah AI. Yang menyusun kalender
   * harus melihat sendiri pijakan yang dipakainya — dan bebas
   * membetulkannya kalau menurutnya tidak tepat.
   *
   * Laporan yang belum disetujui tidak akan terbaca di sini sama
   * sekali: yang menutupnya aturan database, bukan pemeriksaan di
   * halaman ini.
   */
  const laporanId = Number(q.laporan);
  if (Number.isInteger(laporanId) && laporanId > 0) {
    const { data: laporan } = await supabase
      .from("laporan_sosmed")
      .select("bulan, tahun, hasil, disetujui_pada")
      .eq("id", laporanId)
      .maybeSingle();

    if (laporan?.hasil && laporan.disetujui_pada) {
      pijakan = `Laporan Media Sosial ${NAMA_BULAN[laporan.bulan]} ${laporan.tahun}`;
      const isi = perasEvaluasi(laporan.hasil);
      kolom = kolom.map((k) =>
        k.kunci === "evaluasi" ? { ...k, bawaan: isi } : k,
      );
    }
  }

  const namaBerkas = modul.judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <div className="max-w-3xl">
      <Link href="/" className="text-sm text-tinta-3 hover:underline">
        ← Kembali ke daftar modul
      </Link>

      <div className="mt-2 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{modul.judul}</h1>
          <p className="mt-1 max-w-xl text-tinta-2">{modul.deskripsi}</p>
        </div>
        {izin === "penuh" && (
          <Link
            href={`/modul/${modul.id}/ubah`}
            className="rounded-lg border border-garis px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Sunting modul
          </Link>
        )}
      </div>

      {pijakan && (
        <p className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-hijau bg-hijau-muda/50 px-4 py-2.5 text-sm text-tinta-2">
          <span className="font-medium text-hijau">Berpijak pada {pijakan}.</span>
          Evaluasinya sudah dimuat ke isian di bawah — periksa dulu, boleh
          diubah sebelum kalendernya disusun.
        </p>
      )}

      <FormJalankan
        modulId={modul.id}
        kolom={kolom}
        namaBerkas={namaBerkas}
        namaModul={modul.judul}
      />
    </div>
  );
}
