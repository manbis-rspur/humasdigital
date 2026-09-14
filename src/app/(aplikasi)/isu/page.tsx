import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaUsulan } from "@/lib/isu-data";
import {
  NAMA_BULAN,
  sebutTanggal,
  type HariKesehatan,
  type IsuRamai,
} from "@/lib/isu";
import { BarisBahan } from "./baris";
import { HariBaru, IsuBaru } from "./formulir";

/**
 * Bahan usulan tema.
 *
 * Menentukan tema campaign itu bagian paling sulit, dan orang
 * berhenti di kotak pertama karena belum tahu mau mengangkat apa.
 * Padahal bahannya sudah ada — cuma belum pernah dikumpulkan di
 * satu tempat.
 */
export default async function HalamanIsu() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const supabase = await createClient();

  const [{ data: hari }, { data: isu }, usulan] = await Promise.all([
    supabase
      .from("hari_kesehatan")
      .select("id, nama, bulan, tanggal, lingkup, kaitan, sudut, aktif")
      .order("bulan")
      .order("tanggal"),
    supabase
      .from("isu_ramai")
      .select("id, judul, ringkasan, sudut, kaitan, sumber, mulai, sampai, aktif")
      .order("mulai", { ascending: false }),
    bacaUsulan(),
  ]);

  const daftarHari = (hari ?? []) as unknown as HariKesehatan[];
  const daftarIsu = (isu ?? []) as unknown as IsuRamai[];
  const terdekat = usulan.slice(0, 6);

  const perBulan = NAMA_BULAN.slice(1).map((nama, i) => ({
    nama,
    isi: daftarHari.filter((h) => h.bulan === i + 1),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bahan Usulan Tema</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Isi halaman ini muncul sebagai usulan di kotak cerita kampanye pada
          modul Kalender Konten, dan ikut dibaca AI saat menyusun kalendernya.
        </p>
      </div>

      {terdekat.length > 0 && (
        <section className="rounded-xl border border-hijau bg-hijau-muda/40 p-5">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-hijau">
            <Ikon nama="waktu" ukuran={14} />
            Yang terdekat
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {terdekat.map((u) => (
              <li key={u.kunci}>
                <span className="font-medium">{u.judul}</span>
                <span className="text-tinta-2">
                  {" — "}
                  {u.kapan}
                  {u.jenis === "hari" &&
                    (u.jarak === 0 ? " · hari ini" : ` · ${u.jarak} hari lagi`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Isu yang sedang ramai ---------- */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium">Isu yang sedang ramai</h2>
          <p className="mt-1 max-w-2xl text-sm text-tinta-2">
            Mpox, kabut asap, demam berdarah musim hujan. Punya masa berlaku,
            karena yang ramai bulan ini belum tentu ramai bulan depan — yang
            lewat berhenti diusulkan dengan sendirinya.
          </p>
        </div>

        <IsuBaru />

        {daftarIsu.length === 0 ? (
          <p className="rounded-xl border border-garis bg-permukaan px-5 py-8 text-center text-sm text-tinta-3 shadow-lembut">
            Belum ada isu yang dicatat. Bapak/Ibu yang paling tahu apa yang
            sedang ramai di sini — itulah yang tidak bisa ditebak program.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {daftarIsu.map((i) => (
              <BarisBahan
                key={i.id}
                tabel="isu_ramai"
                id={i.id}
                judul={i.judul}
                aktif={i.aktif}
                isu={i}
                keterangan={[
                  i.sampai ? `${i.mulai} sampai ${i.sampai}` : `sejak ${i.mulai}`,
                  i.kaitan,
                  i.sudut ?? i.ringkasan,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Hari kesehatan ---------- */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium">Hari kesehatan</h2>
          <p className="mt-1 max-w-2xl text-sm text-tinta-2">
            Berulang tiap tahun dan tanggalnya tetap, jadi bisa direncanakan
            jauh hari. Yang tanggalnya berpindah tiap tahun — Hari Ginjal dan
            Hari Penglihatan Sedunia jatuh pada Kamis kedua — sengaja tidak
            diisi, silakan ditambahkan sendiri tiap tahun.
          </p>
        </div>

        <HariBaru />

        <div className="flex flex-col gap-5">
          {perBulan
            .filter((b) => b.isi.length > 0)
            .map((b) => (
              <div key={b.nama} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
                  {b.nama}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {b.isi.map((h) => (
                    <BarisBahan
                      key={h.id}
                      tabel="hari_kesehatan"
                      id={h.id}
                      judul={h.nama}
                      aktif={h.aktif}
                      hari={h}
                      keterangan={[
                        sebutTanggal(h.bulan, h.tanggal),
                        h.lingkup,
                        h.kaitan,
                        h.sudut,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
