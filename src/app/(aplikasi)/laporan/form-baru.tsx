"use client";

import { useActionState } from "react";
import { buatLaporan } from "@/lib/sosmed-actions";
import { NAMA_BULAN } from "@/lib/sosmed";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormBaru() {
  const [hasil, kirim, sedang] = useActionState(buatLaporan, hasilAwal);
  const kini = new Date();

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Laporan bulan baru
      </p>
      <div className="flex flex-wrap gap-2">
        <select name="bulan" defaultValue={kini.getMonth() + 1} className={gaya}>
          {NAMA_BULAN.slice(1).map((n, i) => (
            <option key={n} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
        <select name="tahun" defaultValue={kini.getFullYear()} className={gaya}>
          {[kini.getFullYear(), kini.getFullYear() - 1].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Membuat…" : "Buat laporan"}
        </button>
      </div>
      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
    </form>
  );
}
