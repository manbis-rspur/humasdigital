import Link from "next/link";
import { wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Dokumen yang sudah dikirim ke Koordinator, beserta koreksinya.
 *
 * Tidak ada pengiriman balik: kedua dashboard memakai database yang
 * sama, jadi begitu Koordinator menyimpan suntingannya, perubahan
 * itu langsung terbaca di sini.
 */
export default async function HalamanArsip() {
  await wajibHumas();

  const supabase = await createClient();
  const { data } = await supabase
    .from("publikasi")
    .select(
      "id, judul, jenis, isi, tautan_docs, diunggah_pada, diubah_pada, pengunggah:diunggah_oleh(nama), penyunting:diubah_oleh(nama)",
    )
    .order("diunggah_pada", { ascending: false })
    .limit(200);

  const dokumen = data ?? [];
  const adaKoreksi = dokumen.filter((d) => d.diubah_pada).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arsip &amp; Koreksi</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Dokumen yang sudah dikirim ke Koordinator. Bila beliau menyuntingnya,
          perubahannya langsung terlihat di sini — tanpa perlu dikirim balik.
        </p>
        {adaKoreksi > 0 && (
          <p className="mt-2 text-sm text-hijau">
            {adaKoreksi} dokumen sudah disunting Koordinator.
          </p>
        )}
      </div>

      {dokumen.length === 0 ? (
        <div className="rounded border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada dokumen yang dikirim.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Jalankan sebuah modul, lalu tekan Kirim ke Koordinator pada hasilnya.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {dokumen.map((d) => {
            const pengunggah = Array.isArray(d.pengunggah) ? d.pengunggah[0] : d.pengunggah;
            const penyunting = Array.isArray(d.penyunting) ? d.penyunting[0] : d.penyunting;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-garis bg-permukaan px-4 py-3"
              >
                <div className="mr-auto min-w-0">
                  <p className="font-medium">{d.judul}</p>
                  <p className="text-xs text-tinta-3">
                    {d.jenis} · dikirim {waktu.format(new Date(d.diunggah_pada))}
                    {pengunggah && ` oleh ${pengunggah.nama}`}
                  </p>
                  {d.diubah_pada && penyunting && (
                    <p className="mt-0.5 text-xs text-hijau">
                      Disunting {waktu.format(new Date(d.diubah_pada))} oleh{" "}
                      {penyunting.nama}
                    </p>
                  )}
                </div>

                {d.tautan_docs && (
                  <a
                    href={d.tautan_docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                  >
                    Google Docs
                  </a>
                )}

                {d.isi !== null && (
                  <Link
                    href={`/arsip/${d.id}`}
                    className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                  >
                    Baca
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
