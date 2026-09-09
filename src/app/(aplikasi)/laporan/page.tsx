import Link from "next/link";
import { wajibSosmed } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { NAMA_BULAN } from "@/lib/sosmed";
import { FormBaru } from "./form-baru";

export default async function HalamanLaporan() {
  await wajibSosmed();

  const supabase = await createClient();
  const { data } = await supabase
    .from("laporan_sosmed")
    .select("id, bulan, tahun, akun, hasil, disusun_pada")
    .order("tahun", { ascending: false })
    .order("bulan", { ascending: false });

  const laporan = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Laporan Bulanan Media Sosial
        </h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          Capaian Instagram dan TikTok @rspurosnati. Naskahnya disusun dari
          angka yang Anda catat, lalu diunduh untuk diunggah ke Dashboard
          Manajemen Bisnis.
        </p>
      </div>

      <FormBaru />

      {laporan.length === 0 ? (
        <div className="rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada laporan.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Mulai dengan memilih bulannya di atas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {laporan.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-garis bg-permukaan px-4 py-3"
            >
              <div className="mr-auto">
                <Link href={`/laporan/${l.id}`} className="font-medium hover:underline">
                  {NAMA_BULAN[l.bulan]} {l.tahun}
                </Link>
                <p className="text-xs text-tinta-3">
                  {l.hasil ? "Naskah sudah tersusun" : "Belum disusun"}
                </p>
              </div>
              {l.hasil && (
                <a
                  href={`/laporan/${l.id}/word`}
                  className="rounded-lg border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                >
                  Unduh Word
                </a>
              )}
              <Link
                href={`/laporan/${l.id}`}
                className="rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Buka
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
