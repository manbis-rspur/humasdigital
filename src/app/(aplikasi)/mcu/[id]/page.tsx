import Link from "next/link";
import { notFound } from "next/navigation";
import { wajibMcu } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { hitungPenawaran, persen, rupiah, type RincianItem } from "@/lib/mcu";
import { AksiPenawaran } from "./aksi-penawaran";

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Baris({
  label,
  nilai,
  keterangan,
  tebal,
  warna,
}: {
  label: string;
  nilai: string;
  keterangan?: string;
  tebal?: boolean;
  warna?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-tinta-2">
        {label}
        {keterangan && <span className="block text-xs text-tinta-3">{keterangan}</span>}
      </span>
      <span className={`font-mono text-sm ${tebal ? "font-semibold" : ""} ${warna ?? ""}`}>
        {nilai}
      </span>
    </div>
  );
}

export default async function HalamanPenawaran({ params }: PageProps<"/mcu/[id]">) {
  await wajibMcu();
  const { id } = await params;

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("mcu_penawaran")
    .select("*, nomor:nomor_id(nomor_lengkap), pengguna:dibuat_oleh(nama)")
    .eq("id", Number(id))
    .maybeSingle();

  if (!p) notFound();

  const nomor = Array.isArray(p.nomor) ? p.nomor[0] : p.nomor;
  const pembuat = Array.isArray(p.pengguna) ? p.pengguna[0] : p.pengguna;
  const rincian = (p.rincian ?? []) as RincianItem[];

  const h = hitungPenawaran(rincian, {
    hargaPaket: p.harga_paket,
    jumlahPeserta: p.jumlah_peserta,
    kenaPpn: p.kena_ppn,
    ppnPersen: Number(p.ppn_persen),
  });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href="/mcu" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke daftar penawaran
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{p.rekanan}</h1>
        <p className="mt-1 text-tinta-2">
          {p.jenis_pemeriksaan ?? "Paket MCU"} · {p.jumlah_peserta} peserta ·{" "}
          {tanggalPanjang.format(new Date(p.tanggal_surat))}
          {pembuat && ` · disusun ${pembuat.nama}`}
        </p>
        {nomor ? (
          <p className="mt-1 font-mono text-sm">{nomor.nomor_lengkap}</p>
        ) : (
          <p className="mt-1 text-sm text-tinta-3">Belum punya nomor surat</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                <th className="border-b border-garis px-4 py-2.5">Pemeriksaan</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Tarif</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Biaya</th>
              </tr>
            </thead>
            <tbody>
              {rincian.map((r, i) => (
                <tr key={`${r.nama}-${i}`}>
                  <td className="border-b border-garis px-4 py-2">{r.nama}</td>
                  <td className="border-b border-garis px-4 py-2 text-right font-mono">
                    {rupiah(r.tarif)}
                  </td>
                  <td className="border-b border-garis px-4 py-2 text-right font-mono text-tinta-3">
                    {rupiah(r.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-tinta-3">
            Tarif di atas adalah salinan pada saat penawaran dibuat, jadi tidak
            ikut berubah bila daftar tarif diperbarui kemudian.
          </p>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Hitungan
            </h2>
            <Baris label="Jumlah tarif daftar" nilai={rupiah(h.subTarif)} />
            <Baris
              label="Diskon"
              nilai={`${rupiah(h.diskon)} · ${persen(h.diskonPersen)}`}
            />
            <Baris label="Harga per peserta" nilai={rupiah(h.hargaPaket)} keterangan="sebelum PPN" />
            <Baris
              label={p.kena_ppn ? `PPN ${Number(p.ppn_persen)}%` : "PPN"}
              nilai={p.kena_ppn ? rupiah(h.ppnPerPeserta) : "tidak dikenakan"}
            />
            <Baris label="Tagihan per peserta" nilai={rupiah(h.tagihanPerPeserta)} tebal />

            <div className="mt-2 border-t border-garis pt-2">
              <Baris label="Total tagihan" nilai={rupiah(h.totalTagihan)} tebal />
              <Baris
                label="PPN dipungut"
                keterangan="disetor ke negara"
                nilai={rupiah(h.totalPpn)}
                warna="text-tinta-3"
              />
              <Baris label="Total biaya" nilai={rupiah(h.totalBiaya)} warna="text-tinta-3" />
            </div>

            <div className="mt-2 rounded-lg bg-permukaan-2 p-3">
              <Baris
                label="Pendapatan bersih"
                nilai={rupiah(h.pendapatan)}
                tebal
                warna={h.pendapatan < 0 ? "text-merah" : "text-hijau"}
              />
              <Baris label="Margin" nilai={persen(h.margin)} tebal />
            </div>
          </div>

          <div className="rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Dokumen
            </h2>
            {nomor ? (
              <a
                href={`/mcu/${p.id}/cetak`}
                target="_blank"
                rel="noopener"
                className="inline-block rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Surat penawaran
              </a>
            ) : (
              <p className="text-sm text-tinta-2">
                Terbitkan dulu untuk mendapat nomor surat — dokumen resmi tidak
                dicetak tanpa nomor.
              </p>
            )}
          </div>

          <AksiPenawaran id={p.id} status={p.status} sudahBernomor={Boolean(nomor)} />
        </aside>
      </div>

      {p.catatan && (
        <section className="rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Catatan
          </h2>
          <p className="text-sm whitespace-pre-wrap text-tinta-2">{p.catatan}</p>
        </section>
      )}
    </div>
  );
}
