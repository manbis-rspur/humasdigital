import Link from "next/link";
import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { hapusKopSurat, jadikanKopBawaan } from "@/lib/kop-actions";
import type { KopSurat } from "@/lib/kop-surat";
import { FormKop } from "./form-kop";

/**
 * Kop surat untuk berkas PDF.
 *
 * Boleh lebih dari satu, dan itu disengaja: modul yang sama juga
 * dipakai menyusun konten untuk rumah sakit atau klinik lain, dan
 * dokumen untuk mereka jelas tidak boleh berkop RSPUR.
 */
export default async function HalamanKopSurat() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("kop_surat")
    .select("id, nama, berkas_nama, bawaan, aktif")
    .order("bawaan", { ascending: false })
    .order("nama");

  const daftar = (data ?? []) as unknown as KopSurat[];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          prefetch={false}
          href="/draf"
          className="flex w-fit items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta"
        >
          <span className="inline-block rotate-180">
            <Ikon nama="panah" ukuran={14} />
          </span>
          Kembali ke Draf Bersama
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Kop Surat</h1>
        <p className="mt-1 text-tinta-2">
          Dipasang di kepala berkas PDF yang diunduh dari draf. Boleh lebih dari
          satu — konsep untuk rumah sakit atau klinik lain tentu tidak berkop
          RSPUR.
        </p>
      </div>

      <FormKop />

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-garis bg-permukaan px-5 py-8 text-center text-sm text-tinta-3 shadow-lembut">
          Belum ada kop. Sementara ini PDF terbit tanpa kop.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {daftar.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-garis bg-permukaan px-4 py-3 shadow-lembut"
            >
              <span className="mr-auto min-w-0">
                <span className="font-medium">{k.nama}</span>
                <span className="block text-xs text-tinta-3">{k.berkas_nama}</span>
              </span>

              {k.bawaan ? (
                <span className="rounded-full bg-hijau-muda px-2.5 py-0.5 text-xs font-medium text-hijau">
                  Bawaan
                </span>
              ) : (
                <form action={jadikanKopBawaan}>
                  <input type="hidden" name="id" value={k.id} />
                  <button type="submit" className="text-xs text-tinta-3 hover:text-tinta">
                    Jadikan bawaan
                  </button>
                </form>
              )}

              <form action={hapusKopSurat}>
                <input type="hidden" name="id" value={k.id} />
                <button
                  type="submit"
                  aria-label="Hapus"
                  title="Hapus"
                  className="text-merah hover:opacity-70"
                >
                  <Ikon nama="hapus" ukuran={14} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
