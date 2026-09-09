"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { bacaDataSosmed, siapkanUnggahData } from "@/lib/sosmed-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.docx,.pdf,.png,.jpg,.jpeg,.webp";

/**
 * Membaca rekapan Meta dan TikTok Studio, lalu mengisi laporan dari
 * isinya.
 *
 * Berkasnya naik dari peramban langsung ke penyimpanan — server
 * action hanya menerima kiriman 1 MB, dan rekapan Excel gampang
 * melewatinya. Sesudah dibaca, berkas mentahnya dibuang: yang
 * berharga hasil bacaannya.
 *
 * Hasil bacaan sengaja masuk sebagai konten biasa yang masih bisa
 * diperiksa dan diperbaiki. Mesin yang salah membaca satu kolom
 * tidak boleh diam-diam jadi angka resmi rumah sakit.
 */
export function Pembaca({ id }: { id: number }) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData
      .getAll("berkas")
      .filter((b): b is File => b instanceof File && b.size > 0);

    if (berkas.length === 0) {
      setPesan("Pilih dulu berkas rekapannya.");
      return;
    }

    const jalur: string[] = [];
    for (const [nomor, b] of berkas.entries()) {
      setTahap(`Mengunggah berkas ${nomor + 1} dari ${berkas.length}…`);
      const naik = await unggahLewatIzin(b, siapkanUnggahData);
      if (naik.jalur === null) {
        setTahap(null);
        setPesan(naik.pesan);
        return;
      }
      jalur.push(naik.jalur);
    }

    formData.delete("berkas");
    formData.set("jalur", jalur.join("\n"));

    setTahap("Membaca isinya… ini bisa sebentar.");
    const hasil = await bacaDataSosmed({ pesan: null, berhasil: null }, formData);
    setTahap(null);

    setPesan(hasil.pesan);
    setBerhasil(hasil.berhasil);
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <input type="hidden" name="id" value={id} />

      <div>
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="unduh" ukuran={14} />
          Isi otomatis dari rekapan
        </h2>
        <p className="mt-1.5 text-sm text-tinta-2">
          Unggah unduhan dari Meta Business Suite, Instagram Insight, atau
          TikTok Studio — CSV, Excel, Word, PDF, atau tangkapan layar. Isinya
          dibaca lalu dijadikan baris konten di bawah. Beberapa berkas
          sekaligus boleh.
        </p>
      </div>

      <input
        type="file"
        name="berkas"
        multiple
        required
        accept={ACCEPT}
        className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
      />

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {berhasil && (
        <p className="rounded-lg border-l-2 border-hijau bg-hijau-muda/50 px-3 py-2 text-sm text-tinta-2">
          {berhasil}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Membaca…") : "Baca berkas"}
        </button>
        <span className="text-xs text-tinta-3">
          Hasil bacaan masih bisa diperbaiki dan dihapus sebelum naskahnya
          disusun.
        </span>
      </div>
    </form>
  );
}
