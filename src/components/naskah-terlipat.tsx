"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Ikon from "@/components/ikon";
import { pisahBagian } from "@/lib/konsep-teks";

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
export function NaskahTerlipat({ naskah }: { naskah: string }) {
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.isi}</ReactMarkdown>
            </div>
          </section>
        );
      })}
    </div>
  );
}
