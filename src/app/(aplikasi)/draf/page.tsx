import Link from "next/link";
import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { ukuranRapi, warnaStatusDraf, type Draf } from "@/lib/draf";
import { FormDraf } from "./form-draf";

const waktu = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Draf bersama Humas dan Digital Marketing.
 *
 * Tempat menggarap dokumen berdua sebelum layak dikirim ke
 * Koordinator. Koordinator sengaja tidak bisa membukanya — draf yang
 * bisa dilihat atasan berhenti jadi draf, dan orang mulai menahan
 * diri menaruh yang setengah jadi.
 */
export default async function HalamanDraf() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("draf")
    // Seluruh kolom: kolom isi baru ada setelah berkas SQL 41
    // dijalankan, dan menyebut kolom yang belum ada membuat
    // daftarnya kosong sama sekali.
    .select("*, pembuat:dibuat_oleh(nama)")
    .order("dibuat_pada", { ascending: false })
    .limit(100);

  const semua = (data ?? []) as unknown as (Draf & {
    pembuat: { nama: string } | { nama: string }[] | null;
  })[];

  const digarap = semua.filter((d) => d.status !== "Terkirim");
  const terkirim = semua.filter((d) => d.status === "Terkirim");

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Draf Bersama</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Tempat menggarap dokumen berdua sebelum dikirim ke Koordinator. Hanya
          Humas dan Digital Marketing yang bisa membukanya.
        </p>
      </div>

      <FormDraf />

      {digarap.length === 0 ? (
        <div className="rounded-xl border border-garis bg-permukaan px-5 py-10 text-center shadow-lembut">
          <p className="font-medium">Belum ada draf yang digarap.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Taruh yang sedang dikerjakan, walaupun masih setengah jadi — justru
            itu gunanya tempat ini.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {digarap.map((d) => {
            const oleh = Array.isArray(d.pembuat) ? d.pembuat[0] : d.pembuat;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-garis bg-permukaan px-4 py-3 shadow-lembut"
              >
                <span className="mr-auto min-w-0">
                  <Link prefetch={false}
                    href={`/draf/${d.id}`}
                    className="font-medium hover:underline"
                  >
                    {d.judul}
                  </Link>
                  <span className="block text-xs text-tinta-3">
                    {d.jenis} · {waktu.format(new Date(d.dibuat_pada))}
                    {oleh && ` · ${oleh.nama.split(",")[0]}`}
                    {d.berkas_ukuran ? ` · ${ukuranRapi(d.berkas_ukuran)}` : ""}
                    {d.isi && !d.berkas_nama ? " · naskah teks" : ""}
                  </span>
                  {d.keterangan && (
                    <span className="mt-0.5 block text-sm text-tinta-2">
                      {d.keterangan}
                    </span>
                  )}
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${warnaStatusDraf(d.status)}`}
                >
                  {d.status}
                </span>

                <Link prefetch={false}
                  href={`/draf/${d.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Buka
                  <Ikon nama="panah" ukuran={13} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {terkirim.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            <Ikon nama="centang" ukuran={14} />
            Sudah dikirim ke arsip
          </h2>
          <ul className="flex flex-col gap-1.5">
            {terkirim.map((d) => (
              <li key={d.id} className="border-l-2 border-hijau pl-3 text-sm">
                <Link prefetch={false} href={`/draf/${d.id}`} className="hover:underline">
                  {d.judul}
                </Link>
                <span className="ml-2 text-xs text-tinta-3">{d.jenis}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
