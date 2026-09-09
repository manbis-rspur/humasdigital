"use client";

import { useActionState } from "react";
import { terbitkanPenawaran, ubahStatusPenawaran } from "@/lib/mcu-actions";
import { hasilAwal } from "@/lib/hasil";

export function AksiPenawaran({
  id,
  status,
  sudahBernomor,
}: {
  id: number;
  status: string;
  sudahBernomor: boolean;
}) {
  const [hasil, terbitkan, sedang] = useActionState(terbitkanPenawaran, hasilAwal);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!sudahBernomor && status !== "Batal" && (
          <form action={terbitkan}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={sedang}
              className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {sedang ? "Mengambil nomor…" : "Terbitkan & ambil nomor surat"}
            </button>
          </form>
        )}

        {sudahBernomor && status !== "Disetujui" && status !== "Batal" && (
          <form action={ubahStatusPenawaran}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="Disetujui" />
            <button
              type="submit"
              className="rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
            >
              Tandai disetujui rekanan
            </button>
          </form>
        )}

        {status !== "Batal" && (
          <form action={ubahStatusPenawaran} className="ml-auto">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="Batal" />
            <button type="submit" className="text-sm text-tinta-3 hover:text-merah">
              Tandai batal
            </button>
          </form>
        )}
      </div>

      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}
    </div>
  );
}
