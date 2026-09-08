import Link from "next/link";
import { notFound } from "next/navigation";
import { wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { TampilHasil } from "@/components/tampil-hasil";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function HalamanArsipDokumen({
  params,
}: PageProps<"/arsip/[id]">) {
  await wajibHumas();
  const { id } = await params;

  const supabase = await createClient();
  const { data: d } = await supabase
    .from("publikasi")
    .select("id, judul, jenis, isi, diubah_pada, penyunting:diubah_oleh(nama)")
    .eq("id", Number(id))
    .maybeSingle();

  if (!d || d.isi === null) notFound();

  const { data: revisi } = await supabase
    .from("publikasi_revisi")
    .select("id, catatan, pada, pengguna:oleh(nama)")
    .eq("publikasi_id", Number(id))
    .order("pada", { ascending: false });

  const penyunting = Array.isArray(d.penyunting) ? d.penyunting[0] : d.penyunting;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/arsip" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke arsip
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{d.judul}</h1>
        {d.diubah_pada && penyunting && (
          <p className="mt-1 text-sm text-hijau">
            Sudah disunting {waktu.format(new Date(d.diubah_pada))} oleh {penyunting.nama}
          </p>
        )}
      </div>

      <TampilHasil judul={d.judul} hasil={d.isi} namaBerkas="dokumen-arsip" />

      {(revisi ?? []).length > 0 && (
        <section className="rounded border border-garis bg-permukaan p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Riwayat perubahan
          </h2>
          <ol className="flex flex-col gap-3">
            {(revisi ?? []).map((r) => {
              const oleh = Array.isArray(r.pengguna) ? r.pengguna[0] : r.pengguna;
              return (
                <li key={r.id} className="border-l-2 border-garis pl-3">
                  <p className="text-sm">{r.catatan ?? "Disunting"}</p>
                  <p className="text-xs text-tinta-3">
                    {waktu.format(new Date(r.pada))}
                    {oleh && ` · ${oleh.nama}`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
