import Link from "next/link";
import Ikon, { type NamaIkon } from "@/components/ikon";
import { NAMA_BULAN } from "@/lib/sosmed";
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

  // Dokumen yang dikembalikan Koordinator dengan catatan. Ditaruh di
  // halaman depan, bukan cuma di lonceng: kabar di lonceng hilang
  // begitu dibaca, sedangkan pekerjaan yang belum dibereskan harus
  // tetap kelihatan sampai benar-benar selesai.
  const { data: dikembalikan } = await supabase
    .from("publikasi")
    .select("id, judul, jenis, catatan_tinjauan, tenggat, ditinjau_pada")
    .eq("status_tinjauan", "Perlu revisi")
    .order("ditinjau_pada", { ascending: false })
    .limit(5);

  // Laporan media sosial yang sudah disetujui Koordinator. Terbuka
  // untuk Humas sejak disetujui — sebelum itu database sendiri yang
  // menutupnya, jadi kuerinya cukup ditulis apa adanya.
  const { data: laporanSiap } = await supabase
    .from("laporan_sosmed")
    .select("id, bulan, tahun, disetujui_pada")
    .not("disetujui_pada", "is", null)
    .order("tahun", { ascending: false })
    .order("bulan", { ascending: false })
    .limit(3);

  const kalender = modul.find((m) => /kalender/i.test(m.judul));

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

      {(laporanSiap ?? []).length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-hijau bg-hijau-muda/40 p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-hijau">
            <Ikon nama="centang" ukuran={14} />
            Laporan yang sudah disetujui
          </h2>
          <p className="text-sm text-tinta-2">
            Evaluasi di dalamnya adalah bahan paling jujur untuk menyusun
            kalender konten bulan berikutnya — apa yang terbukti jalan, apa
            yang tidak.
          </p>
          <ul className="flex flex-col gap-2">
            {(laporanSiap ?? []).map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-garis bg-permukaan px-4 py-2.5"
              >
                <span className="mr-auto text-sm font-medium">
                  Laporan Media Sosial {NAMA_BULAN[l.bulan]} {l.tahun}
                </span>
                {kalender && (
                  <Link
                    href={`/modul/${kalender.id}?laporan=${l.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    <Ikon nama="waktu" ukuran={14} />
                    Susun kalender dari evaluasinya
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(dikembalikan ?? []).length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-oker bg-[#fbf6ec] p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-oker">
            <Ikon nama="peringatan" ukuran={14} />
            Dikembalikan Koordinator
          </h2>
          <ul className="flex flex-col gap-3">
            {(dikembalikan ?? []).map((d) => (
              <li key={d.id} className="border-l-2 border-oker pl-3">
                <p className="text-sm font-medium">
                  {d.judul}
                  <span className="ml-2 text-xs font-normal text-tinta-3">{d.jenis}</span>
                </p>
                {d.catatan_tinjauan && (
                  <p className="mt-0.5 text-sm text-tinta-2">{d.catatan_tinjauan}</p>
                )}
                {d.tenggat && (
                  <p className="mt-0.5 text-xs text-tinta-3">
                    Ditunggu sampai{" "}
                    {new Date(d.tenggat).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-tinta-3">
            Perbaiki dokumennya, lalu unggah ulang lewat Dashboard Manajemen
            Bisnis — versi lama tidak tertimpa.
          </p>
        </section>
      )}

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
