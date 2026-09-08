import { notFound } from "next/navigation";
import { wajibHumasPenuh } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaKolom } from "@/lib/modul-ai";
import { PerakitModul } from "../../perakit-modul";

export default async function HalamanSuntingModul({
  params,
}: PageProps<"/modul/[id]/ubah">) {
  await wajibHumasPenuh();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("modul_ai")
    .select("id, judul, deskripsi, kategori, instruksi_sistem, pola_perintah, kolom, bawaan")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Sunting Modul</h1>
      <p className="mt-1 mb-8 text-tinta-2">
        Perubahan berlaku untuk seluruh tim yang memakai modul ini.
      </p>

      <PerakitModul modul={{ ...data, kolom: bacaKolom(data.kolom) }} />
    </div>
  );
}
