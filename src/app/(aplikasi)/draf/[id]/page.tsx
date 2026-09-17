import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { ukuranRapi, warnaStatusDraf, type Draf } from "@/lib/draf";
import {
  FormRevisiDraf,
  TombolHapusDraf,
  TombolKembali,
  TombolKirimArsip,
  TombolStatus,
} from "./aksi-draf";
import { NaskahDraf } from "./naskah";
import type { KopSurat } from "@/lib/kop-surat";
import { Percakapan, type Komentar } from "./percakapan";

/**
 * Batas waktu fungsi, dalam detik.
 *
 * Menyusun dan memperbaiki dokumen lewat AI bisa memakan setengah
 * menit lebih, apalagi kalender sembilan kolom. Bila fungsinya
 * dipotong di tengah jalan, jawabannya hilang — dan yang lebih
 * buruk, cookie sesi yang baru disegarkan proxy ikut hilang karena
 * tanggapannya tidak pernah sampai ke peramban. Itulah yang membuat
 * orang terpental ke halaman masuk.
 */
export const maxDuration = 60;


const waktu = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Nama orang dari kolom sambungan — Supabase kadang mengirimnya sebagai larik. */
function nama(nilai: unknown): string {
  const isi = Array.isArray(nilai) ? nilai[0] : nilai;
  if (isi && typeof isi === "object" && "nama" in isi) {
    return String((isi as { nama: unknown }).nama ?? "");
  }
  return "";
}

type Revisi = {
  id: number;
  versi: number;
  berkas_nama: string;
  berkas_ukuran: number | null;
  catatan: string | null;
  pada: string;
  penggarap: unknown;
};

/**
 * Satu draf: berkasnya, riwayat versinya, dan percakapan di sekitarnya.
 *
 * Tiga hal itu sengaja disatukan di satu halaman. Kalau catatannya
 * di WhatsApp dan berkasnya di Drive, yang membuka bulan depan harus
 * menebak catatan mana milik versi mana.
 */
export default async function HalamanDraf({ params }: PageProps<"/draf/[id]">) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const { id } = await params;
  const nomor = Number(id);
  if (!Number.isFinite(nomor)) notFound();

  const supabase = await createClient();

  const [{ data: draf }, { data: revisi }, { data: komentar }, { data: dataKop }] =
    await Promise.all([
    supabase
      .from("draf")
      // Seluruh kolom: kolom isi baru ada setelah berkas SQL 41
      // dijalankan.
      .select("*, pembuat:dibuat_oleh(nama)")
      .eq("id", nomor)
      .maybeSingle(),
    supabase
      .from("draf_revisi")
      .select("id, versi, berkas_nama, berkas_ukuran, catatan, pada, penggarap:oleh(nama)")
      .eq("draf_id", nomor)
      .order("versi", { ascending: false }),
    supabase
      .from("draf_komentar")
      .select("id, isi, pada, penulis:oleh(nama)")
      .eq("draf_id", nomor)
      .order("pada", { ascending: true }),
    supabase
      .from("kop_surat")
      .select("id, nama, berkas_nama, bawaan, aktif")
      .eq("aktif", true)
      .order("bawaan", { ascending: false })
      .order("nama"),
  ]);

  if (!draf) notFound();

  const d = draf as unknown as Draf & {
    dikirim_pada: string | null;
    pembuat: unknown;
  };

  const daftarRevisi = (revisi ?? []) as unknown as Revisi[];
  const terkirim = d.status === "Terkirim";

  const percakapan: Komentar[] = (
    (komentar ?? []) as unknown as {
      id: number;
      isi: string;
      pada: string;
      penulis: unknown;
    }[]
  ).map((k) => ({ id: k.id, isi: k.isi, pada: k.pada, nama: nama(k.penulis) }));

  return (
    <div className="flex flex-col gap-6">
      <Link prefetch={false}
        href="/draf"
        className="flex w-fit items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta"
      >
        <span className="inline-block rotate-180">
          <Ikon nama="panah" ukuran={14} />
        </span>
        Kembali ke Draf Bersama
      </Link>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="mr-auto min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{d.judul}</h1>
          <p className="mt-1 text-sm text-tinta-3">
            {d.jenis} · dibuat {nama(d.pembuat).split(",")[0] || "anggota unit"} ·{" "}
            {waktu.format(new Date(d.dibuat_pada))}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${warnaStatusDraf(d.status)}`}
        >
          {d.status}
        </span>
      </div>

      {d.keterangan && (
        <p className="max-w-2xl whitespace-pre-wrap text-tinta-2">{d.keterangan}</p>
      )}

      {d.isi && (
        <NaskahDraf
          id={d.id}
          isi={d.isi}
          terkunci={terkirim}
          kop={(dataKop ?? []) as unknown as KopSurat[]}
        />
      )}

      {/* Berkas terbaru dan tautannya. */}
      <section className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="publikasi" ukuran={14} />
          Naskah terbaru
        </h2>

        {daftarRevisi.length === 0 && !d.tautan && (
          <p className="text-sm text-tinta-3">
            {d.isi
              ? "Draf ini berupa naskah teks. Boleh juga dilampiri berkas — desain, foto, atau naskah versi Word."
              : "Belum ada berkas yang diunggah pada draf ini."}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {daftarRevisi[0] && (
            <a
              href={`/draf/berkas/${daftarRevisi[0].id}`}
              className="flex items-center gap-2 rounded-lg border border-garis px-3 py-2 text-sm font-medium hover:bg-permukaan-2"
            >
              <Ikon nama="unduh" ukuran={15} />
              {daftarRevisi[0].berkas_nama}
              <span className="text-xs font-normal text-tinta-3">
                versi {daftarRevisi[0].versi}
                {daftarRevisi[0].berkas_ukuran
                  ? ` · ${ukuranRapi(daftarRevisi[0].berkas_ukuran)}`
                  : ""}
              </span>
            </a>
          )}

          {d.tautan && (
            <a
              href={d.tautan}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-garis px-3 py-2 text-sm font-medium hover:bg-permukaan-2"
            >
              <Ikon nama="panah" ukuran={15} />
              Buka tautan Drive
            </a>
          )}
        </div>
      </section>

      {/* Tahapan dan pengiriman. */}
      <section className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="centang" ukuran={14} />
          Tahapan
        </h2>

        {terkirim ? (
          <p className="text-sm text-hijau">
            Sudah dikirim ke Arsip Publikasi
            {d.dikirim_pada && ` pada ${waktu.format(new Date(d.dikirim_pada))}`}.
            Tinjauan Koordinator akan muncul di lonceng.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <TombolStatus id={d.id} status={d.status} />
              <TombolKembali id={d.id} status={d.status} />
            </div>
            <TombolKirimArsip id={d.id} siap={d.status === "Siap kirim"} />
          </>
        )}
      </section>

      {!terkirim && <FormRevisiDraf id={d.id} />}

      {/* Riwayat versi. */}
      {daftarRevisi.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            <Ikon nama="waktu" ukuran={14} />
            Riwayat versi
            <span className="font-normal normal-case tracking-normal">
              {daftarRevisi.length}
            </span>
          </h2>

          <ol className="flex flex-col gap-2.5">
            {daftarRevisi.map((r, urutan) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 pl-3 ${
                  urutan === 0 ? "border-hijau" : "border-garis"
                }`}
              >
                <span className="text-sm font-medium">Versi {r.versi}</span>
                {r.catatan && (
                  <span className="text-sm text-tinta-2">{r.catatan}</span>
                )}
                <span className="ml-auto text-xs text-tinta-3">
                  {nama(r.penggarap).split(",")[0] || "anggota unit"} ·{" "}
                  {waktu.format(new Date(r.pada))}
                  {r.berkas_ukuran ? ` · ${ukuranRapi(r.berkas_ukuran)}` : ""}
                </span>
                <a
                  href={`/draf/berkas/${r.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-hijau hover:underline"
                >
                  <Ikon nama="unduh" ukuran={13} />
                  Unduh
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Percakapan drafId={d.id} daftar={percakapan} saya={pengguna.nama} />

      {!terkirim && (
        <div className="flex justify-end border-t border-garis pt-5">
          <TombolHapusDraf id={d.id} />
        </div>
      )}
    </div>
  );
}
