import Link from "next/link";
import { wajibMcu } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { Kalkulator, type Paket, type Pemeriksaan } from "./kalkulator";

export default async function HalamanPenawaranBaru() {
  await wajibMcu();

  const supabase = await createClient();

  const [{ data: item }, { data: paket }, { data: pengaturan }] = await Promise.all([
    supabase
      .from("mcu_item")
      .select("id, nama, tarif, cost")
      .eq("aktif", true)
      .order("urutan")
      .order("id"),
    supabase.from("mcu_paket").select("id, nama, item_id").order("nama"),
    supabase.from("pengaturan_sistem").select("ppn_persen").eq("id", 1).maybeSingle(),
  ]);

  return (
    <div>
      <Link href="/mcu" className="text-sm text-tinta-3 hover:underline">
        ← Kembali ke daftar penawaran
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Penawaran Baru</h1>
      <p className="mt-1 mb-8 max-w-2xl text-tinta-2">
        Pilih pemeriksaan yang termasuk paket, tentukan harga per peserta, lalu
        lihat labanya sebelum penawaran dikirim.
      </p>

      <Kalkulator
        pemeriksaan={(item ?? []) as Pemeriksaan[]}
        paket={(paket ?? []) as Paket[]}
        ppnBawaan={Number(pengaturan?.ppn_persen ?? 11)}
      />
    </div>
  );
}
