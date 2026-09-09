import Link from "next/link";
import { notFound } from "next/navigation";
import { izinHumas, wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaKolom } from "@/lib/modul-ai";
import { FormJalankan } from "./form-jalankan";

export default async function HalamanModul({ params }: PageProps<"/modul/[id]">) {
  await wajibHumas();
  const izin = await izinHumas();
  const { id } = await params;

  const supabase = await createClient();
  const { data: modul } = await supabase
    .from("modul_ai")
    .select("id, judul, deskripsi, kategori, kolom, bawaan")
    .eq("id", Number(id))
    .maybeSingle();

  if (!modul) notFound();

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

      <FormJalankan
        modulId={modul.id}
        kolom={bacaKolom(modul.kolom)}
        namaBerkas={namaBerkas}
        namaModul={modul.judul}
      />
    </div>
  );
}
