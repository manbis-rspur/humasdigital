"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { siapkanBerkasDraf, tambahDraf } from "@/lib/draf-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import {
  ACCEPT_DRAF,
  JENIS_DRAF,
  MAKS_DRAF,
  jenisBerkasDrafDiterima,
  ukuranRapi,
} from "@/lib/draf";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Menaruh draf baru.
 *
 * Tertutup sampai tombolnya ditekan, supaya daftar draf — yang
 * justru dicari saat membuka halaman — tidak terdorong ke bawah
 * lipatan layar.
 */
export function FormDraf() {
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    const adaBerkas = berkas instanceof File && berkas.size > 0;
    const tautan = String(formData.get("tautan") ?? "").trim();
    formData.delete("berkas");

    if (!adaBerkas && !tautan) {
      setPesan("Pilih berkasnya, atau tempel tautan Drive-nya.");
      return;
    }

    if (adaBerkas) {
      if (!jenisBerkasDrafDiterima(berkas.name)) {
        setPesan("Jenis berkas itu belum didukung. Video cukup ditempel tautannya.");
        return;
      }
      if (berkas.size > MAKS_DRAF) {
        setPesan(
          `Berkasnya ${ukuranRapi(berkas.size)} — melebihi batas ${ukuranRapi(MAKS_DRAF)}. Taruh di Drive lalu tempel tautannya.`,
        );
        return;
      }

      setTahap(`Mengunggah ${ukuranRapi(berkas.size)}…`);
      const naik = await unggahLewatIzin(berkas, siapkanBerkasDraf);
      setTahap(null);

      if (naik.jalur === null) {
        setPesan(naik.pesan);
        return;
      }

      formData.set("jalur", naik.jalur);
      formData.set("berkas_nama", berkas.name);
      formData.set("berkas_ukuran", String(berkas.size));
    }

    setTahap("Menyimpan…");
    const hasil = await tambahDraf({ pesan: null, berhasil: null }, formData);
    setTahap(null);

    setPesan(hasil.pesan);
    setBerhasil(hasil.berhasil);
    if (hasil.berhasil) setBuka(false);
  }

  if (!buka) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="flex w-fit items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white shadow-lembut hover:opacity-90"
        >
          <Ikon nama="tambah" ukuran={16} />
          Taruh draf baru
        </button>
        {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}
      </div>
    );
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="tambah" ukuran={14} />
          Draf baru
        </h2>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-xs text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_13rem]">
        <input name="judul" required placeholder="Judul draf" className={gaya} />
        <select name="jenis" defaultValue="Lainnya" className={gaya}>
          {JENIS_DRAF.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
      </div>

      <textarea
        name="keterangan"
        rows={2}
        placeholder="Keterangan — untuk apa, sudah sampai mana, apa yang perlu ditinjau"
        className={`${gaya} w-full`}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="file"
          name="berkas"
          accept={ACCEPT_DRAF}
          className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
        />
        <input
          name="tautan"
          type="url"
          placeholder="Tautan Drive untuk berkas berat — https://…"
          className={gaya}
        />
      </div>

      {pesan && <p className="text-sm text-merah">{pesan}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Menyimpan…") : "Taruh draf"}
        </button>
        <span className="text-xs text-tinta-3">
          Sampai {ukuranRapi(MAKS_DRAF)}. Video taruh di Drive lalu tempel
          tautannya.
        </span>
      </div>
    </form>
  );
}
