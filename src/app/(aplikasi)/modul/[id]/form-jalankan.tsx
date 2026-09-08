"use client";

import { useActionState } from "react";
import { jalankanModul, type HasilSusun } from "@/lib/humas-actions";
import { TampilHasil } from "@/components/tampil-hasil";
import { kunciLain, type Kolom } from "@/lib/modul-ai";

const awal: HasilSusun = { pesan: null, hasil: null, judul: "", riwayatId: null };

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

function IsianKolom({ k }: { k: Kolom }) {
  const bawaan = k.bawaan;

  if (k.jenis === "checkbox") {
    return (
      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name={k.kunci}
          defaultChecked={bawaan === true || bawaan === "true"}
          className="accent-hijau"
        />
        <span className="text-sm">{k.label}</span>
      </label>
    );
  }

  if (k.jenis === "multiselect") {
    const terpilih = Array.isArray(bawaan) ? bawaan : [];
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-tinta-3">
          {k.label}
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(k.pilihan ?? []).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={k.kunci}
                value={p}
                defaultChecked={terpilih.includes(p)}
                className="accent-hijau"
              />
              {p}
            </label>
          ))}
        </div>

        {k.boleh_lain && (
          <label className="mt-1 flex flex-col gap-1">
            <span className="text-xs text-tinta-3">
              Lainnya — tulis sendiri, pisahkan dengan koma bila lebih dari satu
            </span>
            <input
              name={kunciLain(k.kunci)}
              placeholder="Kesehatan jiwa, Program CSR sekolah"
              className={`${gaya} w-full text-sm`}
            />
          </label>
        )}
      </fieldset>
    );
  }

  const label = (
    <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
      {k.label} {k.wajib && <span className="text-merah">*</span>}
    </span>
  );

  return (
    <label className="flex flex-col gap-1.5">
      {label}
      {k.jenis === "textarea" ? (
        <textarea
          name={k.kunci}
          rows={5}
          required={k.wajib}
          placeholder={k.contoh}
          defaultValue={typeof bawaan === "string" ? bawaan : undefined}
          className={`${gaya} w-full`}
        />
      ) : k.jenis === "select" ? (
        <select
          name={k.kunci}
          defaultValue={typeof bawaan === "string" ? bawaan : undefined}
          className={gaya}
        >
          {(k.pilihan ?? []).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      ) : (
        <input
          name={k.kunci}
          type={k.jenis === "number" ? "number" : "text"}
          required={k.wajib}
          placeholder={k.contoh}
          defaultValue={typeof bawaan === "string" ? bawaan : undefined}
          className={gaya}
        />
      )}
      {k.petunjuk && <span className="text-xs text-tinta-3">{k.petunjuk}</span>}
    </label>
  );
}

export function FormJalankan({
  modulId,
  kolom,
  namaBerkas,
}: {
  modulId: number;
  kolom: Kolom[];
  namaBerkas: string;
}) {
  const [hasil, kirim, sedang] = useActionState(jalankanModul, awal);

  return (
    <div className="flex flex-col gap-8">
      <form action={kirim} className="flex flex-col gap-5">
        <input type="hidden" name="modul_id" value={modulId} />

        {kolom.map((k) => (
          <IsianKolom key={k.kunci} k={k} />
        ))}

        {hasil.pesan && (
          <p className="rounded border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
            {hasil.pesan}
          </p>
        )}

        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Sedang menyusun…" : "Susun dokumen"}
        </button>

        {sedang && (
          <p className="text-sm text-tinta-3">
            Biasanya butuh sepuluh sampai tiga puluh detik. Jangan tutup halaman ini.
          </p>
        )}
      </form>

      {hasil.hasil && (
        <TampilHasil
          judul={hasil.judul}
          hasil={hasil.hasil}
          namaBerkas={namaBerkas}
          riwayatId={hasil.riwayatId}
        />
      )}
    </div>
  );
}
