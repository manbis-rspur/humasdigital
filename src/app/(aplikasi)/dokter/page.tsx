import Link from "next/link";
import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { ubahAktifDokter } from "@/lib/dokter-actions";
import { kelompokPoli, ringkasJadwal, type Dokter, type Sesi } from "@/lib/dokter";
import { DokterBaru } from "./baru";
import { ImporJadwal } from "./impor";

/**
 * Daftar dokter spesialis.
 *
 * Gunanya bukan menggantikan jadwal yang tertempel di lobi,
 * melainkan memberi AI satu-satunya sumber nama yang boleh ia
 * sebut. Tanpa daftar ini AI akan mengarang nama dokter, dan nama
 * dokter karangan di akun resmi rumah sakit jauh lebih berbahaya
 * daripada konten yang tidak menyebut nama.
 */
export default async function HalamanDokter() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("dokter")
    .select("id, poliklinik, nama, aktif, catatan, urutan, dokter_jadwal(hari, jam)")
    .order("urutan")
    .order("nama");

  const semua = (data ?? []) as unknown as (Dokter & { dokter_jadwal: Sesi[] | null })[];
  const kelompok = kelompokPoli(semua);
  const aktif = semua.filter((d) => d.aktif).length;
  const daftarPoli = [...new Set(semua.map((d) => d.poliklinik))].sort();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daftar Dokter</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Sumber nama dokter untuk konten. Modul Kalender Konten membaca daftar
          ini, jadi nama yang disebut AI selalu nama yang benar-benar ada di
          sini — dan hanya yang sedang praktik.
        </p>
      </div>

      <ImporJadwal />

      <DokterBaru daftarPoli={daftarPoli} />

      {semua.length === 0 ? (
        <div className="rounded-xl border border-garis bg-permukaan px-5 py-10 text-center shadow-lembut">
          <p className="font-medium">Belum ada dokter yang terdaftar.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Unggah berkas jadwal poliklinik di atas — sekali unggah, seluruh
            daftarnya terisi.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-tinta-3">
            {semua.length} dokter terdaftar, {aktif} sedang praktik, dalam{" "}
            {kelompok.length} poliklinik.
          </p>

          <div className="flex flex-col gap-6">
            {kelompok.map((k) => (
              <section key={k.poliklinik} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
                  {k.poliklinik}
                </h2>

                <ul className="flex flex-col gap-1.5">
                  {k.isi.map((d) => {
                    const jadwal = ringkasJadwal(d.dokter_jadwal ?? []);
                    return (
                      <li
                        key={d.id}
                        className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-garis bg-permukaan px-4 py-2.5 shadow-lembut ${
                          d.aktif ? "" : "opacity-60"
                        }`}
                      >
                        <span className="mr-auto min-w-0">
                          <span className="font-medium">{d.nama}</span>
                          <span className="block text-xs text-tinta-3">
                            {jadwal || "belum ada jam praktik"}
                          </span>
                          {d.catatan && (
                            <span className="block text-xs text-oker">{d.catatan}</span>
                          )}
                        </span>

                        {!d.aktif && (
                          <span className="rounded-full bg-permukaan-2 px-2.5 py-0.5 text-xs font-medium text-tinta-2">
                            Tidak praktik
                          </span>
                        )}

                        <form action={ubahAktifDokter}>
                          <input type="hidden" name="id" value={d.id} />
                          <input
                            type="hidden"
                            name="aktif"
                            value={d.aktif ? "tidak" : "ya"}
                          />
                          <button
                            type="submit"
                            className="text-xs text-tinta-3 hover:text-tinta"
                          >
                            {d.aktif ? "Padamkan" : "Nyalakan"}
                          </button>
                        </form>

                        <Link
                          href={`/dokter/${d.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-hijau hover:underline"
                        >
                          Ubah
                          <Ikon nama="panah" ukuran={12} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
