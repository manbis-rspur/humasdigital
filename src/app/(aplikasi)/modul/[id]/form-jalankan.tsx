"use client";

import { Fragment, useState, useTransition } from "react";
import { jalankanModul, siapkanRujukan, type HasilSusun } from "@/lib/humas-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import { ACCEPT_DATA, MAKS_DATA } from "@/lib/berkas-jenis";
import { TampilHasil } from "@/components/tampil-hasil";
import { kunciLain, type Kolom } from "@/lib/modul-ai";
import type { Usulan } from "@/lib/isu";
import { PanelUsulan } from "./panel-usulan";

const awal: HasilSusun = { pesan: null, hasil: null, judul: "", riwayatId: null };

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

function IsianKolom({
  k,
  nilai,
  aturNilai,
}: {
  k: Kolom;
  /** Terisi hanya untuk kotak yang isinya bisa diubah panel usulan. */
  nilai?: string;
  aturNilai?: (isi: string) => void;
}) {
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
        aturNilai ? (
          <textarea
            name={k.kunci}
            rows={5}
            required={k.wajib}
            placeholder={k.contoh}
            value={nilai ?? ""}
            onChange={(e) => aturNilai(e.target.value)}
            className={`${gaya} w-full`}
          />
        ) : (
          <textarea
            name={k.kunci}
            rows={5}
            required={k.wajib}
            placeholder={k.contoh}
            defaultValue={typeof bawaan === "string" ? bawaan : undefined}
            className={`${gaya} w-full`}
          />
        )
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
          type={
            k.jenis === "number" ? "number" : k.jenis === "date" ? "date" : "text"
          }
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
  namaModul,
  usulan,
  kunciCerita,
  bolehKeDraf,
}: {
  modulId: number;
  kolom: Kolom[];
  namaBerkas: string;
  namaModul: string;
  usulan: Usulan[];
  kunciCerita: string | null;
  bolehKeDraf: boolean;
}) {
  const [hasil, setHasil] = useState<HasilSusun>(awal);
  // Dimulai dari nilai bawaan kotaknya, bukan dari kosong: kalender
  // yang dibuka dari sebuah laporan datang dengan kotaknya sudah
  // terisi, dan mengosongkannya di sini menghapus isian itu.
  /**
   * Untuk siapa dokumen ini disusun.
   *
   * Modul yang sama dipakai juga menyusun konten untuk rumah sakit
   * atau klinik lain. Untuk dokumen seperti itu, data RSPUR justru
   * tidak boleh ikut — nama dokter RSPUR di dalam konten milik
   * rumah sakit lain menyesatkan pembacanya, dan baru ketahuan
   * sesudah terbit.
   */
  const [untukRspur, setUntukRspur] = useState(true);

  const [cerita, setCerita] = useState(() => {
    const k = kolom.find((x) => x.kunci === kunciCerita);
    return typeof k?.bawaan === "string" ? k.bawaan : "";
  });
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  /**
   * Berkas rujukan naik lebih dulu, baru modulnya dijalankan.
   *
   * Urutannya harus begitu: berkasnya tidak boleh lewat server
   * action — batas kirimannya 1 MB, dan foto atau panduan merek
   * gampang melewatinya. Yang lewat aksi cuma alamat berkasnya.
   */
  async function kirim(formData: FormData) {
    setHasil(awal);

    const berkas = formData
      .getAll("rujukan_berkas")
      .filter((b): b is File => b instanceof File && b.size > 0);

    formData.delete("rujukan_berkas");

    const jalur: string[] = [];
    for (const [nomor, b] of berkas.entries()) {
      if (b.size > MAKS_DATA) {
        setHasil({ ...awal, pesan: `${b.name} terlalu besar untuk dijadikan rujukan.` });
        return;
      }

      setTahap(`Mengunggah rujukan ${nomor + 1} dari ${berkas.length}…`);
      const naik = await unggahLewatIzin(b, siapkanRujukan);
      if (naik.jalur === null) {
        setTahap(null);
        setHasil({ ...awal, pesan: naik.pesan });
        return;
      }
      jalur.push(naik.jalur);
    }

    if (jalur.length > 0) formData.set("rujukan", jalur.join("\n"));

    setTahap(berkas.length > 0 ? "Membaca rujukan dan menyusun…" : null);
    setHasil(await jalankanModul(awal, formData));
    setTahap(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        action={(formData) => mulai(() => kirim(formData))}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="modul_id" value={modulId} />
        {untukRspur && <input type="hidden" name="untuk_rspur" value="ya" />}

        <fieldset className="rounded-lg border border-garis px-3 py-2.5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Dokumen ini untuk
          </legend>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={untukRspur}
                onChange={() => setUntukRspur(true)}
                className="accent-hijau"
              />
              RS Pertamedika Ummi Rosnati
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!untukRspur}
                onChange={() => setUntukRspur(false)}
                className="accent-hijau"
              />
              Rumah sakit / klinik lain
            </label>
          </div>

          {!untukRspur && (
            <div className="mt-3 flex flex-col gap-2">
              <input
                name="instansi"
                placeholder="Nama instansinya — boleh dikosongkan"
                className={`${gaya} w-full text-sm`}
              />
              <p className="text-xs text-tinta-2">
                Nama dokter dan daftar layanan RSPUR tidak akan ikut, dan RSPUR
                tidak akan disebut. AI juga tidak akan menyebut nama dokter mana
                pun — daftar dokter instansi itu tidak ada di sistem, jadi nama
                apa pun akan jadi karangan. Bagian yang harus diisi sendiri
                ditandai dalam kurung siku.
              </p>
            </div>
          )}
        </fieldset>

        {kolom.map((k) => {
          const cerita_ini = k.kunci === kunciCerita;
          return (
            <Fragment key={k.kunci}>
              <IsianKolom
                k={k}
                nilai={cerita_ini ? cerita : undefined}
                aturNilai={cerita_ini ? setCerita : undefined}
              />
              {cerita_ini && (
                <PanelUsulan
                  daftar={usulan}
                  onPilih={(kalimat) =>
                    setCerita((lama) =>
                      lama.trim() === "" ? kalimat : `${lama.trimEnd()}\n${kalimat}`,
                    )
                  }
                />
              )}
            </Fragment>
          );
        })}

        {/* Rujukan opsional: foto ruangan, panduan merek, kerangka
            acuan acara, contoh konten sebelumnya. Dibaca AI sebagai
            bahan, lalu berkas mentahnya dibuang — yang berharga hasil
            susunannya, bukan salinan berkas yang menumpuk. */}
        <fieldset className="rounded-lg border border-garis px-3 py-2.5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Lampiran rujukan
          </legend>
          <input
            type="file"
            name="rujukan_berkas"
            multiple
            accept={ACCEPT_DATA}
            className={`${gaya} w-full file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
          />
          <p className="mt-2 text-xs text-tinta-3">
            Boleh dikosongkan. Foto, PDF, Word, Excel, atau CSV — misalnya foto
            ruangan, panduan merek, kerangka acuan acara, atau contoh konten
            sebelumnya. Isinya dibaca sebagai bahan, lalu berkasnya dibuang.
          </p>
        </fieldset>

        {hasil.pesan && (
          <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
            {hasil.pesan}
          </p>
        )}

        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Sedang menyusun…") : "Susun dokumen"}
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
          jenisArsip={namaModul}
          bolehKeDraf={bolehKeDraf}
        />
      )}
    </div>
  );
}
