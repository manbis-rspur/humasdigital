"use client";

import { useActionState } from "react";
import { simpanDokter } from "@/lib/dokter-actions";
import { HARI, type Sesi } from "@/lib/dokter";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export type IsianDokter = {
  id: number;
  poliklinik: string;
  nama: string;
  aktif: boolean;
  catatan: string | null;
  jadwal: Sesi[];
};

/**
 * Menambah atau memperbaiki satu dokter.
 *
 * Tiap hari disediakan dua kotak jam, karena sesi pagi dan sesi sore
 * memang lazim di sini. Yang dikosongkan tidak tersimpan.
 */
export function FormDokter({
  awal,
  daftarPoli,
}: {
  awal?: IsianDokter;
  daftarPoli: string[];
}) {
  const [hasil, kirim, sedang] = useActionState(simpanDokter, hasilAwal);

  function jamHari(hari: number, ke: number): string {
    const isi = (awal?.jadwal ?? []).filter((s) => s.hari === hari);
    return isi[ke]?.jam ?? "";
  }

  return (
    <form action={kirim} className="flex flex-col gap-4">
      {awal && <input type="hidden" name="id" value={awal.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Poliklinik</span>
          <input
            name="poliklinik"
            required
            list="daftar-poli"
            defaultValue={awal?.poliklinik ?? ""}
            placeholder="Spesialis Anak"
            className={gaya}
          />
          <datalist id="daftar-poli">
            {daftarPoli.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nama dokter</span>
          <input
            name="nama"
            required
            defaultValue={awal?.nama ?? ""}
            placeholder="dr. Nurjannah, Sp.A (K)"
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Tulis lengkap dengan gelarnya — persis seperti ini yang akan dipakai
            AI menulis konten.
          </span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Jam praktik</legend>
        <div className="flex flex-col gap-2">
          {HARI.slice(1).map((hari, urutan) => {
            const nomor = urutan + 1;
            return (
              <div key={hari} className="flex flex-wrap items-center gap-2">
                <span className="w-16 text-sm text-tinta-2">{hari}</span>
                <input
                  name={`jam_${nomor}`}
                  defaultValue={jamHari(nomor, 0)}
                  placeholder="08.00 - 12.00"
                  className={`${gaya} w-40`}
                />
                <input
                  name={`jam_${nomor}`}
                  defaultValue={jamHari(nomor, 1)}
                  placeholder="sesi kedua"
                  className={`${gaya} w-40`}
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Catatan</span>
        <input
          name="catatan"
          defaultValue={awal?.catatan ?? ""}
          placeholder="Misalnya: cuti sampai akhir bulan"
          className={gaya}
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={awal ? awal.aktif : true}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Sedang praktik</span>
          <span className="block text-tinta-3">
            Yang dipadamkan tetap tersimpan, tapi tidak pernah disebut AI dalam
            konten.
          </span>
        </span>
      </label>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
