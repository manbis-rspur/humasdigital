"use client";

import { useState } from "react";
import Ikon from "@/components/ikon";
import { kalimatUsulan, type Usulan } from "@/lib/isu";

/**
 * Bahan usulan tema di sebelah kotak cerita kampanye.
 *
 * Sengaja TIDAK muncul sendiri sewaktu orang mengetik. Yang sedang
 * ramai tidak berubah tiap huruf, jadi mencarinya ulang tiap
 * ketikan cuma mengulang pekerjaan yang sama — dan kotak yang
 * berkedip sewaktu orang sedang menyusun pikiran justru memutusnya.
 *
 * Diklik, kalimatnya masuk ke kotak cerita. Boleh lebih dari satu:
 * kampanye sungguhan memang sering menggabungkan hari besar dengan
 * isu yang sedang hangat.
 */
export function PanelUsulan({
  daftar,
  onPilih,
}: {
  daftar: Usulan[];
  onPilih: (kalimat: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [dipakai, setDipakai] = useState<string[]>([]);

  if (daftar.length === 0) return null;

  const isu = daftar.filter((u) => u.jenis === "isu");

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-garis bg-permukaan-2 px-3 py-1.5 text-sm font-medium text-tinta-2 hover:bg-permukaan"
      >
        <Ikon nama="modul" ukuran={15} />
        Bingung mau angkat apa? Lihat {daftar.length} usulan
        {isu.length > 0 && (
          <span className="rounded-full bg-oker px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
            {isu.length} sedang ramai
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-garis bg-permukaan-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Bahan usulan tema
        </h3>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-xs text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>

      <p className="text-xs text-tinta-3">
        Klik yang cocok — kalimatnya masuk ke kotak cerita di atas, lalu boleh
        diubah sesukanya. Boleh pilih lebih dari satu.
      </p>

      <ul className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
        {daftar.map((u) => {
          const sudah = dipakai.includes(u.kunci);
          return (
            <li key={u.kunci}>
              <button
                type="button"
                disabled={sudah}
                onClick={() => {
                  onPilih(kalimatUsulan(u));
                  setDipakai((lama) => [...lama, u.kunci]);
                }}
                className={`flex h-full w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left ${
                  sudah
                    ? "border-hijau bg-hijau-muda"
                    : "border-garis bg-permukaan hover:border-hijau"
                }`}
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{u.judul}</span>
                  {u.jenis === "isu" && (
                    <span className="rounded-full bg-[#f6efe2] px-1.5 py-0.5 text-[0.65rem] font-semibold text-oker">
                      sedang ramai
                    </span>
                  )}
                  {sudah && <span className="text-xs text-hijau">sudah dipakai</span>}
                </span>

                <span className="text-xs text-tinta-3">
                  {u.kapan}
                  {u.jenis === "hari" &&
                    (u.jarak === 0 ? " · hari ini" : ` · ${u.jarak} hari lagi`)}
                </span>

                {u.sudut && <span className="text-xs text-tinta-2">{u.sudut}</span>}
                {u.kaitan && (
                  <span className="text-xs text-tinta-3">Layanan: {u.kaitan}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
