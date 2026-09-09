import Link from "next/link";
import { wajibMcu } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { rupiah, persen } from "@/lib/mcu";
import { simpanBarisPemeriksaan, ubahAktifPemeriksaan } from "@/lib/mcu-actions";
import { FormTambah } from "./form-tambah";

const gaya =
  "w-28 rounded border border-garis bg-permukaan px-2 py-1 text-right text-sm font-mono outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export default async function HalamanPemeriksaan() {
  await wajibMcu();

  const supabase = await createClient();
  const { data } = await supabase
    .from("mcu_item")
    .select("id, nama, tarif, cost, aktif")
    .order("aktif", { ascending: false })
    .order("urutan")
    .order("id");

  const item = data ?? [];
  const aktif = item.filter((i) => i.aktif);
  const totalTarif = aktif.reduce((j, i) => j + i.tarif, 0);
  const totalCost = aktif.reduce((j, i) => j + i.cost, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/mcu" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke daftar penawaran
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Daftar Pemeriksaan</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Tarif dan biaya yang dipakai kalkulator. Mengubahnya di sini tidak
          mengubah penawaran yang sudah dibuat — masing-masing menyimpan
          salinannya sendiri.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-garis bg-permukaan px-4 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Jumlah tarif
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">{rupiah(totalTarif)}</p>
        </div>
        <div className="rounded-lg border border-garis bg-permukaan px-4 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Jumlah biaya
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">{rupiah(totalCost)}</p>
        </div>
        <div className="rounded-lg border border-garis bg-permukaan px-4 py-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Margin bila semua diambil
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {totalTarif > 0 ? persen((totalTarif - totalCost) / totalTarif) : "—"}
          </p>
        </div>
      </div>

      <FormTambah />

      <div className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
              <th className="border-b border-garis px-4 py-2.5">Pemeriksaan</th>
              <th className="border-b border-garis px-4 py-2.5 text-right">Tarif</th>
              <th className="border-b border-garis px-4 py-2.5 text-right">Biaya</th>
              <th className="border-b border-garis px-4 py-2.5 text-right">Margin</th>
              <th className="border-b border-garis px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {item.map((i) => (
              <tr key={i.id} className={i.aktif ? "" : "text-tinta-3"}>
                <td className="border-b border-garis px-4 py-2">
                  {i.nama}
                  {!i.aktif && (
                    <span className="ml-2 rounded-lg bg-permukaan-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide">
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="border-b border-garis px-4 py-2 text-right" colSpan={2}>
                  <form action={simpanBarisPemeriksaan} className="flex justify-end gap-2">
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="nama" value={i.nama} />
                    <input
                      name="tarif"
                      type="number"
                      min={0}
                      defaultValue={i.tarif}
                      aria-label={`Tarif ${i.nama}`}
                      className={gaya}
                    />
                    <input
                      name="cost"
                      type="number"
                      min={0}
                      defaultValue={i.cost}
                      aria-label={`Biaya ${i.nama}`}
                      className={gaya}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-garis px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                    >
                      Simpan
                    </button>
                  </form>
                </td>
                <td className="border-b border-garis px-4 py-2 text-right">
                  {i.tarif > 0 ? persen((i.tarif - i.cost) / i.tarif) : "—"}
                </td>
                <td className="border-b border-garis px-4 py-2 text-right">
                  <form action={ubahAktifPemeriksaan}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="aktif" value={String(!i.aktif)} />
                    <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
                      {i.aktif ? "nonaktifkan" : "aktifkan"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
