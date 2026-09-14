import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import type { Dokter, Sesi } from "@/lib/dokter";
import { FormDokter } from "../form-dokter";
import { TombolHapusDokter } from "./hapus";

export default async function HalamanUbahDokter({ params }: PageProps<"/dokter/[id]">) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await punyaIzin("humas"))) redirect("/tanpa-akses");

  const { id } = await params;
  const nomor = Number(id);
  if (!Number.isFinite(nomor)) notFound();

  const supabase = await createClient();

  const [{ data: dokter }, { data: semua }] = await Promise.all([
    supabase
      .from("dokter")
      .select("id, poliklinik, nama, aktif, catatan, urutan, dokter_jadwal(hari, jam)")
      .eq("id", nomor)
      .maybeSingle(),
    supabase.from("dokter").select("poliklinik"),
  ]);

  if (!dokter) notFound();

  const d = dokter as unknown as Dokter & { dokter_jadwal: Sesi[] | null };
  const daftarPoli = [
    ...new Set((semua ?? []).map((p) => p.poliklinik as string)),
  ].sort();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/dokter"
        className="flex w-fit items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta"
      >
        <span className="inline-block rotate-180">
          <Ikon nama="panah" ukuran={14} />
        </span>
        Kembali ke Daftar Dokter
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">{d.nama}</h1>

      <div className="rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        <FormDokter
          daftarPoli={daftarPoli}
          awal={{
            id: d.id,
            poliklinik: d.poliklinik,
            nama: d.nama,
            aktif: d.aktif,
            catatan: d.catatan,
            jadwal: d.dokter_jadwal ?? [],
          }}
        />
      </div>

      <div className="flex justify-end border-t border-garis pt-5">
        <TombolHapusDokter id={d.id} nama={d.nama} />
      </div>
    </div>
  );
}
