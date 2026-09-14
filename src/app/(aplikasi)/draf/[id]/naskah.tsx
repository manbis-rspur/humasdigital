"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Ikon from "@/components/ikon";
import { SuntingDokumen } from "@/components/sunting-dokumen";
import { simpanNaskahDraf } from "@/lib/draf-actions";

/**
 * Naskah draf yang datang langsung dari modul AI.
 *
 * Bisa disunting berdua di sini — itulah gunanya tempat ini. Yang
 * tersimpan menimpa naskah sebelumnya; percakapan di bawahlah yang
 * menyimpan alasan tiap perubahan.
 */
export function NaskahDraf({
  id,
  isi,
  terkunci,
}: {
  id: number;
  isi: string;
  terkunci: boolean;
}) {
  const [naskah, setNaskah] = useState(isi);
  const [tersimpan, setTersimpan] = useState(isi);
  const [menyunting, setMenyunting] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  const belumSimpan = naskah !== tersimpan;

  function simpan() {
    mulai(async () => {
      const h = await simpanNaskahDraf(id, naskah);
      setKabar(h.pesan);
      if (h.ok) setTersimpan(naskah);
      setTimeout(() => setKabar(null), 3000);
    });
  }

  async function salinBerbentuk(sasaran: HTMLElement | null) {
    if (!sasaran) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([sasaran.innerHTML], { type: "text/html" }),
          "text/plain": new Blob([naskah], { type: "text/plain" }),
        }),
      ]);
      setKabar("Tersalin. Buka Docs baru, lalu tempel — tabelnya ikut.");
    } catch {
      await navigator.clipboard.writeText(naskah);
      setKabar("Teks tersalin.");
    }
    setTimeout(() => setKabar(null), 3000);
  }

  const kecil =
    "rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-50";

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="template" ukuran={14} />
          Naskah
        </h2>

        <div className="flex flex-wrap gap-2">
          {!terkunci && (
            <button
              type="button"
              onClick={() => setMenyunting((m) => !m)}
              className={kecil}
            >
              {menyunting ? "Selesai menyunting" : "Sunting"}
            </button>
          )}
          {!terkunci && belumSimpan && (
            <button
              type="button"
              onClick={simpan}
              disabled={sedang}
              className="rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {sedang ? "Menyimpan…" : "Simpan naskah"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) =>
              salinBerbentuk(
                e.currentTarget.closest("section")?.querySelector(".dokumen") ?? null,
              )
            }
            className={kecil}
          >
            Salin untuk Google Docs
          </button>
        </div>
      </div>

      {kabar && <p className="text-sm text-hijau">{kabar}</p>}

      <div className="overflow-x-auto">
        <div className="dokumen" hidden={menyunting}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{naskah}</ReactMarkdown>
        </div>

        {!terkunci && (
          <div hidden={!menyunting}>
            <SuntingDokumen isi={tersimpan} onUbah={setNaskah} />
          </div>
        )}
      </div>
    </section>
  );
}
