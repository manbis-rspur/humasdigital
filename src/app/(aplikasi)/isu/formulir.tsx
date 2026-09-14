"use client";

import { useActionState, useState } from "react";
import Ikon from "@/components/ikon";
import { simpanHariKesehatan, simpanIsu } from "@/lib/isu-actions";
import { LINGKUP, NAMA_BULAN, type HariKesehatan, type IsuRamai } from "@/lib/isu";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/** Formulir yang baru muncul setelah tombolnya ditekan. */
function Lipat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [buka, setBuka] = useState(false);

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-garis bg-permukaan px-4 py-2 text-sm font-medium hover:bg-permukaan-2"
      >
        <Ikon nama="tambah" ukuran={15} />
        {label}
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{label}</h3>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-sm text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>
      {children}
    </section>
  );
}

export function FormHariKesehatan({ awal }: { awal?: HariKesehatan }) {
  const [hasil, kirim, sedang] = useActionState(simpanHariKesehatan, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-3">
      {awal && <input type="hidden" name="id" value={awal.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Nama hari</span>
          <input
            name="nama"
            required
            defaultValue={awal?.nama ?? ""}
            placeholder="Hari Jantung Sedunia"
            className={gaya}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tanggal</span>
          <div className="flex gap-2">
            <input
              name="tanggal"
              type="number"
              min={1}
              max={31}
              required
              defaultValue={awal?.tanggal ?? ""}
              className={`${gaya} w-20`}
            />
            <select
              name="bulan"
              defaultValue={awal?.bulan ?? 1}
              className={`${gaya} flex-1`}
            >
              {NAMA_BULAN.slice(1).map((b, i) => (
                <option key={b} value={i + 1}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-tinta-3">
            Berulang tiap tahun, jadi tahunnya tidak perlu diisi.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Lingkup</span>
          <select
            name="lingkup"
            defaultValue={awal?.lingkup ?? "Internasional"}
            className={gaya}
          >
            {LINGKUP.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Layanan yang nyambung</span>
          <input
            name="kaitan"
            defaultValue={awal?.kaitan ?? ""}
            placeholder="Spesialis Jantung"
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Inilah yang menyambungkan hari besar ke nama dokter yang benar.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Sudut yang diusulkan</span>
          <input
            name="sudut"
            defaultValue={awal?.sudut ?? ""}
            placeholder="Kenali gejala serangan jantung dan pentingnya waktu"
            className={gaya}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={awal ? awal.aktif : true}
          className="accent-hijau"
        />
        Dipakai sebagai usulan
      </label>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}

export function FormIsu({ awal }: { awal?: IsuRamai }) {
  const [hasil, kirim, sedang] = useActionState(simpanIsu, hasilAwal);
  const hariIni = new Date().toISOString().slice(0, 10);

  return (
    <form action={kirim} className="flex flex-col gap-3">
      {awal && <input type="hidden" name="id" value={awal.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Isunya apa</span>
        <input
          name="judul"
          required
          defaultValue={awal?.judul ?? ""}
          placeholder="Kabut asap kebakaran hutan"
          className={gaya}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Keterangan singkat</span>
        <textarea
          name="ringkasan"
          rows={2}
          defaultValue={awal?.ringkasan ?? ""}
          placeholder="Kualitas udara menurun sejak sepekan terakhir, keluhan sesak napas meningkat."
          className={gaya}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Sudut yang diusulkan</span>
        <textarea
          name="sudut"
          rows={2}
          defaultValue={awal?.sudut ?? ""}
          placeholder="Langkah melindungi diri di rumah, dan kapan keluhan sesak harus dibawa ke rumah sakit."
          className={gaya}
        />
        <span className="text-xs text-tinta-3">
          Tulis sebagai edukasi dan pertolongan. Rumah sakit tidak menyatakan ada
          wabah, tidak menyebut jumlah kasus, dan tidak menakut-nakuti.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Layanan yang nyambung</span>
          <input
            name="kaitan"
            defaultValue={awal?.kaitan ?? ""}
            placeholder="Spesialis Paru, Spesialis Anak"
            className={gaya}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tautan sumber</span>
          <input
            name="sumber"
            type="url"
            defaultValue={awal?.sumber ?? ""}
            placeholder="https://…"
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Boleh dikosongkan. Berguna saat isunya dipertanyakan belakangan.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Mulai berlaku</span>
          <input
            name="mulai"
            type="date"
            defaultValue={awal?.mulai ?? hariIni}
            className={gaya}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Sampai</span>
          <input
            name="sampai"
            type="date"
            defaultValue={awal?.sampai ?? ""}
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Kosongkan bila belum tahu. Isu yang lewat masa berlakunya berhenti
            diusulkan dengan sendirinya.
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={awal ? awal.aktif : true}
          className="accent-hijau"
        />
        Dipakai sebagai usulan
      </label>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}

export function IsuBaru() {
  return (
    <Lipat label="Tambah isu yang sedang ramai">
      <FormIsu />
    </Lipat>
  );
}

export function HariBaru() {
  return (
    <Lipat label="Tambah hari kesehatan">
      <FormHariKesehatan />
    </Lipat>
  );
}
