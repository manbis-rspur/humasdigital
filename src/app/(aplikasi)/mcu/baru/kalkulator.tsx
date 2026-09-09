"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { simpanPenawaran } from "@/lib/mcu-actions";
import { hitungPenawaran, persen, rupiah, type RincianItem } from "@/lib/mcu";
import { hasilAwal } from "@/lib/hasil";

export type Pemeriksaan = { id: number; nama: string; tarif: number; cost: number };
export type Paket = { id: number; nama: string; item_id: number[] };

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

function Angka({
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
      <span
        className={`font-mono text-sm whitespace-nowrap ${tebal ? "font-semibold" : ""} ${warna ?? ""}`}
      >
        {nilai}
      </span>
    </div>
  );
}

export function Kalkulator({
  pemeriksaan,
  paket,
  ppnBawaan,
}: {
  pemeriksaan: Pemeriksaan[];
  paket: Paket[];
  ppnBawaan: number;
}) {
  const [hasil, kirim, sedang] = useActionState(simpanPenawaran, hasilAwal);

  const [dipilih, setDipilih] = useState<number[]>([]);
  const [cari, setCari] = useState("");
  const [peserta, setPeserta] = useState(1);
  const [hargaPaket, setHargaPaket] = useState<string>("");
  const [kenaPpn, setKenaPpn] = useState(true);

  const rincian: RincianItem[] = useMemo(
    () =>
      dipilih
        .map((id) => pemeriksaan.find((p) => p.id === id))
        .filter((p): p is Pemeriksaan => Boolean(p))
        .map((p) => ({ nama: p.nama, tarif: p.tarif, cost: p.cost })),
    [dipilih, pemeriksaan],
  );

  const h = hitungPenawaran(rincian, {
    hargaPaket: hargaPaket.trim() === "" ? null : Number(hargaPaket),
    jumlahPeserta: peserta,
    kenaPpn,
    ppnPersen: ppnBawaan,
  });

  const tampil = pemeriksaan.filter((p) =>
    cari.trim() === "" ? true : p.nama.toLowerCase().includes(cari.trim().toLowerCase()),
  );

  function pakaiPaket(p: Paket) {
    setDipilih(p.item_id.filter((id) => pemeriksaan.some((x) => x.id === id)));
  }

  return (
    <form action={kirim} className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <input type="hidden" name="rincian" value={JSON.stringify(rincian)} />
      <input type="hidden" name="jumlah_peserta" value={peserta} />
      <input type="hidden" name="harga_paket" value={h.hargaPaket} />
      <input type="hidden" name="kena_ppn" value={kenaPpn ? "Ya" : "Tidak"} />
      <input type="hidden" name="ppn_persen" value={ppnBawaan} />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Pemeriksaan yang termasuk
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {paket.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pakaiPaket(p)}
                  className="rounded-lg border border-garis px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                >
                  {p.nama}
                </button>
              ))}
              {dipilih.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDipilih([])}
                  className="rounded-lg px-2.5 py-1 text-xs text-tinta-3 hover:text-merah"
                >
                  kosongkan
                </button>
              )}
            </div>
          </div>

          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari pemeriksaan…"
            className={`${gaya} text-sm`}
          />

          <div className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  <th className="border-b border-garis px-3 py-2.5 w-10"></th>
                  <th className="border-b border-garis px-3 py-2.5">Pemeriksaan</th>
                  <th className="border-b border-garis px-3 py-2.5 text-right">Tarif</th>
                  <th className="border-b border-garis px-3 py-2.5 text-right">Biaya</th>
                  <th className="border-b border-garis px-3 py-2.5 text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((p) => {
                  const aktif = dipilih.includes(p.id);
                  const laba = p.tarif - p.cost;
                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        setDipilih((lama) =>
                          lama.includes(p.id)
                            ? lama.filter((x) => x !== p.id)
                            : [...lama, p.id],
                        )
                      }
                      className={`cursor-pointer ${aktif ? "bg-hijau-muda" : "hover:bg-permukaan-2"}`}
                    >
                      <td className="border-b border-garis px-3 py-2">
                        <input
                          type="checkbox"
                          checked={aktif}
                          onChange={() => {}}
                          tabIndex={-1}
                          className="pointer-events-none accent-hijau"
                        />
                      </td>
                      <td className="border-b border-garis px-3 py-2">{p.nama}</td>
                      <td className="border-b border-garis px-3 py-2 text-right font-mono">
                        {rupiah(p.tarif)}
                      </td>
                      <td className="border-b border-garis px-3 py-2 text-right font-mono text-tinta-3">
                        {rupiah(p.cost)}
                      </td>
                      <td
                        className={`border-b border-garis px-3 py-2 text-right font-mono ${laba < 0 ? "text-merah" : ""}`}
                      >
                        {rupiah(laba)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-tinta-3">
            {dipilih.length} dari {pemeriksaan.length} pemeriksaan dipilih. Klik
            barisnya untuk memasukkan atau mengeluarkan.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Rekanan / Perusahaan <span className="text-merah">*</span>
            </span>
            <input name="rekanan" required placeholder="PT Sumber Sehat" className={gaya} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Jenis pemeriksaan
            </span>
            <input
              name="jenis_pemeriksaan"
              placeholder="MCU Karyawan Tahunan"
              className={gaya}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Tanggal surat
            </span>
            <input
              name="tanggal_surat"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={gaya}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Jumlah peserta
            </span>
            <input
              type="number"
              min={1}
              value={peserta}
              onChange={(e) => setPeserta(Math.max(1, Number(e.target.value) || 1))}
              className={gaya}
            />
          </label>
          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
                Catatan
              </span>
              <textarea name="catatan" rows={3} className={`${gaya} w-full`} />
            </label>
          </div>
        </section>
      </div>

      <aside className="w-full shrink-0 lg:w-96">
        <div className="flex flex-col gap-4 rounded-xl shadow-lembut border border-garis bg-permukaan p-5 lg:sticky lg:top-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Hitungan
          </h2>

          <div className="border-b border-garis pb-2">
            <Angka label="Jumlah tarif daftar" nilai={rupiah(h.subTarif)} />
            <Angka label="Jumlah biaya" nilai={rupiah(h.subCost)} />
            <Angka
              label="Laba bila dijual harga daftar"
              nilai={`${rupiah(h.labaDaftar)} · ${persen(h.marginDaftar)}`}
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Harga penawaran per peserta
            </span>
            <input
              type="number"
              min={0}
              value={hargaPaket}
              onChange={(e) => setHargaPaket(e.target.value)}
              placeholder={String(h.subTarif)}
              className={gaya}
            />
            <span className="text-xs text-tinta-3">
              Sebelum PPN. Kosongkan untuk memakai harga daftar.
            </span>
          </label>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={kenaPpn}
              onChange={(e) => setKenaPpn(e.target.checked)}
              className="accent-hijau"
            />
            <span className="text-sm">Kena PPN {ppnBawaan}%</span>
          </label>

          <div className="border-t border-garis pt-2">
            <Angka
              label="Diskon dari harga daftar"
              nilai={`${rupiah(h.diskon)} · ${persen(h.diskonPersen)}`}
              warna={h.diskon < 0 ? "text-oker" : undefined}
              keterangan={h.diskon < 0 ? "harga di atas daftar" : undefined}
            />
            <Angka label={`PPN ${ppnBawaan}%`} nilai={rupiah(h.ppnPerPeserta)} />
            <Angka
              label="Tagihan per peserta"
              nilai={rupiah(h.tagihanPerPeserta)}
              tebal
            />
          </div>

          <div className="border-t border-garis pt-2">
            <Angka
              label={`Total tagihan · ${peserta} peserta`}
              nilai={rupiah(h.totalTagihan)}
              tebal
            />
            <Angka
              label="PPN dipungut"
              keterangan="disetor ke negara, bukan pendapatan"
              nilai={rupiah(h.totalPpn)}
              warna="text-tinta-3"
            />
            <Angka label="Total biaya" nilai={rupiah(h.totalBiaya)} warna="text-tinta-3" />
          </div>

          <div className="rounded-lg bg-permukaan-2 p-3">
            <Angka
              label="Pendapatan bersih"
              keterangan="setelah PPN dikeluarkan"
              nilai={rupiah(h.pendapatan)}
              tebal
              warna={h.pendapatan < 0 ? "text-merah" : "text-hijau"}
            />
            <Angka
              label="Margin"
              nilai={persen(h.margin)}
              tebal
              warna={h.margin < 0 ? "text-merah" : undefined}
            />
          </div>

          {hasil.pesan && (
            <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
              {hasil.pesan}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={sedang || rincian.length === 0}
              className="rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {sedang ? "Menyimpan…" : "Simpan penawaran"}
            </button>
            <Link
              href="/mcu"
              className="rounded-lg border border-garis px-4 py-2.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
            >
              Batal
            </Link>
          </div>
        </div>
      </aside>
    </form>
  );
}
