"use client";

import { useState } from "react";
import Ikon from "@/components/ikon";
import {
  barisKosong,
  gabungBlok,
  pisahBlok,
  type Blok,
} from "@/lib/markdown-tabel";

/**
 * Menyunting dokumen hasil susunan AI di tempat.
 *
 * Tabel disunting sebagai tabel — kotak per kotak — bukan sebagai
 * deretan tanda garis tegak. Menyunting kalender konten dalam
 * bentuk mentah gampang merusak barisnya, dan yang rusak baru
 * ketahuan setelah dokumennya diunduh.
 *
 * Bagian di luar tabel tetap berupa kotak tulis biasa. Yang tidak
 * diurai tidak bisa rusak.
 */
export function SuntingDokumen({
  isi,
  onUbah,
}: {
  isi: string;
  onUbah: (baru: string) => void;
}) {
  const [sumber, setSumber] = useState(isi);
  const [blok, setBlok] = useState<Blok[]>(() => pisahBlok(isi));

  // Naskah yang datang dari luar diurai ulang. Yang diubah dari
  // dalam komponen ini tidak — kalau ikut diurai tiap ketikan,
  // kotak yang sedang diketik kehilangan letak kursornya.
  if (isi !== sumber) {
    setSumber(isi);
    setBlok(pisahBlok(isi));
  }

  function perbarui(baru: Blok[]) {
    setBlok(baru);
    onUbah(gabungBlok(baru));
  }

  function gantiBlok(nomor: number, ganti: Blok) {
    perbarui(blok.map((b, i) => (i === nomor ? ganti : b)));
  }

  return (
    <div className="flex flex-col gap-4">
      {blok.map((b, nomor) =>
        b.jenis === "teks" ? (
          <textarea
            key={nomor}
            value={b.isi}
            onChange={(e) => gantiBlok(nomor, { jenis: "teks", isi: e.target.value })}
            rows={Math.min(14, Math.max(2, b.isi.split("\n").length))}
            className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
          />
        ) : (
          <TabelSunting
            key={nomor}
            blok={b}
            onUbah={(ganti) => gantiBlok(nomor, ganti)}
          />
        ),
      )}
    </div>
  );
}

function TabelSunting({
  blok,
  onUbah,
}: {
  blok: Extract<Blok, { jenis: "tabel" }>;
  onUbah: (ganti: Extract<Blok, { jenis: "tabel" }>) => void;
}) {
  function ubahKotak(baris: number, kolom: number, nilai: string) {
    onUbah({
      ...blok,
      isi: blok.isi.map((r, i) =>
        i === baris ? r.map((k, j) => (j === kolom ? nilai : k)) : r,
      ),
    });
  }

  function ubahKepala(kolom: number, nilai: string) {
    onUbah({ ...blok, kepala: blok.kepala.map((k, j) => (j === kolom ? nilai : k)) });
  }

  function sisipBaris(setelah: number) {
    const baru = [...blok.isi];
    baru.splice(setelah + 1, 0, barisKosong(blok.kepala.length));
    onUbah({ ...blok, isi: baru });
  }

  function hapusBaris(nomor: number) {
    onUbah({ ...blok, isi: blok.isi.filter((_, i) => i !== nomor) });
  }

  function geser(nomor: number, arah: -1 | 1) {
    const tujuan = nomor + arah;
    if (tujuan < 0 || tujuan >= blok.isi.length) return;
    const baru = [...blok.isi];
    [baru[nomor], baru[tujuan]] = [baru[tujuan], baru[nomor]];
    onUbah({ ...blok, isi: baru });
  }

  const kotak =
    "w-full min-w-32 rounded border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-garis focus:border-hijau focus:bg-permukaan focus:ring-2 focus:ring-hijau-muda";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-garis">
        <table className="w-full border-collapse text-left">
          <thead className="bg-permukaan-2">
            <tr>
              {blok.kepala.map((k, j) => (
                <th key={j} className="border-b border-garis p-0">
                  <input
                    value={k}
                    onChange={(e) => ubahKepala(j, e.target.value)}
                    className={`${kotak} text-xs font-semibold uppercase tracking-wide text-tinta-3`}
                  />
                </th>
              ))}
              <th className="w-28 border-b border-garis px-2 text-xs font-normal text-tinta-3">
                baris
              </th>
            </tr>
          </thead>
          <tbody>
            {blok.isi.map((baris, i) => (
              <tr key={i} className="border-b border-garis last:border-0">
                {baris.map((nilai, j) => (
                  <td key={j} className="p-0 align-top">
                    <textarea
                      value={nilai}
                      /* Tinggi mengikuti isi. Kotak setinggi satu
                         baris memotong tulisan panjang, dan yang
                         terpotong tidak terbaca saat diperiksa. */
                      rows={Math.min(6, Math.max(1, Math.ceil(nilai.length / 25)))}
                      onChange={(e) => ubahKotak(i, j, e.target.value)}
                      className={`${kotak} resize-y`}
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-1">
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => geser(i, -1)}
                      disabled={i === 0}
                      aria-label="Naikkan baris"
                      title="Naikkan"
                      className="text-tinta-3 hover:text-tinta disabled:opacity-30"
                    >
                      <span className="inline-block -rotate-90">
                        <Ikon nama="panah" ukuran={13} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => geser(i, 1)}
                      disabled={i === blok.isi.length - 1}
                      aria-label="Turunkan baris"
                      title="Turunkan"
                      className="text-tinta-3 hover:text-tinta disabled:opacity-30"
                    >
                      <span className="inline-block rotate-90">
                        <Ikon nama="panah" ukuran={13} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sisipBaris(i)}
                      aria-label="Sisipkan baris di bawah"
                      title="Sisipkan di bawah"
                      className="text-tinta-3 hover:text-tinta"
                    >
                      <Ikon nama="tambah" ukuran={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => hapusBaris(i)}
                      aria-label="Hapus baris"
                      title="Hapus baris"
                      className="text-merah hover:opacity-70"
                    >
                      <Ikon nama="hapus" ukuran={13} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => sisipBaris(blok.isi.length - 1)}
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-hijau hover:underline"
      >
        <Ikon nama="tambah" ukuran={13} />
        Tambah baris
      </button>
    </div>
  );
}
