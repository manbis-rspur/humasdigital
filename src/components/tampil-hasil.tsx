"use client";

import { useRef, useState } from "react";
import { kirimKeArsip } from "@/lib/arsip-actions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Menampilkan dokumen hasil susunan AI.
 *
 * Dua tampilan: pratinjau yang sudah rapi, dan teks mentah untuk
 * ditempel ke tempat lain. Keduanya perlu — tabel jauh lebih enak
 * dibaca sudah jadi, tapi kadang yang dibutuhkan teks apa adanya.
 */
export function TampilHasil({
  judul,
  hasil,
  namaBerkas = "dokumen",
  riwayatId = null,
  jenisArsip,
}: {
  judul: string;
  hasil: string;
  namaBerkas?: string;
  riwayatId?: number | null;
  /** Nama modul, dipakai sebagai jenis dokumen saat dikirim ke arsip. */
  jenisArsip?: string;
}) {
  const [mentah, setMentah] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const pratinjau = useRef<HTMLDivElement>(null);

  async function kirim() {
    setMengirim(true);
    const h = await kirimKeArsip(judul, jenisArsip ?? "Lainnya", "", hasil);
    beriKabar(h.pesan);
    if (h.ok) setTerkirim(true);
    setMengirim(false);
  }

  function beriKabar(teks: string) {
    setKabar(teks);
    setTimeout(() => setKabar(null), 2500);
  }

  async function salinTeks() {
    try {
      await navigator.clipboard.writeText(hasil);
      beriKabar("Teks tersalin.");
    } catch {
      beriKabar("Peramban menolak menyalin.");
    }
  }

  /**
   * Menyalin dokumen beserta bentuknya.
   *
   * Yang disalin bukan teks mentah melainkan tampilan yang sudah
   * jadi, sehingga saat ditempel ke Google Docs tabel tetap berupa
   * tabel — bukan deretan tanda garis tegak.
   */
  async function salinBerbentuk() {
    const isi = pratinjau.current?.innerHTML;
    if (!isi) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([isi], { type: "text/html" }),
          "text/plain": new Blob([hasil], { type: "text/plain" }),
        }),
      ]);
      beriKabar("Tersalin. Tempel langsung ke Google Docs.");
    } catch {
      // Peramban lama tidak mengenal ClipboardItem — teks biasa
      // masih lebih baik daripada tidak tersalin sama sekali.
      await salinTeks();
    }
  }

  function unduhTeks() {
    const gumpal = new Blob([hasil], { type: "text/markdown;charset=utf-8" });
    const alamat = URL.createObjectURL(gumpal);
    const tautan = document.createElement("a");
    tautan.href = alamat;
    tautan.download = `${namaBerkas}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    setTimeout(() => URL.revokeObjectURL(alamat), 1000);
  }

  const gayaTombol =
    "rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{judul}</h2>
        <div className="flex flex-wrap gap-2">
          {jenisArsip && (
            <button
              type="button"
              onClick={kirim}
              disabled={mengirim || terkirim}
              className="rounded bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {terkirim
                ? "Sudah dikirim"
                : mengirim
                  ? "Mengirim…"
                  : "Kirim ke Koordinator"}
            </button>
          )}
          {riwayatId !== null && (
            <a
              href={`/riwayat/${riwayatId}/word`}
              className="rounded bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Unduh Word
            </a>
          )}
          <button type="button" onClick={salinBerbentuk} className={gayaTombol}>
            Salin untuk Google Docs
          </button>
          <button type="button" onClick={() => setMentah((m) => !m)} className={gayaTombol}>
            {mentah ? "Tampilan rapi" : "Teks mentah"}
          </button>
          <button type="button" onClick={salinTeks} className={gayaTombol}>
            Salin teks
          </button>
          <button type="button" onClick={unduhTeks} className={gayaTombol}>
            Unduh teks
          </button>
          <button type="button" onClick={() => window.print()} className={gayaTombol}>
            Cetak
          </button>
        </div>
      </div>

      {kabar && <p className="text-sm text-hijau">{kabar}</p>}

      <div className="overflow-x-auto rounded border border-garis bg-permukaan p-5">
        {/* Keduanya tetap ada di halaman; yang tidak dipakai
            disembunyikan. Pratinjau harus tetap hidup supaya
            penyalinan berbentuk punya bahan untuk disalin. */}
        <div ref={pratinjau} className="dokumen" hidden={mentah}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{hasil}</ReactMarkdown>
        </div>
        <pre className="text-xs whitespace-pre-wrap" hidden={!mentah}>
          {hasil}
        </pre>
      </div>

      {jenisArsip && (
        <p className="text-xs text-tinta-3">
          Kirim ke Koordinator menaruh dokumen ini di Arsip Publikasi pada
          Dashboard Manajemen Bisnis, sebagai teks yang bisa beliau sunting
          langsung — dan suntingannya terlihat lagi di menu Arsip di sini.
        </p>
      )}

      <p className="text-xs text-tinta-3">
        Dokumen ini disusun mesin. Periksa dulu nama, tanggal, angka, dan
        keterangan medisnya sebelum diterbitkan.
      </p>
    </section>
  );
}
