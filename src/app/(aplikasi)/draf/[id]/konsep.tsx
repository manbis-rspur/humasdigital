"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { buatKonsepKonten } from "@/lib/draf-actions";
import { bacaBarisKalender, type BarisKalender } from "@/lib/kalender-baris";
import { judulKonsep, punyaKonsep } from "@/lib/konsep-teks";

/**
 * Membuat brief produksi dari satu baris kalender.
 *
 * Per baris, saat mau diproduksi — bukan seluruhnya sekaligus.
 * Kalender sebulan berisi puluhan baris, dan sebagian besar akan
 * berubah sebelum sempat digarap: jadwal bergeser, ada acara
 * dadakan, dokternya berhalangan. Konsep yang dibuat jauh hari
 * untuk semuanya jadi puluhan halaman yang tidak dibaca siapa pun.
 *
 * Formatnya tidak ditanyakan ulang — kolom Format pada barisnya
 * sudah menyebutkannya.
 */
export function KonsepKonten({
  drafId,
  naskah,
  onSelesai,
}: {
  drafId: number;
  naskah: string;
  onSelesai: (isiBaru: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [sedang, setSedang] = useState<number | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
  const [durasi, setDurasi] = useState(60);
  const [maks, setMaks] = useState(4);
  /** Baris mana yang kotak perbaikannya sedang dibuka, beserta isinya. */
  const [ulang, setUlang] = useState<number | null>(null);
  const [permintaan, setPermintaan] = useState("");
  const [, mulai] = useTransition();

  const baris = bacaBarisKalender(naskah);
  if (baris.length === 0) return null;

  const sudahAda = (b: BarisKalender) =>
    punyaKonsep(naskah, judulKonsep(b.tanggal, b.format));

  function buat(b: BarisKalender, perbaikan = "") {
    setSedang(b.nomor);
    setKabar(null);
    mulai(async () => {
      const h = await buatKonsepKonten(drafId, b, durasi, maks, perbaikan);
      setSedang(null);
      setKabar(h.pesan);
      if (h.ok && h.isi) {
        onSelesai(h.isi);
        setUlang(null);
        setPermintaan("");
      }
      setTimeout(() => setKabar(null), 5000);
    });
  }

  const warnaTahap = (tahap: string) => {
    const t = tahap.toUpperCase();
    if (t.includes("BOFU")) return "bg-hijau-muda text-hijau";
    if (t.includes("MOFU")) return "bg-[#dce4ec] text-[#2f4e6b]";
    if (t.includes("TOFU")) return "bg-[#f6efe2] text-oker";
    return "bg-permukaan-2 text-tinta-2";
  };

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-garis bg-permukaan px-4 py-2 text-sm font-medium hover:bg-permukaan-2"
      >
        <Ikon nama="template" ukuran={15} />
        Buat konsep konten
        <span className="text-xs font-normal text-tinta-3">
          {baris.length} baris kalender
        </span>
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Buat konsep konten</h2>
          <p className="mt-1 max-w-2xl text-sm text-tinta-2">
            Pilih baris yang mau diproduksi. Hook, isi, ajakan, ide visual, dan
            teksnya disusun mengikuti format dan tahap corong baris itu, lalu
            ditempelkan di bawah kalender ini.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-sm text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg bg-permukaan-2 px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          Durasi video
          <input
            type="number"
            min={15}
            max={180}
            value={durasi}
            onChange={(e) => setDurasi(Number(e.target.value) || 60)}
            className="w-20 rounded border border-garis bg-permukaan px-2 py-1 text-sm outline-none focus:border-hijau"
          />
          detik
        </label>
        <label className="flex items-center gap-2 text-sm">
          Maksimal carousel
          <input
            type="number"
            min={2}
            max={10}
            value={maks}
            onChange={(e) => setMaks(Number(e.target.value) || 4)}
            className="w-20 rounded border border-garis bg-permukaan px-2 py-1 text-sm outline-none focus:border-hijau"
          />
          halaman
        </label>
      </div>

      {kabar && <p className="text-sm text-hijau">{kabar}</p>}

      <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
        {baris.map((b) => (
          <li
            key={b.nomor}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-garis px-3 py-2"
          >
            <span className="mr-auto min-w-0">
              <span className="text-sm font-medium">{b.topik}</span>
              <span className="block text-xs text-tinta-3">
                {[b.tanggal, b.format, b.dokter].filter(Boolean).join(" · ")}
                {sudahAda(b) && (
                  <span className="ml-1.5 text-hijau">· konsep sudah ada</span>
                )}
              </span>
            </span>

            {b.tahap && (
              <span
                className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${warnaTahap(b.tahap)}`}
              >
                {b.tahap}
              </span>
            )}

            {sudahAda(b) ? (
              <button
                type="button"
                disabled={sedang !== null}
                onClick={() => {
                  setUlang(ulang === b.nomor ? null : b.nomor);
                  setPermintaan("");
                }}
                className="rounded-lg border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-50"
              >
                {sedang === b.nomor ? "Menyusun…" : "Susun ulang"}
              </button>
            ) : (
              <button
                type="button"
                disabled={sedang !== null}
                onClick={() => buat(b)}
                className="rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {sedang === b.nomor ? "Menyusun…" : "Buat konsep"}
              </button>
            )}

            {ulang === b.nomor && (
              <div className="flex w-full flex-col gap-2 border-t border-garis pt-2">
                <textarea
                  value={permintaan}
                  onChange={(e) => setPermintaan(e.target.value)}
                  rows={2}
                  placeholder="Apa yang kurang? Misalnya: hooknya terlalu datar, tambahkan halaman tentang gejala pada lansia."
                  className="w-full rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={sedang !== null}
                    onClick={() => buat(b, permintaan)}
                    className="rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Susun ulang konsepnya
                  </button>
                  <span className="text-xs text-tinta-3">
                    Yang lama diganti, bukan ditambah. Boleh dikosongkan kalau
                    cuma ingin hasil yang berbeda.
                  </span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-tinta-3">
        Ajakannya mengikuti tahap corong: TOFU mengajak menyimpan atau
        membagikan, MOFU mengajak melihat jadwal, BOFU baru mengajak datang.
      </p>
    </section>
  );
}
