"use client";

import { useActionState } from "react";
import { simpanPemeriksaan } from "@/lib/mcu-actions";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormTambah() {
  const [hasil, kirim, sedang] = useActionState(simpanPemeriksaan, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Tambah pemeriksaan
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem_auto]">
        <input name="nama" required placeholder="Nama pemeriksaan" className={gaya} />
        <input name="tarif" type="number" min={0} placeholder="Tarif" className={gaya} />
        <input name="cost" type="number" min={0} placeholder="Biaya" className={gaya} />
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Tambah"}
        </button>
      </div>
      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}
    </form>
  );
}
