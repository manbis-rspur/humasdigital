"use client";

import { useActionState, useState } from "react";
import { buatLaporan } from "@/lib/sosmed-actions";
import { NAMA_BULAN } from "@/lib/sosmed";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormBaru() {
  const [hasil, kirim, sedang] = useActionState(buatLaporan, hasilAwal);
  /**
   * Laporan boleh disusun untuk rumah sakit atau klinik lain.
   * Namanya ikut tersimpan, karena seluruh naskahnya nanti disusun
   * atas nama instansi itu — termasuk saat disusun ulang
   * berbulan-bulan kemudian.
   */
  const [untukRspur, setUntukRspur] = useState(true);
  const kini = new Date();

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Laporan bulan baru
      </p>
      {untukRspur && <input type="hidden" name="untuk_rspur" value="ya" />}

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={untukRspur}
            onChange={() => setUntukRspur(true)}
            className="accent-hijau"
          />
          RSPUR
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!untukRspur}
            onChange={() => setUntukRspur(false)}
            className="accent-hijau"
          />
          Rumah sakit / klinik lain
        </label>
      </div>

      {!untukRspur && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input name="instansi" placeholder="Nama instansinya" className={gaya} />
            <input name="akun" placeholder="@akunmedsosnya" className={gaya} />
          </div>
          <p className="text-xs text-tinta-2">
            Naskahnya disusun atas nama instansi itu, dan RSPUR tidak akan
            disebut sama sekali. Angkanya tetap dari berkas rekapan yang Anda
            unggah nanti.
          </p>
        </div>
      )}

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
