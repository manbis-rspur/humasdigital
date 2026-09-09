import Link from "next/link";
import Ikon, { type NamaIkon } from "@/components/ikon";
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

  // Lambang dipilih dari kata kunci pada judul modul. Modul bisa
  // dirakit sendiri kapan saja, jadi tidak mungkin dipasangkan satu
  // per satu di sini — yang tidak dikenali memakai lambang dokumen.
  function lambang(judul: string): NamaIkon {
    const j = judul.toLowerCase();
    if (j.includes("kalender") || j.includes("jadwal")) return "waktu";
    if (j.includes("laporan") || j.includes("analis")) return "laporan";
    if (j.includes("balas") || j.includes("tanggap") || j.includes("ulasan"))
      return "obrolan";
    if (j.includes("komplain") || j.includes("keluhan")) return "komplain";
    if (j.includes("acara") || j.includes("event")) return "modul";
    if (j.includes("siaran") || j.includes("pers") || j.includes("rilis"))
      return "surat";
    return "template";
  }

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
            className="flex items-center gap-2 rounded-lg border border-garis px-4 py-2.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            <Ikon nama="template" ukuran={16} />
            Riwayat dokumen
          </Link>
          {izin === "penuh" && (
            <Link
              href="/modul/baru"
              className="flex items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white shadow-lembut hover:opacity-90"
            >
              <Ikon nama="tambah" ukuran={16} />
              Buat modul
            </Link>
          )}
        </div>
      </div>

      {modul.length === 0 ? (
        <div className="rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada modul yang terbuka untuk Anda.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Dokumen yang disusun tim tetap bisa dibuka lewat Riwayat Dokumen.
          </p>
        </div>
      ) : (
        kategori.map((k) => (
          <section key={k} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              <Ikon nama="modul" ukuran={14} />
              {k}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modul
                .filter((m) => m.kategori === k)
                .map((m) => (
                  <Link
                    key={m.id}
                    href={`/modul/${m.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut transition hover:border-hijau hover:shadow-angkat"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-hijau-muda text-hijau">
                        <Ikon nama={lambang(m.judul)} ukuran={18} />
                      </span>
                      <p className="font-medium">{m.judul}</p>
                    </div>
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
