"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { simpanKopSurat, siapkanKopSurat } from "@/lib/kop-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import { ACCEPT_KOP, MAKS_KOP, jenisKopDiterima } from "@/lib/kop-surat";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormKop() {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    if (!(berkas instanceof File) || berkas.size === 0) {
      setPesan("Pilih dulu gambar kopnya.");
      return;
    }
    if (!jenisKopDiterima(berkas.name)) {
      setPesan("Kop surat harus berupa gambar PNG atau JPG.");
      return;
    }
    if (berkas.size > MAKS_KOP) {
      setPesan("Gambarnya terlalu besar — batasnya 4 MB.");
      return;
    }

    setTahap("Mengunggah…");
    const naik = await unggahLewatIzin(berkas, siapkanKopSurat);
    setTahap(null);

    if (naik.jalur === null) {
      setPesan(naik.pesan);
      return;
    }

    formData.delete("berkas");
    formData.set("jalur", naik.jalur);
    formData.set("berkas_nama", berkas.name);

    const hasil = await simpanKopSurat({ ok: false, pesan: "" }, formData);
    if (hasil.ok) setBerhasil(hasil.pesan);
    else setPesan(hasil.pesan);
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="tambah" ukuran={14} />
        Kop baru
      </h2>

      <input
        name="nama"
        required
        placeholder="Nama kopnya — misalnya RSPUR, atau Klinik Sehat Bersama"
        className={gaya}
      />

      <input
        type="file"
        name="berkas"
        required
        accept={ACCEPT_KOP}
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="bawaan" className="mt-1 accent-hijau" />
        <span>
          <span className="font-medium">Jadikan kop bawaan</span>
          <span className="block text-tinta-3">
            Dipakai bila tidak memilih — termasuk oleh bot Telegram, yang tidak
            punya layar untuk menanyakannya.
          </span>
        </span>
      </label>

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? (tahap ?? "Menyimpan…") : "Simpan kop"}
      </button>

      <p className="text-xs text-tinta-3">
        Gambar melebar (landscape) paling pas, karena berkas PDF-nya juga
        melebar. Kop dipasang di halaman pertama saja; halaman berikutnya cukup
        nama instansinya di kaki halaman.
      </p>
    </form>
  );
}
