"use client";

import { useActionState, useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import {
  bacaBerkasJadwal,
  bacaDokterDariWeb,
  simpanDokterDariWeb,
  simpanJadwalDokter,
  siapkanBerkasDokter,
} from "@/lib/dokter-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import {
  ACCEPT_DOKTER,
  MAKS_DOKTER,
  ringkasJadwal,
  type DokterBaca,
  type LembarDokter,
} from "@/lib/dokter";
import { hasilAwal } from "@/lib/hasil";

/** Tabel hasil baca, sebelum ada yang tersimpan. */
function Pratinjau({ daftar }: { daftar: DokterBaca[] }) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-garis">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-permukaan-2 text-xs uppercase tracking-wide text-tinta-3">
          <tr>
            <th className="px-3 py-2">Poliklinik</th>
            <th className="px-3 py-2">Dokter</th>
            <th className="px-3 py-2">Jadwal</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((d) => (
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
  );
}

/** Peringatan bahwa yang di layar belum tersimpan. */
function BelumTersimpan({ jumlah }: { jumlah: number }) {
  return (
    <p className="rounded-lg border-l-4 border-oker bg-[#f6efe2] px-4 py-2.5 text-sm">
      <strong>Belum tersimpan.</strong> Yang di bawah baru hasil baca —{" "}
      {jumlah} dokter. Tekan tombol hijau di bawahnya supaya masuk ke daftar.
    </p>
  );
}

function PilihanCara() {
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-medium">Daftar yang sekarang</legend>
      <label className="flex items-start gap-2">
        <input type="radio" name="cara" value="ganti" defaultChecked className="mt-1" />
        <span>
          <span className="font-medium">Ganti seluruhnya</span>
          <span className="block text-tinta-3">
            Yang lama dihapus. Dokter yang sudah tidak praktik ikut hilang
            dengan sendirinya.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2">
        <input type="radio" name="cara" value="gabung" className="mt-1" />
        <span>
          <span className="font-medium">Gabungkan</span>
          <span className="block text-tinta-3">
            Yang sudah ada diperbarui jadwalnya, yang belum ada ditambahkan.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

const tombolHijau =
  "w-fit rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60";

/**
 * Mengambil daftar dokter langsung dari situs rumah sakit.
 *
 * Ini cara yang dianjurkan. Situs itulah yang dibaca pasien, jadi
 * kalau daftar di sini berbeda dengan yang di sana, yang salah
 * hampir selalu yang di sini.
 */
export function AmbilDariSitus() {
  const [daftar, setDaftar] = useState<DokterBaca[] | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [membaca, mulai] = useTransition();
  const [hasil, simpan, menyimpan] = useActionState(simpanDokterDariWeb, hasilAwal);

  function baca() {
    setPesan(null);
    mulai(async () => {
      const h = await bacaDokterDariWeb();
      if (h.dokter === null) setPesan(h.pesan);
      else setDaftar(h.dokter);
    });
  }

  const poli = daftar ? new Set(daftar.map((d) => d.poliklinik)).size : 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-hijau bg-permukaan p-5 shadow-lembut">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <Ikon nama="unduh" ukuran={16} />
          Ambil dari rspur.co.id
          <span className="rounded-full bg-hijau-muda px-2 py-0.5 text-xs font-semibold text-hijau">
            dianjurkan
          </span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-tinta-2">
          Membaca halaman Jadwal Dokter di situs rumah sakit. Setiap ada
          penambahan dokter atau perubahan jadwal di sana, daftar ini ikut —
          tidak perlu berkas apa pun.
        </p>
        <p className="mt-1 text-sm text-tinta-3">
          Berjalan sendiri tiap hari pukul 03.00 WIB. Tombol ini untuk kalau
          ingin sekarang juga.
        </p>
      </div>

      <button
        type="button"
        onClick={baca}
        disabled={membaca}
        className="w-fit rounded-lg border border-garis px-4 py-2 text-sm font-medium hover:bg-permukaan-2 disabled:opacity-60"
      >
        {membaca ? "Membaca situs…" : "Baca sekarang"}
      </button>

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      {daftar && !hasil.berhasil && (
        <form action={simpan} className="flex flex-col gap-4 border-t border-garis pt-4">
          <BelumTersimpan jumlah={daftar.length} />
          <p className="text-sm text-tinta-2">
            Terbaca <strong>{daftar.length} dokter</strong> dalam{" "}
            <strong>{poli} poliklinik</strong>.
          </p>
          <Pratinjau daftar={daftar} />
          <PilihanCara />
          <button type="submit" disabled={menyimpan} className={tombolHijau}>
            {menyimpan ? "Menyimpan…" : `Simpan ${daftar.length} dokter`}
          </button>
        </form>
      )}
    </section>
  );
}

/**
 * Memasukkan jadwal dari berkas Excel bagian pelayanan.
 *
 * Tetap disediakan untuk keadaan yang tidak tertangani situs —
 * jadwal sementara, atau dokter yang belum diumumkan.
 */
export function ImporJadwal() {
  const [lembar, setLembar] = useState<LembarDokter[] | null>(null);
  const [jalur, setJalur] = useState("");
  const [pilih, setPilih] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [buka, setBuka] = useState(false);
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

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="w-fit text-sm text-tinta-3 hover:text-tinta hover:underline"
      >
        Atau ambil dari berkas Excel bagian pelayanan →
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <Ikon nama="unduh" ukuran={16} />
            Ambil dari berkas Excel
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-tinta-2">
            Untuk yang belum ada di situs — jadwal sementara, atau dokter yang
            belum diumumkan. Hasil bacanya ditampilkan dulu.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="text-sm text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
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

          <BelumTersimpan jumlah={terpilih.dokter.length} />

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

          {tanpaJadwal > 0 && (
            <p className="text-sm text-oker">
              {tanpaJadwal} dokter tanpa jam praktik — akan disimpan dalam
              keadaan padam, jadi tidak ikut dipakai AI.
            </p>
          )}

          <Pratinjau daftar={terpilih.dokter} />
          <PilihanCara />

          <button type="submit" disabled={menyimpan} className={tombolHijau}>
            {menyimpan ? "Menyimpan…" : `Simpan ${terpilih.dokter.length} dokter`}
          </button>
        </form>
      )}
    </section>
  );
}
