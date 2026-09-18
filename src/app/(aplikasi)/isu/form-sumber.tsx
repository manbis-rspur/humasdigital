"use client";

import { useActionState, useState } from "react";
import Ikon from "@/components/ikon";
import { simpanSumber } from "@/lib/isu-actions";
import { LEMBAGA_LAZIM, LINGKUP } from "@/lib/sumber";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Menambah sumber rujukan.
 *
 * Isinya ditempel manusia dari halaman yang memang sudah dibuka.
 * Satu sumber yang benar-benar pernah dibaca lebih berharga
 * daripada dua puluh yang ditebak mesin.
 */
export function SumberBaru() {
  const [buka, setBuka] = useState(false);
  const [hasil, kirim, sedang] = useActionState(simpanSumber, hasilAwal);

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex w-fit items-center gap-2 rounded-lg border border-garis bg-permukaan px-4 py-2 text-sm font-medium hover:bg-permukaan-2"
      >
        <Ikon nama="tambah" ukuran={15} />
        Tambah sumber rujukan
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Sumber rujukan baru</h3>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-sm text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>

      <form action={kirim} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Lembaga</span>
            <input
              name="lembaga"
              required
              list="lembaga-lazim"
              placeholder="Kementerian Kesehatan RI"
              className={gaya}
            />
            <datalist id="lembaga-lazim">
              {LEMBAGA_LAZIM.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Judul halaman</span>
            <input
              name="judul"
              placeholder="Pedoman Pengendalian Hipertensi"
              className={gaya}
            />
            <span className="text-xs text-tinta-3">
              Boleh dikosongkan bila yang didaftarkan halaman utama lembaganya.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tautan</span>
          <input
            name="tautan"
            type="url"
            required
            placeholder="https://…"
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Tempel dari halaman yang memang sudah Anda buka. Inilah yang akan
            disalin AI apa adanya ke dalam konsep.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Lingkup</span>
          <select name="lingkup" defaultValue="nasional" className={gaya}>
            {LINGKUP.map((l) => (
              <option key={l.nilai} value={l.nilai}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-tinta-3">
            Pedoman Indonesia atau rujukan luar negeri. Dipakai AI untuk
            menopang tiap klaim dengan keduanya sekaligus.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Topik</span>
          <input
            name="topik"
            placeholder="hipertensi, jantung, tekanan darah"
            className={gaya}
          />
          <span className="text-xs text-tinta-3">
            Dipisah koma. Membantu memilih sumber mana yang cocok untuk sebuah
            konsep.
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="aktif" defaultChecked className="accent-hijau" />
          Dipakai sebagai rujukan
        </label>

        {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
        {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Simpan sumber"}
        </button>
      </form>
    </section>
  );
}
