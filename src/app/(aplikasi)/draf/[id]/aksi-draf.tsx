"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import {
  hapusDraf,
  kirimDraf,
  siapkanBerkasDraf,
  tambahRevisiDraf,
  ubahStatusDraf,
} from "@/lib/draf-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import {
  ACCEPT_DRAF,
  MAKS_DRAF,
  jenisBerkasDrafDiterima,
  ukuranRapi,
} from "@/lib/draf";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/** Memindahkan draf ke tahap berikutnya. */
export function TombolStatus({ id, status }: { id: number; status: string }) {
  const berikutnya =
    status === "Digarap"
      ? "Minta ditinjau"
      : status === "Minta ditinjau"
        ? "Siap kirim"
        : null;

  if (!berikutnya) return null;

  return (
    <form action={ubahStatusDraf}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={berikutnya} />
      <button
        type="submit"
        className="rounded-lg border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
      >
        Tandai &ldquo;{berikutnya}&rdquo;
      </button>
    </form>
  );
}

/** Mengembalikan draf ke tahap sebelumnya. */
export function TombolKembali({ id, status }: { id: number; status: string }) {
  if (status === "Digarap" || status === "Terkirim") return null;

  const sebelumnya = status === "Siap kirim" ? "Minta ditinjau" : "Digarap";

  return (
    <form action={ubahStatusDraf}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={sebelumnya} />
      <button type="submit" className="text-xs text-tinta-3 hover:text-tinta">
        kembalikan ke &ldquo;{sebelumnya}&rdquo;
      </button>
    </form>
  );
}

/** Mengunggah revisi. Versi lama tidak ditimpa. */
export function FormRevisiDraf({ id }: { id: number }) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    if (!(berkas instanceof File) || berkas.size === 0) {
      setPesan("Pilih dulu berkas revisinya.");
      return;
    }
    if (!jenisBerkasDrafDiterima(berkas.name)) {
      setPesan("Jenis berkas itu belum didukung.");
      return;
    }
    if (berkas.size > MAKS_DRAF) {
      setPesan(`Berkasnya ${ukuranRapi(berkas.size)} — melebihi batas ${ukuranRapi(MAKS_DRAF)}.`);
      return;
    }

    setTahap(`Mengunggah ${ukuranRapi(berkas.size)}…`);
    const naik = await unggahLewatIzin(berkas, siapkanBerkasDraf);
    setTahap(null);

    if (naik.jalur === null) {
      setPesan(naik.pesan);
      return;
    }

    formData.delete("berkas");
    formData.set("jalur", naik.jalur);
    formData.set("berkas_nama", berkas.name);
    formData.set("berkas_ukuran", String(berkas.size));

    setTahap("Mencatat revisi…");
    const hasil = await tambahRevisiDraf({ pesan: null, berhasil: null }, formData);
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

      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="unduh" ukuran={14} />
        Unggah revisi
      </h2>

      <input
        type="file"
        name="berkas"
        required
        accept={ACCEPT_DRAF}
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />
      <input
        name="catatan"
        placeholder="Catatan perubahan — misalnya: warna spanduk diganti sesuai masukan"
        className={gaya}
      />

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Menyimpan…") : "Unggah revisi"}
        </button>
        <span className="text-xs text-tinta-3">
          Versi lama tidak tertimpa — semuanya tetap bisa dibuka dari riwayat.
        </span>
      </div>
    </form>
  );
}

/** Mengirim draf ke Arsip Publikasi di Dashboard Manajemen Bisnis. */
export function TombolKirimArsip({ id, siap }: { id: number; siap: boolean }) {
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [sedang, mulai] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <form
        action={(formData) =>
          mulai(async () => {
            setHasil(await kirimDraf(formData));
          })
        }
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={sedang || !siap}
          className="flex items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Ikon nama="surat" ukuran={16} />
          {sedang ? "Mengirim…" : "Kirim ke Arsip Manbis"}
        </button>
      </form>

      {!siap && (
        <p className="text-xs text-tinta-3">
          Tandai &ldquo;Siap kirim&rdquo; lebih dulu. Tahapan itu yang membedakan
          draf yang sudah disepakati berdua dari yang masih digarap sendiri.
        </p>
      )}

      {hasil && (
        <p className={`text-sm ${hasil.ok ? "text-hijau" : "text-merah"}`}>
          {hasil.pesan}
        </p>
      )}
    </div>
  );
}

/** Menghapus draf yang salah tulis, beserta seluruh berkasnya. */
export function TombolHapusDraf({ id }: { id: number }) {
  return (
    <form action={hapusDraf}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg border border-merah px-3 py-1.5 text-xs font-medium text-merah hover:bg-[#f6e7e6]"
      >
        <Ikon nama="hapus" ukuran={14} />
        Hapus draf
      </button>
    </form>
  );
}
