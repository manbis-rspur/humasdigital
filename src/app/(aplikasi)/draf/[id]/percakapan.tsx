"use client";

import { useActionState, useEffect, useRef } from "react";
import Ikon from "@/components/ikon";
import { tambahKomentar } from "@/lib/draf-actions";
import { hasilAwal } from "@/lib/hasil";

const waktu = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export type Komentar = {
  id: number;
  isi: string;
  pada: string;
  nama: string;
};

/**
 * Percakapan kerja pada sebuah draf.
 *
 * Bertumpuk, bukan satu kotak yang ditimpa. Koordinasi yang ditimpa
 * kehilangan alasan di balik keputusannya, dan sebulan kemudian
 * tidak ada yang ingat kenapa bagian itu diubah.
 *
 * Komentar tidak bisa disunting maupun dihapus — percakapan kerja
 * yang bisa diubah belakangan berhenti bisa dijadikan pegangan.
 */
export function Percakapan({
  drafId,
  daftar,
  saya,
}: {
  drafId: number;
  daftar: Komentar[];
  saya: string;
}) {
  const [hasil, kirim, sedang] = useActionState(tambahKomentar, hasilAwal);
  const kotak = useRef<HTMLFormElement>(null);

  // Kotak dikosongkan setelah terkirim. Tanpa ini, catatan sebelumnya
  // tertinggal dan ikut terkirim lagi pada catatan berikutnya.
  useEffect(() => {
    if (!sedang && !hasil.pesan) kotak.current?.reset();
  }, [sedang, hasil.pesan]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="obrolan" ukuran={14} />
        Percakapan
        <span className="font-normal normal-case tracking-normal">
          {daftar.length > 0 ? daftar.length : "belum ada"}
        </span>
      </h2>

      {daftar.length > 0 && (
        <ol className="flex flex-col gap-3">
          {daftar.map((k) => (
            <li
              key={k.id}
              className={`border-l-2 pl-3 ${
                k.nama === saya ? "border-hijau" : "border-garis"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{k.isi}</p>
              <p className="mt-0.5 text-xs text-tinta-3">
                {k.nama.split(",")[0]} · {waktu.format(new Date(k.pada))}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form ref={kotak} action={kirim} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={drafId} />
        <textarea
          name="isi"
          rows={2}
          required
          placeholder="Tulis catatan — apa yang perlu diubah, apa yang sudah disepakati"
          className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
        {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
        >
          {sedang ? "Mengirim…" : "Kirim catatan"}
        </button>
      </form>
    </section>
  );
}
