"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { simpanModul, hapusModul } from "@/lib/humas-actions";
import type { Kolom, JenisKolom } from "@/lib/modul-ai";

const awal = { pesan: null as string | null, berhasil: null as string | null };

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

const JENIS: { nilai: JenisKolom; label: string }[] = [
  { nilai: "text", label: "Isian singkat" },
  { nilai: "textarea", label: "Isian panjang" },
  { nilai: "select", label: "Pilih satu" },
  { nilai: "multiselect", label: "Pilih beberapa" },
  { nilai: "number", label: "Angka" },
  { nilai: "checkbox", label: "Ya / tidak" },
];

/** Mengubah label jadi kunci yang aman dipakai pada pola perintah. */
function jadikanKunci(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) || "isian"
  );
}

export function PerakitModul({
  modul,
}: {
  modul: (Partial<Kolom> & {
    id?: number;
    judul?: string;
    deskripsi?: string;
    kategori?: string;
    instruksi_sistem?: string;
    pola_perintah?: string;
    kolom?: Kolom[];
    bawaan?: boolean;
  }) | null;
}) {
  const [hasil, kirim, sedang] = useActionState(simpanModul, awal);
  const [kolom, setKolom] = useState<Kolom[]>(modul?.kolom ?? []);

  function ubah(i: number, bagian: Partial<Kolom>) {
    setKolom((lama) => lama.map((k, n) => (n === i ? { ...k, ...bagian } : k)));
  }

  function tambah() {
    setKolom((lama) => [
      ...lama,
      { kunci: `isian_${lama.length + 1}`, label: "", jenis: "text" },
    ]);
  }

  return (
    <form action={kirim} className="flex flex-col gap-8">
      {modul?.id && <input type="hidden" name="id" value={modul.id} />}
      <input type="hidden" name="kolom" value={JSON.stringify(kolom)} />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Keterangan modul
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Nama modul <span className="text-merah">*</span>
            </span>
            <input name="judul" required defaultValue={modul?.judul} className={gaya} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Kategori
            </span>
            <input
              name="kategori"
              defaultValue={modul?.kategori ?? "Umum"}
              placeholder="Konten & Media Sosial"
              className={gaya}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Keterangan singkat
          </span>
          <input
            name="deskripsi"
            defaultValue={modul?.deskripsi}
            placeholder="Muncul di kartu modul pada daftar"
            className={gaya}
          />
        </label>
      </section>

      <section className="flex flex-col gap-4 border-t border-garis pt-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Isian yang diminta
          </h2>
          <p className="mt-1 text-sm text-tinta-2">
            Tiap isian punya kunci yang dipakai di pola perintah di bawah,
            ditulis di antara kurung kurawal ganda.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {kolom.map((k, i) => (
            <div key={i} className="rounded-xl shadow-lembut border border-garis bg-permukaan p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_11rem_auto]">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-tinta-3">Label</span>
                  <input
                    value={k.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      ubah(i, { label, kunci: jadikanKunci(label) });
                    }}
                    placeholder="Tema kegiatan"
                    className={`${gaya} text-sm`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-tinta-3">Jenis</span>
                  <select
                    value={k.jenis}
                    onChange={(e) => ubah(i, { jenis: e.target.value as JenisKolom })}
                    className={`${gaya} text-sm`}
                  >
                    {JENIS.map((j) => (
                      <option key={j.nilai} value={j.nilai}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end gap-3 pb-1">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={k.wajib ?? false}
                      onChange={(e) => ubah(i, { wajib: e.target.checked })}
                      className="accent-hijau"
                    />
                    wajib
                  </label>
                  <button
                    type="button"
                    onClick={() => setKolom((l) => l.filter((_, n) => n !== i))}
                    className="text-xs text-tinta-3 hover:text-merah"
                  >
                    hapus
                  </button>
                </div>
              </div>

              {k.jenis === "multiselect" && (
                <label className="mt-3 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={k.boleh_lain ?? false}
                    onChange={(e) => ubah(i, { boleh_lain: e.target.checked })}
                    className="accent-hijau"
                  />
                  sediakan kotak isian sendiri di bawah daftar pilihan
                </label>
              )}

              {(k.jenis === "select" || k.jenis === "multiselect") && (
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-xs text-tinta-3">
                    Pilihan — pisahkan dengan titik koma
                  </span>
                  <input
                    value={(k.pilihan ?? []).join("; ")}
                    onChange={(e) =>
                      ubah(i, {
                        pilihan: e.target.value
                          .split(";")
                          .map((p) => p.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Instagram; TikTok; Facebook"
                    className={`${gaya} w-full text-sm`}
                  />
                </label>
              )}

              <p className="mt-2 text-xs text-tinta-3">
                Dipakai di pola perintah sebagai{" "}
                <span className="font-mono">{`{{${k.kunci}}}`}</span>
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={tambah}
          className="w-fit rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
        >
          Tambah isian
        </button>
      </section>

      <section className="flex flex-col gap-4 border-t border-garis pt-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Perintah untuk AI
          </h2>
          <p className="mt-1 text-sm text-tinta-2">
            Instruksi sistem menjelaskan siapa AI-nya dan bentuk dokumen yang
            harus dihasilkan. Pola perintah berisi isian formulir yang dikirim
            tiap kali modul dijalankan.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Instruksi sistem <span className="text-merah">*</span>
          </span>
          <textarea
            name="instruksi_sistem"
            rows={10}
            required
            defaultValue={modul?.instruksi_sistem}
            placeholder="Anda adalah ... Susun dokumen dengan struktur berikut ..."
            className={`${gaya} w-full font-mono text-xs`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Pola perintah <span className="text-merah">*</span>
          </span>
          <textarea
            name="pola_perintah"
            rows={8}
            required
            defaultValue={modul?.pola_perintah}
            placeholder={"Topik : {{topik}}\nKanal : {{kanal}}"}
            className={`${gaya} w-full font-mono text-xs`}
          />
        </label>
      </section>

      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-garis pt-6">
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Simpan modul"}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-garis px-5 py-2.5 font-medium text-tinta-2 hover:bg-permukaan-2"
        >
          Kembali
        </Link>

        {modul?.id && !modul.bawaan && (
          <button
            type="submit"
            formAction={hapusModul}
            className="ml-auto text-sm text-tinta-3 hover:text-merah"
          >
            Hapus modul ini
          </button>
        )}
        {modul?.bawaan && (
          <span className="ml-auto text-xs text-tinta-3">
            Modul bawaan — boleh disunting, tidak bisa dihapus
          </span>
        )}
      </div>
    </form>
  );
}
