"use client";

import { useState } from "react";
import Ikon from "@/components/ikon";
import { hapusBahan, ubahAktifBahan } from "@/lib/isu-actions";
import type { HariKesehatan, IsuRamai } from "@/lib/isu";
import { FormHariKesehatan, FormIsu } from "./formulir";

/**
 * Satu baris bahan, dengan formulirnya tersembunyi sampai diminta.
 *
 * Halaman ini berisi puluhan baris; membuka semua formulirnya
 * sekaligus membuat halamannya panjang tanpa guna, padahal yang
 * dikerjakan sehari-hari cuma membaca.
 */
export function BarisBahan({
  tabel,
  judul,
  keterangan,
  aktif,
  id,
  hari,
  isu,
}: {
  tabel: "hari_kesehatan" | "isu_ramai";
  judul: string;
  keterangan: string;
  aktif: boolean;
  id: number;
  hari?: HariKesehatan;
  isu?: IsuRamai;
}) {
  const [buka, setBuka] = useState(false);

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-garis bg-permukaan px-4 py-2.5 shadow-lembut ${
        aktif ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="mr-auto min-w-0">
          <span className="font-medium">{judul}</span>
          <span className="block text-xs text-tinta-3">{keterangan}</span>
        </span>

        {!aktif && (
          <span className="rounded-full bg-permukaan-2 px-2.5 py-0.5 text-xs font-medium text-tinta-2">
            Tidak dipakai
          </span>
        )}

        <form action={ubahAktifBahan}>
          <input type="hidden" name="tabel" value={tabel} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="aktif" value={aktif ? "tidak" : "ya"} />
          <button type="submit" className="text-xs text-tinta-3 hover:text-tinta">
            {aktif ? "Padamkan" : "Nyalakan"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          className="text-xs font-medium text-hijau hover:underline"
        >
          {buka ? "Tutup" : "Ubah"}
        </button>

        <form action={hapusBahan}>
          <input type="hidden" name="tabel" value={tabel} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            aria-label="Hapus"
            title="Hapus"
            className="text-merah hover:opacity-70"
          >
            <Ikon nama="hapus" ukuran={14} />
          </button>
        </form>
      </div>

      {buka && (
        <div className="border-t border-garis pt-3">
          {hari ? <FormHariKesehatan awal={hari} /> : isu ? <FormIsu awal={isu} /> : null}
        </div>
      )}
    </li>
  );
}
