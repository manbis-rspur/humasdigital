"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Ikon from "@/components/ikon";
import { SuntingDokumen } from "@/components/sunting-dokumen";
import { kirimKeArsip } from "@/lib/arsip-actions";
import { drafDariNaskah } from "@/lib/draf-actions";
import { perbaikiDokumen, simpanSuntingan, simpanTautanDocs } from "@/lib/riwayat-actions";
import { adaTabel } from "@/lib/markdown-tabel";

/**
 * Menampilkan dokumen hasil susunan AI.
 *
 * Tiga tampilan: pratinjau yang sudah rapi, penyuntingan kotak per
 * kotak, dan teks mentah untuk ditempel ke tempat lain. Ketiganya
 * perlu — tabel jauh lebih enak dibaca sudah jadi, sering perlu
 * dibetulkan satu dua kotak, dan kadang yang dibutuhkan teks apa
 * adanya.
 */
export function TampilHasil({
  judul,
  hasil,
  namaBerkas = "dokumen",
  riwayatId = null,
  jenisArsip,
  tautanDocsAwal = null,
  bolehKeDraf = false,
}: {
  judul: string;
  hasil: string;
  namaBerkas?: string;
  riwayatId?: number | null;
  /** Nama modul, dipakai sebagai jenis dokumen saat dikirim ke arsip. */
  jenisArsip?: string;
  tautanDocsAwal?: string | null;
  /** Hanya pemegang izin humas yang punya Draf Bersama. */
  bolehKeDraf?: boolean;
}) {
  const [sumber, setSumber] = useState(hasil);
  const [naskah, setNaskah] = useState(hasil);
  const [tersimpan, setTersimpan] = useState(hasil);
  /* Naskah yang dibaca penyunting tabel. Berbeda dari naskah yang
     sedang berjalan: penyunting hanya perlu diurai ulang saat
     isinya diganti dari luar, bukan tiap ketikan. */
  const [benih, setBenih] = useState(hasil);
  const [permintaan, setPermintaan] = useState("");
  const [sebelumPerbaikan, setSebelumPerbaikan] = useState<string | null>(null);
  const [waspada, setWaspada] = useState<string | null>(null);
  const [tampilan, setTampilan] = useState<"rapi" | "sunting" | "mentah">("rapi");
  const [kabar, setKabar] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);
  const [keDraf, setKeDraf] = useState<number | null>(null);
  const [docs, setDocs] = useState(tautanDocsAwal ?? "");
  const pratinjau = useRef<HTMLDivElement>(null);

  // Dokumen yang baru disusun mengganti seluruh isinya. Disetel
  // saat menggambar, bukan lewat efek: kalau lewat efek, naskah
  // lama sempat tergambar sekejap sebelum tertimpa.
  if (hasil !== sumber) {
    setSumber(hasil);
    setNaskah(hasil);
    setTersimpan(hasil);
    setBenih(hasil);
    setSebelumPerbaikan(null);
  }

  const belumSimpan = naskah !== tersimpan;
  const bisaSimpan = riwayatId !== null;

  function beriKabar(teks: string) {
    setKabar(teks);
    setTimeout(() => setKabar(null), 3000);
  }

  async function simpan(): Promise<boolean> {
    if (!bisaSimpan || !belumSimpan) return true;
    setSibuk("Menyimpan…");
    const h = await simpanSuntingan(riwayatId, naskah);
    setSibuk(null);
    beriKabar(h.pesan);
    if (h.ok) setTersimpan(naskah);
    return h.ok;
  }

  async function kirim() {
    setSibuk("Mengirim…");
    await simpan();
    const h = await kirimKeArsip(judul, jenisArsip ?? "Lainnya", "", naskah);
    setSibuk(null);
    beriKabar(h.pesan);
    if (h.ok) setTerkirim(true);
  }

  async function keDrafBersama() {
    setSibuk("Mengirim ke draf…");
    await simpan();
    const h = await drafDariNaskah(judul, jenisArsip ?? "Lainnya", naskah, riwayatId);
    setSibuk(null);
    beriKabar(h.pesan);
    if (h.ok && h.id) setKeDraf(h.id);
  }

  /**
   * Meminta AI memperbaiki dokumen yang sudah ada.
   *
   * Hasilnya tidak langsung disimpan, dan naskah sebelumnya
   * disimpan di sini supaya bisa dikembalikan. Perbaikan yang tidak
   * bisa dibatalkan membuat orang takut mencobanya.
   */
  async function perbaiki() {
    if (riwayatId === null) return;

    setSibuk("Memperbaiki…");
    const h = await perbaikiDokumen(riwayatId, naskah, permintaan);
    setSibuk(null);

    if (h.hasil === null) {
      beriKabar(h.pesan ?? "Gagal memperbaiki.");
      return;
    }

    setSebelumPerbaikan(naskah);
    setNaskah(h.hasil);
    setBenih(h.hasil);
    setPermintaan("");
    setWaspada(h.peringatan ?? null);
    beriKabar("Sudah diperbaiki. Periksa dulu, lalu simpan.");
  }

  function batalkanPerbaikan() {
    if (sebelumPerbaikan === null) return;
    setNaskah(sebelumPerbaikan);
    setBenih(sebelumPerbaikan);
    setSebelumPerbaikan(null);
    setWaspada(null);
    beriKabar("Dikembalikan ke naskah sebelum perbaikan.");
  }

  async function simpanDocs() {
    if (!bisaSimpan) return;
    setSibuk("Menyimpan tautan…");
    const h = await simpanTautanDocs(riwayatId, docs);
    setSibuk(null);
    beriKabar(h.pesan);
  }

  /**
   * Unduhan Word disusun di peladen dari naskah yang tersimpan,
   * jadi suntingan harus mendarat lebih dulu. Tanpa ini, yang
   * terunduh naskah sebelum disunting — dan bedanya tidak kelihatan
   * sampai berkasnya dibuka.
   */
  async function unduhWord() {
    if (riwayatId === null) return;
    if (belumSimpan && !(await simpan())) return;

    // Tautan yang diklik, bukan perpindahan halaman: alamat ini
    // mengirim berkas, dan perpindahan halaman biasa akan membuat
    // Next.js menunggu halaman yang tidak pernah datang.
    const tautan = document.createElement("a");
    tautan.href = `/riwayat/${riwayatId}/word`;
    tautan.download = "";
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
  }

  async function salinTeks() {
    try {
      await navigator.clipboard.writeText(naskah);
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
          "text/plain": new Blob([naskah], { type: "text/plain" }),
        }),
      ]);
      beriKabar("Tersalin. Buka Docs baru, lalu tempel — tabelnya ikut.");
    } catch {
      // Peramban lama tidak mengenal ClipboardItem — teks biasa
      // masih lebih baik daripada tidak tersalin sama sekali.
      await salinTeks();
    }
  }

  function unduhTeks() {
    const gumpal = new Blob([naskah], { type: "text/markdown;charset=utf-8" });
    const alamat = URL.createObjectURL(gumpal);
    const tautan = document.createElement("a");
    tautan.href = alamat;
    tautan.download = `${namaBerkas}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    setTimeout(() => URL.revokeObjectURL(alamat), 1000);
  }

  const kecil =
    "rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-50";
  const utama =
    "rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{judul}</h2>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setTampilan((t) => (t === "sunting" ? "rapi" : "sunting"))
            }
            className={tampilan === "sunting" ? utama : kecil}
          >
            {tampilan === "sunting" ? "Selesai menyunting" : "Sunting"}
          </button>

          {bisaSimpan && belumSimpan && (
            <button type="button" onClick={simpan} className={utama} disabled={!!sibuk}>
              Simpan suntingan
            </button>
          )}

          {bolehKeDraf && (
            <button
              type="button"
              onClick={keDrafBersama}
              disabled={!!sibuk || keDraf !== null}
              className={kecil}
            >
              {keDraf !== null ? "Sudah di draf" : "Kirim ke Draf Bersama"}
            </button>
          )}

          {jenisArsip && (
            <button
              type="button"
              onClick={kirim}
              disabled={!!sibuk || terkirim}
              className={kecil}
            >
              {terkirim ? "Sudah dikirim" : "Kirim ke Koordinator"}
            </button>
          )}
        </div>
      </div>

      {/* Baris kedua: cara membawa dokumennya keluar. */}
      <div className="flex flex-wrap gap-2 border-b border-garis pb-3">
        {riwayatId !== null && (
          <button type="button" onClick={unduhWord} className={kecil} disabled={!!sibuk}>
            Unduh Word
          </button>
        )}
        <button type="button" onClick={salinBerbentuk} className={kecil}>
          Salin untuk Google Docs
        </button>
        <a
          href="https://docs.new"
          target="_blank"
          rel="noopener noreferrer"
          className={`${kecil} inline-flex items-center gap-1.5`}
        >
          Buka Docs baru
          <Ikon nama="panah" ukuran={12} />
        </a>
        <button
          type="button"
          onClick={() => setTampilan((t) => (t === "mentah" ? "rapi" : "mentah"))}
          className={kecil}
        >
          {tampilan === "mentah" ? "Tampilan rapi" : "Teks mentah"}
        </button>
        <button type="button" onClick={salinTeks} className={kecil}>
          Salin teks
        </button>
        <button type="button" onClick={unduhTeks} className={kecil}>
          Unduh teks
        </button>
        <button type="button" onClick={() => window.print()} className={kecil}>
          Cetak
        </button>
      </div>

      {(kabar || sibuk) && (
        <p className="text-sm text-hijau">{sibuk ?? kabar}</p>
      )}

      {keDraf !== null && (
        <p className="text-sm">
          <a href={`/draf/${keDraf}`} className="font-medium text-hijau hover:underline">
            Buka drafnya di Draf Bersama →
          </a>
        </p>
      )}

      {tampilan === "sunting" && !bisaSimpan && (
        <p className="rounded-lg border-l-2 border-oker bg-permukaan-2 px-3 py-2 text-xs text-tinta-2">
          Suntingan di halaman ini tidak tersimpan ke riwayat — tapi tetap ikut
          saat disalin, diunduh, dicetak, atau dikirim ke draf.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        {/* Ketiganya tetap ada di halaman; yang tidak dipakai
            disembunyikan. Pratinjau harus tetap hidup supaya
            penyalinan berbentuk punya bahan untuk disalin. */}
        <div ref={pratinjau} className="dokumen" hidden={tampilan !== "rapi"}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{naskah}</ReactMarkdown>
        </div>

        {/* Tetap terpasang walau sedang tidak dipakai. Kalau
            dicopot saat berpindah ke tampilan rapi, suntingan yang
            belum disimpan ikut hilang — dan hilangnya diam-diam. */}
        <div hidden={tampilan !== "sunting"}>
          <SuntingDokumen isi={benih} onUbah={setNaskah} />
        </div>

        <pre className="text-xs whitespace-pre-wrap" hidden={tampilan !== "mentah"}>
          {naskah}
        </pre>
      </div>

      {tampilan === "sunting" && !adaTabel(naskah) && (
        <p className="text-xs text-tinta-3">
          Dokumen ini tidak berisi tabel, jadi seluruhnya disunting sebagai teks
          biasa.
        </p>
      )}

      {bisaSimpan && (
        <div className="flex flex-col gap-2 rounded-lg border border-garis bg-permukaan-2 px-4 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Ada yang perlu diperbaiki?
            </span>
            <textarea
              value={permintaan}
              onChange={(e) => setPermintaan(e.target.value)}
              rows={2}
              placeholder="Misalnya: tambahkan konten donor darah di pekan kedua, dan ganti PIC baris 10 Oktober jadi Humas."
              className="w-full rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
            />
          </label>

          {waspada && (
            <p className="rounded border-l-4 border-oker bg-[#f6efe2] px-3 py-2 text-sm">
              {waspada}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={perbaiki}
              disabled={!!sibuk || permintaan.trim() === ""}
              className={utama}
            >
              Perbaiki dokumen ini
            </button>

            {sebelumPerbaikan !== null && (
              <button type="button" onClick={batalkanPerbaikan} className={kecil}>
                Batalkan perbaikan
              </button>
            )}

            <span className="text-xs text-tinta-3">
              Dokumen yang sama diperbaiki di tempat — tidak membuat dokumen
              baru, jadi daftar riwayat dan draf tidak menumpuk.
            </span>
          </div>
        </div>
      )}

      {bisaSimpan && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-garis bg-permukaan-2 px-4 py-3">
          <label className="flex min-w-64 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Tautan Google Docs
            </span>
            <input
              value={docs}
              onChange={(e) => setDocs(e.target.value)}
              placeholder="https://docs.google.com/document/d/…"
              className="rounded border border-garis bg-permukaan px-3 py-1.5 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
            />
          </label>
          <button type="button" onClick={simpanDocs} className={kecil} disabled={!!sibuk}>
            Simpan tautan
          </button>
          {tautanDocsAwal && (
            <a
              href={tautanDocsAwal}
              target="_blank"
              rel="noopener noreferrer"
              className={kecil}
            >
              Buka Docs-nya
            </a>
          )}
          <p className="w-full text-xs text-tinta-3">
            Salin untuk Google Docs → Buka Docs baru → tempel. Lalu tempel
            alamatnya ke sini supaya tautannya tidak hilang di percakapan.
          </p>
        </div>
      )}

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
