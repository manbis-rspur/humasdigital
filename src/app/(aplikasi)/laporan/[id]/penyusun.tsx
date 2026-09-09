"use client";

import { useActionState } from "react";
import { simpanAngka, tambahKonten, susunLaporan } from "@/lib/sosmed-actions";
import { PLATFORM, UKURAN, angkaRapi, interaksi, type Konten } from "@/lib/sosmed";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded border border-garis bg-permukaan px-2.5 py-1.5 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormAngka({
  id,
  angka,
  catatan,
  tenggat,
}: {
  id: number;
  angka: Record<string, Record<string, number>>;
  catatan: string | null;
  /** Kapan laporan bulan ini ditunggu Koordinator. */
  tenggat: string | null;
}) {
  const [hasil, kirim, sedang] = useActionState(simpanAngka, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-4 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <input type="hidden" name="id" value={id} />
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Capaian akun
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        {PLATFORM.map((p) => (
          <div key={p} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{p}</p>
            {UKURAN.map((u) => (
              <label key={u.kunci} className="flex items-center justify-between gap-3">
                <span className="text-xs text-tinta-2">{u.label}</span>
                <input
                  name={`${p}_${u.kunci}`}
                  type="number"
                  min={0}
                  defaultValue={angka?.[p]?.[u.kunci] ?? 0}
                  className={`${gaya} w-28 text-right font-mono`}
                />
              </label>
            ))}
          </div>
        ))}
      </div>

      <label className="flex flex-wrap items-center gap-3 border-t border-garis pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.13em] text-tinta-3">
          Tenggat laporan
        </span>
        <input
          type="date"
          name="tenggat"
          defaultValue={tenggat ?? ""}
          className={gaya}
        />
        <span className="text-xs text-tinta-3">
          Kapan laporan ini ditunggu Koordinator.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-tinta-3">
          Catatan penyusun — hal yang perlu diketahui tapi tidak terbaca dari angka
        </span>
        <textarea
          name="catatan"
          rows={3}
          defaultValue={catatan ?? ""}
          placeholder="Misalnya: pekan kedua ada kendala jadwal dokter, unggahan tertunda tiga hari"
          className={`${gaya} w-full`}
        />
      </label>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan capaian akun"}
      </button>
    </form>
  );
}

export function FormKonten({ laporanId }: { laporanId: number }) {
  const [hasil, kirim, sedang] = useActionState(tambahKonten, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <input type="hidden" name="laporan_id" value={laporanId} />
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Tambah konten
      </h2>

      <div className="grid gap-2 sm:grid-cols-4">
        <input name="tanggal" type="date" className={gaya} aria-label="Tanggal" />
        <select name="platform" defaultValue="Instagram" className={gaya} aria-label="Platform">
          {PLATFORM.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input name="format" placeholder="Reels / Carousel / Video" className={gaya} />
        <select name="funnel" defaultValue="" className={gaya} aria-label="Funnel">
          <option value="">— Tahap funnel —</option>
          <option value="TOFU">TOFU · pengenalan</option>
          <option value="MOFU">MOFU · pertimbangan</option>
          <option value="BOFU">BOFU · ajakan bertindak</option>
        </select>
      </div>

      <input name="judul" required placeholder="Judul atau topik konten" className={`${gaya} w-full`} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {[
          ["tayangan", "Tayangan"],
          ["jangkauan", "Jangkauan"],
          ["suka", "Suka"],
          ["komentar", "Komentar"],
          ["dibagikan", "Dibagikan"],
          ["disimpan", "Disimpan"],
        ].map(([n, l]) => (
          <label key={n} className="flex flex-col gap-1">
            <span className="text-xs text-tinta-3">{l}</span>
            <input name={n} type="number" min={0} defaultValue={0} className={`${gaya} text-right font-mono`} />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ada_ads" className="accent-hijau" />
          Memakai iklan berbayar
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-tinta-3">Biaya iklan (Rp)</span>
          <input name="biaya_ads" type="number" min={0} defaultValue={0} className={`${gaya} w-36 text-right font-mono`} />
        </label>
      </div>

      <input name="catatan" placeholder="Catatan konten — boleh dikosongkan" className={`${gaya} w-full`} />

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Tambah konten"}
      </button>
    </form>
  );
}

export function TombolSusun({ id, sudahAda }: { id: number; sudahAda: boolean }) {
  const [hasil, kirim, sedang] = useActionState(susunLaporan, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyusun…" : sudahAda ? "Susun ulang naskah" : "Susun naskah laporan"}
        </button>
        {sedang && (
          <span className="text-sm text-tinta-3">
            Biasanya butuh setengah sampai satu menit. Jangan tutup halaman ini.
          </span>
        )}
      </div>
      {sudahAda && !sedang && (
        <p className="text-xs text-tinta-3">
          Menyusun ulang akan menimpa naskah yang ada. Unduh dulu bila yang lama
          masih diperlukan.
        </p>
      )}
      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}
    </form>
  );
}

export function RingkasKonten({ daftar }: { daftar: Konten[] }) {
  if (daftar.length === 0) return null;
  const berbayar = daftar.filter((k) => k.ada_ads).length;

  return (
    <p className="text-xs text-tinta-3">
      {daftar.length} konten tercatat · {berbayar} memakai iklan ·{" "}
      {angkaRapi(daftar.reduce((j, k) => j + k.tayangan, 0))} tayangan ·{" "}
      {angkaRapi(daftar.reduce((j, k) => j + interaksi(k), 0))} interaksi
    </p>
  );
}
