import Link from "next/link";
import { wajibMcu } from "@/lib/akses";
import Ikon from "@/components/ikon";
import { createClient } from "@/lib/supabase/server";
import { hitungPenawaran, rupiah, persen, type RincianItem } from "@/lib/mcu";

const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function warnaStatus(status: string) {
  if (status === "Disetujui") return "bg-hijau-muda text-hijau";
  if (status === "Terbit") return "bg-[#dce4ec] text-[#2f4e6b]";
  if (status === "Batal") return "bg-[#f1dfe1] text-merah";
  return "bg-permukaan-2 text-tinta-3";
}

export default async function HalamanMcu() {
  const pengguna = await wajibMcu();

  const supabase = await createClient();
  const { data } = await supabase
    .from("mcu_penawaran")
    .select(
      "id, rekanan, jenis_pemeriksaan, jumlah_peserta, harga_paket, kena_ppn, ppn_persen, rincian, status, tanggal_surat, nomor:nomor_id(nomor_lengkap)",
    )
    .order("dibuat_pada", { ascending: false })
    .limit(200);

  const penawaran = data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kalkulator MCU</h1>
          <p className="mt-1 max-w-2xl text-tinta-2">
            Menghitung harga paket medical check-up untuk rekanan, beserta laba
            dan marginnya, lalu menerbitkan surat penawaran.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/mcu/pemeriksaan"
            className="rounded-lg border border-garis px-4 py-2.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Daftar pemeriksaan
          </Link>
          <Link
            href="/mcu/baru"
            className="flex items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Ikon nama="tambah" ukuran={16} />
            Penawaran baru
          </Link>
          {pengguna.peran === "Admin" && (
            <Link
              href="/mcu/hapus"
              title="Mengosongkan data penawaran"
              className="flex items-center gap-2 rounded-lg border border-garis px-3 py-2.5 text-sm font-medium text-tinta-3 hover:bg-permukaan-2"
            >
              <Ikon nama="hapus" ukuran={16} />
              Hapus data
            </Link>
          )}
        </div>
      </div>

      {penawaran.length === 0 ? (
        <div className="rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada penawaran.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Mulai dari Penawaran baru — pilih pemeriksaannya, lalu lihat labanya.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
          <table className="w-full min-w-[54rem] border-collapse text-sm">
            <thead>
              <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                <th className="border-b border-garis px-4 py-2.5">Rekanan</th>
                <th className="border-b border-garis px-4 py-2.5">Nomor surat</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Peserta</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Total tagihan</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Pendapatan</th>
                <th className="border-b border-garis px-4 py-2.5 text-right">Margin</th>
                <th className="border-b border-garis px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {penawaran.map((p) => {
                const nomor = Array.isArray(p.nomor) ? p.nomor[0] : p.nomor;
                const h = hitungPenawaran((p.rincian ?? []) as RincianItem[], {
                  hargaPaket: p.harga_paket,
                  jumlahPeserta: p.jumlah_peserta,
                  kenaPpn: p.kena_ppn,
                  ppnPersen: Number(p.ppn_persen),
                });
                return (
                  <tr key={p.id} className="hover:bg-permukaan-2">
                    <td className="border-b border-garis px-4 py-2.5">
                      <Link href={`/mcu/${p.id}`} className="font-medium hover:underline">
                        {p.rekanan}
                      </Link>
                      <span className="block text-xs text-tinta-3">
                        {p.jenis_pemeriksaan ?? "—"} ·{" "}
                        {tanggal.format(new Date(p.tanggal_surat))}
                      </span>
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                      {nomor?.nomor_lengkap ?? <span className="text-tinta-3">belum terbit</span>}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 text-right">
                      {p.jumlah_peserta}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 text-right font-mono whitespace-nowrap">
                      {rupiah(h.totalTagihan)}
                    </td>
                    <td
                      className={`border-b border-garis px-4 py-2.5 text-right font-mono whitespace-nowrap ${h.pendapatan < 0 ? "text-merah" : ""}`}
                    >
                      {rupiah(h.pendapatan)}
                    </td>
                    <td
                      className={`border-b border-garis px-4 py-2.5 text-right ${h.margin < 0 ? "text-merah" : ""}`}
                    >
                      {persen(h.margin)}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${warnaStatus(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
