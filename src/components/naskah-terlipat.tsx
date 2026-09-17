"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Ikon from "@/components/ikon";
import { pisahBagian } from "@/lib/konsep-teks";
import type { KopSurat } from "@/lib/kop-surat";

/**
 * Menampilkan naskah draf dengan konsep-konsepnya bisa dilipat.
 *
 * Satu kalender dengan enam konsep di bawahnya bisa berpuluh
 * halaman di layar, padahal yang dicari orang hampir selalu satu
 * di antaranya. Kalendernya sendiri selalu terbuka — itu yang
 * dibaca paling sering.
 *
 * Yang terlipat disembunyikan dengan atribut hidden, bukan dibuang
 * dari halaman. Penyalinan ke Google Docs membaca isi halaman apa
 * adanya; kalau bagian yang terlipat dibuang, yang tersalin cuma
 * separuh dokumen tanpa ada yang menyadarinya.
 */
export function NaskahTerlipat({
  naskah,
  drafId,
  kop = [],
}: {
  naskah: string;
  drafId: number;
  kop?: KopSurat[];
}) {
  const kopBawaan = kop.find((k) => k.bawaan) ?? kop[0];
  const bagian = pisahBagian(naskah);
  const konsep = bagian.filter((b) => b.judul !== "");

  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  function jungkit(judul: string) {
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(judul)) baru.delete(judul);
      else baru.add(judul);
      return baru;
    });
  }

  // Tidak ada konsep sama sekali — tidak ada yang perlu dilipat.
  if (konsep.length === 0) {
    return (
      <div className="dokumen">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{naskah}</ReactMarkdown>
      </div>
    );
  }

  const semuaTerbuka = terbuka.size === konsep.length;

  const gayaUnduh =
    "inline-flex items-center gap-1.5 rounded border border-garis px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-permukaan-2";

  return (
    <div className="dokumen flex flex-col gap-3">
      {bagian.map((b, urutan) => {
        if (b.judul === "") {
          return (
            <div key={`kalender-${urutan}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.isi}</ReactMarkdown>

              {urutan === 0 && konsep.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-garis pt-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
                    {konsep.length} konsep konten
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setTerbuka(
                        semuaTerbuka ? new Set() : new Set(konsep.map((k) => k.judul)),
                      )
                    }
                    className="text-xs font-medium text-hijau hover:underline"
                  >
                    {semuaTerbuka ? "Tutup semua" : "Buka semua"}
                  </button>
                </div>
              )}
            </div>
          );
        }

        const buka = terbuka.has(b.judul);

        return (
          <section
            key={b.judul}
            className="overflow-hidden rounded-xl border border-garis"
          >
            <button
              type="button"
              onClick={() => jungkit(b.judul)}
              aria-expanded={buka}
              className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-permukaan-2 ${
                buka ? "bg-permukaan-2" : ""
              }`}
            >
              <span
                className={`inline-block transition-transform ${buka ? "rotate-90" : ""}`}
              >
                <Ikon nama="panah" ukuran={14} />
              </span>
              {b.judul}
            </button>

            <div hidden={!buka} className="border-t border-garis px-4 py-3">
              {/* Unduhan per konsep, bukan seluruh draf. Yang
                  diserahkan ke desainer cuma satu konten; seluruh
                  kalender sebulan justru membuat ia harus mencari
                  bagiannya sendiri. */}
              <div className="mb-3 flex flex-wrap gap-2 border-b border-garis pb-3">
                <a
                  href={`/draf/${drafId}/bagian?bentuk=pdf&kop=${
                    kopBawaan ? kopBawaan.id : "tanpa"
                  }&judul=${encodeURIComponent(b.judul)}`}
                  className={gayaUnduh}
                >
                  <Ikon nama="unduh" ukuran={13} />
                  PDF
                  {kopBawaan && (
                    <span className="font-normal text-tinta-3">
                      kop {kopBawaan.nama}
                    </span>
                  )}
                </a>

                {kopBawaan && (
                  <a
                    href={`/draf/${drafId}/bagian?bentuk=pdf&kop=tanpa&judul=${encodeURIComponent(b.judul)}`}
                    className={gayaUnduh}
                  >
                    <Ikon nama="unduh" ukuran={13} />
                    PDF tanpa kop
                  </a>
                )}

                <a
                  href={`/draf/${drafId}/bagian?bentuk=word&judul=${encodeURIComponent(b.judul)}`}
                  className={gayaUnduh}
                >
                  <Ikon nama="unduh" ukuran={13} />
                  Word
                </a>
              </div>

              <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.isi}</ReactMarkdown>
            </div>
          </section>
        );
      })}
    </div>
  );
}
