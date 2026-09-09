"use client";

import { useActionState, useState } from "react";
import { hapusPenawaranMcu } from "@/lib/hapus-mcu-actions";
import { hasilAwal } from "@/lib/hasil";

/**
 * Satu kumpulan data beserta penegasannya.
 *
 * Tombolnya baru menyala setelah kata penegasan diketik persis.
 * Sengaja tidak memakai kotak "yakin?" biasa — kotak semacam itu
 * ditekan orang tanpa dibaca, sedangkan mengetik menuntut berhenti
 * sejenak dan menyadari apa yang sedang dilakukan.
 */
export function KotakHapus({
  nama,
  penegasan,
  keterangan,
  jumlah,
}: {
  nama: string;
  penegasan: string;
  keterangan: string;
  jumlah: number;
}) {
  const [hasil, kirim, sedang] = useActionState(hapusPenawaranMcu, hasilAwal);
  const [diketik, setDiketik] = useState("");
  const cocok = diketik.trim() === penegasan;

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <div>
        <p className="font-medium">
          {nama}
          <span className="ml-2 rounded-lg bg-permukaan-2 px-1.5 py-0.5 text-xs font-normal text-tinta-3">
            {jumlah} baris
          </span>
        </p>
        <p className="mt-1 text-sm text-tinta-2">{keterangan}</p>
      </div>

      {jumlah === 0 ? (
        <p className="text-sm text-tinta-3">Sudah kosong — tidak ada yang perlu dihapus.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-tinta-3">
              Ketik <span className="font-mono font-semibold">{penegasan}</span> untuk
              membuka tombolnya
            </span>
            <input
              name="penegasan"
              value={diketik}
              onChange={(e) => setDiketik(e.target.value)}
              autoComplete="off"
              className="w-fit rounded-lg border border-garis bg-permukaan px-3 py-2 font-mono text-sm outline-none focus:border-merah focus:ring-2 focus:ring-[#f1dfe1]"
            />
          </label>

          <button
            type="submit"
            disabled={!cocok || sedang}
            className="w-fit rounded-lg bg-merah px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sedang ? "Menghapus…" : `Kosongkan ${nama.toLowerCase()}`}
          </button>
        </>
      )}

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}
    </form>
  );
}
