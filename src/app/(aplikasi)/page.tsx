import Link from "next/link";
import { wajibHumas } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaKolom } from "@/lib/modul-ai";

export default async function HalamanHumas() {
  const izin = await wajibHumas();

  const supabase = await createClient();
  const { data } = await supabase
    .from("modul_ai")
    .select("id, judul, deskripsi, kategori, kolom, bawaan, urutan")
    .eq("aktif", true)
    .order("urutan")
    .order("id");

  const modul = data ?? [];

  // Dikelompokkan per kategori, urut sesuai kemunculan pertamanya —
  // bukan diurutkan menurut abjad, supaya modul pokok tetap di atas.
  const kategori: string[] = [];
  for (const m of modul) if (!kategori.includes(m.kategori)) kategori.push(m.kategori);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Humas &amp; Digital Marketing
          </h1>
          <p className="mt-1 max-w-2xl text-tinta-2">
            {izin === "penuh"
              ? "Bantuan menyusun siaran pers, kalender konten, rencana acara, dan tanggapan — dikerjakan mesin, diperiksa manusia."
              : "Seluruh dokumen yang disusun Humas dan Digital Marketing masuk ke Riwayat Dokumen. Modul penyusunnya dipegang mereka; yang terbuka di sini modul layanan pelanggan."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/riwayat"
            className="rounded border border-garis px-4 py-2.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Riwayat dokumen
          </Link>
          {izin === "penuh" && (
            <Link
              href="/modul/baru"
              className="rounded bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Buat modul
            </Link>
          )}
        </div>
      </div>

      {modul.length === 0 ? (
        <div className="rounded border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada modul yang terbuka untuk Anda.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Dokumen yang disusun tim tetap bisa dibuka lewat Riwayat Dokumen.
          </p>
        </div>
      ) : (
        kategori.map((k) => (
          <section key={k} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              {k}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {modul
                .filter((m) => m.kategori === k)
                .map((m) => (
                  <Link
                    key={m.id}
                    href={`/modul/${m.id}`}
                    className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
                  >
                    <p className="font-medium">{m.judul}</p>
                    <p className="text-sm text-tinta-2">{m.deskripsi}</p>
                    <p className="mt-1 text-xs text-tinta-3">
                      {bacaKolom(m.kolom).length} isian
                      {m.bawaan ? " · modul bawaan" : ""}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
