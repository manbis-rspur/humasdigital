"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Ikon from "@/components/ikon";
import { tandaiKabarDibaca } from "@/lib/notifikasi-actions";
import type { Kabar } from "@/lib/notifikasi";

/** Menyebut jarak waktu dengan bahasa yang biasa dipakai orang. */
function jarakWaktu(iso: string): string {
  const detik = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return "kemarin";
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Lonceng({
  daftar,
  baru,
}: {
  daftar: Kabar[];
  baru: number;
}) {
  const [buka, setBuka] = useState(false);
  const [belum, setBelum] = useState(baru);
  const [hitunganLama, setHitunganLama] = useState(baru);
  const kotak = useRef<HTMLDivElement>(null);

  // Tata letak tidak dipasang ulang saat berpindah halaman, jadi
  // hitungan baru dari peladen harus disalin saat angkanya berubah.
  // Disetel di tengah render, bukan lewat useEffect — cara yang
  // dianjurkan React untuk menyesuaikan state terhadap prop, dan
  // tidak menyebabkan halaman digambar dua kali.
  if (baru !== hitunganLama) {
    setHitunganLama(baru);
    setBelum(baru);
  }

  useEffect(() => {
    if (!buka) return;

    function diLuar(e: MouseEvent) {
      if (!kotak.current?.contains(e.target as Node)) setBuka(false);
    }
    function tekanEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }

    document.addEventListener("mousedown", diLuar);
    document.addEventListener("keydown", tekanEsc);
    return () => {
      document.removeEventListener("mousedown", diLuar);
      document.removeEventListener("keydown", tekanEsc);
    };
  }, [buka]);

  function bukaTutup() {
    const berikutnya = !buka;
    setBuka(berikutnya);

    // Angka merahnya dihapus begitu daftarnya dibuka. Penandaan di
    // peladen dibiarkan berjalan sendiri — kalau gagal pun, yang
    // hilang cuma penanda, bukan kabarnya.
    if (berikutnya && belum > 0) {
      setBelum(0);
      void tandaiKabarDibaca();
    }
  }

  return (
    <div className="relative" ref={kotak}>
      <button
        type="button"
        onClick={bukaTutup}
        aria-label={
          belum > 0 ? `Pemberitahuan, ${belum} kabar baru` : "Pemberitahuan"
        }
        aria-expanded={buka}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border text-tinta-2 hover:bg-permukaan-2 ${
          buka ? "border-hijau bg-permukaan-2 text-hijau" : "border-garis"
        }`}
      >
        <Ikon nama="lonceng" ukuran={18} />
        {belum > 0 && (
          <span className="denyut absolute -right-1 -top-1 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-merah px-1 text-[0.65rem] font-semibold text-white">
            {belum > 9 ? "9+" : belum}
          </span>
        )}
      </button>

      {buka && (
        <div className="masuk-halus absolute right-0 top-11 z-50 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-garis bg-permukaan shadow-angkat">
          <div className="flex items-center justify-between border-b border-garis px-4 py-2.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Kegiatan Unit
            </span>
            <span className="text-xs text-tinta-3">
              {daftar.length > 0 ? `${daftar.length} terakhir` : "—"}
            </span>
          </div>

          {daftar.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-tinta-3">
              Belum ada kegiatan yang tercatat.
            </p>
          ) : (
            <ul className="max-h-[24rem] overflow-y-auto">
              {daftar.map((k) => (
                <li key={k.kunci}>
                  <Link
                    href={k.tautan}
                    onClick={() => setBuka(false)}
                    className="flex gap-3 border-b border-garis px-4 py-3 last:border-b-0 hover:bg-permukaan-2"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-hijau-muda text-hijau">
                      <Ikon nama={k.ikon} ukuran={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">
                        {k.judul}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-tinta-2">
                        {k.rincian}
                      </span>
                      <span className="mt-1 block text-[0.7rem] text-tinta-3">
                        {jarakWaktu(k.waktu)}
                        {k.olehSaya && " · oleh Anda"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
