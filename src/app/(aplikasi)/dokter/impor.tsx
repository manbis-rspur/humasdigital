"use client";

import { useActionState, useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import {
  bacaBerkasJadwal,
  simpanJadwalDokter,
  siapkanBerkasDokter,
} from "@/lib/dokter-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import {
  ACCEPT_DOKTER,
  MAKS_DOKTER,
  ringkasJadwal,
  type LembarDokter,
} from "@/lib/dokter";
import { hasilAwal } from "@/lib/hasil";

/**
 * Memasukkan jadwal dari berkas Excel bagian pelayanan.
 *
 * Dua langkah, bukan satu. Berkas jadwal disusun manusia dan
 * susunannya berubah tiap kali dirapikan — jadi hasil bacanya
 * ditunjukkan dulu, dan yang menekan simpan sudah melihat apa yang
 * akan tersimpan.
 */
export function ImporJadwal() {
  const [lembar, setLembar] = useState<LembarDokter[] | null>(null);
  const [jalur, setJalur] = useState("");
  const [pilih, setPilih] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [membaca, mulai] = useTransition();

  const [hasil, simpan, menyimpan] = useActionState(simpanJadwalDokter, hasilAwal);

  async function naikkan(berkas: File) {
    setPesan(null);
    setLembar(null);

    if (!berkas.name.toLowerCase().endsWith(".xlsx")) {
      setPesan("Berkasnya harus .xlsx.");
      return;
    }
    if (berkas.size > MAKS_DOKTER) {
      setPesan("Berkasnya terlalu besar — batasnya 10 MB.");
      return;
    }

    setTahap("Mengunggah berkas…");
    const naik = await unggahLewatIzin(berkas, siapkanBerkasDokter);
    if (naik.jalur === null) {
      setTahap(null);
      setPesan(naik.pesan);
      return;
    }

    setTahap("Membaca jadwalnya…");
    const dibaca = await bacaBerkasJadwal(naik.jalur);
    setTahap(null);

    if (dibaca.lembar === null) {
      setPesan(dibaca.pesan);
      return;
    }

    // Lembar dengan dokter terbanyak hampir selalu jadwal yang
    // sedang berlaku; lembar sementara dan poli eksekutif isinya
    // sedikit.
    let terbanyak = 0;
    dibaca.lembar.forEach((l, i) => {
      if (l.dokter.length > dibaca.lembar[terbanyak].dokter.length) terbanyak = i;
    });

    setJalur(naik.jalur);
    setLembar(dibaca.lembar);
    setPilih(terbanyak);
  }

  const terpilih = lembar?.[pilih];
  const tanpaJadwal = terpilih?.dokter.filter((d) => d.jadwal.length === 0).length ?? 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <Ikon nama="unduh" ukuran={16} />
          Ambil dari berkas jadwal
        </h2>
        <p className="mt-1 text-sm text-tinta-2">
          Unggah berkas Excel jadwal poliklinik dari bagian pelayanan. Hasil
          bacanya ditampilkan dulu sebelum ada yang tersimpan.
        </p>
      </div>

      <input
        type="file"
        accept={ACCEPT_DOKTER}
        disabled={membaca}
        onChange={(e) => {
          const berkas = e.target.files?.[0];
          if (berkas) mulai(() => naikkan(berkas));
        }}
        className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium"
      />

      {tahap && <p className="text-sm text-tinta-3">{tahap}</p>}
      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      {lembar && terpilih && !hasil.berhasil && (
        <form action={simpan} className="flex flex-col gap-4 border-t border-garis pt-4">
          <input type="hidden" name="jalur" value={jalur} />
          <input type="hidden" name="lembar" value={pilih} />

          {lembar.length > 1 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Lembar mana yang dipakai</span>
              <select
                value={pilih}
                onChange={(e) => setPilih(Number(e.target.value))}
                className="w-fit rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau"
              >
                {lembar.map((l, i) => (
                  <option key={l.nama} value={i}>
                    {l.nama} — {l.dokter.length} dokter
                  </option>
                ))}
              </select>
            </label>
          )}

          <p className="text-sm">
            Terbaca <strong>{terpilih.dokter.length} dokter</strong> dari lembar{" "}
            <strong>{terpilih.nama}</strong>.
            {tanpaJadwal > 0 && (
              <>
                {" "}
                <span className="text-oker">
                  {tanpaJadwal} di antaranya tanpa jam praktik — akan disimpan
                  dalam keadaan padam, jadi tidak ikut dipakai AI.
                </span>
              </>
            )}
          </p>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-garis">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-permukaan-2 text-xs uppercase tracking-wide text-tinta-3">
                <tr>
                  <th className="px-3 py-2">Poliklinik</th>
                  <th className="px-3 py-2">Dokter</th>
                  <th className="px-3 py-2">Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {terpilih.dokter.map((d) => (
                  <tr key={`${d.poliklinik}|${d.nama}`} className="border-t border-garis">
                    <td className="px-3 py-1.5 text-tinta-3">{d.poliklinik}</td>
                    <td className="px-3 py-1.5 font-medium">{d.nama}</td>
                    <td className="px-3 py-1.5 text-tinta-2">
                      {d.jadwal.length === 0 ? (
                        <span className="text-oker">tanpa jam praktik</span>
                      ) : (
                        ringkasJadwal(d.jadwal)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1 font-medium">Daftar yang sekarang</legend>
            <label className="flex items-start gap-2">
              <input type="radio" name="cara" value="ganti" defaultChecked className="mt-1" />
              <span>
                <span className="font-medium">Ganti seluruhnya</span>
                <span className="block text-tinta-3">
                  Yang lama dihapus. Pilih ini kalau berkasnya jadwal terbaru —
                  dokter yang sudah tidak praktik ikut hilang dengan sendirinya.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="cara" value="gabung" className="mt-1" />
              <span>
                <span className="font-medium">Gabungkan</span>
                <span className="block text-tinta-3">
                  Yang sudah ada diperbarui jadwalnya, yang belum ada
                  ditambahkan. Dokter lama tetap tinggal.
                </span>
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={menyimpan}
            className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {menyimpan ? "Menyimpan…" : `Simpan ${terpilih.dokter.length} dokter`}
          </button>
        </form>
      )}
    </section>
  );
}
