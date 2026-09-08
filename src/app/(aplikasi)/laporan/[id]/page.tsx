import Link from "next/link";
import { notFound } from "next/navigation";
import { wajibSosmed } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { hapusKonten } from "@/lib/sosmed-actions";
import { TampilHasil } from "@/components/tampil-hasil";
import { NAMA_BULAN, angkaRapi, interaksi, type Konten } from "@/lib/sosmed";
import { FormAngka, FormKonten, RingkasKonten, TombolSusun } from "./penyusun";

export default async function HalamanLaporanBulan({
  params,
}: PageProps<"/laporan/[id]">) {
  await wajibSosmed();
  const { id } = await params;

  const supabase = await createClient();
  const { data: l } = await supabase
    .from("laporan_sosmed")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();

  if (!l) notFound();

  const { data: baris } = await supabase
    .from("laporan_konten")
    .select("*")
    .eq("laporan_id", Number(id))
    .order("tanggal", { ascending: true })
    .order("id");

  const konten = (baris ?? []) as Konten[];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href="/laporan" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke daftar laporan
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {NAMA_BULAN[l.bulan]} {l.tahun}
        </h1>
        <p className="mt-1 text-tinta-2">Instagram dan TikTok {l.akun}</p>
        <RingkasKonten daftar={konten} />
      </div>

      <FormAngka
        id={l.id}
        angka={(l.angka ?? {}) as Record<string, Record<string, number>>}
        catatan={l.catatan}
      />

      {konten.length > 0 && (
        <section className="overflow-x-auto rounded border border-garis bg-permukaan">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                <th className="border-b border-garis px-3 py-2.5">Tanggal</th>
                <th className="border-b border-garis px-3 py-2.5">Konten</th>
                <th className="border-b border-garis px-3 py-2.5">Funnel</th>
                <th className="border-b border-garis px-3 py-2.5 text-right">Tayangan</th>
                <th className="border-b border-garis px-3 py-2.5 text-right">Interaksi</th>
                <th className="border-b border-garis px-3 py-2.5">Iklan</th>
                <th className="border-b border-garis px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {konten.map((k) => (
                <tr key={k.id}>
                  <td className="border-b border-garis px-3 py-2 whitespace-nowrap text-tinta-3">
                    {k.tanggal ?? "—"}
                  </td>
                  <td className="border-b border-garis px-3 py-2">
                    {k.judul}
                    <span className="block text-xs text-tinta-3">
                      {k.platform}
                      {k.format ? ` · ${k.format}` : ""}
                    </span>
                  </td>
                  <td className="border-b border-garis px-3 py-2">
                    {k.funnel ?? <span className="text-tinta-3">belum diisi</span>}
                  </td>
                  <td className="border-b border-garis px-3 py-2 text-right font-mono">
                    {angkaRapi(k.tayangan)}
                  </td>
                  <td className="border-b border-garis px-3 py-2 text-right font-mono">
                    {angkaRapi(interaksi(k))}
                  </td>
                  <td className="border-b border-garis px-3 py-2 whitespace-nowrap">
                    {k.ada_ads ? (
                      <span className="rounded bg-[#f0e7d4] px-2 py-0.5 text-xs font-semibold text-oker">
                        Rp {angkaRapi(k.biaya_ads)}
                      </span>
                    ) : (
                      <span className="text-xs text-tinta-3">organik</span>
                    )}
                  </td>
                  <td className="border-b border-garis px-3 py-2 text-right">
                    <form action={hapusKonten}>
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="laporan_id" value={l.id} />
                      <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
                        hapus
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <FormKonten laporanId={l.id} />

      <section className="flex flex-col gap-3 border-t border-garis pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Naskah laporan
        </h2>
        <TombolSusun id={l.id} sudahAda={Boolean(l.hasil)} />
      </section>

      {l.hasil && (
        <div className="flex flex-col gap-3">
          <a
            href={`/laporan/${l.id}/word`}
            className="w-fit rounded bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Unduh Word
          </a>
          <TampilHasil
            judul={`Laporan Media Sosial — ${NAMA_BULAN[l.bulan]} ${l.tahun}`}
            hasil={l.hasil}
            namaBerkas={`laporan-sosmed-${l.tahun}-${String(l.bulan).padStart(2, "0")}`}
          />
        </div>
      )}
    </div>
  );
}
